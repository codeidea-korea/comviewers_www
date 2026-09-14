import { useState } from 'react'
import type { Product } from '../../../domain/products/types'
import { Button } from '../../../components/ui/ButtonControl'
import windowsLogo from '../../../assets/figma/windows-logo-detail.svg'
import shoppingBag from '../../../assets/figma/shopping-bag.svg'
import serverLinkIcon from '../../../assets/figma/server-link.svg'
import serverOffIcon from '../../../assets/figma/icon-server-off.svg'
import mouseIcon from '../../../assets/figma/mouse.svg'
import keyboardIcon from '../../../assets/figma/keyboard.svg'
import mouseActiveIcon from '../../../assets/figma/mouse-active.svg'
import keyboardActiveIcon from '../../../assets/figma/keyboard-active.svg'
import addIcon from '../../../assets/figma/icon-add.svg'
import removeIcon from '../../../assets/figma/icon-remove.svg'
import defaultProductImage from '../../../assets/figma/windows-card-render.png'
import defaultPartProductImage from '../../../assets/figma/cart-product-partner.png'

const formatWon = (amount: number | null) => amount === null ? "정보 없음" : `${amount.toLocaleString('ko-KR')}원`

export function ProductDetailHero({ product, message, onCart, onBuy, cartPending = false, buyPending = false }: { product: Product; message: string; onCart: (rentalPeriods: number) => void; onBuy: (rentalPeriods: number) => void; cartPending?: boolean; buyPending?: boolean }) {
  const part = product.pricingType === 'one_time' && product.billingUnit === 'unit'
  const minimum = part ? product.minPurchaseQuantity : product.minRentalUnits
  const maximum = part ? product.maxPurchaseQuantity : product.maxRentalUnits
  const unit = product.billingUnit
  const unitLabel = part ? '개' : unit === 'hour' ? '시간' : unit === 'day' ? '일' : '개월'
  const periodDescription = unit === 'thirty_day' ? '1개월(30일)' : `1${unitLabel}`
  const rentalUnitPrice = product.unitPrice ?? (unit === 'thirty_day' ? product.monthlyPrice : null)
  const canSelectPeriod = (part || ['hour', 'day', 'thirty_day'].includes(unit ?? '')) && rentalUnitPrice !== null
    && minimum !== null && maximum !== null && minimum <= maximum
  const [selectedQuantity, setQuantity] = useState(minimum ?? 1)
  const quantity = canSelectPeriod ? Math.max(minimum, Math.min(maximum, selectedQuantity)) : null
  const setupFee = product.setupFee
  const totalAmount = rentalUnitPrice === null || quantity === null ? null : part ? (setupFee + rentalUnitPrice) * quantity : setupFee + rentalUnitPrice * quantity
  const safeTotalAmount = totalAmount !== null && Number.isSafeInteger(totalAmount) ? totalAmount : null
  const immediatelyPurchasable = part || product.available === true
  const specs = [['OS', product.os], ['CPU', product.cpu], ['RAM', product.ram], ['DISK', product.disk], ['GPU', product.gpu]]
  return (
      <section className="content-container product-detail-hero">
        <div className="product-detail-visual"><img alt={product.image ? (product.title ?? `${product.os ?? ''} RCPC`) : part ? '기본 파트 상품 이미지' : '기본 RCPC 상품 이미지'} src={product.image ?? (part ? defaultPartProductImage : defaultProductImage)} />{!part && product.os?.includes("Windows") ? <img alt="Windows" src={windowsLogo} /> : null}</div>
        <div className="product-detail-buy">
          <h1><span>품번 <b>{product.productId}</b></span><small>{product.serverRoomProvider ? `${product.serverRoomProvider}/` : ''}{product.serverRoom}</small></h1>
          {part && <h2>{product.title ?? product.productId}</h2>}
          {part ? <p>{product.saleAvailability === 'SOLD_OUT' ? '품절 상품입니다.' : '수량형 일회성 상품입니다.'}</p> : <p className={`product-detail-availability${product.available ? '' : ' is-waiting'}`}>{product.serverState !== null ? <i className="product-detail-availability__icon"><img alt="" src={product.serverState === 'online' ? serverLinkIcon : serverOffIcon} /></i> : null}{product.saleAvailability === 'SOLD_OUT' ? '품절 상품입니다.' : product.available === null ? '즉시 이용 가능 여부가 제공되지 않았습니다.' : product.available ? '구매 즉시 접속 가능합니다.' : '준비 중'}</p>}
          {part ? <p style={{ whiteSpace: 'pre-wrap' }}>{product.description || '등록된 상품 설명이 없습니다.'}</p> : <dl className="product-detail-specs">
            {specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? "정보 없음"}</dd></div>)}
            <div>
              <dt>주변기기</dt>
              <dd className="product-detail-peripherals">
                <i>{product.mouseIncluded === null ? "마우스 정보 없음" : <img alt={product.mouseIncluded ? '마우스 제공' : '마우스 미제공'} src={product.mouseIncluded ? mouseActiveIcon : mouseIcon} />}</i>
                <i>{product.keyboardIncluded === null ? "키보드 정보 없음" : <img alt={product.keyboardIncluded ? '키보드 제공' : '키보드 미제공'} src={product.keyboardIncluded ? keyboardActiveIcon : keyboardIcon} />}</i>
              </dd>
            </div>
          </dl>}
          <div className="product-detail-prices">
            {(!part || setupFee > 0) && <p><span><b>{part ? '개당 추가 비용' : '세팅비'}</b>{!part && <small>최초 1회 부과, 기간 연장 시 무료</small>}</span><strong>{formatWon(setupFee)}</strong></p>}
            <p><span><b>{part ? '상품 금액' : `${unit === 'thirty_day' ? '월' : unit === 'hour' ? '시간' : '일'} 렌탈료`}</b><small>{part ? '1개' : periodDescription} 기준</small></span><strong>{formatWon(rentalUnitPrice)}</strong></p>
            {!part && <p><b>적립 포인트</b><strong>{product.pointRate === null ? '정보 없음' : <><span>렌탈금액의</span> {product.pointRate}%</>}</strong></p>}
          </div>
          {canSelectPeriod ? <p className="product-detail-notice">{part ? '수량은' : '이용기간은'} <b>{part ? '1개' : periodDescription} 단위</b>로 {minimum}~{maximum}{unitLabel}까지 선택할 수 있습니다.</p> : <p>단가 또는 선택 가능한 {part ? '수량' : '이용기간'}을 확인할 수 없어 장바구니에 담을 수 없습니다.</p>}
          <div className="quantity-control">
            <span>{part ? '수량' : '이용기간'}</span>
            <button aria-label={part ? '수량 줄이기' : '이용기간 줄이기'} disabled={!canSelectPeriod || quantity === minimum} onClick={() => { if (quantity !== null && minimum !== null) setQuantity(Math.max(minimum, quantity - 1)) }} type="button"><img alt="" src={removeIcon} /></button>
            <strong>{quantity ?? '—'}</strong>
            <button aria-label={part ? '수량 늘리기' : '이용기간 늘리기'} disabled={!canSelectPeriod || quantity === maximum} onClick={() => { if (quantity !== null && maximum !== null) setQuantity(Math.min(maximum, quantity + 1)) }} type="button"><img alt="" src={addIcon} /></button>
            <span>{unitLabel}</span>
          </div>
          <div className="product-detail-total"><span>총 금액</span><strong><b>{safeTotalAmount === null ? '계산 불가' : safeTotalAmount.toLocaleString('ko-KR')}</b><small>원</small></strong></div>
          <div className="product-detail-actions">
            <button aria-label="장바구니 담기" className="product-detail-favorite" disabled={cartPending || !canSelectPeriod || safeTotalAmount === null || product.saleAvailability === "SOLD_OUT" || !immediatelyPurchasable} onClick={() => { if (quantity !== null && safeTotalAmount !== null) onCart(quantity) }} type="button"><img alt="" src={shoppingBag} /></button>
            <Button className="commerce-primary-button" disabled={buyPending || !canSelectPeriod || safeTotalAmount === null || product.saleAvailability === "SOLD_OUT" || !immediatelyPurchasable} fullWidth onClick={() => { if (quantity !== null) onBuy(quantity) }} size="large">바로구매</Button>
          </div>
          <p aria-live="polite" className="product-detail-message">{message}</p>
        </div>
      </section>
  )
}
