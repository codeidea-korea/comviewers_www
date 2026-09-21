import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router'
import { useServices } from '@/app/ServiceProvider'
import { cartQueryKeys } from '@/domain/cart/cartRepository'
import { cartSchema } from '@/domain/cart/schemas'
import { z } from 'zod'

export function useCartCount() {
  const { cart } = useServices()
  const onCartPage = useLocation().pathname === '/cart'
  const count = useQuery({
    queryKey: cartQueryKeys.count,
    queryFn: async ({ signal }) => z.number().int().nonnegative().parse(await cart.count(signal)),
    enabled: !onCartPage,
  })
  // The cart page already loads these items; share its query instead of GET /cart twice.
  const items = useQuery({
    queryKey: cartQueryKeys.items,
    queryFn: async ({ signal }) => cartSchema.parse(await cart.list(signal)),
    select: (rows) => rows.length,
    enabled: onCartPage,
  })
  return onCartPage ? items.data : count.data
}
