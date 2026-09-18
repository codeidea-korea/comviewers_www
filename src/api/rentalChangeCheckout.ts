import { z } from 'zod'
import { productNoResponseSchema } from './productNo'
import type { ApiClient } from './httpClient'

const id = z.number().int().positive().safe()
const money = z.number().int().safe()
const count = z.number().int().nonnegative().safe()
const time = z.iso.datetime({ local: true })
const optionalTime = time.nullable()
const quoteHash = z.string().regex(/^[a-f0-9]{64}$/)

const selection = z.object({
  userCouponId: id.nullable().optional(),
  pointAmount: z.number().int().nonnegative().max(2147483647).default(0),
})
export type RentalChangeSelection = z.infer<typeof selection>

const benefit = z.object({
  subtotalAmount: count,
  setupFeeAmount: count,
  couponDiscountAmount: count,
  pointUsedAmount: count,
  finalAmount: count,
  availablePoints: count,
  userCouponId: id.nullable(),
  coupons: z.object({
    userCouponId: id,
    name: z.string(),
    serverRoomId: id.nullable(),
    expiresAt: optionalTime,
    discountAmount: count,
  }).array(),
})

export const rentalChangeCaseSchema = z.object({
  id,
  rentalId: id,
  customerId: id.nullable(),
  customerOrganizationId: id,
  orderId: id.nullable(),
  orderItemId: id.nullable(),
  sourcePcAssetId: id.nullable(),
  targetPcAssetId: id.nullable(),
  targetProductId: id.nullable(),
  targetServerRoomId: id.nullable(),
  previousAmount: money,
  replacementAmount: money,
  differenceAmount: money,
  additionalPaymentAmount: count,
  pointCreditAmount: count,
  paymentId: id.nullable(),
  changeNo: z.string(),
  changeType: z.string(),
  status: z.string(),
  reason: z.string().nullable(),
  sourceProductNo: productNoResponseSchema.nullable(),
  targetProductNo: productNoResponseSchema.nullable(),
  targetProductTitle: z.string().nullable(),
  targetServerRoomName: z.string().nullable(),
  serviceEndsAtSnapshot: optionalTime,
  createdAt: optionalTime,
  completedAt: optionalTime,
  paidAt: optionalTime,
  refundRecoveryAvailable: z.boolean().default(false),
})
const rentalChangeItemSchema = z.object({
  lineNo: z.number().int(),
  itemType: z.string(),
  previousValue: z.string().nullable(),
  replacementValue: z.string().nullable(),
  differenceAmount: money,
})
const rentalChangeEventSchema = z.object({
  id,
  eventType: z.string(),
  previousStatus: z.string().nullable(),
  newStatus: z.string().nullable(),
  reason: z.string().nullable(),
  createdAt: time,
})
const detail = z.object({
  change: rentalChangeCaseSchema,
  items: rentalChangeItemSchema.array(),
  events: rentalChangeEventSchema.array(),
})
const checkoutQuote = z.object({
  caseId: id,
  amount: count,
  quoteHash,
  benefits: benefit,
})
const checkout = z.object({
  selection,
  quoteHash,
  contact: z.object({
    name: z.string().trim().min(1).max(100),
    email: z.email().max(255),
    phone: z.string().trim().min(1).max(30),
    messengerType: z.string().max(50).nullable(),
    messengerId: z.string().max(100).nullable(),
  }),
})
export type RentalChangeCheckoutInput = z.infer<typeof checkout>
export type RentalChangeCase = z.infer<typeof rentalChangeCaseSchema>
export type RentalChangeDetail = z.infer<typeof detail>
export type RentalChangeCheckoutQuote = z.infer<typeof checkoutQuote>

export function createRentalChangeCheckoutApi(client: ApiClient, organizationId: string) {
  const scoped = { authenticated: true, customerOrganizationId: organizationId } as const
  return {
    list: (rentalId: number, signal?: AbortSignal) => client.request(`/api/v1/my/rentals/${id.parse(rentalId)}/changes`, rentalChangeCaseSchema.array(), { ...scoped, signal }),
    detail: (caseId: number, signal?: AbortSignal) => client.request(`/api/v1/my/rental-changes/${id.parse(caseId)}`, detail, { ...scoped, signal }),
    quote: (caseId: number, value: RentalChangeSelection) => client.request(`/api/v1/my/rental-changes/${id.parse(caseId)}/quote`, checkoutQuote, {
      ...scoped, method: 'POST', body: selection.parse(value),
    }),
    create: (caseId: number, body: RentalChangeCheckoutInput, key: string) => client.request(`/api/v1/my/rental-changes/${id.parse(caseId)}/checkout`,
      z.object({ orderId: id, orderNo: z.string(), finalAmount: count, paymentDueAt: time, replayed: z.boolean() }),
      { ...scoped, method: 'POST', body: checkout.parse(body), idempotencyKey: z.uuidv4().parse(key) }),
  }
}
