import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { RelativeLink as Link } from '../../components/navigation/RelativeLinkView'
import { Modal } from '../../components/ui/ModalControl'
import { Pagination } from '../../components/ui/PaginationControl'
import { Checkbox } from '../../components/ui/CheckboxControl'
import { useReviews, useReviewProduct } from '@/routes/community/-components/hooks/useContent'
import { BoardToolbar, CommunityShell, CommunityTabs, Stars } from './CommunityComponentsView'
import { useSession } from '@/app/session/SessionProvider'
import { LoadingState } from '@/components/ui/LoadingStateControl'

function RentalReviewListContent() {
  const [search, setSearch] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const [sort, setSort] = useState('latest')
  const [currentPage, setCurrentPage] = useState(1)
  const boardRef = useRef<HTMLDivElement>(null)
  const result = useReviews()
  const session = useSession()
  const catalogReviews = useMemo(() => result.data ?? [], [result.data])
  const reviews = useMemo(() => catalogReviews.filter((review) => {
    const matchesSearch = `${review.productName} ${review.content}`.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (!mineOnly || review.isMine)
  }).sort((left, right) => sort === 'oldest' ? left.reviewId.localeCompare(right.reviewId) : sort === 'views' ? 0 : right.reviewId.localeCompare(left.reviewId)), [mineOnly, search, sort, catalogReviews])
  const totalPages = Math.ceil(reviews.length / 9)
  const page = totalPages > 0 ? Math.min(currentPage, totalPages) : 1
  const displayedReviews = reviews.slice((page - 1) * 9, page * 9)

  return (
    <div className={`board-page content-container${!result.isPending && !result.isError && !reviews.length ? ' board-page--empty' : ''}`} ref={boardRef}>
      <CommunityTabs active="reviews" />
      <BoardToolbar count={reviews.length} onSearchChange={(value) => { setSearch(value); setCurrentPage(1) }} onSortChange={(value) => { setSort(value); setCurrentPage(1) }} search={search} sort={sort} />
      <div className="rental-review-list">{result.isPending ? <LoadingState className="route-loading--compact" label="후기를 불러오는 중입니다." /> : result.isError ? <p role="alert">후기를 불러오지 못했습니다. <button type="button" onClick={() => void result.refetch()}>다시 시도</button></p> : !reviews.length ? <div className="board-empty">검색 결과가 없습니다.</div> : null}
        {displayedReviews.map((review) => (
          <Link key={review.id} state={{ reviewId: review.reviewId }} to="/community/reviews">
            <span className="rental-review-list__top"><span><i>{review.reviewId}</i>{review.isMine ? <em>내 후기</em> : null}<Stars tone="mono" value={review.rating} /></span><span className="rental-review-list__meta">{review.author}<i />{review.date}</span></span>
            <span className="rental-review-list__body"><span><span className="rental-review-list__product-id"><span>품번</span><b>{review.productId}</b></span><small>{review.center}</small></span><p>{review.content}</p></span>
          </Link>
        ))}
      </div>
      {session.status === 'authenticated' && (catalogReviews.length > 0 || mineOnly) ? <label className="board-mine-toggle"><Checkbox checked={mineOnly} onChange={(event) => { setMineOnly(event.target.checked); setCurrentPage(1) }} role="switch" variant="switch" /> 내 후기만 보기</label> : null}
      <Pagination currentPage={page} onPageChange={(page) => { setCurrentPage(page); boardRef.current?.scrollIntoView({ block: 'start' }) }} totalPages={totalPages} />
    </div>
  )
}

export function RentalReviewListPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const result = useReviews()
  const [reviewId, setReviewId] = useState<string | null>(null)
  useEffect(() => {
    const state: unknown = location.state
    if (!state || typeof state !== 'object' || !('reviewId' in state) || typeof state.reviewId !== 'string') return
    setReviewId(state.reviewId)
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location.pathname, location.search, location.state, navigate])
  const review = result.data?.find((item) => item.reviewId === reviewId)
  const product = useReviewProduct(review?.productId)
  const close = () => setReviewId(null)
  return (
    <CommunityShell>
      <RentalReviewListContent />
      {review ? <Modal className="modal--review" confirmLabel="상품 보러가기" isOpen={Boolean(reviewId)} onClose={close} onConfirm={() => navigate(`/products/${review.productId}`)} title="렌탈 후기">
        <div className="review-detail-modal">
          <div className="review-detail-modal__product"><span><strong>품번 {review.productId}</strong><small>{review.center}</small></span><p>{product.data ? [product.data.os, product.data.cpu, product.data.ram, product.data.disk, product.data.gpu].join(" / ") : review.productName}</p></div>
          <section className="review-detail-modal__rating"><strong>상품 만족도</strong><Stars tone="mono" value={review.rating} /></section>
          <section className="review-detail-modal__copy">
            <strong>후기 내용</strong>
            <div aria-label="후기 내용 스크롤 영역" className="review-detail-modal__scroll" role="region" tabIndex={0}>
              <p>{review.content}</p>
            </div>
          </section>
        </div>
      </Modal> : reviewId && !result.isPending ? <Modal isOpen onClose={close} title="렌탈 후기"><p>해당 후기를 찾을 수 없습니다.</p></Modal> : null}
    </CommunityShell>
  )
}

