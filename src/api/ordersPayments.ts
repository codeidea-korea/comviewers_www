import { z } from 'zod'
import type { ApiClient } from './httpClient'

const id = z.number().int().positive().safe()
const count = z.number().int().nonnegative().safe()
const time = z.iso.datetime({ local: true }).nullable()
const term = z.object({ termsPolicyVersionId: id, policyKey: z.string(), agreementType: z.string(), title: z.string(), content: z.string(), contentHash: z.string(), effectiveFrom: z.iso.datetime({ local: true }) })
const order = z.object({ orderId: id, orderNo: z.string(), orderStatus: z.string(), paymentStatus: z.string(), currency: z.string(),
  subtotalAmount: count, setupFeeAmount: count, finalAmount: count, reservationExpiresAt: time,
  items: z.array(z.object({ orderItemId: id, productNo: z.string(), title: z.string(), quantity: z.number().int().positive(), billingUnit: z.string(), durationUnits: z.number().int().positive().nullable(), unitPrice: count, setupFee: count, amount: count })) })
const checkoutAction = z.object({ type: z.string(), sdkUrl: z.string().nullable(), operation: z.string().nullable(), clientPayload: z.string().nullable() })
const prepared = z.object({ paymentId: id, orderNo: z.string(), paymentMethod: z.string(), amount: count, currency: z.string(), paymentStatus: z.string(),
  provider: z.string(), providerPreparationStatus: z.string(), providerOrderId: z.string().nullable(), redirectUrl: z.string().nullable(), checkoutAction,
  reservationExpiresAt: time, replayed: z.boolean() })
const detail = z.object({ paymentId: id, orderNo: z.string(), paymentMethod: z.string(), provider: z.string(), amount: count, currency: z.string(),
  status: z.string(), approvedAt: time, createdAt: time, transactions: z.array(z.unknown()) })
export type PaymentDetail = z.infer<typeof detail>
export type OrderTerm = z.infer<typeof term>
export type PreparedPayment = z.infer<typeof prepared>
const benefitQuote = z.object({ subtotalAmount: count, setupFeeAmount: count, couponDiscountAmount: count, pointUsedAmount: count,
  finalAmount: count, availablePoints: count, userCouponId: id.nullable(),
  coupons: z.array(z.object({ userCouponId: id, name: z.string(), serverRoomId: id.nullable(), expiresAt: time, discountAmount: count })) })
export type OrderBenefitQuote = z.infer<typeof benefitQuote>
const confirmationRequest = z.object({ paymentKey: z.string().min(1).max(200), orderId: z.string().regex(/^[A-Za-z0-9_-]{6,64}$/), amount: z.number().int().positive().safe() })
const confirmation = z.object({ paymentId: id, orderId: z.string(), providerPaymentId: z.string(), status: z.string(), approved: z.boolean(), replayed: z.boolean(), virtualAccount: z.object({ bankCode: z.string(), accountNumber: z.string(), customerName: z.string().nullable(), dueDate: z.string() }).nullable() })
export type PaymentConfirmation = z.infer<typeof confirmation>
export type PaymentConfirmationRequest = z.infer<typeof confirmationRequest>

export function createOrdersPaymentsApi(client: ApiClient, organizationId: string) {
  const scoped = { authenticated: true, customerOrganizationId: organizationId } as const
  return {
    terms: () => client.request('/api/v1/orders/terms', term.array(), { authenticated: true }),
    resume: (orderNo: string, key: string) => client.request('/api/v1/payments/resume', prepared, { ...scoped, method: 'POST', body: { orderNo, paymentMethod: 'card', cashReceiptType: 'not_requested', cashReceiptIdentifier: null }, idempotencyKey: z.uuidv4().parse(key) }),
    benefitQuote: (body: { cartItemIds: number[]; userCouponId: number | null; pointAmount: number }, signal?: AbortSignal) => client.request('/api/v1/orders/quote', benefitQuote, { ...scoped, method: 'POST', body, signal }),
    order: (body: unknown, key: string) => client.request('/api/v1/orders', order, { ...scoped, method: 'POST', body, idempotencyKey: `order:${z.uuid().parse(key)}` }),
    prepare: (body: unknown, key: string) => client.request('/api/v1/payments/prepare', prepared, { ...scoped, method: 'POST', body, idempotencyKey: `payment:${z.uuid().parse(key)}` }),
    settleInternal: (orderNo: string, key: string) => client.request('/api/v1/payments/internal/settle', prepared, { ...scoped, method: 'POST', body: { orderNo }, idempotencyKey: z.uuidv4().parse(key) }),
    confirm: (body: PaymentConfirmationRequest, key: string) => client.request('/api/v1/payments/toss/confirm', confirmation, { ...scoped, method: 'POST', body: confirmationRequest.parse(body), idempotencyKey: z.uuidv4().parse(key) }),
    refresh: (providerOrderId: string, key: string) => client.request('/api/v1/payments/toss/refresh', confirmation, { ...scoped, method: 'POST', body: { orderId: providerOrderId }, idempotencyKey: z.uuidv4().parse(key) }),
    payment: (paymentId: number, signal?: AbortSignal) => client.request(`/api/v1/payments/${id.parse(paymentId)}`, detail, { ...scoped, signal }),
  }
}
