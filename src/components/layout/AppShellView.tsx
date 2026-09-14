import type { ReactNode } from 'react'
import { Footer } from './FooterControl'
import { Header } from './HeaderControl'
import { useCartCount } from './hooks/useCartCount'

export interface AppShellProps {
  children: ReactNode
  className?: string
  headerState?: 'main' | 'sub'
  onCartClick?: () => void
}

export function AppShell({ children, className = '', headerState = 'sub', onCartClick }: AppShellProps) {
  const cartCount = useCartCount()
  return (
    <div className={`app-shell ${className}`.trim()}>
      <Header cartCount={cartCount} onCartClick={onCartClick} state={headerState} />
      <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
      <main id="main-content" tabIndex={-1}>{children}</main>
      <Footer />
    </div>
  )
}
