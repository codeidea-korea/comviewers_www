import { useSession } from '@/app/session/SessionProvider'
import { currentKstDate, dateRangeError, quickAccountDates } from './-components/accountDates'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { RelativeLink as Link } from '../../components/navigation/RelativeLinkView'
import { AppShell } from '../../components/layout/AppShellView'
import { mypageManagerMenu, mypageMenu } from '../../navigation/menuItems'
import { MyPageProductSearch } from './-components/MyPageProductSearch'
import { SearchField } from '@/components/ui/SearchFieldControl'
import { useMobileOverlay } from '@/components/ui/useMobileOverlay'
import searchIcon from '@/assets/figma/mypage-search.svg'
import backIcon from '@/assets/figma/chevron-left.svg'
import closeIcon from '@/assets/figma/inquiry-modal-close.svg'
import { managerScopedPath } from './-components/managerPortalPath'
import { TranslatedText, type TranslationKey } from '../../i18n/translation'
import { ManualTranslationControls } from '../../components/layout/GoogleTranslateTrial'

interface MyPageMenuItem { id: string; label: string; href: string; disabled?: boolean }
interface MyPageMenuGroup { id: string; label: string; href?: string; disabled?: boolean; opensPasswordGate?: boolean; items: readonly MyPageMenuItem[] }

const menuTranslationKeys: Readonly<Partial<Record<string, TranslationKey>>> = {
  rcpc: 'nav.rcpcManagement',
  'rcpc-list': 'nav.myRcpc',
  orders: 'nav.orders',
  points: 'nav.points',
  coupons: 'nav.coupons',
  support: 'nav.inquiries',
  profile: 'nav.profile',
}

function MyPageMenuLabel({ item }: { item: { id: string; label: string } }) {
  const key = menuTranslationKeys[item.id]
  return key ? <TranslatedText id={key} /> : item.label
}

export function MobileBottomSheet({ children, hideHeader = false, id, label, onClose, open }: { children: ReactNode; hideHeader?: boolean; id: string; label: string; onClose?: () => void; open: boolean }) {
  const surfaceRef = useRef<HTMLElement | null>(null)
  useMobileOverlay(open, onClose)

  useEffect(() => {
    if (!open) return undefined
    const focusFrame = requestAnimationFrame(() => surfaceRef.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(focusFrame)
  }, [open])

  if (!open) return null
  const titleId = `${id}-title`
  return (
    <div className="mobile-bottom-sheet" id={id}>
      <button aria-label="바텀시트 닫기" className="mobile-bottom-sheet__backdrop" onClick={onClose} type="button" />
      <section aria-labelledby={titleId} aria-modal="true" className="mobile-bottom-sheet__surface" ref={surfaceRef} role="dialog" tabIndex={-1}>
        <div className="mobile-bottom-sheet__handle" />
        {hideHeader ? <h2 className="sr-only" id={titleId}>{label}</h2> : <header className="mobile-bottom-sheet__header">
          <h2 id={titleId}>{label}</h2>
          <button aria-label={`${label} 닫기`} className="mobile-icon-button mobile-bottom-sheet__close" onClick={onClose} type="button"><img alt="" src={closeIcon} /></button>
        </header>}
        <div className="mobile-bottom-sheet__content">{children}</div>
      </section>
    </div>
  )
}

export function MyPageMobileFilterSheet({ items = ['RCPC', '서버 위치', '서버 상태', '트래픽사용량', { label: '서버 위치', value: 'server-location-secondary' }], onClose, onSelect, open = false }: { items?: readonly (string | { label: string; value: string })[]; onClose?: () => void; onSelect?: (label: string) => void; open?: boolean }) {
  return (
    <MobileBottomSheet hideHeader id="mypage-mobile-filter" label="필터" onClose={onClose} open={open}>
      <div className="mypage-mobile-filter-options">
        {items.map((item) => {
          const value = typeof item === 'string' ? item : item.value
          const itemLabel = typeof item === 'string' ? item : item.label
          return <button key={value} onClick={() => { onSelect?.(itemLabel); onClose?.() }} type="button">{itemLabel}</button>
        })}
      </div>
    </MobileBottomSheet>
  )
}

export function MyPageMobileHeader({ menuOpen = false, onBack, onMenuToggle, onSearchOpen, showMenu = true, showSearch = true, title = 'MYPAGE' }: { menuOpen?: boolean; onBack?: () => void; onMenuToggle?: () => void; onSearchOpen?: () => void; showMenu?: boolean; showSearch?: boolean; title?: string }) {
  return (
    <header className={`mypage-mobile-header${menuOpen ? ' is-menu-open' : ''}`}>
      {menuOpen
        ? <strong className="mypage-mobile-header__title">{title}</strong>
        : <button aria-label="마이페이지 뒤로가기" className="mypage-mobile-header__back" onClick={onBack} type="button">
          <img alt="" src={backIcon} />
          <span>{title}</span>
        </button>}
      <div className="mypage-mobile-header__actions">
        {showSearch && !menuOpen ? <button aria-controls="mypage-mobile-search" aria-label="품번 검색 열기" className="mobile-icon-button" onClick={onSearchOpen} type="button"><img alt="" src={searchIcon} /></button> : null}
        {showMenu ? <button aria-controls="mypage-mobile-menu" aria-expanded={menuOpen} aria-label={menuOpen ? '마이페이지 메뉴 닫기' : '마이페이지 메뉴 열기'} className={`mypage-mobile-menu-toggle${menuOpen ? ' is-open' : ''}`} onClick={onMenuToggle} type="button">{menuOpen ? <img alt="" src={closeIcon} /> : <><span /><span /><span /></>}</button> : null}
      </div>
    </header>
  )
}

export function MyPageLayout({ children, title }: { children: ReactNode; title?: string }) {
  const { pathname, search, hash, state } = useLocation()
  const profileEntryState = pathname === '/mypage/profile' ? state : { openProfilePasswordGate: true, returnTo: `${pathname}${search}${hash}` }
  const navigate = useNavigate()
  const session = useSession()
  const capability = session.status === 'authenticated' ? session.customerSession : null
  const isManager = capability?.myPageOnly === true
  const baseMenu = isManager ? mypageManagerMenu : mypageMenu
  const menu: readonly MyPageMenuGroup[] = baseMenu.filter(group => {
    if (!capability) return false
    if (capability.myPageOnly) return ['rcpc', 'support'].includes(group.id)
    if (group.id === 'managers') return capability.cManagerManagementAvailable
    if (['orders', 'storage', 'benefits'].includes(group.id)) return capability.commerceAvailable
    return true
  }).map(group => ({ ...group, items: group.items.filter(item => !item.disabled) }))
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [mobileSearchValue, setMobileSearchValue] = useState('')
  useMobileOverlay(mobileMenuOpen, () => setMobileMenuOpen(false))

  useEffect(() => {
    setMobileMenuOpen(false)
    setMobileSearchOpen(false)
  }, [pathname])

  const submitMobileSearch = () => {
    const productNumber = mobileSearchValue.trim()
    if (!productNumber) return
    setMobileSearchOpen(false)
    navigate(managerScopedPath(`/mypage/rcpc?productNo=${encodeURIComponent(productNumber)}`, pathname))
  }
  const isCurrentMenuPath = (href: string) => {
    const scopedHref = managerScopedPath(href, pathname)
    return pathname === scopedHref || pathname.startsWith(`${scopedHref}/`)
  }

  return (
    <AppShell className="mypage-shell" showHeader={!isManager}>
      <MyPageMobileHeader
        menuOpen={mobileMenuOpen}
        onBack={() => navigate(-1)}
        onMenuToggle={() => { setMobileSearchOpen(false); setMobileMenuOpen((current) => !current) }}
        onSearchOpen={() => { setMobileMenuOpen(false); setMobileSearchOpen(true) }}
      />
      {mobileMenuOpen ? <nav aria-label="모바일 마이페이지 메뉴" className="mypage-mobile-menu" id="mypage-mobile-menu">
        <ManualTranslationControls />
        {menu.map((group) => (
          <section className={group.items.length ? 'has-children' : ''} key={group.id}>
            <h2>{group.href ? (group.disabled ? <span><MyPageMenuLabel item={group} /></span> : <Link onClick={() => setMobileMenuOpen(false)} className={isCurrentMenuPath(group.href) ? 'is-active' : undefined} state={group.opensPasswordGate ? profileEntryState : undefined} to={group.href}><MyPageMenuLabel item={group} /></Link>) : <MyPageMenuLabel item={group} />}</h2>
            {group.items.map((item) => (
              item.disabled
                ? <span className="mypage-mobile-menu__disabled" key={item.id}><MyPageMenuLabel item={item} /></span>
                : <Link className={isCurrentMenuPath(item.href) ? 'is-active' : undefined} key={item.id} onClick={() => setMobileMenuOpen(false)} to={item.href}><MyPageMenuLabel item={item} /></Link>
            ))}
          </section>
        ))}
      </nav> : null}
      <div className="mypage-layout content-container">
        <aside className="mypage-sidebar">
          <Link className="mypage-sidebar__eyebrow" to="/mypage">MYPAGE</Link>
          <MyPageProductSearch/>
          <nav aria-label="마이페이지 메뉴">
            {menu.map((group) => (
              <section key={group.id}>
                <h2>{group.href ? (group.disabled ? <span><MyPageMenuLabel item={group} /></span> : <Link className={isCurrentMenuPath(group.href) ? 'is-active' : undefined} state={group.opensPasswordGate ? profileEntryState : undefined} to={group.href}><MyPageMenuLabel item={group} /></Link>) : <MyPageMenuLabel item={group} />}</h2>
                {group.items.map((item) => (
                  item.disabled ? <span className="mypage-sidebar__disabled" key={item.id}><MyPageMenuLabel item={item} /></span> : <Link
                    className={isCurrentMenuPath(item.href) ? 'is-active' : undefined}
                    key={item.id}
                    to={item.href}
                  >
                    <MyPageMenuLabel item={item} />
                  </Link>
                ))}
              </section>
            ))}
          </nav>
        </aside>
        <div className="mypage-content">
          {title ? <h1 className="mypage-title">{title}</h1> : null}
          {children}
        </div>
      </div>
      <MobileBottomSheet id="mypage-mobile-search" label="검색" onClose={() => setMobileSearchOpen(false)} open={mobileSearchOpen}>
        <SearchField
          autoFocus
          className="mypage-mobile-search"
          controlClassName="mypage-mobile-search__control"
          label="품번 검색"
          onChange={(event) => setMobileSearchValue(event.target.value.replace(/\D/g, '').slice(0, 16))}
          onSubmit={submitMobileSearch}
          placeholder="품번 검색"
          value={mobileSearchValue}
        />
        <button className="mypage-mobile-search__submit" disabled={!mobileSearchValue.trim()} onClick={submitMobileSearch} type="button">조회</button>
      </MobileBottomSheet>
    </AppShell>
  )
}

export function MyPageTabs({ active, items }: { active: string; items: readonly { id: string; label: string; href: string }[] }) {
  return (
    <nav aria-label="페이지 구분" className="mypage-tabs">
      {items.map((item) => {
        const href = item.href
        return href.startsWith('/')
          ? <Link className={active === item.id ? 'is-active' : ''} key={item.id} to={href}>{item.label}</Link>
          : <a className={active === item.id ? 'is-active' : ''} href={href} key={item.id}>{item.label}</a>
      })}
    </nav>
  )
}

export function MyPageToolbar({ children, count, label = '전체', suffix = '' }: { children?: ReactNode; count: number; label?: string; suffix?: string }) {
  return <div className="mypage-toolbar"><strong>{label} <b>{count}</b>{suffix ? ` ${suffix}` : ''}</strong><div>{children}</div></div>
}

export function StatusBadge({ children, tone = 'green' }: { children: ReactNode; tone?: string }) {
  return <span className={`mypage-status mypage-status--${tone}`}>{children}</span>
}

export function PeriodFilter({ dates, open = false, onApply }: { dates: { from: string; to: string }; open?: boolean; onApply?: (start: string, end: string) => void }) {
  const [quickPeriod, setQuickPeriod] = useState(() =>
    Object.entries(quickAccountDates()).find(([, [from, to]]) => from === dates.from && to === dates.to)?.[0] ?? '')
  const [startDate, setStartDate] = useState(dates.from)
  const [endDate, setEndDate] = useState(dates.to)
  const today = currentKstDate()
  const [selectedDay, setSelectedDay] = useState(Number(today.slice(8)))
  const [error, setError] = useState('')
  const month = today.slice(0, 7)
  const daysInMonth = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate()
  const ranges = quickAccountDates()
  const selectQuickPeriod = (label: string) => {
    const [nextStartDate, nextEndDate] = ranges[label]
    setQuickPeriod(label)
    setStartDate(nextStartDate)
    setEndDate(nextEndDate)
  }
  return (
    <div className={`period-filter${open ? ' is-open' : ''}`}>
      <div className="period-filter__quick">
        {Object.keys(ranges).map((label) => <button aria-pressed={quickPeriod === label} key={label} onClick={() => selectQuickPeriod(label)} type="button">{label}</button>)}
      </div>
      <label><span className="sr-only">시작일</span><input onChange={(event) => { setQuickPeriod(''); setStartDate(event.target.value) }} type="date" value={startDate} /></label>
      <span>~</span>
      <label><span className="sr-only">종료일</span><input onChange={(event) => { setQuickPeriod(''); setEndDate(event.target.value) }} type="date" value={endDate} /></label>
      <button className="mypage-dark-button" onClick={() => { const nextError = dateRangeError(startDate, endDate); setError(nextError); if (!nextError) onApply?.(startDate, endDate) }} type="button">조회</button>
      <button onClick={() => { setStartDate(''); setEndDate(''); setQuickPeriod(''); setError(''); onApply?.('', '') }} type="button">초기화</button>{error ? <p role="alert">{error}</p> : null}
      {open ? <div className="period-filter__calendar" aria-label="기간 선택 달력"><strong>{today.slice(0, 4)}년 {Number(today.slice(5, 7))}월</strong><div>{Array.from({ length: daysInMonth }, (_, i) => <button aria-pressed={i + 1 === selectedDay} className={i + 1 === selectedDay ? 'is-selected' : ''} key={i + 1} onClick={() => { setSelectedDay(i + 1); setEndDate(`${month}-${String(i + 1).padStart(2, '0')}`); setQuickPeriod('') }} type="button">{i + 1}</button>)}</div></div> : null}
    </div>
  )
}

export function DataTable<Row extends { id: string }>({ caption = '목록', columns, rows }: { caption?: string; columns: readonly { key: keyof Row & string; label: ReactNode; render?: (row: Row) => ReactNode }[]; rows: readonly Row[] }) {
  return <div className="mypage-table-wrap"><table className="mypage-table"><caption className="sr-only">{caption}</caption><thead><tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : String(row[column.key] ?? '')}</td>)}</tr>)}</tbody></table></div>
}
