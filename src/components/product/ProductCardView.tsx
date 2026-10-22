import type { ReactNode } from 'react'
import { CpuCoreBadge } from './CpuCoreBadge'
import { TranslatedText, useTranslation } from '../../i18n/translation'
import type { Product } from '../../domain/products/types'
import { RelativeLink as Link } from '../navigation/RelativeLinkView'
import flagKorea from '../../assets/figma/flag-korea.png'
import { ProductPeripherals } from './ProductPeripherals'
import countryEmptyIcon from '../../assets/figma/product-country-empty.png'
import { ProductServerState } from './ProductServerStateView'
import shoppingBagIcon from '../../assets/figma/shopping-bag.svg'
import { ProductOsOverlay } from './ProductOsOverlay'
import { productOsVisual } from './productOsVisual'
import { EllipsisText } from '../ui/TooltipControl'

const formatPrice = (price: number) => new Intl.NumberFormat('ko-KR').format(price)

function ProductText({ children, to, lines = 2, className = '' }: { children: ReactNode; to: string; lines?: 1 | 2; className?: string }) {
  return <EllipsisText asChild lines={lines} className={className}><Link className="product-card__text-link" to={to}>{children}</Link></EllipsisText>
}

function ProductSpec({ className = '', label, value, tone, to, structured = false }: { className?: string; label: ReactNode; value: ReactNode; tone?: 'blue' | 'gray' | 'red'; to: string; structured?: boolean }) {
  return (
    <div className={`product-card__spec ${className}`.trim()}>
      <dt className="notranslate" translate="no"><ProductText to={to} lines={1}>{label}</ProductText></dt>
      <dd className={tone ? `tag tag--${tone}` : undefined}>{structured ? value : <ProductText to={to}>{value}</ProductText>}</dd>
    </div>
  )
}

function PriceValue({ amount, compact = false, to }: { amount: number | null; compact?: boolean; to: string }) {
  const { locale, t } = useTranslation()
  return (
    <strong translate="no" className={`notranslate ${compact ? 'product-card__price-value product-card__price-value--compact' : 'product-card__price-value'}`}>
      <ProductText to={to} className="product-card__price-copy">{amount === null ? <b>{t('common.noInformation')}</b> : locale === 'ko' ? <><b>{formatPrice(amount)}</b><small>원</small></> : <b>{t('money.krwAmount', { amount: formatPrice(amount) })}</b>}</ProductText>
    </strong>
  )
}

export function ProductCard({ onAddToCart, product, size = 'medium' }: { onAddToCart?: (product: Product) => void; product: Product; size?: 'medium' | 'large' }) {
  const { locale, t } = useTranslation()
  const isLarge = size === 'large'
  const part = product.pricingType === 'one_time' && product.billingUnit === 'unit'
  const productPrice = part ? product.unitPrice : product.unitPrice ?? product.monthlyPrice
  const visual = productOsVisual(product.osFilterValue, part, product.image)
  const productHref = `/products/${product.productId}`

  return (
    <article lang={locale} className={`product-card product-card--clamped product-card--${size}${locale !== 'ko' ? ' product-card--translated' : ''}`}>
      <div className="product-card__image">
        <img alt={product.image || visual.label ? t('cart.productImage', { name: product.image ? product.title ?? product.productId : visual.label ?? '' }) : t('cart.defaultImage')} src={visual.image} />
        {!product.image ? <ProductOsOverlay label={visual.label} /> : null}
      </div>
      <div className="product-card__info">
        <dl className="product-card__specs">
          <ProductSpec to={productHref} className="product-card__spec--number" label={<TranslatedText id="product.number" />} value={<span className="notranslate" translate="no">{product.productId}</span>} />
          <ProductSpec to={productHref} className="product-card__spec--os" label="OS" value={visual.label || product.os ? <span className="notranslate" translate="no">{visual.label ?? product.os}</span> : <TranslatedText id="common.noInformation" />} />
          <ProductSpec to={productHref} className="product-card__spec--cpu" label="CPU" value={product.cpu ? <span className="notranslate" translate="no">{product.cpu}</span> : <TranslatedText id="common.noInformation" />} />
          <ProductSpec to={productHref} className="product-card__spec--cores" label="CORE" structured value={<CpuCoreBadge value={product.cpuCores} truncate to={productHref} />} />
          <ProductSpec to={productHref} className="product-card__spec--ram" label="RAM" tone="blue" value={product.ram ?? <TranslatedText id="common.noInformation" />} />
          <ProductSpec to={productHref} className="product-card__spec--disk" label="DISK" tone="gray" value={product.disk ?? <TranslatedText id="common.noInformation" />} />
          <ProductSpec to={productHref} className="product-card__spec--gpu" label="GPU" tone="red" value={product.gpu ? <span className="notranslate" translate="no">{product.gpu}</span> : <TranslatedText id="common.noInformation" />} />
          {isLarge ? (
            <>
              <ProductSpec
                to={productHref} structured
                className="product-card__spec--peripherals"
                label={<TranslatedText id="product.peripherals" />}
                value={<ProductPeripherals mouseIncluded={product.mouseIncluded} keyboardIncluded={product.keyboardIncluded} />}
              />
              <ProductSpec
                to={productHref} structured
                className="product-card__spec--ip"
                label="IP"
                value={product.country || product.ip ? <>
                  {product.country ? <>{product.country === 'Korea' ? <img alt={t('catalogUi.korea')} className="flag" src={flagKorea} /> : null}<ProductText to={productHref} lines={1}>{product.country}</ProductText></> : null}
                  {product.ip ? <small><ProductText to={productHref} lines={1}>{product.ip}</ProductText></small> : null}
                </> : <img alt={t('catalogUi.countryUnknown')} className="flag" height={20} src={countryEmptyIcon} width={20} />}
              />
              <ProductSpec
                to={productHref} structured
                label={<TranslatedText id="product.serverStatus" />}
                value={<ProductServerState state={product.serverState} />}
              />
            </>
          ) : null}
        </dl>
        <div className="product-card__purchase">
          <div className="product-card__price">
            {isLarge ? <span><ProductText to={productHref} lines={1} className="product-card__price-label"><TranslatedText id="money.setupFee" /></ProductText> <PriceValue to={productHref} amount={product.setupFee} compact /></span> : null}
            <span><ProductText to={productHref} lines={1} className="product-card__price-label"><TranslatedText id={part ? 'money.productAmount' : 'money.monthlyRental'} /></ProductText> <PriceValue to={productHref} amount={productPrice} /></span>
          </div>
          {isLarge ? <button disabled={productPrice === null} className="product-card__cart" onClick={() => onAddToCart?.(product)} type="button"><TranslatedText id="cart.add" /> <img alt="" src={shoppingBagIcon} /></button> : null}
        </div>
      </div>
      <Link aria-label={t('catalogUi.productDetails', { id: product.productId })} className="product-card__detail-overlay" to={`/products/${product.productId}`} />
    </article>
  )
}
