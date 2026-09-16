import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { RelativeLink as Link } from '../../components/navigation/RelativeLinkView'
import { Pagination } from '../../components/ui/PaginationControl'
import { Checkbox } from '../../components/ui/CheckboxControl'
import communityBubble from '../../assets/figma/community-bubble.svg'
import attachmentIcon from '../../assets/figma/community-company/support-attachment.svg'
import { usePosts } from '@/routes/community/-components/hooks/useContent'
import { BoardToolbar, CommunityShell, CommunityTabs } from './CommunityComponentsView'
import { useSession } from '@/app/session/SessionProvider'
import { Modal } from '@/components/ui/ModalControl'
import { AsyncContentState, resolveAsyncContentStatus } from '@/components/common/AsyncContentState'
import { communityListReturnTo } from './communityNavigation'

export function CommunityPostListPage() {
  const [params, setParams] = useSearchParams()
  const initialSort = ['latest', 'views', 'comments'].includes(params.get('sort') ?? '') ? params.get('sort')! : 'latest'
  const [search, setSearch] = useState(params.get('keyword') ?? '')
  const [mineOnly, setMineOnly] = useState(params.get('mineOnly') === 'true')
  const [sort, setSort] = useState(initialSort)
  const [currentPage, setCurrentPage] = useState(Math.max(1, Number(params.get('page')) || 1))
  const [loginRequired, setLoginRequired] = useState(false)
  const boardRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const session = useSession()
  const communityWriteAllowed = session.status !== 'authenticated' || (session.capabilityStatus === 'ready' && session.customerSession?.myPageOnly !== true)
  const result = usePosts({ keyword: search.trim() || undefined, mineOnly, sort })
  const catalogPosts = useMemo(() => result.data ?? [], [result.data])
  const writeParams = new URLSearchParams()
  if (search.trim()) writeParams.set('keyword', search.trim())
  if (mineOnly) writeParams.set('mineOnly', 'true')
  if (sort !== 'latest') writeParams.set('sort', sort)
  if (currentPage > 1) writeParams.set('page', String(currentPage))
  const preservedSearch = writeParams.toString()
  const detailReturnTo = communityListReturnTo(writeParams)
  const detailSuffix = detailReturnTo === '/community/posts' ? '' : detailReturnTo.slice('/community/posts'.length)
  const writePath = `/community/posts/new${preservedSearch ? `?${preservedSearch}` : ''}`
  const posts = useMemo(() => {
    const filtered = catalogPosts.filter((post) => (!mineOnly || post.isMine) && `${post.title} ${post.content.join(' ')}`.toLowerCase().includes(search.trim().toLowerCase()))
    return filtered
  }, [mineOnly, search, catalogPosts])
  const totalPages = Math.ceil(posts.length / 10)
  const page = totalPages > 0 ? Math.min(currentPage, totalPages) : 1
  const visiblePosts = posts.slice((page - 1) * 10, page * 10)
  const contentStatus = resolveAsyncContentStatus({ isPending: result.isPending, isError: result.isError, isEmpty: posts.length === 0 })
  const stateOnly = contentStatus === 'error' || contentStatus === 'empty'
  const changePage = (page: number) => {
    setCurrentPage(page)
    const next = new URLSearchParams(params)
    if (page > 1) next.set('page', String(page)); else next.delete('page')
    setParams(next, { replace: true })
    boardRef.current?.scrollIntoView({ block: 'start' })
  }
  const updateListState = (nextSearch: string, nextSort: string, nextMineOnly: boolean) => {
    const next = new URLSearchParams()
    if (nextSearch.trim()) next.set('keyword', nextSearch.trim())
    if (nextMineOnly) next.set('mineOnly', 'true')
    if (nextSort !== 'latest') next.set('sort', nextSort)
    setParams(next, { replace: true })
  }
  return (
    <CommunityShell>
      <div className={`board-page content-container${stateOnly ? ' board-page--empty' : ''}`} ref={boardRef}>
        <CommunityTabs active="posts" />
        <BoardToolbar count={posts.length} onSearchChange={(value) => { setSearch(value); setCurrentPage(1); updateListState(value, sort, mineOnly) }} onSortChange={(value) => { setSort(value); setCurrentPage(1); updateListState(search, value, mineOnly) }} onWrite={session.status === 'authenticated' ? undefined : () => setLoginRequired(true)} search={search} showWrite={communityWriteAllowed} sort={sort} sortOptions={[{ label: '최신순', value: 'latest' }, { label: '조회순', value: 'views' }, { label: '댓글순', value: 'comments' }]} writeLabel="글쓰기" writeTo={writePath} />
        <AsyncContentState className="board-empty" emptyMessage={mineOnly ? '작성한 게시글이 없습니다.' : search.trim() ? '검색 조건에 해당하는 게시글이 없습니다.' : '등록된 게시글이 없습니다.'} errorMessage="게시글을 불러오지 못했습니다." loadingClassName="route-loading--compact" loadingLabel="게시글을 불러오는 중입니다." onRetry={() => void result.refetch()} status={contentStatus} />
        {contentStatus === null ? <div className="post-list">{visiblePosts.map((post) => <Link key={post.id} to={`/community/posts/${post.postId}${detailSuffix}`}><span className="post-list__number">{post.number}</span><span className="post-list__main"><strong>{post.isMine ? <em className="post-list__badge">내 글</em> : null}<span>{post.title}</span>{post.attachments.length ? <img alt="첨부파일 있음" className="post-list__document" src={attachmentIcon} /> : null}</strong><small>{post.author} <i aria-hidden="true" /> 조회 {post.views} <i aria-hidden="true" /> <img alt="" src={communityBubble} /> {post.comments}</small></span><time>{post.date}</time></Link>)}</div> : null}
        {session.status === 'authenticated' ? <label className="board-mine-toggle"><Checkbox checked={mineOnly} onChange={(event) => { const checked = event.target.checked; setMineOnly(checked); setCurrentPage(1); updateListState(search, sort, checked) }} role="switch" variant="switch" /> 내 글만 보기</label> : null}
        <Pagination currentPage={page} onPageChange={changePage} totalPages={totalPages} />
        <Modal closeLabel="취소" confirmLabel="로그인하기" isOpen={loginRequired} onClose={() => setLoginRequired(false)} onConfirm={() => navigate(`/login?returnTo=${encodeURIComponent(writePath)}`)} title="로그인이 필요합니다."><p>게시글을 작성하려면 로그인해 주세요.</p></Modal>
      </div>
    </CommunityShell>
  )
}
