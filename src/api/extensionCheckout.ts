import { z } from 'zod'
import { productNoResponseSchema } from './productNo'
import type { ApiClient } from './httpClient'

const id = z.number().int().positive().safe()
const time = z.iso.datetime({ local: true })
const uniqueIds = id.array().max(100).refine(ids => new Set(ids).size === ids.length)
const selectionIds = uniqueIds.refine(ids => ids.length > 0)
const storageItems = z.object({ itemId: id, durationUnits: z.number().int().positive().max(2147483647).nullable() }).array().max(100)
  .refine(items => new Set(items.map(item => item.itemId)).size === items.length)
const partOffers = z.object({ offerId: id, quantity: z.number().int().positive().max(2147483647) }).array().max(100)
  .refine(items => new Set(items.map(item => item.offerId)).size === items.length)
export const extensionSelectionSchema = z.object({ rentalIds: uniqueIds,
  addedDays: z.number().int().min(1).max(90).optional(), targetEndDate: z.iso.date().optional(),
  offerIds: selectionIds.optional(), cartItemIds: uniqueIds.optional(),
  storageItems: storageItems.optional(), partOffers: partOffers.optional(),
  userCouponId: id.nullable().optional(), pointAmount: z.number().int().nonnegative().max(2147483647).default(0),
}).refine(value => [value.addedDays, value.targetEndDate, value.offerIds].filter(item => item !== undefined).length === (value.rentalIds.length ? 1 : 0))
  .refine(value => value.offerIds === undefined || value.offerIds.length === value.rentalIds.length)
  .refine(value => {
    const count = value.rentalIds.length + (value.cartItemIds?.length ?? 0) + (value.storageItems?.length ?? 0) + (value.partOffers?.length ?? 0)
    return count > 0 && count <= 100
  })
  .refine(value => !(value.cartItemIds?.length && ((value.storageItems?.length ?? 0) + (value.partOffers?.length ?? 0))))
export type ExtensionSelection = z.infer<typeof extensionSelectionSchema>
const row = z.object({ rentalId: id, productNo: productNoResponseSchema.nullable(), title: z.string().nullable(),
  serverRoomName: z.string().nullable(), spec: z.string().nullable(), previousEnd: time.nullable(), targetEnd: time.nullable(),
  addedDays: z.number().int().nullable(), amount: z.number().int().nonnegative().safe().nullable(), monthlyFee: z.number().int().nonnegative().safe().nullable(), eligible: z.boolean(), reason: z.string().nullable() })
const benefit = z.object({ subtotalAmount: z.number(), setupFeeAmount: z.number(), couponDiscountAmount: z.number().int().nonnegative(), pointUsedAmount: z.number().int().nonnegative(),
  finalAmount: z.number().int().nonnegative().safe(), availablePoints: z.number().int().nonnegative(), userCouponId: id.nullable(),
  coupons: z.object({ userCouponId: id, name: z.string(), serverRoomId: id.nullable(), expiresAt: time.nullable(), discountAmount: z.number().int().nonnegative() }).array(),
})
const purchaseRow = z.object({ sourceType: z.enum(['storage_rental', 'storage_part', 'cart']), sourceId: id,
  productId: id, pcAssetId: id.nullable(), productNo: productNoResponseSchema.nullable(), title: z.string().nullable(),
  serverRoomName: z.string().nullable(), spec: z.string().nullable(), imageUrl: z.string().nullable(), categoryCode: z.string(),
  quantity: z.number().int().positive().safe(), billingUnit: z.enum(['thirty_day', 'day', 'hour', 'unit']),
  durationUnits: z.number().int().positive().safe().nullable(), unitPrice: z.number().int().nonnegative().safe(),
  setupFee: z.number().int().nonnegative().safe(), lineAmount: z.number().int().nonnegative().safe(), pointAmount: z.number().int().nonnegative().safe(),
})
const quote = z.object({ items: row.array(), purchaseItems: purchaseRow.array(), totalAmount: z.number().int().nonnegative().safe(), eligible: z.boolean(), quoteHash: z.string().regex(/^[a-f0-9]{64}$/), benefits: benefit.nullable(),
  extensionAmount: z.number().int().nonnegative().safe(), purchaseSubtotalAmount: z.number().int().nonnegative().safe(), purchaseSetupFeeAmount: z.number().int().nonnegative().safe() })
export type ExtensionQuote = z.infer<typeof quote>
const offer = z.object({ id, rentalId: id, productNo: productNoResponseSchema, title: z.string(),
  serverRoomName: z.string().nullable(), spec: z.string().nullable().default(null), previousEnd: time, targetEnd: time, addedDays: z.number().int().min(1).max(90), quotedAmount: z.number().int().positive().safe(), createdAt: time })
export type ExtensionOffer = z.infer<typeof offer>
const create = z.object({ selection: extensionSelectionSchema, quoteHash: z.string().regex(/^[a-f0-9]{64}$/),
  contact: z.object({ name: z.string().trim().min(1).max(100), email: z.email().max(255), phone: z.string().trim().max(30),
    messengerType: z.string().max(50).nullable(), messengerId: z.string().max(100).nullable() }),
  offerIds: id.array().max(100).refine(ids => new Set(ids).size === ids.length).optional(),
}).refine(value => value.selection.offerIds === undefined || (
  value.offerIds !== undefined && value.offerIds.length === value.selection.offerIds.length
  && value.selection.offerIds.every(id => value.offerIds?.includes(id))
))
export type ExtensionCheckoutInput = z.infer<typeof create>
export function createExtensionCheckoutApi(client: ApiClient, organizationId: string) {
  const scoped = { authenticated: true, customerOrganizationId: organizationId } as const
  const checkoutPath = (selection: ExtensionSelection) => selection.storageItems?.length || selection.partOffers?.length
    ? '/api/v1/my/storage/checkout' : '/api/v1/my/rentals/extension-checkout'
  return {
    offers: () => client.request('/api/v1/my/rentals/extension-offers', offer.array(), scoped),
    cancelOffer: (offerId: number) => client.request(`/api/v1/my/rentals/extension-offers/${id.parse(offerId)}`, z.unknown(), { ...scoped, method: 'DELETE' }),
    quote: (selection: ExtensionSelection) => client.request(`${checkoutPath(selection)}/quote`, quote, {
      ...scoped, method: 'POST', body: extensionSelectionSchema.parse(selection),
    }),
    create: (body: ExtensionCheckoutInput, key: string) => client.request(checkoutPath(body.selection),
      z.object({ orderId: id, orderNo: z.string(), finalAmount: z.number().int().nonnegative().safe(), paymentDueAt: time, replayed: z.boolean() }),
      { ...scoped, method: 'POST', body: create.parse(body), idempotencyKey: z.uuidv4().parse(key) }),
  }
}
