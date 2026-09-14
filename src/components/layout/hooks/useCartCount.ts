import { useQuery } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { cartQueryKeys } from '@/domain/cart/cartRepository'
import { cartSchema } from '@/domain/cart/schemas'

export function useCartCount() {
  const { cart } = useServices()
  const result = useQuery({
    queryKey: cartQueryKeys.items,
    queryFn: async ({ signal }) => cartSchema.parse(await cart.list(signal)),
  })
  return result.data?.length
}
