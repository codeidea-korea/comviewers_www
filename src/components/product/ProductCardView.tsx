import type { ReactNode } from 'react'
import type { Product } from '../../domain/products/types'
import { RelativeLink as Link } from '../navigation/RelativeLinkView'
import flagKorea from '../../assets/figma/flag-korea.png'
import keyboardActiveIcon from '../../assets/figma/keyboard-active.svg'
import keyboardIcon from '../../assets/figma/keyboard.svg'
import mouseActiveIcon from '../../assets/figma/mouse-active.svg'
import mouseIcon from '../../assets/figma/mouse.svg'
import serverLinkIcon from '../../assets/figma/server-link.svg'
import serverOffIcon from '../../assets/figma/link-off.svg'
import shoppingBagIcon from '../../assets/figma/shopping-bag.svg'


import windowsLogo from '../../assets/figma/windows-logo.svg'
import defaultProductImage from '../../assets/figma/windows-card-render.png'
import defaultPartProductImage from '../../assets/figma/cart-product-partner.png'

const formatPrice = (price: number) => new Intl.NumberFormat('ko-KR').format(price)

function ProductSpec({ className = '', label, value, tone }: { className?: string; label: string; value: ReactNode; tone?: 'blue' | 'gray' | 'red' }) {
  return (
    <div className={`product-card__spec ${className}`.trim()}>
      <dt>{label}</dt>
      <dd className={tone ? `tag tag--${tone}` : undefined}>{value}</dd>
    </div>
  )
}

function PriceValue({ amount, compact = false }: { amount: number | null; compact?: boolean }) {
  return (
    <strong className={compact ? 'product-card__price-value product-card__price-value--compact' : 'product-card__price-value'}>
      <b>{amount === null ? '정보 없음' : formatPrice(amount)}</b><small>원</small>
    </strong>
  )
}

export function ProductCard({ image, onAddToCart, product, size = 'medium' }: { image?: string; onAddToCart?: (product: Product) => void; product: Product; size?: 'medium' | 'large' }) {
  const isLarge = size === 'large'
  const hasMouse = Boolean(product.mouseIncluded)
  const hasKeyboard = Boolean(product.keyboardIncluded)
  const serverOnline = product.serverState === 'online'
  const part = product.pricingType === 'one_time' && product.billingUnit === 'unit'
  const instantAvailabilityRequired = !part
  const productPrice = part ? product.unitPrice : product.monthlyPrice
  const imageSource = image ?? product.image ?? (part ? defaultPartProductImage : defaultProductImage)

  return (
    <article className={`product-card product-card--${size}`}>
      <div className="product-card__image">
        <img alt={product.image || image ? '' : part ? '기본 파트 상품 이미지' : '기본 RCPC 상품 이미지'} src={imageSource} />
        {product.os?.includes("Windows") ? <img alt="Windows" className="product-card__windows-logo" src={windowsLogo} /> : null}
      </div>
      <div className="product-card__info">
        <dl className="product-card__specs">
          <ProductSpec label="품번" value={product.productId} />
          <ProductSpec className="product-card__spec--os" label="OS" value={product.os ?? '정보 없음'} />
          <ProductSpec className="product-card__spec--cpu" label="CPU" value={product.cpu ?? '정보 없음'} />
          <ProductSpec label="RAM" tone="blue" value={product.ram ?? '정보 없음'} />
          <ProductSpec label="DISK" tone="gray" value={product.disk ?? '정보 없음'} />
          <ProductSpec label="GPU" tone="red" value={product.gpu ?? '정보 없음'} />
          {isLarge ? (
            <>
              <ProductSpec
                label="주변기기"
                value={(
                  <span className="product-card__peripherals">
                    <span>{product.mouseIncluded === null ? "—" : <img alt="" src={hasMouse ? mouseActiveIcon : mouseIcon} />}</span>
                    <span>{product.keyboardIncluded === null ? "—" : <img alt="" src={hasKeyboard ? keyboardActiveIcon : keyboardIcon} />}</span>
                    <span className="sr-only">{product.mouseIncluded === null ? '마우스 정보 없음' : hasMouse ? '마우스 포함' : '마우스 미포함'}, {product.keyboardIncluded === null ? '키보드 정보 없음' : hasKeyboard ? '키보드 포함' : '키보드 미포함'}</span>
                  </span>
                )}
              />
              <ProductSpec
                className="product-card__spec--ip"
                label="IP"
                value={<>{product.country === "Korea" ? <img alt="대한민국" className="flag" src={flagKorea} /> : null}<span>{product.country ?? "국가 정보 없음"}</span><small>{product.ip ?? "IP 정보 없음"}</small></>}
              />
              <ProductSpec
                label="서버상태"
                value={product.serverState === null ? "정보 없음" : <span className={`product-card__server-state${serverOnline ? '' : ' is-waiting'}`}><img alt="" src={serverOnline ? serverLinkIcon : serverOffIcon} /><span className="sr-only">{serverOnline ? '서버 연결됨' : '서버 연결 끊김'}</span></span>}
              />
            </>
          ) : null}
        </dl>
        <div className="product-card__purchase">
          <div className="product-card__price">
            {isLarge ? <span>세팅비 <PriceValue amount={product.setupFee} compact /></span> : null}
            <span>{part ? '상품 금액' : '월 렌탈료'} <PriceValue amount={productPrice} /></span>
          </div>
          {isLarge ? <button disabled={productPrice === null || product.saleAvailability === "SOLD_OUT" || (instantAvailabilityRequired && product.available !== true)} className="product-card__cart" onClick={() => onAddToCart?.(product)} type="button">담기 <img alt="" src={shoppingBagIcon} /></button> : null}
        </div>
      </div>
      <Link aria-label={`상품 ${product.productId} 상세 보기`} className="product-card__detail-overlay" to={`/products/${product.productId}`} />
    </article>
  )
}
