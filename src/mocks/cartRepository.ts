import type { CartRepository } from '../domain/cart/cartRepository'
import { addCartItemSchema, cartItemSchema, cartSchema, changeCartQuantitySchema, removeCartItemsSchema } from '../domain/cart/schemas'
import type { ProductRepository } from '../domain/products/productRepository'
import { productSchema } from '../domain/products/schemas'
import { cartFixtures } from './cart/cartFixtures'

export function createMockCartRepository(products: ProductRepository): CartRepository {
  let items = cartSchema.parse(cartFixtures)
  return {
    async add(input) {
      const selection = addCartItemSchema.parse(input)
      if (selection.rentalPeriods > 3) throw new Error('선택 가능한 이용기간을 초과했습니다.')
      const found = await products.get(selection.productNo)
      if (!found) throw new Error('장바구니에 담을 상품을 찾을 수 없습니다.')
      const product = productSchema.parse(found)
      if (String(product.productId) !== selection.productNo) throw new Error('상품 번호가 일치하지 않습니다.')
      if (product.billingUnit !== 'thirty_day' || product.monthlyPrice === null) throw new Error('선택할 수 없는 렌탈 단위입니다.')
      const nextItem = cartItemSchema.parse({
        id: `product-${selection.productNo}`, type: 'rental',
        rowKind: product.available ? 'normal' : 'waiting', instantAvailable: product.available,
        label: `품번 ${product.productId}`, productId: product.productId,
        location: product.serverRoom, image: product.image,
        spec: [product.os, product.cpu, product.ram, product.disk, product.gpu].join(' / '),
        available: product.saleAvailability !== 'SOLD_OUT', setupFee: product.setupFee, rentalFee: product.monthlyPrice,
        quantity: 1, durationUnits: selection.rentalPeriods, maximumQuantity: 3,
      })
      // Read the current cart after lookup so concurrent additions retain one another.
      const remaining = items.filter((item) => !(item.type === 'rental' && item.productId === product.productId))
      const nextItems = cartSchema.parse([...remaining, nextItem])
      items = nextItems
      return cartSchema.parse(items)
    },
    async list(signal) {
      signal?.throwIfAborted()
      await Promise.resolve()
      signal?.throwIfAborted()
      return cartSchema.parse(items)
    },
    async remove(input) {
      const ids = removeCartItemsSchema.parse(input)
      items = items.filter((item) => !ids.includes(item.id))
      return cartSchema.parse(items)
    },
    async changeQuantity(input) {
      const change = changeCartQuantitySchema.parse(input)
      if (!items.some((item) => item.id === change.id)) throw new Error('장바구니 항목을 찾을 수 없습니다.')
      const nextItems = cartSchema.parse(items.map((item) => item.id === change.id ? { ...item, ...(item.durationUnits === null ? { quantity: change.quantity } : { durationUnits: change.quantity }) } : item))
      items = nextItems
      return cartSchema.parse(items)
    },
  }
}
