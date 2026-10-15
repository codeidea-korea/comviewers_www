import { useState } from 'react'
import type { Product } from '../../../domain/products/types'
import { Button } from '../../../components/ui/ButtonControl'
import shoppingBag from '../../../assets/figma/shopping-bag.svg'
import { ProductServerState } from '@/components/product/ProductServerStateView'
import { ProductPeripherals } from '@/components/product/ProductPeripherals'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { productOsVisual } from '@/components/product/productOsVisual'
import { ProductOsOverlay } from '@/components/product/ProductOsOverlay'
import { useUiTranslation } from '@/i18n/uiTranslation'

export function ProductDetailHero({ product, message, onCart, onBuy, cartPending = false, buyPending = false, readOnly = false }: { product: Product; message: string; onCart: (rentalPeriods: number) => void; onBuy: (rentalPeriods: number) => void; cartPending?: boolean; buyPending?: boolean; readOnly?: boolean }) {
  const { locale, t, uiText } = useUiTranslation()
  const formatWon = (amount: number | null) => amount === null ? t('common.noInformation') : t('money.krwAmount', { amount: amount.toLocaleString('ko-KR') })
  const part = product.pricingType === 'one_time' && product.billingUnit === 'unit'
  const visual = productOsVisual(product.osFilterValue, part, product.image)
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
  const specs = [['OS', visual.label ?? product.os], ['CPU', product.cpu], ['RAM', product.ram], ['DISK', product.disk], ['GPU', product.gpu]]
  return (
      <section className="content-container product-detail-hero">
        <div className="product-detail-visual"><img alt={product.image ? `${product.title ?? product.productId} 상품 이미지` : visual.label ? `${visual.label} 상품 이미지` : '상품 기본 이미지'} src={visual.image} />{!product.image ? <ProductOsOverlay label={visual.label} /> : null}</div>
        <div className="product-detail-buy">
          <h1><span><span>품번</span><b>{product.productId}</b></span><small>{product.serverRoomProvider ? `${product.serverRoomProvider}/` : ''}{product.serverRoom}</small></h1>
          {part && <h2>{product.title ?? product.productId}</h2>}
          {part ? <p>{product.saleAvailability === 'SOLD_OUT' ? '품절 상품입니다.' : '수량형 일회성 상품입니다.'}</p> : <p className="product-detail-availability"><ProductServerState state={product.serverState} />{product.saleAvailability === 'SOLD_OUT' ? '품절 상품입니다.' : product.available === null ? '즉시 이용 가능 여부가 제공되지 않았습니다.' : product.available ? '구매 즉시 접속 가능합니다.' : '대기 중인 서버로, 주문 완료 시 1~24시간 이내로 관리자가 확인 후 접속 가능합니다.'}</p>}
          {part ? <p style={{ whiteSpace: 'pre-wrap' }}>{product.description || '등록된 상품 설명이 없습니다.'}</p> : <dl className="product-detail-specs">
            {specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? "정보 없음"}</dd></div>)}
            <div>
              <dt>주변기기</dt>
              <dd><ProductPeripherals mouseIncluded={product.mouseIncluded} keyboardIncluded={product.keyboardIncluded} /></dd>
            </div>
          </dl>}
          <div className="product-detail-prices">
            {(!part || setupFee > 0) && <p><span><b className={!part ? 'notranslate' : undefined} translate={!part ? 'no' : undefined}>{part ? '개당 추가 비용' : t('money.setupFee')}</b>{!part && <small>최초 1회 부과, 기간 연장 시 무료</small>}</span><strong className="notranslate" translate="no">{formatWon(setupFee)}</strong></p>}
            <p><span><b>{part ? '상품 금액' : `${unit === 'thirty_day' ? '월' : unit === 'hour' ? '시간' : '일'} 렌탈료`}</b><small>{part ? '1개' : periodDescription} 기준</small></span><strong className="notranslate" translate="no">{formatWon(rentalUnitPrice)}</strong></p>
            {!part && <p><b>적립 포인트</b><strong>{product.pointRate === null ? '정보 없음' : <><span>렌탈금액의</span> {product.pointRate}%</>}</strong></p>}
          </div>
          {canSelectPeriod ? <p className="product-detail-notice">{!part && unit === 'thirty_day' ? <>결제 수량은 <b>1개월 단위로 추가</b>되며, 최대 {maximum}개월까지 결제하실 수 있습니다. 1개월은 30일을 기준으로 계산됩니다.</> : <>{part ? '수량은' : '이용기간은'} <b>{part ? '1개' : periodDescription} 단위</b>로 {minimum}~{maximum}{unitLabel}까지 선택할 수 있습니다.</>}</p> : <p>{uiText(part ? '단가 또는 선택 가능한 수량을 확인할 수 없어 장바구니에 담을 수 없습니다.' : '단가 또는 선택 가능한 이용기간을 확인할 수 없어 장바구니에 담을 수 없습니다.')}</p>}
          <QuantityStepper label={part ? '수량' : '이용기간'} value={quantity} minimum={minimum} maximum={maximum} unit={unitLabel} disabled={!canSelectPeriod} onChange={setQuantity} />
          <div className="product-detail-total"><span>총 금액</span><strong className="notranslate" translate="no">{locale === 'ko' ? <><b>{safeTotalAmount === null ? '계산 불가' : safeTotalAmount.toLocaleString('ko-KR')}</b><small>원</small></> : <b>{formatWon(safeTotalAmount)}</b>}</strong></div>
          {!readOnly && product.saleAvailability === 'AVAILABLE' ? <div className="product-detail-actions">
            <button aria-label="장바구니 담기" className="product-detail-favorite" disabled={cartPending || !canSelectPeriod || safeTotalAmount === null} onClick={() => { if (quantity !== null && safeTotalAmount !== null) onCart(quantity) }} type="button"><img alt="" src={shoppingBag} /></button>
            <Button className="commerce-primary-button" disabled={buyPending || !canSelectPeriod || safeTotalAmount === null} fullWidth onClick={() => { if (quantity !== null) onBuy(quantity) }} size="large">바로구매</Button>
          </div> : null}
          <p aria-live="polite" className="product-detail-message">{uiText(message)}</p>
        </div>
      </section>
  )
}
