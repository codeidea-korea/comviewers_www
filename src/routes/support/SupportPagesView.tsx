import { useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { RelativeLink as Link } from '../../components/navigation/RelativeLinkView'
import supportHero from '../../assets/figma/community-company/support-04.png'
import chevronDown from '../../assets/figma/community-company/support-chevron-down.svg'
import attachmentIcon from '../../assets/figma/community-company/support-attachment.svg'
import keepIcon from '../../assets/figma/community-company/support-keep.svg'
import searchIcon from '../../assets/figma/community-company/support-search.svg'
import downloadIcon from '../../assets/figma/community-company/support-download.svg'
import { AppShell } from '../../components/layout/AppShellView'
import { Pagination } from '../../components/ui/PaginationControl'
import { BOARD_SEARCH_MAX_LENGTH, BoardToolbar } from '../../components/community/BoardToolbarControl'
import { AttachmentList } from '../../components/ui/AttachmentListControl'
import { RichContentRenderer } from '../../components/ui/RichContentRendererControl'
import { LoadingState } from '../../components/ui/LoadingStateControl'
import { useArticlePage, useArticle } from '@/routes/community/-components/hooks/useContent'
import { useDebouncedValue } from '@/routes/community/-components/hooks/useDebouncedValue'
import { supportReturnTo } from './supportNavigation'

const supportSortOptions = [
  { label: '최신순', value: 'latest' },
  { label: '조회순', value: 'views' },
] as const
type SupportSort = (typeof supportSortOptions)[number]['value']
function supportSort(value: string | null): SupportSort {
  return value === 'views' ? 'views' : 'latest'
}
function SupportHero() {
  return (
    <section className="support-hero">
      <div className="content-container"><div><h1>고객센터</h1><p>ComViewers 서비스 이용에 필요한 안내와 주요 소식을 확인해 주세요.</p></div><img alt="고객센터 헤드셋" src={supportHero} /></div>
    </section>
  )
}

export function SupportListPage() {
  const [params, setParams] = useSearchParams()
  const sort = supportSort(params.get('sort'))
  const search = (params.get('keyword') ?? '').slice(0, BOARD_SEARCH_MAX_LENGTH)
  const debouncedSearch = useDebouncedValue(search.trim())
  const requestedPage = Number(params.get('page'))
  const currentPage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const pageRef = useRef<HTMLElement>(null)
  const result = useArticlePage({ page: currentPage, size: 10, keyword: debouncedSearch || undefined, sort })
  const visibleArticles = result.data?.items ?? []
  const totalPages = result.data?.totalPages ?? 0
  const page = totalPages > 0 ? Math.min(currentPage, totalPages) : 1
  useEffect(() => {
    if (!result.data || totalPages === 0 || currentPage <= totalPages) return
    setParams((current) => { const next = new URLSearchParams(current); next.set('page', String(totalPages)); return next }, { replace: true })
  }, [currentPage, result.data, setParams, totalPages])
  const updateParams = (values: Record<string, string>) => setParams((current) => {
    const next = new URLSearchParams(current)
    Object.entries(values).forEach(([key, value]) => { if (value) next.set(key, value); else next.delete(key) })
    return next
  })
  const listParams = new URLSearchParams()
  if (search) listParams.set('keyword', search)
  if (sort !== 'latest') listParams.set('sort', sort)
  if (currentPage > 1) listParams.set('page', String(currentPage))
  const listQuery = listParams.toString()
  const listPath = `/support${listQuery ? `?${listQuery}` : ''}`
  return (
    <AppShell className="support-shell">
      <SupportHero />
      <section className="support-page content-container" ref={pageRef}>
        <BoardToolbar className="support-toolbar" count={result.data?.totalCount ?? 0} onSearchChange={(value) => updateParams({ keyword: value, page: '' })} onSortChange={(value) => updateParams({ sort: value, page: '' })} search={search} searchIcon={searchIcon} sort={sort} sortIcon={chevronDown} sortOptions={supportSortOptions} />
        <div className="support-list">{result.isPending ? <LoadingState label="안내를 불러오는 중입니다." /> : result.isError ? <p role="alert">안내를 불러오지 못했습니다. <button type="button" onClick={() => void result.refetch()}>다시 시도</button></p> : !visibleArticles.length ? <div className="board-empty">{search ? '검색 조건에 해당하는 게시글이 없습니다.' : '등록된 게시글이 없습니다.'}</div> : null}{visibleArticles.map((article) => <Link key={article.id} to={`/support/${article.articleId}?returnTo=${encodeURIComponent(listPath)}`}><span className={article.pinned ? 'is-pinned' : ''}>{article.pinned ? <img alt="고정 공지" src={keepIcon} /> : article.number}</span><strong className={article.pinned ? 'is-pinned-title' : undefined}>{article.title}{article.attachmentCount > 0 ? <img alt="첨부파일 있음" src={attachmentIcon} /> : null}</strong><time>{article.date}</time></Link>)}</div>
        <Pagination currentPage={page} onPageChange={(nextPage) => { updateParams({ page: String(nextPage) }); pageRef.current?.scrollIntoView({ block: 'start' }) }} totalPages={totalPages} />
      </section>
    </AppShell>
  )
}

export function SupportDetailPage() {
  const { articleId } = useParams()
  const [params] = useSearchParams()
  const result = useArticle(articleId)
  const article = result.data
  const listPath = supportReturnTo(params.get('returnTo'))
  if (result.isPending) return <AppShell className="support-shell"><LoadingState label="안내를 불러오는 중입니다." /></AppShell>
  if (result.isError) return <AppShell className="support-shell"><p role="alert">안내를 불러오지 못했습니다.</p><Link to={listPath}>목록으로</Link></AppShell>
  if (!article) return <AppShell className="support-shell"><p role="alert">안내를 찾을 수 없습니다.</p><Link to={listPath}>목록으로</Link></AppShell>
  const content = article.content
  return (
    <AppShell className="support-shell">
      <article className="support-detail content-container">
        <header><h1>{article.title}</h1><time>작성일시 {article.dateTime ?? article.date}</time></header>
        <div className="support-detail__body"><RichContentRenderer attachments={article.attachments} document={article.richContent} fallback={content} /></div>
        <AttachmentList attachments={article.attachments} downloadIcon={downloadIcon} iconAlt="다운로드" />
        <Link className="board-list-button" to={listPath}>게시글 목록</Link>
      </article>
    </AppShell>
  )
}

