import { RelativeLink as Link } from '../components/navigation/RelativeLinkView'
import { AppShell } from '../components/layout/AppShellView'
import { Button } from '../components/ui/ButtonControl'

export function NotReadyPage({ title }: { title: string }) {
  return (
    <AppShell>
      <section className="not-ready-page">
        <div className="auth-panel auth-panel--result">
          <h1>{title}</h1>
          <p>요청한 화면을 찾을 수 없습니다. 메뉴에서 이동 경로를 확인해 주세요.</p>
          <Button as={Link} size="large" to="/">메인으로</Button>
        </div>
      </section>
    </AppShell>
  )
}
