import type { OrderBenefitQuote } from '@/api/ordersPayments'
import { ApiClientError } from '@/api/httpClient'
import { Button } from '@/components/ui/ButtonControl'
import { NativeSelect } from '@/components/ui/SelectControl'
import { CheckoutField, CheckoutSectionTitle } from './CheckoutFields'

interface Props {
  quote?: OrderBenefitQuote; couponId: number | null; points: string; disabled: boolean; pending: boolean; error: Error | null
  onCoupon: (id: number | null) => void; onPoints: (value: string) => void; onRetry: () => void; onReset: () => void
}
function benefitErrorMessage(error: Error) {
  if (error instanceof ApiClientError) {
    if (error.kind === 'authentication' || error.status === 401) return '로그인 상태를 확인한 후 다시 시도해 주세요.'
    if (error.kind === 'network') return '할인혜택 정보를 불러오지 못했습니다. 네트워크 연결을 확인한 후 다시 시도해 주세요.'
  }
  return '할인혜택 정보를 불러오지 못했습니다. 다시 시도해 주세요.'
}

export function CheckoutDiscounts({ quote, couponId, points, disabled, pending, error, onCoupon, onPoints, onRetry, onReset }: Props) {
  const currentQuote = error ? undefined : quote
  const maxPoints = currentQuote ? Math.max(0, Math.min(currentQuote.availablePoints, currentQuote.subtotalAmount + currentQuote.setupFeeAmount - currentQuote.couponDiscountAmount)) : 0
  const unavailableLabel = pending ? '조회 중…' : error ? '조회 실패' : '조회 대기'
  const couponLabel = !currentQuote ? unavailableLabel : currentQuote.coupons.length === 0 ? '사용 가능한 보유 쿠폰이 없습니다.' : '쿠폰 사용 안 함'
  const pointsPlaceholder = !currentQuote ? unavailableLabel : currentQuote.availablePoints === 0 ? '보유 포인트가 없습니다.' : '0'
  return <section className="checkout-discounts" aria-busy={pending}>
    <CheckoutSectionTitle>할인혜택</CheckoutSectionTitle>
    <CheckoutField label="쿠폰 할인"><div className="coupon-select-field"><NativeSelect aria-label="쿠폰 할인" disabled={disabled || pending || !currentQuote?.coupons.length} value={currentQuote ? couponId ?? '' : ''} onChange={event => onCoupon(event.target.value ? Number(event.target.value) : null)}>
      <option value="">{couponLabel}</option>{currentQuote?.coupons.map(coupon => <option key={coupon.userCouponId} value={coupon.userCouponId}>{coupon.name} ({coupon.discountAmount.toLocaleString('ko-KR')}원 할인)</option>)}
    </NativeSelect></div></CheckoutField>
    <p className="commerce-help">*사용 조건에 맞는 쿠폰만 선택할 수 있습니다.</p>
    <CheckoutField label="포인트 사용"><div className="field-with-button"><input aria-label="사용할 포인트" inputMode="numeric" disabled={disabled || (!currentQuote && !pending) || currentQuote?.availablePoints === 0} value={pending ? points : !currentQuote || currentQuote.availablePoints === 0 ? '' : points} onChange={event => { if (/^\d{0,10}$/.test(event.target.value)) onPoints(event.target.value) }} placeholder={pointsPlaceholder} /><button disabled={disabled || pending || !currentQuote || maxPoints === 0} type="button" onClick={() => onPoints(String(maxPoints))}>전액사용</button></div><small className="commerce-points-owned"><span>보유 포인트</span><b>{currentQuote ? `${currentQuote.availablePoints.toLocaleString('ko-KR')} P` : unavailableLabel}</b></small></CheckoutField>
    {error && <div className="checkout-discounts__error"><p role="alert">{benefitErrorMessage(error)}</p><div className="checkout-discounts__error-actions"><Button size="small" variant="secondary" disabled={disabled || pending} onClick={onRetry}>{pending ? '조회 중…' : '다시 조회'}</Button>{(couponId !== null || Number(points) > 0) && <Button size="small" variant="secondary" disabled={disabled || pending} onClick={onReset}>할인 선택 초기화</Button>}</div></div>}
    <p className="discount-total"><span>총 할인 금액</span>{pending || !currentQuote ? <span className="checkout-discounts__unavailable">{unavailableLabel}</span> : <strong><b>{(currentQuote.couponDiscountAmount + currentQuote.pointUsedAmount).toLocaleString('ko-KR')}</b><i>원</i></strong>}</p>
  </section>
}
