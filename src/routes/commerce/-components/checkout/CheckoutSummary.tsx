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
import { TranslatedText, useTranslation, type TranslationKey } from '@/i18n/translation'

const paymentOptions: readonly { value: PaymentMethod; label?: string; translationKey?: TranslationKey; cardLogos?: boolean }[] = [
  { value: 'virtual-account', translationKey: 'checkout.virtualAccount' }, { value: 'card', translationKey: 'checkout.card' },
  { value: 'payco', label: '페이코' }, { value: 'global-card', label: '', cardLogos: true },
]
export function CheckoutSummary({ quote, benefits, form, refreshing, locked, checkingPayment, submitting, submitError, onSubmit }: { quote: CheckoutQuote; benefits?: OrderBenefitQuote; form: CheckoutFormModel; refreshing: boolean; locked: boolean; checkingPayment?: boolean; submitting: boolean; submitError?: string; onSubmit: () => void }) {
  const { locale, t } = useTranslation()
  const amount = quote.estimate
  return <aside className="order-summary">
    <div className="order-summary__box">
      <h2><TranslatedText id="checkout.paymentAmount" /></h2>
      <dl className="order-summary__amounts">
        <div><dt><TranslatedText id="cart.rentalProducts" /></dt><dd className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}>{money(refreshing ? null : amount.rentalTotal)}</dd></div>
        <div className="sub"><dt>ㄴ <TranslatedText id="money.setupFee" /></dt><dd className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}>{money(refreshing ? null : amount.rentalSetupTotal)}</dd></div>
        <div className="sub"><dt>ㄴ <TranslatedText id="money.rentalAmount" /></dt><dd className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}>{money(refreshing ? null : amount.rentalMonthlyTotal)}</dd></div>
        <div><dt><TranslatedText id="nav.parts" /></dt><dd className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}>{money(refreshing ? null : amount.partTotal)}</dd></div>
        <div><dt><TranslatedText id="checkout.orderTotal" /></dt><dd className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}>{money(refreshing ? null : amount.expectedTotal)}</dd></div>
      </dl>
      <div aria-hidden="true" className="order-summary__rule" />
      <section className="order-summary__benefits"><h3><TranslatedText id="checkout.benefitsAmount" /></h3><dl><div><dt><TranslatedText id="checkout.couponDiscount" /></dt><dd className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}>{money(refreshing ? null : benefits?.couponDiscountAmount ?? 0)}</dd></div><div><dt><TranslatedText id="checkout.pointsUsed" /></dt><dd className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}>{money(refreshing ? null : benefits?.pointUsedAmount ?? 0)}</dd></div></dl></section>
      <div aria-hidden="true" className="order-summary__rule" />
      <section className="order-summary__final"><dl><div className="order-summary__total"><dt><TranslatedText id="checkout.finalTotal" /></dt><dd className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}>{locale === 'ko' ? <><strong>{refreshing ? '-' : (benefits?.finalAmount ?? amount.expectedTotal).toLocaleString('ko-KR')}</strong><span>원</span></> : <strong>{money(refreshing ? null : benefits?.finalAmount ?? amount.expectedTotal)}</strong>}</dd></div></dl><div className="order-summary__coupon"><TranslatedText id="checkout.expectedPoints" /><strong className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined}>{refreshing || amount.pointTotal === null ? '-' : t('money.pointAmount', { points: amount.pointTotal.toLocaleString('ko-KR') })}</strong></div></section>
      <div aria-hidden="true" className="order-summary__rule" />
      <fieldset className="payment-methods" disabled={locked}><legend><TranslatedText id="checkout.paymentMethod" /></legend><div className="payment-methods__options">{paymentOptions.map(({ value, label, translationKey, cardLogos }) => <Radio checked={form.payment === value} iconClassName="payment-radio-icon" key={value} name="payment" offIcon={radioOffIcon} onChange={() => form.setPayment(value)} onIcon={radioOnIcon} value={value}>{translationKey ? <TranslatedText id={translationKey} /> : <span>{label}</span>}{cardLogos ? <span className="payment-card-logos"><img alt="Mastercard" src={mastercardIcon} /><img alt="Visa" src={visaIcon} /><img alt="WeChat Pay" src={wechatIcon} /><img alt="JCB" src={jcbIcon} /></span> : null}</Radio>)}</div>{form.fieldError('payment') && <small className="checkout-validation-error" role="alert">{form.fieldError('payment')}</small>}</fieldset>
      
      <div aria-hidden="true" className="order-summary__rule" />
      <div className="order-summary__agreements">
        <div className="order-summary__agreement"><label><Checkbox checked={form.orderAgreed} disabled={locked} onChange={(event) => form.setOrderAgreed(event.target.checked)} /> <TranslatedText id="checkout.requiredOrderReview" /></label></div>
      </div>
      
    </div>
    {!quote.checkoutEligible && <div role="alert"><p><TranslatedText id="checkout.unavailable" /></p>{quote.issues.map((issue) => <p className={import.meta.env.DEV ? 'notranslate' : undefined} translate={import.meta.env.DEV ? 'no' : undefined} key={issue}>{cartIssueMessage(issue)}</p>)}</div>}
    {form.fieldError('orderAgreed') && <div className="checkout-agreement-errors" role="alert"><p>{form.fieldError('orderAgreed')}</p></div>}
    {submitError ? <p className="checkout-submit-error" role="alert">{submitError} <RelativeLink to="/mypage/orders"><TranslatedText id="checkout.viewOrders" /></RelativeLink></p> : null}
    <Button className="commerce-primary-button" disabled={refreshing || submitting || !quote.checkoutEligible} fullWidth onClick={onSubmit} size="large">{submitting ? <TranslatedText id="checkout.processing" /> : checkingPayment ? '결제 상태 다시 확인' : <TranslatedText id={locked ? 'checkout.retryPayment' : 'checkout.order'} />}</Button>
  </aside>
}
