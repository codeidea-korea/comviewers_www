import type { UseQueryResult } from '@tanstack/react-query'
import type { AccountOrderDetail } from '@/api/myAccountOrders'
import { AccountQueryState } from '../AccountQueryState'
import { accountMoney } from '../shared/AccountReadCommon'

export function OrderRefundSummary({ result, itemId, originalAmount }: { result: UseQueryResult<AccountOrderDetail, Error>; itemId: string; originalAmount: number }) {
  const refund = result.data?.refunds.find(entry => entry.orderItemId === itemId)
    ?? result.data?.refunds.find(entry => entry.orderItemId === null)
  const pointRefund = refund?.method === 'point'
  const paidAmount = refund ? (pointRefund ? refund.paidPoints : refund.paidCash) : 0
  const approvedAmount = pointRefund ? refund?.approvedPointAmount : refund?.approvedAmount
  const requestedAmount = pointRefund ? refund?.requestedPointAmount : refund?.requestedAmount
  const finalAmount = approvedAmount ?? (paidAmount > 0 ? paidAmount : requestedAmount) ?? originalAmount
  return <section aria-label="환불 내역"><AccountQueryState pending={result.isPending} error={result.error} retry={result.refetch}/>
    {result.data ? <div className="order-item__totals order-item__refund-totals">
      <span>{refund ? '원결제금액' : '주문금액'} <strong>{accountMoney(originalAmount)}</strong></span>
      {refund?.usedDaysDeductionRateBasisPoints !== null && refund?.usedDaysDeductionRateBasisPoints !== undefined ? <span>공제율 <strong>{refund.usedDaysDeductionRateBasisPoints / 100}%</strong></span> : null}
      {refund ? <span>최종 환불금액 <strong>{pointRefund ? `${finalAmount.toLocaleString('ko-KR')}점` : accountMoney(finalAmount)}</strong></span> : <span>환불 내역 없음</span>}
    </div> : null}
  </section>
}
