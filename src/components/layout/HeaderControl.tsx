import { SessionControls } from '../../app/session/SessionControls'
import { useSession } from '../../app/session/SessionProvider'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import logoPrimary from '../../assets/figma/logo-primary.png'
import logoWhite from '../../assets/figma/logo-white.png'
import shoppingBagIcon from '../../assets/figma/shopping-bag.svg'
import closeIcon from '../../assets/figma/inquiry-modal-close.svg'
import { RelativeLink as Link } from '../navigation/RelativeLinkView'
import { menuItems, utilityMenuItems } from '../../navigation/menuItems'
import { useMobileOverlay } from '../ui/useMobileOverlay'
import { GoogleTranslateTrial } from './GoogleTranslateTrial'

export function Header({ cartCount, onCartClick, state = 'sub' }: { cartCount?: number; onCartClick?: () => void; state?: 'main' | 'sub' }) {
  const navigate = useNavigate()
  const session = useSession()
  const capability = session.status === 'authenticated' ? session.customerSession : null
  const restricted = session.status === 'authenticated' && (!capability || capability.myPageOnly)
  const visibleMenuItems = restricted ? [{ id: 'my-rcpc', label: '이용 RCPC', href: '/mypage/rcpc' }, { id: 'my-favorites', label: '즐겨찾기', href: '/mypage/favorites' }, { id: 'my-inquiries', label: '문의 관리', href: '/mypage/inquiries' }] : menuItems
  const visibleUtilityItems = utilityMenuItems.filter(item => item.id !== 'signup' || session.status === 'anonymous')
  const isMain = state === 'main'
  const [mobileOpen, setMobileOpen] = useState(false)
  const mobileToggleRef = useRef<HTMLButtonElement>(null)

  useMobileOverlay(mobileOpen, () => {
    setMobileOpen(false)
    requestAnimationFrame(() => mobileToggleRef.current?.focus({ preventScroll: true }))
  })

  const closeMobileMenu = () => setMobileOpen(false)
  const openCart = () => {
    if (onCartClick) onCartClick()
    else navigate('/cart')
  }

  return (
    <header className={`site-header site-header--${state}`}>
      <GoogleTranslateTrial />
      <div className="site-header__utility">
        <div className="site-header__inner">
          <p>게임부터 작업까지, 원하는 PC 환경을 RCPC로 간편하게</p>
          <nav aria-label="사용자 메뉴" className="utility-menu notranslate" translate="no">
            {visibleUtilityItems.map((item) => item.id === 'login'
              ? <SessionControls key={item.id} loginLabel="로그인" />
              : (
                <Link key={item.id} onClick={item.id === 'cart' && onCartClick ? (event) => { event.preventDefault(); onCartClick() } : undefined} to={item.href}>
                  {item.label}
                  {item.id === 'cart' && cartCount !== undefined ? <span className="cart-count">{cartCount}</span> : null}
                </Link>
              ))}
          </nav>
        </div>
      </div>
      <div className="site-header__primary">
        <div className="site-header__inner">
          <Link className="site-logo" to={restricted ? '/mypage/rcpc' : '/'}>
            <img alt="ComViewers" src={isMain ? logoWhite : logoPrimary} />
          </Link>
          <nav aria-label="주 메뉴" className="main-menu">
            {visibleMenuItems.map((item) => <Link key={item.id} to={item.href}>{item.label}</Link>)}
          </nav>
          <div className="mobile-header-actions">
            <button
              aria-label={`장바구니 ${cartCount ?? 0}개`}
              className="mobile-cart-button"
              onClick={openCart}
              type="button"
            >
              <img alt="" aria-hidden="true" src={shoppingBagIcon} />
              {cartCount !== undefined ? <span className="mobile-cart-button__count">{cartCount}</span> : null}
            </button>
            <button aria-controls="mobile-site-menu" aria-expanded={mobileOpen} aria-label={mobileOpen ? '메뉴 닫기' : '메뉴 열기'} className={`mobile-menu-toggle${mobileOpen ? ' is-open' : ''}`} onClick={() => setMobileOpen((current) => !current)} ref={mobileToggleRef} type="button">{mobileOpen ? <img alt="" className="mobile-menu-toggle__close" src={closeIcon} /> : <><span /><span /><span /></>}</button>
          </div>
        </div>
      </div>
      {mobileOpen ? <button aria-label="메뉴 외부 영역 닫기" className="mobile-menu-backdrop" onClick={closeMobileMenu} type="button" /> : null}
      {mobileOpen ? <nav aria-label="모바일 메뉴" className="mobile-site-menu is-open" id="mobile-site-menu">
        <div className="mobile-site-menu__main">
          {visibleMenuItems.map((item) => <Link key={item.id} onClick={closeMobileMenu} to={item.href}>{item.label}</Link>)}
        </div>
        <div className="mobile-site-menu__auth notranslate" translate="no"><SessionControls />
          {visibleUtilityItems.filter(item => item.id !== 'cart' && item.id !== 'login').map((item) => (
            <Link key={item.id} onClick={(event) => { closeMobileMenu(); if (item.id === 'cart' && onCartClick) { event.preventDefault(); onCartClick() } }} to={item.href}>
              {item.label}{item.id === 'cart' && cartCount !== undefined ? <span className="cart-count">{cartCount}</span> : null}
            </Link>
          ))}
        </div>
      </nav> : null}
    </header>
  )
}

