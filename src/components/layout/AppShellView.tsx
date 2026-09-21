import type { ReactNode } from 'react'
import { Footer } from './FooterControl'
import { Header } from './HeaderControl'
import { useCartCount } from './hooks/useCartCount'

export interface AppShellProps {
  children: ReactNode
  className?: string
  headerState?: 'main' | 'sub'
  onCartClick?: () => void
  showHeader?: boolean
}

export function AppShell({ children, className = '', headerState = 'sub', onCartClick, showHeader = true }: AppShellProps) {
  const cartCount = useCartCount(showHeader)
  return (
    <div className={`app-shell ${className}`.trim()}>
      {showHeader ? <Header cartCount={cartCount} onCartClick={onCartClick} state={headerState} /> : null}
      <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
      <main id="main-content" tabIndex={-1}>{children}</main>
      <Footer />
    </div>
  )
}
