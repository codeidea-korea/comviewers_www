import type { AccountOrderDetail } from '@/api/myAccountOrders'

type Refund = AccountOrderDetail['refunds'][number]

// Completed refunds use paid-out amounts, including zero and mixed cash/point payments.
export function orderRefundAmounts(refund: Refund) {
  if (refund.status === 'paid') return { cash: refund.paidCash, points: refund.paidPoints }
  return {
    cash: refund.approvedAmount ?? refund.requestedAmount,
    points: refund.approvedPointAmount ?? refund.requestedPointAmount,
  }
}
