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
  const navigate = useNavigate()
  const mouseActive = product.mouseIncluded === true
  const keyboardActive = product.keyboardIncluded === true
  const serverOnline = product.serverState === 'online'
  const part = product.pricingType === 'one_time' && product.billingUnit === 'unit'
  const productPrice = part ? product.unitPrice : product.unitPrice ?? product.monthlyPrice

  return (
    <tr className="product-list-table__row" role="link" tabIndex={0} onClick={event => { if (!(event.target as HTMLElement).closest('button,a,input,select,textarea')) void navigate(`/products/${product.productId}`) }} onKeyDown={event => { if (event.key === 'Enter') void navigate(`/products/${product.productId}`) }}>
      <td>{product.productId}</td>
      <td><span className="product-table-copy">{product.os ?? '정보 없음'}</span></td>
      <td><span className="product-table-copy">{product.cpu ?? '정보 없음'}</span></td>
      <td><span className="tag tag--blue">{product.ram ?? '정보 없음'}</span></td>
      <td><span className="tag tag--gray">{product.disk ?? '정보 없음'}</span></td>
      <td><span className="tag tag--red">{product.gpu ?? '정보 없음'}</span></td>
      <td>
        <span className="product-table-peripherals">
          <i className={`is-mouse${product.mouseIncluded === null ? ' is-unknown' : ''}`} title={product.mouseIncluded === null ? '마우스 정보 없음' : undefined}>{product.mouseIncluded === null ? "정보 없음" : <img alt={mouseActive ? '마우스 사용 가능' : '마우스 사용 불가'} src={mouseActive ? mouseActiveIcon : mouseIcon} />}</i>
          <i className={`is-keyboard${product.keyboardIncluded === null ? ' is-unknown' : ''}`} title={product.keyboardIncluded === null ? '키보드 정보 없음' : undefined}>{product.keyboardIncluded === null ? "정보 없음" : <img alt={keyboardActive ? '키보드 사용 가능' : '키보드 사용 불가'} src={keyboardActive ? keyboardActiveIcon : keyboardIcon} />}</i>
        </span>
      </td>
      <td>
        <span className="product-table-country">
          <span className="product-table-country__name">{product.country === "Korea" ? <img alt="대한민국" src={flagKorea} /> : null}<span>{product.country ?? '정보 없음'}</span></span>
          <small>{product.ip ?? '정보 없음'}</small>
        </span>
      </td>
      <td>{product.serverState === null ? "정보 없음" : <span className={`product-table-status${serverOnline ? ' is-online' : ''}`}><img alt={serverOnline ? '서버 연결됨' : '서버 연결 끊김'} src={serverOnline ? serverLinkIcon : linkOffIcon} /></span>}</td>
      <td className="product-table-price"><strong>{product.setupFee.toLocaleString('ko-KR')}</strong><span>원</span></td>
      <td className="product-table-price"><strong>{productPrice?.toLocaleString('ko-KR') ?? '정보 없음'}</strong><span>원</span></td>
      <td><button disabled={productPrice === null} aria-label={`${product.productId} 장바구니 담기`} onClick={() => onAddToCart(product)} type="button"><img alt="" src={shoppingBagIcon} /></button></td>
    </tr>
  )
}

export function ProductResults({ products, view, onAddToCart }: { products: Product[]; view: 'cards' | 'list'; onAddToCart: (product: Product) => void }) {
  if (view === 'cards') return <div className="product-card-grid">{products.map((product) => <ProductCard key={product.id} onAddToCart={onAddToCart} product={product} size="large" />)}</div>
  const partOnly = products.length > 0 && products.every((product) => product.pricingType === 'one_time' && product.billingUnit === 'unit')
  return (
<div className="product-table-wrap">
              <table className="product-list-table">
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
                <thead><tr>{['품번', 'OS', 'CPU', 'RAM', 'DISK', 'GPU', '주변기기', 'IP', '서버상태', partOnly ? '추가 비용' : '세팅비', partOnly ? '상품 금액' : '월 렌탈료', '담기'].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
                <tbody>{products.map((product) => <ProductListRow key={product.id} onAddToCart={onAddToCart} product={product} />)}</tbody>
              </table>
            </div>
  )
}
