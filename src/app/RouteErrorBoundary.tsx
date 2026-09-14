import { Component, type ReactNode } from 'react'
import { useLocation } from 'react-router'

class ScreenBoundary extends Component<{ children: ReactNode; resetKey: string }, { failed: boolean; chunkFailed: boolean }> {
  state = { failed: false, chunkFailed: false }

  static getDerivedStateFromError(error: unknown) {
    const message = error instanceof Error ? `${error.name} ${error.message}` : ''
    return { failed: true, chunkFailed: /ChunkLoadError|dynamically imported module|loading chunk|module script|Importing a module script/i.test(message) }
  }

  componentDidUpdate(previous: Readonly<{ children: ReactNode; resetKey: string }>) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false, chunkFailed: false })
  }

  render() {
    if (!this.state.failed) return this.props.children
    return <section className="content-container" role="alert">
      <h1>화면을 표시하지 못했습니다.</h1>
      <p>{this.state.chunkFailed ? '화면을 불러오지 못했습니다. 연결을 확인하고 새로고침해 주세요.' : '다시 시도하거나 페이지를 새로고침해 주세요.'}</p>
      {!this.state.chunkFailed && <button type="button" onClick={() => this.setState({ failed: false, chunkFailed: false })}>다시 시도</button>}
      <button type="button" onClick={() => window.location.reload()}>새로고침</button>
    </section>
  }
}

export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation()
  return <ScreenBoundary resetKey={location.key}>{children}</ScreenBoundary>
}

