import { useUiTranslation, translateUiText } from '@/i18n/uiTranslation'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useHref, useLocation } from 'react-router'
import { isRouteImportError, resetFailedRouteImports } from './lazyRoute'

class ScreenBoundary extends Component<{ children: ReactNode; homeHref: string; resetKey: string }, { failed: boolean; chunkFailed: boolean }> {
  state = { failed: false, chunkFailed: false }

  static getDerivedStateFromError(error: unknown) {
    return { failed: true, chunkFailed: isRouteImportError(error) }
  }

  componentDidUpdate(previous: Readonly<{ children: ReactNode; homeHref: string; resetKey: string }>, previousState: Readonly<{ failed: boolean; chunkFailed: boolean }>) {
    if (previousState.failed && previous.resetKey !== this.props.resetKey) this.retry()
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[route-error]', {
      kind: isRouteImportError(error) ? 'screen-import' : 'screen-render',
      componentStack: info.componentStack,
    })
  }

  retry = () => {
    resetFailedRouteImports()
    this.setState({ failed: false, chunkFailed: false })
  }

  render() {
    if (!this.state.failed) return this.props.children
    return <main className="route-error-page" role="alert">
      <div className="route-error-page__content">
        <span className="route-error-page__brand">ComViewers</span>
        <span className="route-error-page__eyebrow">{translateUiText('잠시 문제가 발생했습니다')}</span>
        <h1>{translateUiText('화면을 표시하지 못했습니다.')}</h1>
        <p>{translateUiText(this.state.chunkFailed ? '화면을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침해 주세요.' : '일시적인 오류가 발생했습니다. 다시 시도하거나 페이지를 새로고침해 주세요.')}</p>
        <div className="route-error-page__actions">
          {!this.state.chunkFailed && <button className="route-error-page__primary" type="button" onClick={this.retry}>{translateUiText('다시 시도')}</button>}
          <button className={this.state.chunkFailed ? 'route-error-page__primary' : 'route-error-page__secondary'} type="button" onClick={() => window.location.reload()}>{translateUiText('새로고침')}</button>
        </div>
        <a className="route-error-page__home" href={this.props.homeHref}>{translateUiText('메인으로 이동')}</a>
      </div>
    </main>
  }
}

export function RouteErrorBoundary({ children, resetKey }: { children: ReactNode; resetKey?: string }) {
  useUiTranslation()
  const location = useLocation()
  const homeHref = useHref('/')
  return <ScreenBoundary homeHref={homeHref} resetKey={resetKey ?? location.key}>{children}</ScreenBoundary>
}

