import type { CartRepository } from '@/domain/cart/cartRepository'
import { cartSchema } from '@/domain/cart/schemas'
import { calculateCartEstimate } from '@/domain/cart/cartEstimate'
import { checkoutQuoteSchema, checkoutSelectionSchema, type CheckoutRepository } from '@/domain/checkout/checkoutRepository'

// Re-read the injected cart: URL IDs are references, never trusted item/price snapshots.
export function createMockCheckoutRepository(cart: CartRepository): CheckoutRepository {
  return {
    async quote(input, signal) {
      const ids = checkoutSelectionSchema.parse(input)
      const cartItems = cartSchema.parse(await cart.list(signal))
      signal?.throwIfAborted()
      const items = ids.map((id) => {
        const item = cartItems.find((candidate) => candidate.id === id)
        if (!item) throw new Error('선택한 장바구니 상품이 없습니다. 장바구니에서 다시 선택해 주세요.')
        return item
      })
      return checkoutQuoteSchema.parse({
        source: 'mock', checkoutEligible: true, issues: [], items, estimate: calculateCartEstimate(items), benefits: 'unconnected',
      })
    },
  }
}
