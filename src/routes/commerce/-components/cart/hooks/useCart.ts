import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { cartQueryKeys } from '@/domain/cart/cartRepository'
import { summarizeQuotedCartItems } from '@/domain/cart/cartEstimate'
import { cartSchema, type CartItem, type ChangeCartQuantity } from '@/domain/cart/schemas'
import { checkoutQueryKeys, checkoutQuoteSchema } from '@/domain/checkout/checkoutRepository'
import { useToastMessage } from '@/components/ui/ToastControl'

type CartChange = { type: 'remove'; ids: string[] } | { type: 'quantity'; input: ChangeCartQuantity }
const emptyItems: CartItem[] = []

export function useCart() {
  const { cart, checkout } = useServices()
  const queryClient = useQueryClient()
  const changing = useRef(0)
  const pendingQuantityIds = useRef(new Set<string>())
  const [isChanging, setIsChanging] = useState(false)
  const [updatingQuantityIds, setUpdatingQuantityIds] = useState<Set<string>>(() => new Set())
  const [excludedIds, setExcludedIds] = useState<string[]>([])
  const { message: notice, setMessage: setNotice, toastKey } = useToastMessage()
  const result = useQuery({
    queryKey: cartQueryKeys.items,
    queryFn: async ({ signal }) => cartSchema.parse(await cart.list(signal)),
  })
  const mutation = useMutation({
    scope: { id: 'cart-changes' },
    mutationFn: async (change: CartChange) => cartSchema.parse(await (change.type === 'remove'
      ? cart.remove(change.ids) : cart.changeQuantity(change.input))),
    onSuccess: async (items, change) => {
      await queryClient.cancelQueries({ queryKey: cartQueryKeys.items })
      queryClient.setQueryData(cartQueryKeys.items, items)
      setExcludedIds((ids) => ids.filter((id) => items.some((item) => item.id === id)))
      setNotice(change.type === 'remove' ? '선택한 상품을 삭제했습니다.' : '')
    },
    onSettled: async () => {
      // PUT/DELETE may have succeeded before a network or partial-delete failure.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: cartQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: checkoutQueryKeys.all }),
      ])
    },
  })
  const items = result.data ?? emptyItems
  const selectedItems = items.filter((item) => !excludedIds.includes(item.id))
  const selectedIds = selectedItems.map((item) => item.id)
  const allSelected = items.length > 0 && selectedItems.length === items.length
  const quote = useQuery({
    queryKey: checkoutQueryKeys.quote(selectedIds),
    queryFn: async ({ signal }) => checkoutQuoteSchema.parse(await checkout.quote(selectedIds, signal)),
    enabled: selectedIds.length > 0 && selectedIds.length <= 100,
    staleTime: 0, retry: false,
  })
  const allIds = items.map(item => item.id)
  const sameSelection = allIds.length === selectedIds.length && allIds.every((id, index) => id === selectedIds[index])
  const allQuote = useQuery({
    queryKey: checkoutQueryKeys.quote(allIds),
    queryFn: async ({ signal }) => checkoutQuoteSchema.parse(await checkout.quote(allIds, signal)),
    enabled: allIds.length > 0 && allIds.length <= 100,
    staleTime: 0, retry: false,
  })
  // Keep quoted rows while refetching; selecting a checkbox must not erase prices.
  const quotedItems = items.map(item => {
    const selectedRow = quote.data?.items.find(row => row.id === item.id)
    const allRow = allQuote.data?.items.find(row => row.id === item.id)
    return (quote.dataUpdatedAt >= allQuote.dataUpdatedAt ? selectedRow ?? allRow : allRow ?? selectedRow) ?? item
  })
  const estimate = summarizeQuotedCartItems(quotedItems.filter(item => selectedIds.includes(item.id)))
  const checkoutBlocked = selectedIds.length === 0 || quote.isFetching || !quote.data?.checkoutEligible || quote.isError
  const checkoutChecking = selectedIds.length > 0 && (quote.isPending || quote.isFetching)
  const unavailableItems = quote.isError ? [] : (quote.data?.items ?? []).filter(item => !item.checkoutEligible)

  async function change(input: CartChange) {
    if (result.isPending || result.isError) return
    if (input.type === 'remove' && changing.current > 0) return
    const quantityId = input.type === 'quantity' ? input.input.id : null
    if (quantityId && pendingQuantityIds.current.has(quantityId)) return
    if (quantityId) {
      pendingQuantityIds.current.add(quantityId)
      setUpdatingQuantityIds(new Set(pendingQuantityIds.current))
    }
    changing.current += 1
    setIsChanging(true)
    setNotice('')
    try {
      await queryClient.cancelQueries({ queryKey: cartQueryKeys.items })
      await mutation.mutateAsync(input)
    } catch {
      setNotice('일부 변경을 처리하지 못했습니다. 장바구니를 다시 확인해 주세요.')
    } finally {
      changing.current -= 1
      if (quantityId) {
        pendingQuantityIds.current.delete(quantityId)
        setUpdatingQuantityIds(new Set(pendingQuantityIds.current))
      }
      setIsChanging(changing.current > 0)
    }
  }

  return {
    ...result, items: quotedItems, selectedIds, allSelected, notice, toastKey,
    estimate, checkoutBlocked, checkoutChecking, unavailableItems, quoteError: quote.isError || allQuote.isError,
    retryQuote: () => Promise.all([...(selectedIds.length ? [quote.refetch()] : []), ...(!sameSelection && allIds.length ? [allQuote.refetch()] : [])]),
    isChanging, updatingQuantityIds,
    toggle: (id: string) => { if (changing.current === 0) setExcludedIds((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]) },
    toggleAll: () => { if (changing.current === 0) setExcludedIds(allSelected ? items.map((item) => item.id) : []) },
    remove: (ids: string[]) => { if (ids.length) void change({ type: 'remove', ids: [...ids] }) },
    changeQuantity: (id: string, quantity: number) => { void change({ type: 'quantity', input: { id, quantity } }) },
  }
}
