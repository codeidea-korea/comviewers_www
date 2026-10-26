import type { AccountOrderItem } from '@/api/myAccountOrders'
import { useUiTranslation } from '@/i18n/uiTranslation'
import { accountKstDate } from '@/lib/accountFormat'
import { isReplacementOriginal } from './orderRentalPresentation'
import './order-item-period.css'

export function OrderItemPeriod({ item }: { item: AccountOrderItem }) {
  const { uiText } = useUiTranslation()
  const start = accountKstDate(item.serviceStartedAt)
  const end = accountKstDate(item.serviceEndsAt)
  const adjustedEnd = accountKstDate(item.adminAdjustedServiceEndsAt ?? null)
  const originalPeriod = `${start} ~ ${end}`
  if (item.billingUnit === 'unit' || isReplacementOriginal(item) || start === '-' || end === '-' || adjustedEnd === '-' || adjustedEnd === end) {
    return <>{originalPeriod}</>
  }
  // A removed future renewal segment has no valid start/end range to display.
  const adjustedPeriod = adjustedEnd < start ? `${uiText('이용 종료')} ${adjustedEnd}` : `${start} ~ ${adjustedEnd}`
  return <div className="order-item-period">
    <del className="order-item-period__original">{originalPeriod}</del>
    <div className="order-item-period__current">
      <strong>{adjustedPeriod}</strong>
      <span className="order-item-period__badge">{uiText('관리자 변경')}</span>
    </div>
    <span className="order-item-period__notice">{uiText('관리자에 의해 렌탈 종료일이 변경되었습니다.')}</span>
  </div>
}
