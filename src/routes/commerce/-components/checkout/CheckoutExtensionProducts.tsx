import { PcSpecSummary } from '@/components/product/PcSpecSummary'
import { useUiTranslation } from '@/i18n/uiTranslation'
import { extensionResultText } from '@/routes/mypage/-components/rcpcExtensionPresentation'
import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { CheckoutSectionTitle, formatCheckoutMoney as money } from './CheckoutFields'
import defaultProductImage from '@/assets/figma/store/product-04.png'
import windowsLogo from '@/assets/figma/windows-logo.svg'

export type ExtensionQuote = Awaited<ReturnType<MyRcpcReadServices['extensionCheckout']['quote']>>
const dateTime = (value: string | null) => value ? value.replace('T', ' ').split('.')[0] : '-'

export function CheckoutExtensionProducts({ quote, mixed = false }: { quote: ExtensionQuote; mixed?: boolean }) {
  const { uiText } = useUiTranslation()
  return <section className="checkout-products"><CheckoutSectionTitle>{uiText(mixed ? '기간 연장 상품' : '주문상품')}</CheckoutSectionTitle>
    {quote.items.map(item => <article className="commerce-product-row commerce-product-row--compact" key={item.rentalId}>
      <header className="commerce-product-row__heading"><span className="checkout-product-number">{uiText("품번 ")}<b>{item.productNo ?? '-'}</b></span><small>{item.serverRoomName ?? '-'}</small></header>
      <div className="commerce-product-row__content"><div className="commerce-product-row__image">
        <img className="checkout-product-image" src={defaultProductImage} alt={item.title ?? item.productNo ?? uiText('렌탈 상품')} />
        <img className="checkout-product-logo" src={windowsLogo} alt="" />
      </div><div className="commerce-product-row__body">
        <p className="commerce-product-row__spec">{<PcSpecSummary text={item.spec} fallback={item.title ?? '-'} showMissingCores layout="inline" />}</p>
        <p>{uiText("현재 이용 종료일 ")}{dateTime(item.previousEnd)}</p>
        <p>{uiText("연장 후 이용 종료일 ")}{dateTime(item.targetEnd)}</p>
        {!item.eligible && <p role="alert">{extensionResultText(item)}</p>}
      </div></div>
      <div className="commerce-product-row__meta"><div className="commerce-product-row__terms"><span>{uiText("연장 기간 ")}<strong>{item.addedDays == null ? '-' : uiText('{count}일', { count: item.addedDays })}</strong></span></div>
        <div className="commerce-product-row__amount"><strong>{money(item.amount)}</strong></div></div>
    </article>)}
  </section>
}
