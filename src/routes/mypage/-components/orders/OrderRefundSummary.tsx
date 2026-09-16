import type { UseQueryResult } from '@tanstack/react-query'
import type { AccountOrderDetail } from '@/api/myAccountOrders'
import { AccountQueryState } from '../AccountQueryState'
import { accountMoney } from '../shared/AccountReadCommon'

export function OrderRefundSummary({ result, itemId, originalAmount }: { result: UseQueryResult<AccountOrderDetail, Error>; itemId: string; originalAmount: number }) {
  const refund = result.data?.refunds.find(entry => entry.orderItemId === itemId)
    ?? result.data?.refunds.find(entry => entry.orderItemId === null)
  const paidAmount = refund ? refund.paidCash + refund.paidPoints : 0
  const finalAmount = refund?.approvedAmount ?? (paidAmount > 0 ? paidAmount : refund?.requestedAmount) ?? originalAmount
  return <section aria-label="환불 내역"><AccountQueryState pending={result.isPending} error={result.error} retry={result.refetch}/>
    {result.data ? <div className="order-item__totals order-item__refund-totals">
      <span>원결제금액 <strong>{accountMoney(originalAmount)}</strong></span>
      {refund?.usedDaysDeductionRateBasisPoints !== null && refund?.usedDaysDeductionRateBasisPoints !== undefined ? <span>공제율 <strong>{refund.usedDaysDeductionRateBasisPoints / 100}%</strong></span> : null}
      <span>최종 환불금액 <strong>{accountMoney(finalAmount)}</strong></span>
    </div> : null}
  </section>
}
