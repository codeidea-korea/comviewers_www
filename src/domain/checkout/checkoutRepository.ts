import { z } from 'zod'
import { cartSchema, type CartItem } from '@/domain/cart/schemas'

const amount = z.number().int().nonnegative().safe()
export const checkoutSelectionSchema = z.array(z.string().min(1)).min(1).max(100).refine(
  (ids) => new Set(ids).size === ids.length, '주문 상품이 중복되었습니다.',
)
export const checkoutQuoteSchema = z.object({
  source: z.enum(['mock', 'api']),
  checkoutEligible: z.boolean(),
  issues: z.array(z.string()),
  items: cartSchema.refine((items) => items.length > 0, '주문 상품을 선택해 주세요.'),
  estimate: z.object({
    rentalSetupTotal: amount.nullable(), rentalMonthlyTotal: amount.nullable(), rentalTotal: amount.nullable(),
    partTotal: amount.nullable(), expectedTotal: amount, pointTotal: amount.nullable(),
    subtotalAmount: amount.optional(), setupFeeAmount: amount.optional(),
  }),
  benefits: z.enum(['unconnected', 'available']),
})
export type CheckoutQuote = z.infer<typeof checkoutQuoteSchema>
export interface CheckoutSubmission { cartItemIds: readonly string[]; contact: { name: string; email: string; phone: string; messengerType: string; messengerId: string }; payment: 'virtual_account' | 'card' | 'payco'; cashReceiptType: 'not_requested' | 'income_deduction' | 'business_expense'; cashReceiptIdentifier: string; idempotencyKey: string; userCouponId: number | null; pointAmount: number; expectedFinalAmount: number }
export type CheckoutStartResult = import('@/api/ordersPayments').PreparedPayment
export interface CheckoutRepository {
  quote(cartItemIds: readonly string[], signal?: AbortSignal, knownCartItems?: readonly CartItem[]): Promise<CheckoutQuote>
  start?(input: CheckoutSubmission): Promise<CheckoutStartResult>
  payment?(paymentId: number, signal?: AbortSignal): Promise<import('@/api/ordersPayments').PaymentDetail>
  abandon?(providerOrderId: string): Promise<import('@/api/ordersPayments').PaymentAbandonment>
  resume?(orderNo: string, key: string): Promise<CheckoutStartResult>
  refresh?(providerOrderId: string, key: string): Promise<import('@/api/ordersPayments').PaymentConfirmation>
  benefitQuote?(cartItemIds: readonly string[], userCouponId: number | null, pointAmount: number, signal?: AbortSignal): Promise<import('@/api/ordersPayments').OrderBenefitQuote>
  confirm?(body: import('@/api/ordersPayments').PaymentConfirmationRequest, key: string): Promise<import('@/api/ordersPayments').PaymentConfirmation>
}
export const checkoutQueryKeys = {
  all: ['checkout'] as const,
  quote: (ids: readonly string[]) => ['checkout', 'quote', ids] as const,
}

export function checkoutUrl(ids: readonly string[]): string {
  const params = new URLSearchParams()
  checkoutSelectionSchema.parse(ids).forEach((id) => params.append('cartItemId', id))
  return `/checkout?${params.toString()}`
}
