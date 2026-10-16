import closeIcon from '@/assets/figma/inquiry-modal-close.svg'
import { useUiTranslation } from '@/i18n/uiTranslation'
import type { OrderBenefitQuote } from '@/api/ordersPayments'
import { ApiClientError } from '@/api/httpClient'
import { Button } from '@/components/ui/ButtonControl'
import { NativeSelect } from '@/components/ui/SelectControl'
import { useLocalizedServiceName } from '@/components/common/LocalizedServiceName'
import { CheckoutField, CheckoutSectionTitle } from './CheckoutFields'

interface Props {
  quote?: OrderBenefitQuote; couponId: number | null; points: string; disabled: boolean; pending: boolean; error: Error | null
  onCoupon: (id: number | null) => void; onPoints: (value: string) => void; onRetry: () => void; onReset: () => void
}
function benefitErrorMessage(error: Error) {
  if (error instanceof ApiClientError) {
    if (error.code === 'C001') return '쿠폰 또는 포인트 사용 조건이 변경되었습니다. 다시 조회해 주세요.'
    if (error.kind === 'authentication' || error.status === 401) return '로그인 상태를 확인한 후 다시 시도해 주세요.'
    if (error.kind === 'network') return '할인혜택 정보를 불러오지 못했습니다. 네트워크 연결을 확인한 후 다시 시도해 주세요.'
  }
  return '할인혜택 정보를 불러오지 못했습니다. 다시 시도해 주세요.'
}

function CheckoutCouponOption({ coupon }: { coupon: OrderBenefitQuote['coupons'][number] }) {
  const { uiText } = useUiTranslation()
  const name = useLocalizedServiceName('coupon', coupon.name)
  return <option value={coupon.userCouponId}>{name} ({uiText('{amount}원 할인', { amount: coupon.discountAmount.toLocaleString('ko-KR') })})</option>
}

export function CheckoutDiscounts({ quote, couponId, points, disabled, pending, error, onCoupon, onPoints, onRetry, onReset }: Props) {
  const { uiText } = useUiTranslation()
  const invalidSelection = error instanceof ApiClientError && error.code === 'C001' && (couponId !== null || Number(points) > 0)
  const currentQuote = error ? undefined : quote
  const maxPoints = currentQuote ? Math.max(0, Math.min(currentQuote.availablePoints, currentQuote.subtotalAmount + currentQuote.setupFeeAmount - currentQuote.couponDiscountAmount)) : 0
  const unavailableLabel = pending ? '조회 중…' : error ? '조회 실패' : '조회 대기'
  const couponLabel = !currentQuote ? unavailableLabel : currentQuote.coupons.length === 0 ? '사용 가능한 보유 쿠폰이 없습니다.' : '쿠폰 사용 안 함'
  const pointsPlaceholder = !currentQuote ? unavailableLabel : currentQuote.availablePoints === 0 ? '보유 포인트가 없습니다.' : '0'
  function changePoints(value: string) {
    if (!currentQuote || !/^\d{0,10}$/.test(value)) return
    onPoints(value === '' ? '' : String(Math.min(Number(value), maxPoints)))
  }
  return <section className="checkout-discounts" aria-busy={pending}>
    <CheckoutSectionTitle>{uiText("할인혜택")}</CheckoutSectionTitle>
    <CheckoutField label={uiText("쿠폰 할인")}><div className="coupon-select-field"><NativeSelect aria-label={uiText("쿠폰 할인")} disabled={disabled || pending || !currentQuote?.coupons.length} value={currentQuote ? couponId ?? '' : ''} onChange={event => onCoupon(event.target.value ? Number(event.target.value) : null)}>
      <option value="">{uiText(couponLabel)}</option>{currentQuote?.coupons.map(coupon => <CheckoutCouponOption key={coupon.userCouponId} coupon={coupon} />)}
    </NativeSelect></div></CheckoutField>
    <p className="commerce-help">{uiText("*사용 조건에 맞는 쿠폰만 선택할 수 있습니다.")}</p>
    <CheckoutField label={uiText("포인트 사용")}><div className="field-with-button"><input aria-label={uiText("사용할 포인트")} inputMode="numeric" disabled={disabled || !currentQuote || currentQuote.availablePoints === 0} value={pending ? points : !currentQuote || currentQuote.availablePoints === 0 ? '' : points} onChange={event => changePoints(event.target.value)} placeholder={uiText(pointsPlaceholder)} /><button aria-label={uiText("포인트 입력 초기화")} className="checkout-points-clear" disabled={disabled || pending || !currentQuote || !points} hidden={!points || !currentQuote || currentQuote.availablePoints === 0} onClick={() => onPoints('')} type="button"><img alt="" src={closeIcon}/></button><button disabled={disabled || pending || !currentQuote || maxPoints === 0} type="button" onClick={() => changePoints(String(maxPoints))}>{uiText("전액사용")}</button></div><small className="commerce-points-owned"><span>{uiText("보유 포인트")}</span><b>{currentQuote ? `${currentQuote.availablePoints.toLocaleString('ko-KR')} P` : uiText(unavailableLabel)}</b></small></CheckoutField>
    {error && <div className="checkout-discounts__error"><p role="alert">{uiText(benefitErrorMessage(error))}</p><div className="checkout-discounts__error-actions"><Button size="small" variant="secondary" disabled={disabled || pending} onClick={onRetry}>{uiText(pending ? '조회 중…' : invalidSelection ? '할인 초기화 후 다시 조회' : '다시 조회')}</Button>{!invalidSelection && (couponId !== null || Number(points) > 0) && <Button size="small" variant="secondary" disabled={disabled || pending} onClick={onReset}>{uiText("할인 선택 초기화")}</Button>}</div></div>}
    <p className="discount-total"><span>{uiText("총 할인 금액")}</span>{pending || !currentQuote ? <span className="checkout-discounts__unavailable">{uiText(unavailableLabel)}</span> : <strong><b>{(currentQuote.couponDiscountAmount + currentQuote.pointUsedAmount).toLocaleString('ko-KR')}</b><i>{uiText("원")}</i></strong>}</p>
  </section>
}
