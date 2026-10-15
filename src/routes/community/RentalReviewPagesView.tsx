import { useUiTranslation } from '@/i18n/uiTranslation'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { RelativeLink as Link } from '../../components/navigation/RelativeLinkView'
import { Modal } from '../../components/ui/ModalControl'
import { Pagination } from '../../components/ui/PaginationControl'
import { LoadingState } from '../../components/ui/LoadingStateControl'
import { Checkbox } from '../../components/ui/CheckboxControl'
import { useReview, useReviewPage, useReviewProduct } from '@/routes/community/-components/hooks/useContent'
import { useDebouncedValue } from '@/routes/community/-components/hooks/useDebouncedValue'
import { BoardToolbar, CommunityShell, CommunityTabs, Stars } from './CommunityComponentsView'
import { useSession } from '@/app/session/SessionProvider'
import { AsyncContentState, resolveAsyncContentStatus } from '@/components/common/AsyncContentState'
import './rental-review-dialog.css'

function RentalReviewListContent() {
  const { uiText } = useUiTranslation()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim())
  const [mineOnly, setMineOnly] = useState(false)
  const [sort, setSort] = useState('latest')
  const [currentPage, setCurrentPage] = useState(1)
  const boardRef = useRef<HTMLDivElement>(null)
  const result = useReviewPage({ page: currentPage, size: 9, keyword: debouncedSearch || undefined, mineOnly, sort })
  const session = useSession()
  const reviews = result.data?.items ?? []
  const totalPages = result.data?.totalPages ?? 0
  const page = totalPages > 0 ? Math.min(currentPage, totalPages) : 1
  const displayedReviews = reviews
  useEffect(() => {
    if (result.data && totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, result.data, totalPages])
  const contentStatus = resolveAsyncContentStatus({ isPending: result.isPending, isError: result.isError, isEmpty: reviews.length === 0 })
  const stateOnly = contentStatus === 'error' || contentStatus === 'empty'

  return (
    <div className={`board-page board-page--rental-reviews content-container${stateOnly ? ' board-page--empty' : ''}`} ref={boardRef}>
      <CommunityTabs active="reviews" />
      <BoardToolbar count={result.data?.totalCount ?? 0} onSearchChange={(value) => { setSearch(value); setCurrentPage(1) }} onSortChange={(value) => { setSort(value); setCurrentPage(1) }} search={search} sort={sort} sortOptions={[{ label: uiText('최신순'), value: 'latest' }, { label: uiText('오래된순'), value: 'oldest' }]} />
      <div className="rental-review-list">
        <AsyncContentState className="board-empty" emptyMessage={uiText("검색 결과가 없습니다.")} errorMessage={uiText("후기를 불러오지 못했습니다.")} loadingClassName="route-loading--compact" loadingLabel={uiText("후기를 불러오는 중입니다.")} onRetry={() => void result.refetch()} status={contentStatus} />
        {contentStatus === null ? displayedReviews.map((review) => (
          <Link key={review.id} to={`/community/reviews?review=${encodeURIComponent(review.reviewId)}`}>
            <span className="rental-review-list__top"><span><i>{review.reviewId}</i>{review.isMine ? <em>{uiText("내 후기")}</em> : null}<Stars tone="mono" value={review.rating} /></span><span className="rental-review-list__meta">{review.author}<i />{review.date}</span></span>
            <span className="rental-review-list__body"><span><span className="rental-review-list__product-id"><span>{uiText("품번")}</span><b>{review.productId}</b></span><small>{review.center}</small></span><p>{review.content}</p></span>
          </Link>
        )) : null}
      </div>
      <div className="board-page__footer">
        {session.status === 'authenticated' ? <label className="board-mine-toggle"><Checkbox checked={mineOnly} onChange={(event) => { setMineOnly(event.target.checked); setCurrentPage(1) }} role="switch" variant="switch" /> {uiText("내 후기만 보기")}</label> : null}
        <Pagination currentPage={page} onPageChange={(page) => { setCurrentPage(page); boardRef.current?.scrollIntoView({ block: 'start' }) }} totalPages={totalPages} />
      </div>
    </div>
  )
}

export function RentalReviewListPage() {
  const { uiText } = useUiTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const queryReviewId = new URLSearchParams(location.search).get('review')
  const reviewId = queryReviewId && /^[1-9]\d{0,18}$/.test(queryReviewId) ? queryReviewId : null
  const result = useReview(reviewId)
  useEffect(() => {
    const state: unknown = location.state
    if (!state || typeof state !== 'object' || !('reviewId' in state) || typeof state.reviewId !== 'string') return
    if (!/^[1-9]\d{0,18}$/.test(state.reviewId)) return
    const params = new URLSearchParams(location.search)
    params.set('review', state.reviewId)
    void navigate(`${location.pathname}?${params}`, { replace: true, state: null })
  }, [location.pathname, location.search, location.state, navigate])
  const review = result.data
  const product = useReviewProduct(review?.productId)
  const close = () => {
    const params = new URLSearchParams(location.search)
    params.delete('review')
    const search = params.size ? `?${params}` : ''
    void navigate(`${location.pathname}${search}`, { replace: true, state: null })
  }
  const openProduct = () => {
    if (!review) return
    const path = `/products/${encodeURIComponent(review.productId)}`
    if (document.documentElement.classList.contains('translated-ltr')) window.location.assign(path)
    else void navigate(path)
  }
  return (
    <CommunityShell>
      <RentalReviewListContent />
      {review ? <Modal className="modal--review modal--rental-review-layer notranslate" confirmLabel={uiText("상품 보러가기")} isOpen={Boolean(reviewId)} onClose={close} onConfirm={openProduct} title={uiText("렌탈 후기")}>
        <div className="review-detail-modal">
          <div className="review-detail-modal__product"><span><strong>{uiText("품번")} {review.productId}</strong><small>{review.center}</small></span><p>{product.data ? [product.data.os, product.data.cpu, product.data.ram, product.data.disk, product.data.gpu].join(" / ") : review.productName}</p></div>
          <section className="review-detail-modal__rating"><strong>{uiText("상품 만족도")}</strong><Stars tone="mono" value={review.rating} /></section>
          <section className="review-detail-modal__copy">
            <strong>{uiText("후기 내용")}</strong>
            <div aria-label={uiText("후기 내용 스크롤 영역")} className="review-detail-modal__scroll" role="region" tabIndex={0}>
              <p>{review.content}</p>
            </div>
          </section>
        </div>
      </Modal> : reviewId && result.isPending ? <Modal className="modal--rental-review-layer notranslate" isOpen onClose={close} title={uiText("렌탈 후기")}><LoadingState className="route-loading--compact" label={uiText("후기를 불러오는 중입니다.")} /></Modal> : reviewId && result.isError ? <Modal className="modal--rental-review-layer notranslate" isOpen onClose={close} title={uiText("렌탈 후기")}><p role="alert">{uiText("후기를 불러오지 못했습니다.")}</p><button onClick={() => void result.refetch()} type="button">{uiText("다시 시도")}</button></Modal> : reviewId ? <Modal className="modal--rental-review-layer notranslate" isOpen onClose={close} title={uiText("렌탈 후기")}><p>{uiText("해당 후기를 찾을 수 없습니다.")}</p></Modal> : null}
    </CommunityShell>
  )
}

