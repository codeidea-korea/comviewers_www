import { useTranslation } from '@/i18n/translation'
import type { Product } from '../../../domain/products/types'
import { useNavigate } from 'react-router'
import { ProductCard } from '../../../components/product/ProductCardView'
import flagKorea from '../../../assets/figma/flag-korea.png'
import keyboardActiveIcon from '../../../assets/figma/keyboard-active.svg'
import keyboardIcon from '../../../assets/figma/keyboard.svg'
import mouseActiveIcon from '../../../assets/figma/mouse-active.svg'
import mouseIcon from '../../../assets/figma/mouse.svg'
import shoppingBagIcon from '../../../assets/figma/shopping-bag.svg'
import linkOffIcon from '../../../assets/figma/link-off.svg'
import serverLinkIcon from '../../../assets/figma/server-link.svg'
function ProductListRow({ onAddToCart, product }: { onAddToCart: (product: Product) => void; product: Product }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const mouseActive = product.mouseIncluded === true
  const keyboardActive = product.keyboardIncluded === true
  const serverOnline = product.serverState === 'online'
  const part = product.pricingType === 'one_time' && product.billingUnit === 'unit'
  const productPrice = part ? product.unitPrice : product.unitPrice ?? product.monthlyPrice
  const openProduct = () => {
    const path = `/products/${product.productId}`
    if (import.meta.env.DEV && document.getElementById('comviewers-google-translate')?.dataset.active === 'true') {
      window.location.assign(path)
      return
    }
    void navigate(path)
  }

  return (
    <tr className="product-list-table__row" role="link" tabIndex={0} onClick={event => { if (!(event.target as HTMLElement).closest('button,a,input,select,textarea')) openProduct() }} onKeyDown={event => { if (event.key === 'Enter' && event.target === event.currentTarget) openProduct() }}>
      <td>{product.productId}</td>
      <td><span className="product-table-copy">{product.os ?? t('common.noInformation')}</span></td>
      <td><span className="product-table-copy">{product.cpu ?? t('common.noInformation')}</span></td>
      <td><span className="tag tag--blue">{product.ram ?? t('common.noInformation')}</span></td>
      <td><span className="tag tag--gray">{product.disk ?? t('common.noInformation')}</span></td>
      <td><span className="tag tag--red">{product.gpu ?? t('common.noInformation')}</span></td>
      <td>
        <span className="product-table-peripherals">
          <i className={`is-mouse${product.mouseIncluded === null ? ' is-unknown' : ''}`} title={product.mouseIncluded === null ? '마우스 정보 없음' : undefined}>{product.mouseIncluded === null ? t('common.noInformation') : <img alt={mouseActive ? '마우스 사용 가능' : '마우스 사용 불가'} src={mouseActive ? mouseActiveIcon : mouseIcon} />}</i>
          <i className={`is-keyboard${product.keyboardIncluded === null ? ' is-unknown' : ''}`} title={product.keyboardIncluded === null ? '키보드 정보 없음' : undefined}>{product.keyboardIncluded === null ? t('common.noInformation') : <img alt={keyboardActive ? '키보드 사용 가능' : '키보드 사용 불가'} src={keyboardActive ? keyboardActiveIcon : keyboardIcon} />}</i>
        </span>
      </td>
      <td>
        <span className="product-table-country">
          <span className="product-table-country__name">{product.country === "Korea" ? <img alt="대한민국" src={flagKorea} /> : null}<span>{product.country ?? t('common.noInformation')}</span></span>
          <small>{product.ip ?? t('common.noInformation')}</small>
        </span>
      </td>
      <td>{product.serverState === null ? t('common.noInformation') : <span className={`product-table-status${serverOnline ? ' is-online' : ''}`}><img alt={serverOnline ? t('product.connected') : t('product.disconnected')} src={serverOnline ? serverLinkIcon : linkOffIcon} /></span>}</td>
      <td className="product-table-price"><strong>{t('money.krwAmount', { amount: product.setupFee.toLocaleString('ko-KR') })}</strong></td>
      <td className="product-table-price"><strong>{productPrice === null ? t('common.noInformation') : t('money.krwAmount', { amount: productPrice.toLocaleString('ko-KR') })}</strong></td>
      <td><button disabled={productPrice === null} aria-label={`${product.productId} 장바구니 담기`} onClick={() => onAddToCart(product)} type="button"><img alt="" src={shoppingBagIcon} /></button></td>
    </tr>
  )
}

export function ProductResults({ products, view, onAddToCart }: { products: Product[]; view: 'cards' | 'list'; onAddToCart: (product: Product) => void }) {
  const { t } = useTranslation()
  if (view === 'cards') return <div className="product-card-grid">{products.map((product) => <ProductCard key={product.id} onAddToCart={onAddToCart} product={product} size="large" />)}</div>
  const partOnly = products.length > 0 && products.every((product) => product.pricingType === 'one_time' && product.billingUnit === 'unit')
  return (
<div className="product-table-wrap">
              <table className={['product-list-table', import.meta.env.DEV ? 'notranslate' : ''].filter(Boolean).join(' ')} translate={import.meta.env.DEV ? 'no' : undefined}>
                <caption className="sr-only">RCPC 상품 목록</caption>
                <colgroup>
                  <col style={{ width: '52px' }} />
                  <col style={{ width: '108px' }} />
                  <col style={{ width: '132px' }} />
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
                <thead><tr>{[t('product.number'), 'OS', 'CPU', 'RAM', 'DISK', 'GPU', t('product.peripherals'), 'IP', t('product.serverStatus'), t(partOnly ? 'money.additionalCost' : 'money.setupFee'), t(partOnly ? 'money.productAmount' : 'money.monthlyRental'), t('cart.add')].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
                <tbody>{products.map((product) => <ProductListRow key={product.id} onAddToCart={onAddToCart} product={product} />)}</tbody>
              </table>
            </div>
  )
}
