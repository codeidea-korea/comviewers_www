import { CpuCoreBadge } from '@/components/product/CpuCoreBadge'
import { useTranslation } from '@/i18n/translation'
import { useUiTranslation } from '@/i18n/uiTranslation'
import type { Product } from '../../../domain/products/types'
import { useNavigate } from 'react-router'
import { ProductCard } from '../../../components/product/ProductCardView'
import { osFilterLabel } from '@/domain/products/osFilterLabel'
import flagKorea from '../../../assets/figma/flag-korea.png'
import keyboardActiveIcon from '../../../assets/figma/keyboard-active.svg'
import keyboardIcon from '../../../assets/figma/keyboard.svg'
import mouseActiveIcon from '../../../assets/figma/mouse-active.svg'
import mouseIcon from '../../../assets/figma/mouse.svg'
import shoppingBagIcon from '../../../assets/figma/shopping-bag.svg'
import countryEmptyIcon from '../../../assets/figma/product-country-empty.png'
import { ProductServerState } from '../../../components/product/ProductServerStateView'
import { EllipsisText } from '../../../components/ui/TooltipControl'
function ProductListRow({ onAddToCart, product }: { onAddToCart: (product: Product) => void; product: Product }) {
  const { t } = useTranslation()
  const { uiText } = useUiTranslation()
  const navigate = useNavigate()
  const mouseActive = product.mouseIncluded === true
  const keyboardActive = product.keyboardIncluded === true
  const part = product.pricingType === 'one_time' && product.billingUnit === 'unit'
  const productPrice = part ? product.unitPrice : product.unitPrice ?? product.monthlyPrice
  const openProduct = () => {
    const path = `/products/${product.productId}`
    if (document.getElementById('comviewers-google-translate')?.dataset.active === 'true') {
      window.location.assign(path)
      return
    }
    void navigate(path)
  }

  return (
    <tr className="product-list-table__row" role="link" tabIndex={0} onClick={event => { if (!(event.target as HTMLElement).closest('button,a,input,select,textarea')) openProduct() }} onKeyDown={event => { if (event.key === 'Enter' && event.target === event.currentTarget) openProduct() }}>
      <td><EllipsisText>{product.productId}</EllipsisText></td>
      <td><EllipsisText className="product-table-copy">{osFilterLabel(product.osFilterValue) ?? product.os ?? t('common.noInformation')}</EllipsisText></td>
      <td><EllipsisText className="product-table-copy">{product.cpu ?? t('common.noInformation')}</EllipsisText></td>
      <td className="product-table-cores notranslate" translate="no"><CpuCoreBadge value={product.cpuCores} truncate /></td>
      <td><span className="tag tag--blue"><EllipsisText>{product.ram ?? t('common.noInformation')}</EllipsisText></span></td>
      <td><span className="tag tag--gray"><EllipsisText>{product.disk ?? t('common.noInformation')}</EllipsisText></span></td>
      <td><span className="tag tag--red"><EllipsisText>{product.gpu ?? t('common.noInformation')}</EllipsisText></span></td>
      <td>
        <span className="product-table-peripherals">
          <i className="is-mouse"><img alt={uiText(product.mouseIncluded === null ? '마우스 정보 없음' : mouseActive ? '마우스 사용 가능' : '마우스 사용 불가')} src={mouseActive ? mouseActiveIcon : mouseIcon} /></i>
          <i className="is-keyboard"><img alt={uiText(product.keyboardIncluded === null ? '키보드 정보 없음' : keyboardActive ? '키보드 사용 가능' : '키보드 사용 불가')} src={keyboardActive ? keyboardActiveIcon : keyboardIcon} /></i>
        </span>
      </td>
      <td>
        <span className="product-table-country">
          {product.country && product.ip ? <><span className="product-table-country__name">{product.country === "Korea" ? <img alt={uiText('대한민국')} src={flagKorea} /> : null}<EllipsisText lines={1}>{product.country}</EllipsisText></span><small><EllipsisText lines={1}>{product.ip}</EllipsisText></small></> : <img alt={uiText('국가/IP 정보 없음')} height={20} src={countryEmptyIcon} width={20} />}
        </span>
      </td>
      <td><ProductServerState state={product.serverState} /></td>
      <td className="product-table-price"><strong><EllipsisText>{t('money.krwAmount', { amount: product.setupFee.toLocaleString('ko-KR') })}</EllipsisText></strong></td>
      <td className="product-table-price"><strong><EllipsisText>{productPrice === null ? t('common.noInformation') : t('money.krwAmount', { amount: productPrice.toLocaleString('ko-KR') })}</EllipsisText></strong></td>
      <td><button disabled={productPrice === null} aria-label={t('catalogUi.addProduct', { id: product.productId })} onClick={() => onAddToCart(product)} type="button"><img alt="" src={shoppingBagIcon} /></button></td>
    </tr>
  )
}

export function ProductResults({ products, view, onAddToCart }: { products: Product[]; view: 'cards' | 'list'; onAddToCart: (product: Product) => void }) {
  const { locale, t } = useTranslation()
  if (view === 'cards') return <div className="product-card-grid">{products.map((product) => <ProductCard key={product.id} onAddToCart={onAddToCart} product={product} size="large" />)}</div>
  const partOnly = products.length > 0 && products.every((product) => product.pricingType === 'one_time' && product.billingUnit === 'unit')
  return (
<div className={`product-table-wrap${locale !== 'ko' ? ' product-table-wrap--translated' : ''}`}>
              <table className="product-list-table product-list-table--clamped notranslate" translate="no">
                <caption className="sr-only">{t('catalogUi.productList')}</caption>
                <colgroup>
                  <col style={{ width: '52px' }} />
                  <col style={{ width: '108px' }} />
                  <col style={{ width: '132px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '90px' }} />
                  <col style={{ width: '90px' }} />
                  <col style={{ width: '170px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '104px' }} />
                  <col style={{ width: '70px' }} />
                  <col style={{ width: '88px' }} />
                  <col style={{ width: '88px' }} />
                  <col style={{ width: '68px' }} />
                </colgroup>
                <thead><tr>{[t('product.number'), 'OS', 'CPU', 'CORE', 'RAM', 'DISK', 'GPU', t('product.peripherals'), 'IP', t('product.serverStatus'), t(partOnly ? 'money.additionalCost' : 'money.setupFee'), t(partOnly ? 'money.productAmount' : 'money.monthlyRental'), t('cart.add')].map((label) => <th key={label} scope="col"><EllipsisText lines={1}>{label}</EllipsisText></th>)}</tr></thead>
                <tbody>{products.map((product) => <ProductListRow key={product.id} onAddToCart={onAddToCart} product={product} />)}</tbody>
              </table>
            </div>
  )
}
