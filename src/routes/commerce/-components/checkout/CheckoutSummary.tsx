import { cartIssueMessage } from '@/domain/cart/cartIssues'
import { Radio } from '@/components/ui/RadioControl'
import { Checkbox } from '@/components/ui/CheckboxControl'
import { Button } from '@/components/ui/ButtonControl'
import { RelativeLink } from '@/components/navigation/RelativeLinkView'
import type { CheckoutQuote } from '@/domain/checkout/checkoutRepository'
import type { DirectEasyPayMethods, OrderBenefitQuote } from '@/api/ordersPayments'
import radioOffIcon from '@/assets/figma/select-radio-off.svg'
import radioOnIcon from '@/assets/figma/select-radio-on.svg'
import mastercardIcon from '@/assets/figma/payment-mastercard.svg'
import visaIcon from '@/assets/figma/payment-visa.svg'
import wechatIcon from '@/assets/figma/payment-wechat.svg'
import jcbIcon from '@/assets/figma/payment-jcb.svg'
import naverPayIcon from '@/assets/figma/payment-npay.svg'
import kakaoPayIcon from '@/assets/figma/payment-kpay.png'
import type { CheckoutFormModel, PaymentMethod } from './hooks/useCheckoutForm'
import { formatCheckoutMoney as money } from './CheckoutFields'
import { TranslatedText, useTranslation, type TranslationKey } from '@/i18n/translation'

const paymentOptions: readonly { value: PaymentMethod; label?: string; translationKey?: TranslationKey; cardLogos?: boolean; directEasyPay?: keyof DirectEasyPayMethods; icon?: string }[] = [
  { value: 'virtual-account', translationKey: 'checkout.virtualAccount' }, { value: 'card', translationKey: 'checkout.card' },
  { value: 'payco', label: '페이코' },
  { value: 'naver-pay', label: '네이버페이', directEasyPay: 'naverPay', icon: naverPayIcon },
  { value: 'kakao-pay', label: '카카오페이', directEasyPay: 'kakaoPay', icon: kakaoPayIcon },
  { value: 'global-card', label: '', cardLogos: true },
]
export function CheckoutSummary({ quote, benefits, form, directEasyPayMethods, paymentAvailabilityError, paymentNotice, onPaymentChange, refreshing, locked, checkingPayment, submitting, submitError, onSubmit, variant = 'cart', extensionAmount }: { quote: CheckoutQuote; benefits?: OrderBenefitQuote; form: CheckoutFormModel; directEasyPayMethods?: DirectEasyPayMethods; paymentAvailabilityError?: string | null; paymentNotice?: string | null; onPaymentChange?: () => void; refreshing: boolean; locked: boolean; checkingPayment?: boolean; submitting: boolean; submitError?: string; onSubmit: () => void; variant?: 'cart' | 'extension'; extensionAmount?: number }) {
  const { locale, t } = useTranslation()
  const amount = quote.estimate
  return <aside className="order-summary">
    <div className="order-summary__box">
      <h2><TranslatedText id="checkout.paymentAmount" /></h2>
      <dl className="order-summary__amounts">
        <div><dt>{variant === 'extension' ? '기간 연장' : <TranslatedText id="cart.rentalProducts" />}</dt><dd className="notranslate" translate="no">{money(refreshing ? null : amount.rentalTotal)}</dd></div>
        {variant === 'cart' && <><div className="sub"><dt>ㄴ <TranslatedText id="money.setupFee" /></dt><dd className="notranslate" translate="no">{money(refreshing ? null : amount.rentalSetupTotal)}</dd></div>
        <div className="sub"><dt>ㄴ <TranslatedText id="money.rentalAmount" /></dt><dd className="notranslate" translate="no">{money(refreshing ? null : amount.rentalMonthlyTotal)}</dd></div>
        <div><dt><TranslatedText id="nav.parts" /></dt><dd className="notranslate" translate="no">{money(refreshing ? null : amount.partTotal)}</dd></div></>}
        {extensionAmount !== undefined && <div><dt>기간 연장</dt><dd className="notranslate" translate="no">{money(refreshing ? null : extensionAmount)}</dd></div>}
        <div><dt><TranslatedText id="checkout.orderTotal" /></dt><dd className="notranslate" translate="no">{money(refreshing ? null : amount.expectedTotal)}</dd></div>
      </dl>
      <div aria-hidden="true" className="order-summary__rule" />
      <section className="order-summary__benefits"><h3><TranslatedText id="checkout.benefitsAmount" /></h3><dl><div><dt><TranslatedText id="checkout.couponDiscount" /></dt><dd className="notranslate" translate="no">{money(refreshing ? null : benefits?.couponDiscountAmount ?? 0)}</dd></div><div><dt><TranslatedText id="checkout.pointsUsed" /></dt><dd className="notranslate" translate="no">{money(refreshing ? null : benefits?.pointUsedAmount ?? 0)}</dd></div></dl></section>
      <div aria-hidden="true" className="order-summary__rule" />
      <section className="order-summary__final"><dl><div className="order-summary__total"><dt><TranslatedText id="checkout.finalTotal" /></dt><dd className="notranslate" translate="no">{locale === 'ko' ? <><strong>{refreshing ? '-' : (benefits?.finalAmount ?? amount.expectedTotal).toLocaleString('ko-KR')}</strong><span>원</span></> : <strong>{money(refreshing ? null : benefits?.finalAmount ?? amount.expectedTotal)}</strong>}</dd></div></dl><div className="order-summary__coupon"><TranslatedText id="checkout.expectedPoints" /><strong className="notranslate" translate="no">{refreshing || (benefits?.expectedPoints ?? amount.pointTotal) === null ? '-' : t('money.pointAmount', { points: (benefits?.expectedPoints ?? amount.pointTotal ?? 0).toLocaleString('ko-KR') })}</strong></div></section>
      <div aria-hidden="true" className="order-summary__rule" />
      <fieldset className="payment-methods" disabled={locked}><legend><TranslatedText id="checkout.paymentMethod" /></legend><div className="payment-methods__options">{paymentOptions.filter(option => !option.directEasyPay || directEasyPayMethods?.[option.directEasyPay] || form.payment === option.value).map(({ value, label, translationKey, cardLogos, directEasyPay, icon }) => {
        const unavailable = Boolean(directEasyPay && !directEasyPayMethods?.[directEasyPay])
        return <Radio checked={form.payment === value} disabled={unavailable} iconClassName="payment-radio-icon" key={value} name="payment" offIcon={radioOffIcon} onChange={() => { form.setPayment(value); onPaymentChange?.() }} onIcon={radioOnIcon} value={value}>{translationKey ? <TranslatedText id={translationKey} /> : <span>{label}{unavailable ? ' (현재 이용 불가)' : ''}</span>}{value === 'card' ? <span className="payment-card-easy-pay-logos"><img alt="네이버페이" src={naverPayIcon} /><img alt="카카오페이" src={kakaoPayIcon} /></span> : null}{icon ? <img alt="" className="payment-easy-pay-logo" src={icon} /> : null}{cardLogos ? <span className="payment-card-logos"><img alt="Mastercard" src={mastercardIcon} /><img alt="Visa" src={visaIcon} /><img alt="WeChat Pay" src={wechatIcon} /><img alt="JCB" src={jcbIcon} /></span> : null}</Radio>
      })}</div>{form.fieldError('payment') && <small className="checkout-validation-error" role="alert">{form.fieldError('payment')}</small>}</fieldset>
      
      <div aria-hidden="true" className="order-summary__rule" />
      <div className="order-summary__agreements">
        <div className="order-summary__agreement"><label><Checkbox aria-describedby={form.fieldError('orderAgreed') ? 'checkout-order-agreement-error' : undefined} aria-invalid={Boolean(form.fieldError('orderAgreed'))} checked={form.orderAgreed} disabled={locked} onChange={(event) => form.setOrderAgreed(event.target.checked)} /> <TranslatedText id="checkout.requiredOrderReview" /></label>{form.fieldError('orderAgreed') ? <p className="checkout-agreement-error" id="checkout-order-agreement-error" role="alert">{form.fieldError('orderAgreed')}</p> : null}</div>
        <div className="order-summary__agreement"><label><Checkbox aria-describedby={form.fieldError('paymentServiceAgreed') ? 'checkout-payment-agreement-error' : undefined} aria-invalid={Boolean(form.fieldError('paymentServiceAgreed'))} checked={form.paymentServiceAgreed} disabled={locked} onChange={(event) => form.setPaymentServiceAgreed(event.target.checked)} /> <TranslatedText id="checkout.requiredPaymentServiceTerms" /></label>{form.fieldError('paymentServiceAgreed') ? <p className="checkout-agreement-error" id="checkout-payment-agreement-error" role="alert">{form.fieldError('paymentServiceAgreed')}</p> : null}</div>
      </div>
      
    </div>
    {!quote.checkoutEligible && <div role="alert"><p><TranslatedText id="checkout.unavailable" /></p>{quote.issues.map((issue) => <p className="notranslate" translate="no" key={issue}>{cartIssueMessage(issue)}</p>)}</div>}
    {paymentAvailabilityError && <p className="checkout-submit-error" role="alert">{paymentAvailabilityError}</p>}
    {paymentNotice && <p className="checkout-payment-notice" role="status">{paymentNotice}</p>}
    {submitError ? <p className="checkout-submit-error" role="alert">{submitError} <RelativeLink to="/mypage/orders"><TranslatedText id="checkout.viewOrders" /></RelativeLink></p> : null}
    <Button className="commerce-primary-button" disabled={refreshing || submitting || !quote.checkoutEligible} fullWidth onClick={onSubmit} size="large">{submitting ? <TranslatedText id="checkout.processing" /> : checkingPayment ? '결제 상태 다시 확인' : <TranslatedText id="checkout.order" />}</Button>
  </aside>
}
