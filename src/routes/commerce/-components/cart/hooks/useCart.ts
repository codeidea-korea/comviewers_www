import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { cartQueryKeys } from '@/domain/cart/cartRepository'
import { summarizeQuotedCartItems } from '@/domain/cart/cartEstimate'
import { cartSchema, changeCartQuantitySchema, type CartItem } from '@/domain/cart/schemas'
import { checkoutQueryKeys, checkoutQuoteSchema } from '@/domain/checkout/checkoutRepository'
import { useToastMessage } from '@/components/ui/ToastControl'

type CartChange = { type: 'remove'; ids: string[] } | { type: 'quantity'; item: CartItem; quantity: number }
const emptyItems: CartItem[] = []

function changeCachedQuantity(items: readonly CartItem[], id: string, selectionUnits: number): CartItem[] {
  return cartSchema.parse(items.map((item) => {
    if (item.id !== id) return item
    const quantity = item.billingUnit === 'unit' ? selectionUnits : 1
    const durationUnits = item.billingUnit === 'unit' ? null : selectionUnits
    const amount = item.setupFee === null || item.rentalFee === null
      ? null
      : (item.setupFee + item.rentalFee * (durationUnits ?? 1)) * quantity
    return {
      ...item,
      quantity,
      durationUnits,
      quotedAmount: Number.isSafeInteger(amount) ? amount : null,
      expectedPoints: null,
    }
  }))
}

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
    mutationFn: async (change: CartChange) => {
      if (change.type === 'remove') return cartSchema.parse(await cart.remove(change.ids))
      await cart.changeQuantity(change.item, change.quantity)
      return null
    },
    onMutate: async (change) => {
      if (change.type !== 'quantity') return { previousItems: undefined as CartItem[] | undefined }
      await Promise.all([
        queryClient.cancelQueries({ queryKey: cartQueryKeys.items }),
        queryClient.cancelQueries({ queryKey: checkoutQueryKeys.all }),
      ])
      const previousItems = queryClient.getQueryData<CartItem[]>(cartQueryKeys.items)
      if (previousItems) {
        queryClient.setQueryData(cartQueryKeys.items, changeCachedQuantity(previousItems, change.item.id, change.quantity))
      }
      return { previousItems }
    },
    onError: (_error, change, context) => {
      if (change.type === 'quantity' && context?.previousItems) {
        queryClient.setQueryData(cartQueryKeys.items, context.previousItems)
      }
    },
    onSuccess: async (items, change) => {
      if (change.type !== 'remove' || !items) return
      await queryClient.cancelQueries({ queryKey: cartQueryKeys.items })
      queryClient.setQueryData(cartQueryKeys.items, items)
      queryClient.setQueryData(cartQueryKeys.count, items.length)
      setExcludedIds((ids) => ids.filter((id) => items.some((item) => item.id === id)))
      setNotice('선택한 상품을 삭제했습니다.')
    },
    onSettled: (_items, error, change) => {
      // A failed response may arrive after the server committed the change.
      if (error) {
        void queryClient.invalidateQueries({ queryKey: cartQueryKeys.all })
          .then(() => queryClient.invalidateQueries({ queryKey: checkoutQueryKeys.all }))
        return
      }
      if (change.type === 'remove') {
        void queryClient.invalidateQueries({ queryKey: checkoutQueryKeys.all })
        return
      }
      const quoteIds = selectedIds.includes(change.item.id) ? selectedIds : allIds
      void queryClient.invalidateQueries({ queryKey: checkoutQueryKeys.quote(quoteIds), exact: true })
    },
  })
  const items = result.data ?? emptyItems
  const selectedItems = items.filter((item) => !excludedIds.includes(item.id))
  const selectedIds = selectedItems.map((item) => item.id)
  const allSelected = items.length > 0 && selectedItems.length === items.length
  const quote = useQuery({
    queryKey: checkoutQueryKeys.quote(selectedIds),
    queryFn: async ({ signal }) => checkoutQuoteSchema.parse(await checkout.quote(
      selectedIds,
      signal,
      queryClient.getQueryData<CartItem[]>(cartQueryKeys.items),
    )),
    enabled: selectedIds.length > 0 && selectedIds.length <= 100,
    staleTime: 0, retry: false,
  })
  const allIds = items.map(item => item.id)
  const sameSelection = allIds.length === selectedIds.length && allIds.every((id, index) => id === selectedIds[index])
  const allQuote = useQuery({
    queryKey: checkoutQueryKeys.quote(allIds),
    queryFn: async ({ signal }) => checkoutQuoteSchema.parse(await checkout.quote(
      allIds,
      signal,
      queryClient.getQueryData<CartItem[]>(cartQueryKeys.items),
    )),
    enabled: allIds.length > 0 && allIds.length <= 100,
    staleTime: 0, retry: false,
  })
  // Keep quoted rows while refetching; selecting a checkbox must not erase prices.
  const quotedItems = items.map(item => {
    const matchesCurrentQuantity = (row: CartItem) => row.quantity === item.quantity && row.durationUnits === item.durationUnits
    const selectedRow = quote.data?.items.find(row => row.id === item.id && matchesCurrentQuantity(row))
    const allRow = allQuote.data?.items.find(row => row.id === item.id && matchesCurrentQuantity(row))
    return (quote.dataUpdatedAt >= allQuote.dataUpdatedAt ? selectedRow ?? allRow : allRow ?? selectedRow) ?? item
  })
  const estimate = summarizeQuotedCartItems(quotedItems.filter(item => selectedIds.includes(item.id)))
  const checkoutBlocked = selectedIds.length === 0 || quote.isFetching || !quote.data?.checkoutEligible || quote.isError
  const checkoutChecking = selectedIds.length > 0 && (quote.isPending || quote.isFetching)
  const unavailableItems = quote.isError ? [] : (quote.data?.items ?? []).filter(item => !item.checkoutEligible)

  async function change(input: CartChange) {
    if (result.isPending || result.isError) return
    if (input.type === 'remove' && changing.current > 0) return
    const quantityId = input.type === 'quantity' ? input.item.id : null
    if (quantityId && pendingQuantityIds.current.has(quantityId)) return
    if (quantityId) {
      pendingQuantityIds.current.add(quantityId)
      setUpdatingQuantityIds(new Set(pendingQuantityIds.current))
    }
    changing.current += 1
    setIsChanging(true)
    setNotice('')
    try {
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
    changeQuantity: (id: string, quantity: number) => {
      const item = items.find((candidate) => candidate.id === id)
      const parsed = changeCartQuantitySchema.safeParse({ id, quantity })
      if (!item || !parsed.success || !item.quantityEditable || quantity < item.minimumQuantity
        || (item.maximumQuantity !== null && quantity > item.maximumQuantity)) return
      void change({ type: 'quantity', item, quantity })
    },
  }
}
