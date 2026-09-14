import type { AddCartItem, CartItem, ChangeCartQuantity } from './schemas'

export interface CartRepository {
  list(signal?: AbortSignal): Promise<CartItem[]>
  // Set the selected rental duration or one-time quantity; repeated adds do not duplicate it.
  add(input: AddCartItem): Promise<CartItem[]>
  remove(ids: readonly string[]): Promise<CartItem[]>
  changeQuantity(input: ChangeCartQuantity): Promise<CartItem[]>
}

export const cartQueryKeys = { all: ['cart'] as const, items: ['cart', 'items'] as const }
