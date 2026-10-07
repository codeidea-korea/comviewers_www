import type { ReactNode, Ref } from 'react'
import { Footer } from './FooterControl'
import { Header } from './HeaderControl'
import { useCartCount } from './hooks/useCartCount'

export interface AppShellProps {
  children: ReactNode
  className?: string
  headerState?: 'main' | 'sub'
  onCartClick?: () => void
  scrollBelowHeader?: boolean
  scrollRegionRef?: Ref<HTMLDivElement>
  showHeader?: boolean
}

export function AppShell({ children, className = '', headerState = 'sub', onCartClick, scrollBelowHeader = false, scrollRegionRef, showHeader = true }: AppShellProps) {
  const cartCount = useCartCount(showHeader)
  const pageContent = <>
    <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
    <main id="main-content" tabIndex={-1}>{children}</main>
    <Footer />
  </>
  return (
    <div className={`app-shell ${className}`.trim()}>
      {showHeader ? <Header cartCount={cartCount} onCartClick={onCartClick} state={headerState} /> : null}
      {scrollBelowHeader ? <div className="app-shell__scroll-region" ref={scrollRegionRef}>{pageContent}</div> : pageContent}
    </div>
  )
}
