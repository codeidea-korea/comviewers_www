import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { useServices } from '@/app/ServiceProvider'
import { AppShell } from '@/components/layout/AppShellView'
import { legalDocumentSchema, type LegalKind } from '@/domain/legal/legalRepository'
import { RichContentRenderer } from '@/components/ui/RichContentRendererControl'
import { LoadingState } from '@/components/ui/LoadingStateControl'

function DocumentBody({ kind }: { kind: LegalKind }) {
  const { legal } = useServices()
  const [params, setParams] = useSearchParams()
  const query = useQuery({ queryKey: ['legal', kind], queryFn: async ({ signal }) => {
    const documents = legalDocumentSchema.array().parse(await legal.list(kind, signal))
    if (documents.some(item => item.kind !== kind)) throw new Error('문서 종류가 일치하지 않습니다.')
    return [...documents].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))
  } })
  if (query.isPending) return <LoadingState label="문서를 불러오는 중입니다." />
  if (query.isError) return <p role="alert">문서를 불러오지 못했습니다. <button onClick={() => void query.refetch()}>다시 시도</button></p>
  const selectedId = params.get('version')
  const document = selectedId ? query.data.find(item => item.id === selectedId) : query.data[0]
  return <>
    {!document ? <p role="status">{selectedId ? '선택한 문서 버전을 찾을 수 없습니다.' : '등록된 문서가 없습니다.'}</p> : <article className="legal-page__document">
      <RichContentRenderer document={document.richContent} fallback={document.paragraphs} />
    </article>}
    {query.data.length > 0 && <label className="legal-page__version">문서 버전 <select value={document?.id ?? ''} onChange={event => setParams(current => {
      const next = new URLSearchParams(current); next.set('version', event.target.value); return next
    })}>{!document && <option value="">버전을 선택해 주세요.</option>}{query.data.map(item => <option key={item.id} value={item.id}>{item.version} · {item.effectiveDate}</option>)}</select></label>}
  </>
}
export function LegalPage({ privacy = false }: { privacy?: boolean }) {
  const [params] = useSearchParams()
  const section = privacy ? 'privacy' : params.get('section') === 'point' ? 'point' : params.get('section') === 'refund' ? 'refund' : params.get('section') === 'rental' ? 'rental' : 'terms'
  const title = privacy ? '개인정보처리방침' : section === 'rental' ? 'RCPC 렌탈약관' : section === 'refund' ? '취소·환불·포인트 정책' : section === 'point' ? '포인트·쿠폰 정책' : '서비스 이용약관'
  return <AppShell><section className="legal-page">
    <div className="legal-page__panel">
      <header className="legal-page__heading">
        <h1>{title}</h1>
      </header>
      {!privacy && <nav aria-label="약관 종류" className="legal-page__nav">
        <Link to="/terms" aria-current={section === 'terms' ? 'page' : undefined}>서비스 이용약관</Link>
        <Link to="/terms?section=rental" aria-current={section === 'rental' ? 'page' : undefined}>RCPC 렌탈약관</Link>
        <Link to="/terms?section=refund" aria-current={section === 'refund' ? 'page' : undefined}>취소·환불·포인트 정책</Link>
      </nav>}
      <div className="legal-page__content">
        <DocumentBody key={section} kind={section} />
      </div>
    </div>
  </section></AppShell>
}
