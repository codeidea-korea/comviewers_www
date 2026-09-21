import type { AddCartItem, CartItem } from './schemas'

export interface CartRepository {
  list(signal?: AbortSignal): Promise<CartItem[]>
  count(signal?: AbortSignal): Promise<number>
  // Set the selected rental duration or one-time quantity and return the saved item ID.
  // Repeated adds update the same item instead of duplicating it.
  add(input: AddCartItem): Promise<string>
  remove(ids: readonly string[]): Promise<CartItem[]>
  changeQuantity(item: CartItem, quantity: number): Promise<void>
}

export const cartQueryKeys = { all: ['cart'] as const, items: ['cart', 'items'] as const, count: ['cart', 'count'] as const }
