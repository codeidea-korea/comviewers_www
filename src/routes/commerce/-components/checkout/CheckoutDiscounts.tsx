import type { OrderBenefitQuote } from '@/api/ordersPayments'
import { NativeSelect } from '@/components/ui/SelectControl'
import { CheckoutField, CheckoutSectionTitle } from './CheckoutFields'

interface Props {
  quote?: OrderBenefitQuote; couponId: number | null; points: string; disabled: boolean; pending: boolean; error: boolean
  onCoupon: (id: number | null) => void; onPoints: (value: string) => void; onRetry: () => void
}
export function CheckoutDiscounts({ quote, couponId, points, disabled, pending, error, onCoupon, onPoints, onRetry }: Props) {
  const maxPoints = quote ? Math.min(quote.availablePoints, quote.subtotalAmount + quote.setupFeeAmount - quote.couponDiscountAmount) : 0
  return <section className="checkout-discounts" aria-busy={pending}>
    <CheckoutSectionTitle>할인혜택</CheckoutSectionTitle>
    <CheckoutField label="쿠폰 할인"><div className="coupon-select-field"><NativeSelect aria-label="쿠폰 할인" disabled={disabled || pending || !quote?.coupons.length} value={couponId ?? ''} onChange={event => onCoupon(event.target.value ? Number(event.target.value) : null)}>
      <option value="">{quote && quote.coupons.length === 0 ? '사용 가능한 보유 쿠폰이 없습니다.' : '쿠폰 사용 안 함'}</option>{quote?.coupons.map(coupon => <option key={coupon.userCouponId} value={coupon.userCouponId}>{coupon.name} ({coupon.discountAmount.toLocaleString('ko-KR')}원 할인)</option>)}
    </NativeSelect></div></CheckoutField>
    <p className="commerce-help">*사용 조건에 맞는 쿠폰만 선택할 수 있습니다.</p>
    <CheckoutField label="포인트 사용"><div className="field-with-button"><input aria-label="사용할 포인트" inputMode="numeric" disabled={disabled || !quote || quote.availablePoints === 0} value={quote?.availablePoints === 0 ? '' : points} onChange={event => { if (/^\d{0,10}$/.test(event.target.value)) onPoints(event.target.value) }} placeholder={quote?.availablePoints === 0 ? '보유 포인트가 없습니다.' : '0'} /><button disabled={disabled || pending || !quote || maxPoints === 0} type="button" onClick={() => onPoints(String(maxPoints))}>전액사용</button></div><small className="commerce-points-owned"><span>보유</span><b>{quote ? quote.availablePoints.toLocaleString('ko-KR') : '-'} P</b></small></CheckoutField>
    {error && <p role="alert">쿠폰 또는 포인트 사용 조건을 확인해 주세요. <button type="button" onClick={onRetry}>다시 계산</button></p>}
    <p className="discount-total"><span>총 할인 금액</span><strong><b>{pending || !quote ? '-' : (quote.couponDiscountAmount + quote.pointUsedAmount).toLocaleString('ko-KR')}</b><i>원</i></strong></p>
  </section>
}
