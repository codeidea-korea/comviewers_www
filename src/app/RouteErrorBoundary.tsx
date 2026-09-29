import { Component, type ReactNode } from 'react'
import { useHref, useLocation } from 'react-router'

class ScreenBoundary extends Component<{ children: ReactNode; homeHref: string; resetKey: string }, { failed: boolean; chunkFailed: boolean }> {
  state = { failed: false, chunkFailed: false }

  static getDerivedStateFromError(error: unknown) {
    const message = error instanceof Error ? `${error.name} ${error.message}` : ''
    return { failed: true, chunkFailed: /ChunkLoadError|dynamically imported module|loading chunk|module script|Importing a module script/i.test(message) }
  }

  componentDidUpdate(previous: Readonly<{ children: ReactNode; homeHref: string; resetKey: string }>) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false, chunkFailed: false })
  }

  render() {
    if (!this.state.failed) return this.props.children
    return <main className="route-error-page" role="alert">
      <div className="route-error-page__content">
        <span className="route-error-page__brand">ComViewers</span>
        <span className="route-error-page__eyebrow">잠시 문제가 발생했습니다</span>
        <h1>화면을 표시하지 못했습니다.</h1>
        <p>{this.state.chunkFailed ? '화면을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침해 주세요.' : '일시적인 오류가 발생했습니다. 다시 시도하거나 페이지를 새로고침해 주세요.'}</p>
        <div className="route-error-page__actions">
          {!this.state.chunkFailed && <button className="route-error-page__primary" type="button" onClick={() => this.setState({ failed: false, chunkFailed: false })}>다시 시도</button>}
          <button className={this.state.chunkFailed ? 'route-error-page__primary' : 'route-error-page__secondary'} type="button" onClick={() => window.location.reload()}>새로고침</button>
        </div>
        <a className="route-error-page__home" href={this.props.homeHref}>메인으로 이동</a>
      </div>
    </main>
  }
}

export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation()
  const homeHref = useHref('/')
  return <ScreenBoundary homeHref={homeHref} resetKey={location.key}>{children}</ScreenBoundary>
}

