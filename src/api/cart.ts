import { z } from 'zod'
import type { ApiClient } from './httpClient'

const id = z.number().int().positive().safe()
const amount = z.number().int().nonnegative().safe()
const positiveInt = z.number().int().positive().max(2147483647)
const billingUnit = z.enum(['thirty_day', 'day', 'hour', 'unit'])
const localDateTime = z.iso.datetime({ local: true })
  .refine((value) => !/[Zz]|[+-]\d{2}:?\d{2}$/.test(value))

// Wire DTOs deliberately preserve item IDs, prices and duration separately from UI models.
export const cartItemDtoSchema = z.object({
  id, productNo: z.string().min(1), title: z.string(), quantity: positiveInt,
  billingUnit, currentBillingUnit: billingUnit.nullable(), durationUnits: positiveInt.nullable(),
  snapshotUnitPrice: amount, snapshotSetupFee: amount,
  currentUnitPrice: amount.nullable(), currentSetupFee: amount.nullable(),
  priceChanged: z.boolean(), available: z.boolean(), addedAt: localDateTime, updatedAt: localDateTime,
})
export const cartDtoSchema = z.object({ cartId: id.nullable(), items: z.array(cartItemDtoSchema) })
export const cartItemInputSchema = z.object({
  quantity: positiveInt, durationUnits: positiveInt.nullable().optional(),
})
export const orderQuoteDtoSchema = z.object({
  currency: z.literal('KRW'), checkoutEligible: z.boolean(),
  subtotalAmount: amount, setupFeeAmount: amount, totalAmount: amount, expectedPoints: amount.nullable(),
  items: z.array(z.object({
    cartItemId: id, productNo: z.string().min(1), title: z.string(), quantity: positiveInt,
    billingUnit, currentBillingUnit: billingUnit.nullable(), durationUnits: positiveInt.nullable(),
    snapshotUnitPrice: amount, currentUnitPrice: amount.nullable(), priceChanged: z.boolean(),
    amount, expectedPoints: amount.nullable(), issues: z.array(z.string()),
  })),
})
export type CartDto = z.infer<typeof cartDtoSchema>
export type CartItemInput = z.infer<typeof cartItemInputSchema>
export type OrderQuoteDto = z.infer<typeof orderQuoteDtoSchema>

// Create a new client and discard tenant query caches when the organization changes.
// CartService requires this header even though the controller marks it optional.
export function createCartApi(client: ApiClient, customerOrganizationId: string) {
  const organizationId = z.string().regex(/^[1-9]\d{0,18}$/)
    .refine((value) => BigInt(value) <= 9223372036854775807n).parse(customerOrganizationId)
  const context = { authenticated: true, customerOrganizationId: organizationId } as const
  return {
    list(signal?: AbortSignal) {
      return client.request('/api/v1/cart', cartDtoSchema, { ...context, signal })
    },
    putItem(productNo: string, input: CartItemInput, signal?: AbortSignal) {
      const number = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,49}$/).parse(productNo)
      return client.request(`/api/v1/cart/items/${encodeURIComponent(number)}`, cartItemDtoSchema, {
        ...context, method: 'PUT', body: cartItemInputSchema.parse(input), signal,
      })
    },
    removeItem(itemId: number, signal?: AbortSignal) {
      return client.request(`/api/v1/cart/items/${id.parse(itemId)}`, z.undefined(), {
        ...context, method: 'DELETE', signal,
      })
    },
    quote(cartItemIds: readonly number[], signal?: AbortSignal) {
      // Empty means ALL items on the backend: require an explicit nonempty selection here.
      const selected = z.array(id).min(1).max(100)
        .refine((ids) => new Set(ids).size === ids.length).parse(cartItemIds)
      return client.request('/api/v1/order-quotes', orderQuoteDtoSchema, {
        ...context, method: 'POST', body: { cartItemIds: selected }, signal,
      })
    },
  }
}
