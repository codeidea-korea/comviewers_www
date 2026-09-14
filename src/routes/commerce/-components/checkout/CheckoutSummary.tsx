import { useState } from 'react'
import { cartIssueMessage } from '@/domain/cart/cartIssues'
import { Radio } from '@/components/ui/RadioControl'
import { Checkbox } from '@/components/ui/CheckboxControl'
import { Button } from '@/components/ui/ButtonControl'
import { Modal } from '@/components/ui/ModalControl'
import type { CheckoutQuote } from '@/domain/checkout/checkoutRepository'
import type { OrderBenefitQuote, OrderTerm } from '@/api/ordersPayments'
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
export function CheckoutSummary({ quote, benefits, form, refreshing, submissionBlocked, submitting, submitError, terms, onSubmit }: { quote: CheckoutQuote; benefits?: OrderBenefitQuote; form: CheckoutFormModel; refreshing: boolean; submissionBlocked: boolean; submitting: boolean; submitError: boolean; terms: readonly OrderTerm[]; onSubmit: () => void }) {
  const amount = quote.estimate
  const [activeTerm, setActiveTerm] = useState<OrderTerm | null>(null)
  const orderTerm = terms.find(term => term.agreementType === 'order_content')
  const paymentTerm = terms.find(term => term.agreementType === 'payment_gateway_terms')
  return <><aside className="order-summary">
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
      <fieldset className="payment-methods"><legend>결제수단</legend><div className="payment-methods__options">{paymentOptions.map(({ value, label, cardLogos }) => <Radio checked={form.payment === value} iconClassName="payment-radio-icon" key={value} name="payment" offIcon={radioOffIcon} onChange={() => form.setPayment(value)} onIcon={radioOnIcon} value={value}><span>{label}</span>{cardLogos ? <span className="payment-card-logos"><img alt="Mastercard" src={mastercardIcon} /><img alt="Visa" src={visaIcon} /><img alt="WeChat Pay" src={wechatIcon} /><img alt="JCB" src={jcbIcon} /></span> : null}</Radio>)}</div></fieldset>
      
      <div aria-hidden="true" className="order-summary__rule" />
      <div className="order-summary__agreements">
        <div className="order-summary__agreement"><label><Checkbox checked={form.orderAgreed} onChange={(event) => form.setOrderAgreed(event.target.checked)} /> <span>[필수] 주문 상품, 결제 금액 및 주문 내용을 모두<br />확인했습니다.</span></label><button aria-label="주문 내용 약관 보기" disabled={!orderTerm} onClick={() => orderTerm && setActiveTerm(orderTerm)} type="button">›</button></div>
        <div className="order-summary__agreement"><label><Checkbox checked={form.providerAgreed} onChange={(event) => form.setProviderAgreed(event.target.checked)} /> <span>[필수] 결제대행서비스 약관 동의</span></label><button aria-label="결제대행서비스 약관 보기" disabled={!paymentTerm} onClick={() => paymentTerm && setActiveTerm(paymentTerm)} type="button">›</button></div>
      </div>
      
    </div>
    {!quote.checkoutEligible && <div role="alert"><p>현재 주문할 수 없습니다.</p>{quote.issues.map((issue) => <p key={issue}>{cartIssueMessage(issue)}</p>)}</div>}
    {form.errors.length > 0 && <div role="alert">{form.errors.map((error, index) => <p key={`${index}-${error}`}>{error}</p>)}</div>}
    {submitError ? <p role="alert">주문 또는 결제 준비를 완료하지 못했습니다. 같은 정보로 다시 시도하거나 주문내역을 확인해 주세요.</p> : null}
    <Button className="commerce-primary-button" disabled={refreshing || submissionBlocked || submitting || !quote.checkoutEligible} fullWidth onClick={onSubmit} size="large">주문하기</Button>
  </aside><Modal className="checkout-terms-modal" isOpen={Boolean(activeTerm)} onClose={() => setActiveTerm(null)} title={activeTerm?.title ?? '약관 보기'}><div className="checkout-terms-modal__document">{activeTerm?.content}</div></Modal></>
}
