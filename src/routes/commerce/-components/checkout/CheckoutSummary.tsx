import { cartIssueMessage } from '@/domain/cart/cartIssues'
import { Radio } from '@/components/ui/RadioControl'
import { Checkbox } from '@/components/ui/CheckboxControl'
import { Button } from '@/components/ui/ButtonControl'
import { RelativeLink } from '@/components/navigation/RelativeLinkView'
import type { CheckoutQuote } from '@/domain/checkout/checkoutRepository'
import type { OrderBenefitQuote } from '@/api/ordersPayments'
import radioOffIcon from '@/assets/figma/select-radio-off.svg'
import radioOnIcon from '@/assets/figma/select-radio-on.svg'
import mastercardIcon from '@/assets/figma/payment-mastercard.svg'
import visaIcon from '@/assets/figma/payment-visa.svg'
import wechatIcon from '@/assets/figma/payment-wechat.svg'
import jcbIcon from '@/assets/figma/payment-jcb.svg'
import type { CheckoutFormModel, PaymentMethod } from './hooks/useCheckoutForm'
import { formatCheckoutMoney as money } from './CheckoutFields'

const paymentOptions: readonly { value: PaymentMethod; label: string; cardLogos?: boolean }[] = [
  { value: 'virtual-account', label: '가상계좌' }, { value: 'card', label: '카드결제' },
  { value: 'payco', label: '페이코' }, { value: 'global-card', label: '', cardLogos: true },
]
export function CheckoutSummary({ quote, benefits, form, refreshing, locked, submitting, submitError, onSubmit }: { quote: CheckoutQuote; benefits?: OrderBenefitQuote; form: CheckoutFormModel; refreshing: boolean; locked: boolean; submitting: boolean; submitError?: string; onSubmit: () => void }) {
  const amount = quote.estimate
  return <aside className="order-summary">
    <div className="order-summary__box">
      <h2>결제 금액</h2>
      <dl className="order-summary__amounts">
        <div><dt>렌탈상품</dt><dd>{money(refreshing ? null : amount.rentalTotal)}</dd></div>
        <div className="sub"><dt>ㄴ 세팅비</dt><dd>{money(refreshing ? null : amount.rentalSetupTotal)}</dd></div>
        <div className="sub"><dt>ㄴ 렌탈금액</dt><dd>{money(refreshing ? null : amount.rentalMonthlyTotal)}</dd></div>
        <div><dt>파트상품</dt><dd>{money(refreshing ? null : amount.partTotal)}</dd></div>
        <div><dt>주문 합계</dt><dd>{money(refreshing ? null : amount.expectedTotal)}</dd></div>
      </dl>
      <div aria-hidden="true" className="order-summary__rule" />
      <section className="order-summary__benefits"><h3>혜택 금액</h3><dl><div><dt>쿠폰 할인</dt><dd>{money(refreshing ? null : benefits?.couponDiscountAmount ?? 0)}</dd></div><div><dt>포인트 사용</dt><dd>{money(refreshing ? null : benefits?.pointUsedAmount ?? 0)}</dd></div></dl></section>
      <div aria-hidden="true" className="order-summary__rule" />
      <section className="order-summary__final"><dl><div className="order-summary__total"><dt>총 합계 금액</dt><dd><strong>{refreshing ? '-' : (benefits?.finalAmount ?? amount.expectedTotal).toLocaleString('ko-KR')}</strong><span>원</span></dd></div></dl><div className="order-summary__coupon"><span>적립 예정 포인트</span><strong>{refreshing || amount.pointTotal === null ? '-' : `${amount.pointTotal.toLocaleString('ko-KR')}점`}</strong></div></section>
      <div aria-hidden="true" className="order-summary__rule" />
      <fieldset className="payment-methods" disabled={locked}><legend>결제수단</legend><div className="payment-methods__options">{paymentOptions.map(({ value, label, cardLogos }) => <Radio checked={form.payment === value} iconClassName="payment-radio-icon" key={value} name="payment" offIcon={radioOffIcon} onChange={() => form.setPayment(value)} onIcon={radioOnIcon} value={value}><span>{label}</span>{cardLogos ? <span className="payment-card-logos"><img alt="Mastercard" src={mastercardIcon} /><img alt="Visa" src={visaIcon} /><img alt="WeChat Pay" src={wechatIcon} /><img alt="JCB" src={jcbIcon} /></span> : null}</Radio>)}</div>{form.fieldError('payment') && <small className="checkout-validation-error" role="alert">{form.fieldError('payment')}</small>}</fieldset>
      
      <div aria-hidden="true" className="order-summary__rule" />
      <div className="order-summary__agreements">
        <div className="order-summary__agreement"><label><Checkbox checked={form.orderAgreed} disabled={locked} onChange={(event) => form.setOrderAgreed(event.target.checked)} /> <span>[필수] 주문 상품, 결제 금액 및 주문 내용을 모두 확인했습니다.</span></label></div>
      </div>
      
    </div>
    {!quote.checkoutEligible && <div role="alert"><p>현재 주문할 수 없습니다.</p>{quote.issues.map((issue) => <p key={issue}>{cartIssueMessage(issue)}</p>)}</div>}
    {form.fieldError('orderAgreed') && <div className="checkout-agreement-errors" role="alert"><p>{form.fieldError('orderAgreed')}</p></div>}
    {submitError ? <p className="checkout-submit-error" role="alert">{submitError} <RelativeLink to="/mypage/orders">주문내역 확인</RelativeLink></p> : null}
    <Button className="commerce-primary-button" disabled={refreshing || submitting || !quote.checkoutEligible} fullWidth onClick={onSubmit} size="large">{submitting ? '결제 진행 중…' : locked ? '결제 다시 시도' : '주문하기'}</Button>
  </aside>
}
