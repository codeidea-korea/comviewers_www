import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { cartQueryKeys } from '@/domain/cart/cartRepository'
import type { AddCartItem } from '@/domain/cart/schemas'
import { checkoutQueryKeys } from '@/domain/checkout/checkoutRepository'

export function useAddToCart() {
  const { cart } = useServices()
  const queryClient = useQueryClient()
  const adding = useRef(false)
  const mutation = useMutation({
    mutationFn: async (input: AddCartItem) => cart.add(input),
    onSettled: () => {
      // Refresh canonical state without delaying the add result or its confirmation dialog.
      void queryClient.invalidateQueries({ queryKey: cartQueryKeys.all })
      void queryClient.invalidateQueries({ queryKey: checkoutQueryKeys.all })
    },
  })
  function add(productNo: string, rentalPeriods = 1) {
    if (adding.current) return
    adding.current = true
    mutation.mutate({ productNo, rentalPeriods }, { onSettled: () => { adding.current = false } })
  }
  return {
    add, isPending: mutation.isPending, isSuccess: mutation.isSuccess, isError: mutation.isError,
    message: mutation.isPending ? '장바구니에 담고 있습니다.'
      : mutation.isSuccess ? '장바구니에 담았습니다.'
      : mutation.isError ? '상품을 담지 못했습니다. 상품 정보를 확인하고 다시 시도해 주세요.'
      : '상품을 선택해 주세요.',
  }
}
