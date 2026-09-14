import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'
import { AccountQueryState } from '../AccountQueryState'
import { accountMoney, useAccountRead } from './AccountReadCommon'
import { WithdrawRefund } from './HttpOrderFinance'

export function HttpOrderRefundSummary({ api, itemId, orderNo, originalAmount, terminal }: { api: MyAccountReadServices; itemId: string; orderNo: string; originalAmount: number; terminal: boolean }) {
  const result = useAccountRead(['order', orderNo], signal => api.order(orderNo, signal))
  const refund = result.data?.refunds.find(entry => entry.orderItemId === itemId)
    ?? result.data?.refunds.find(entry => entry.orderItemId === null)
  const paidAmount = refund ? refund.paidCash + refund.paidPoints : 0
  const finalAmount = refund?.approvedAmount ?? (paidAmount > 0 ? paidAmount : refund?.requestedAmount) ?? originalAmount
  return <section aria-label="환불 내역"><AccountQueryState pending={result.isPending} error={result.error} retry={result.refetch}/>
    {terminal && result.data ? <div className="order-item__totals order-item__refund-totals">
      <span>원결제금액 <strong>{accountMoney(originalAmount)}</strong></span>
      {refund?.usedDaysDeductionRateBasisPoints !== null && refund?.usedDaysDeductionRateBasisPoints !== undefined ? <span>공제율 <strong>{refund.usedDaysDeductionRateBasisPoints / 100}%</strong></span> : null}
      <span>최종 환불금액 <strong>{accountMoney(finalAmount)}</strong></span>
    </div> : null}
    {!terminal && refund ? <p>{({ requested: '환불 접수', approved: '환불 승인', paid: '환불 완료', rejected: '환불 반려', cancelled: '환불 철회' } as Record<string, string>)[refund.status] ?? refund.status} · 예상 환불 {accountMoney(refund.requestedAmount)}</p> : null}
    {!terminal && refund?.status === 'requested' ? <WithdrawRefund requestId={Number(refund.requestId)}/> : null}
  </section>
}
