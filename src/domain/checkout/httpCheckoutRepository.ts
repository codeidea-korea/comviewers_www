import type { createCartApi } from '@/api/cart'
import type { CartRepository } from '@/domain/cart/cartRepository'
import { apiCartItemIdSchema } from '@/domain/cart/httpCartRepository'
import { cartSchema } from '@/domain/cart/schemas'
import { checkoutQuoteSchema, checkoutSelectionSchema, type CheckoutRepository } from './checkoutRepository'
import type { ApiClient } from '@/api/httpClient'
import { createOrdersPaymentsApi } from '@/api/ordersPayments'

export function createHttpCheckoutRepository(api: ReturnType<typeof createCartApi>, cart: CartRepository, client: ApiClient, organizationId: string): CheckoutRepository {
  const orders = createOrdersPaymentsApi(client, organizationId)
  return {
    async quote(input, signal) {
      const ids = checkoutSelectionSchema.parse(input)
      const numericIds = ids.map((id) => apiCartItemIdSchema.parse(id))
      const [response, cartItems] = await Promise.all([api.quote(numericIds, signal), cart.list(signal)])
      if (response.items.length !== ids.length || new Set(response.items.map((row) => row.cartItemId)).size !== ids.length) {
        throw new Error('선택한 상품과 견적 응답이 일치하지 않습니다.')
      }
      if (BigInt(response.subtotalAmount) + BigInt(response.setupFeeAmount) !== BigInt(response.totalAmount)
        || response.items.reduce((sum, row) => sum + BigInt(row.amount), 0n) !== BigInt(response.totalAmount)) {
        throw new Error('견적 금액을 확인할 수 없습니다.')
      }
      const items = cartSchema.parse(response.items.map((row) => {
        const item = cartItems.find((candidate) => candidate.id === String(row.cartItemId))
        if (!item || !ids.includes(item.id) || item.productId !== row.productNo || item.source !== 'api'
          || item.billingUnit !== row.billingUnit || item.durationUnits !== row.durationUnits || item.quantity !== row.quantity
          || item.rentalFee !== row.currentUnitPrice) {
          throw new Error('장바구니가 변경되었습니다. 금액을 다시 확인해 주세요.')
        }
        if (row.issues.length === 0) {
          if (row.currentUnitPrice === null || item.setupFee === null || (row.billingUnit !== 'unit' && row.durationUnits === null)) {
            throw new Error('상품 가격을 확인할 수 없습니다.')
          }
          const duration = row.billingUnit === 'unit' ? 1 : row.durationUnits
          if (duration === null || (BigInt(row.currentUnitPrice) * BigInt(duration) + BigInt(item.setupFee)) * BigInt(row.quantity) !== BigInt(row.amount)) {
            throw new Error('장바구니가 변경되었습니다. 금액을 다시 확인해 주세요.')
          }
        }
        const issues = [...new Set([...item.issues, ...row.issues])]
        return { ...item, expectedPoints: row.expectedPoints, priceChanged: row.priceChanged, quotedAmount: row.currentUnitPrice === null || item.setupFee === null ? null : row.amount, issues, checkoutEligible: item.checkoutEligible && issues.length === 0 }
      }))
      return checkoutQuoteSchema.parse({
        source: 'api', items, benefits: 'available',
        checkoutEligible: response.checkoutEligible && items.every((item) => item.checkoutEligible),
        issues: [...new Set(items.flatMap((item) => item.issues))],
        estimate: {
          rentalSetupTotal: items.every(item => item.checkoutEligible) ? items.filter(item => item.type === 'rental').reduce((sum, item) => sum + (item.setupFee ?? 0) * item.quantity, 0) : null,
          rentalMonthlyTotal: items.every(item => item.checkoutEligible) ? items.filter(item => item.type === 'rental').reduce((sum, item) => sum + (item.rentalFee ?? 0) * item.quantity * (item.durationUnits ?? 1), 0) : null,
          rentalTotal: items.every(item => item.checkoutEligible) ? items.filter(item => item.type === 'rental').reduce((sum, item) => sum + (item.quotedAmount ?? 0), 0) : null,
          partTotal: items.every(item => item.checkoutEligible) ? items.filter(item => item.type === 'part').reduce((sum, item) => sum + (item.quotedAmount ?? 0), 0) : null,
          expectedTotal: response.totalAmount, pointTotal: response.expectedPoints,
          subtotalAmount: response.subtotalAmount, setupFeeAmount: response.setupFeeAmount,
        },
      })
    },
    async start(input) {
      const terms = input.terms
      if (!terms.length || terms.length > 2) throw new Error('현재 주문 약관을 확인할 수 없습니다.')
      const created = await orders.order({ cartItemIds: input.cartItemIds.map(value => Number(apiCartItemIdSchema.parse(value))), contact: input.contact,
        userCouponId: input.userCouponId, pointAmount: input.pointAmount, expectedFinalAmount: input.expectedFinalAmount,
        agreements: terms.map(item => ({ agreementType: item.agreementType, termsPolicyVersionId: item.termsPolicyVersionId })) }, input.idempotencyKey)
      if (created.finalAmount === 0) return orders.settleInternal(created.orderNo, input.idempotencyKey)
      const payment = await orders.prepare({ orderNo: created.orderNo, paymentMethod: input.payment,
        cashReceiptType: input.payment === 'virtual_account' ? input.cashReceiptType : 'not_requested',
        cashReceiptIdentifier: input.payment === 'virtual_account' && input.cashReceiptType !== 'not_requested' ? input.cashReceiptIdentifier : null }, input.idempotencyKey)
      return payment
    },
    payment: orders.payment,
    terms: orders.terms,
    resume: orders.resume,
    refresh: orders.refresh,
    benefitQuote: (ids, userCouponId, pointAmount, signal) => orders.benefitQuote({ cartItemIds: ids.map(value => Number(apiCartItemIdSchema.parse(value))), userCouponId, pointAmount }, signal),
    confirm: orders.confirm,
  }
}
