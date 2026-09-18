import { z } from 'zod'
import { productNoResponseSchema } from './productNo'
import type { ApiClient } from './httpClient'

const id = z.number().int().positive().safe()
const time = z.iso.datetime({ local: true })
export const extensionSelectionSchema = z.object({ rentalIds: id.array().min(1).max(100),
  addedDays: z.number().int().min(1).max(90).optional(), targetEndDate: z.iso.date().optional(),
  userCouponId: id.nullable().optional(), pointAmount: z.number().int().nonnegative().max(2147483647).default(0),
}).refine(value => (value.addedDays !== undefined) !== (value.targetEndDate !== undefined))
export type ExtensionSelection = z.infer<typeof extensionSelectionSchema>
const row = z.object({ rentalId: id, productNo: productNoResponseSchema.nullable(), title: z.string().nullable(),
  serverRoomName: z.string().nullable(), spec: z.string().nullable(), previousEnd: time.nullable(), targetEnd: time.nullable(),
  addedDays: z.number().int().nullable(), amount: z.number().int().nonnegative().safe().nullable(), monthlyFee: z.number().int().nonnegative().safe().nullable(), eligible: z.boolean(), reason: z.string().nullable() })
const benefit = z.object({ subtotalAmount: z.number(), setupFeeAmount: z.number(), couponDiscountAmount: z.number().int().nonnegative(), pointUsedAmount: z.number().int().nonnegative(),
  finalAmount: z.number().int().nonnegative().safe(), availablePoints: z.number().int().nonnegative(), userCouponId: id.nullable(),
  coupons: z.object({ userCouponId: id, name: z.string(), serverRoomId: id.nullable(), expiresAt: time.nullable(), discountAmount: z.number().int().nonnegative() }).array(),
})
const quote = z.object({ items: row.array(), totalAmount: z.number().int().nonnegative().safe(), eligible: z.boolean(), quoteHash: z.string().regex(/^[a-f0-9]{64}$/), benefits: benefit.nullable() })
const create = z.object({ selection: extensionSelectionSchema, quoteHash: z.string().regex(/^[a-f0-9]{64}$/),
  contact: z.object({ name: z.string().trim().min(1).max(100), email: z.email().max(255), phone: z.string().trim().min(1).max(30),
    messengerType: z.string().max(50).nullable(), messengerId: z.string().max(100).nullable() }),
  offerIds: id.array().max(100).optional(),
})
export type ExtensionCheckoutInput = z.infer<typeof create>
export function createExtensionCheckoutApi(client: ApiClient, organizationId: string) {
  const scoped = { authenticated: true, customerOrganizationId: organizationId } as const
  return {
    offers: () => client.request('/api/v1/my/rentals/extension-offers', z.object({ id, rentalId: id, productNo: productNoResponseSchema, title: z.string(),
      serverRoomName: z.string().nullable(), previousEnd: time, targetEnd: time, addedDays: z.number().int().min(1).max(90), quotedAmount: z.number().int().positive().safe(), createdAt: time }).array(), scoped),
    cancelOffer: (offerId: number) => client.request(`/api/v1/my/rentals/extension-offers/${id.parse(offerId)}`, z.unknown(), { ...scoped, method: 'DELETE' }),
    quote: (selection: ExtensionSelection) => client.request('/api/v1/my/rentals/extension-checkout/quote', quote, {
      ...scoped, method: 'POST', body: extensionSelectionSchema.parse(selection),
    }),
    create: (body: ExtensionCheckoutInput, key: string) => client.request('/api/v1/my/rentals/extension-checkout',
      z.object({ orderId: id, orderNo: z.string(), finalAmount: z.number().int().nonnegative().safe(), paymentDueAt: time, replayed: z.boolean() }),
      { ...scoped, method: 'POST', body: create.parse(body), idempotencyKey: z.uuidv4().parse(key) }),
  }
}
