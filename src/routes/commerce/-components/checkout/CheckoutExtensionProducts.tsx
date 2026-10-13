import type { MyRcpcReadServices } from '@/domain/myAccount/rcpcInquiryReadServices'
import { CheckoutSectionTitle, formatCheckoutMoney as money } from './CheckoutFields'
import { extensionResultText } from '@/routes/mypage/-components/rcpcExtensionPresentation'
import defaultProductImage from '@/assets/figma/store/product-04.png'
import windowsLogo from '@/assets/figma/windows-logo.svg'
import { useState } from 'react'
import { NativeSelect } from '@/components/ui/SelectControl'

export type ExtensionQuote = Awaited<ReturnType<MyRcpcReadServices['extensionCheckout']['quote']>>
const dateTime = (value: string | null) => value ? value.replace('T', ' ').split('.')[0] : '-'

export function CheckoutExtensionProducts({ quote, mixed = false }: { quote: ExtensionQuote; mixed?: boolean }) {
  const [room, setRoom] = useState('')
  const roomNames = [...new Set(quote.items.map(item => item.serverRoomName).filter((value): value is string => Boolean(value)))]
  const activeRoom = roomNames.includes(room) ? room : ''
  const items = activeRoom ? quote.items.filter(item => item.serverRoomName === activeRoom) : quote.items
  return <section className="checkout-products"><CheckoutSectionTitle>{mixed ? '기간 연장 상품' : '주문상품'}</CheckoutSectionTitle>
    <NativeSelect aria-label="기간연장 주문상품 서버실" onChange={event => setRoom(event.target.value)} value={activeRoom}><option value="">서버실 선택</option>{roomNames.map(name => <option key={name} value={name}>{name}</option>)}</NativeSelect>
    {items.map(item => <article className="commerce-product-row commerce-product-row--compact" key={item.rentalId}>
      <header className="commerce-product-row__heading"><span className="checkout-product-number">품번 <b>{item.productNo ?? '-'}</b></span><small>{item.serverRoomName ?? '-'}</small></header>
      <div className="commerce-product-row__content"><div className="commerce-product-row__image">
        <img className="checkout-product-image" src={defaultProductImage} alt={item.title ?? item.productNo ?? '렌탈 상품'} />
        <img className="checkout-product-logo" src={windowsLogo} alt="" />
      </div><div className="commerce-product-row__body">
        <p className="commerce-product-row__spec">{item.spec ?? item.title ?? '-'}</p>
        <p>현재 이용 종료일 {dateTime(item.previousEnd)}</p>
        <p>연장 후 이용 종료일 {dateTime(item.targetEnd)}</p>
        {!item.eligible && <p role="alert">{extensionResultText(item)}</p>}
      </div></div>
      <div className="commerce-product-row__meta"><div className="commerce-product-row__terms"><span>연장 기간 <strong>{item.addedDays == null ? '-' : `${item.addedDays}일`}</strong></span></div>
        <div className="commerce-product-row__amount"><strong>{money(item.amount)}</strong></div></div>
    </article>)}
  </section>
}
