import type { UseQueryResult } from '@tanstack/react-query'
import type { AccountOrderDetail } from '@/api/myAccountOrders'
import { AccountQueryState } from '../AccountQueryState'
import { TranslatedText, useTranslation } from '@/i18n/translation'

export function OrderRefundSummary({ result, itemId, originalAmount }: { result: UseQueryResult<AccountOrderDetail, Error>; itemId: string; originalAmount: number }) {
  const { t } = useTranslation()
  const refund = result.data?.refunds.find(entry => entry.orderItemId === itemId)
    ?? result.data?.refunds.find(entry => entry.orderItemId === null)
  const pointRefund = refund?.method === 'point'
  const paidAmount = refund ? (pointRefund ? refund.paidPoints : refund.paidCash) : 0
  const approvedAmount = pointRefund ? refund?.approvedPointAmount : refund?.approvedAmount
  const requestedAmount = pointRefund ? refund?.requestedPointAmount : refund?.requestedAmount
  const finalAmount = approvedAmount ?? (paidAmount > 0 ? paidAmount : requestedAmount) ?? originalAmount
  return <section aria-label={t('refund.history')}><AccountQueryState pending={result.isPending} error={result.error} retry={result.refetch}/>
    {result.data ? <div className="order-catalog-item__refund-totals">
      <span><TranslatedText id={refund ? 'refund.originalPayment' : 'refund.orderAmount'} /> <strong>{t('money.krwAmount', { amount: originalAmount.toLocaleString('ko-KR') })}</strong></span>
      {refund?.usedDaysDeductionRateBasisPoints !== null && refund?.usedDaysDeductionRateBasisPoints !== undefined ? <span><TranslatedText id="refund.deductionRate" /> <strong>{refund.usedDaysDeductionRateBasisPoints / 100}%</strong></span> : null}
      {refund ? <span><TranslatedText id="refund.finalAmount" /> <strong>{pointRefund ? t('money.pointAmount', { points: finalAmount.toLocaleString('ko-KR') }) : t('money.krwAmount', { amount: finalAmount.toLocaleString('ko-KR') })}</strong></span> : <TranslatedText id="refund.noHistory" />}
    </div> : null}
  </section>
}
