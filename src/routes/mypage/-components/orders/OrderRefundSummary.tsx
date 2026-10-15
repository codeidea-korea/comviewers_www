import { translateUiText as uiText, useUiTranslation } from '@/i18n/uiTranslation'
import type { UseQueryResult } from '@tanstack/react-query'
import type { AccountOrderDetail } from '@/api/myAccountOrders'
import { AccountQueryState } from '../AccountQueryState'
import { TranslatedText, useTranslation } from '@/i18n/translation'
import { orderRefundAmounts } from './orderRefundDisplay'

export function OrderRefundSummary({ result, itemId, originalAmount }: { result: UseQueryResult<AccountOrderDetail, Error>; itemId: string; originalAmount: number }) {
  useUiTranslation()
  const { t } = useTranslation()
  const refunds = result.data?.refunds.filter(entry => entry.orderItemId === itemId || entry.orderItemId === null) ?? []
  const completed = refunds.filter(entry => entry.status === 'paid')
  const refund = completed[0] ?? refunds.find(entry => !['cancelled', 'rejected'].includes(entry.status))
  const totals = (completed.length ? completed : refund ? [refund] : []).reduce((sum, entry) => {
    const amount = orderRefundAmounts(entry)
    return { cash: sum.cash + amount.cash, points: sum.points + amount.points }
  }, { cash: 0, points: 0 })
  const amountLabel = [
    totals.cash > 0 || totals.points === 0 ? t('money.krwAmount', { amount: totals.cash.toLocaleString('ko-KR') }) : null,
    totals.points > 0 ? t('money.pointAmount', { points: totals.points.toLocaleString('ko-KR') }) : null,
  ].filter(Boolean).join(' + ')
  return <section aria-label={t('refund.history')}><AccountQueryState pending={result.isPending} error={result.error} retry={result.refetch}/>
    {result.data ? <div className="order-catalog-item__refund-totals">
      {refund ? <span>{completed.length ? uiText('최종 환불금액') : t('refund.expectedAmount')}{(completed.length ? completed : [refund]).some(entry => entry.orderItemId === null) ? uiText(' (주문 전체 포함)') : ''} <strong>{amountLabel}</strong></span> : <TranslatedText id="refund.noHistory" />}
      <span><TranslatedText id="refund.orderAmount" /> <strong>{t('money.krwAmount', { amount: originalAmount.toLocaleString('ko-KR') })}</strong></span>
      {refund?.usedDaysDeductionRateBasisPoints !== null && refund?.usedDaysDeductionRateBasisPoints !== undefined ? <span><TranslatedText id="refund.deductionRate" /> <strong>{refund.usedDaysDeductionRateBasisPoints / 100}%</strong></span> : null}
    </div> : null}
  </section>
}
