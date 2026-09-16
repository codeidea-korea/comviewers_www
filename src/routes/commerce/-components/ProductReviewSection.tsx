import type { ProductReviewController } from './hooks/useProductReviews'
import { Pagination } from '../../../components/ui/PaginationControl'
import { LoadingState } from '../../../components/ui/LoadingStateControl'
import reviewStarFilled from '../../../assets/figma/review-star-filled.svg'
import reviewStarEmpty from '../../../assets/figma/review-star-empty.svg'
import reviewMenuMoreIcon from '../../../assets/figma/comment-more-fill.svg'
import { ReviewAuthorAvatar } from './ReviewAuthorAvatar'
function ReviewStars({ rating }: { rating: number }) {
  return (
    <span aria-label={`별점 ${rating}점`} className="review-item__rating">
      {[0, 1, 2, 3, 4].map((star) => <img alt="" key={star} src={star < rating ? reviewStarFilled : reviewStarEmpty} />)}
    </span>
  )
}

export function ProductReviewSection({ reviews }: { reviews: ProductReviewController }) {
  const {
    visibleReviews, reviewPageCount, reviewsEmpty, reviewSectionClass, reviewMenuIndex, setReviewMenuIndex,
    reviewCreateTriggerRef, reviewPage, openCreate, openEdit, openDelete,
    changePage, registerMenuButton,
  } = reviews

  return (
    <section className={reviewSectionClass.trim() || undefined} id="reviews">
      <div className="product-detail-heading">
        <h2>후기</h2>
        <button className="commerce-outline-button" title={!reviews.eligibleRentals.length ? '구매확정 상품에 대해 후기를 작성할 수 있습니다.' : undefined} disabled={reviews.query.isPending || reviews.query.isError || reviews.eligibilityQuery.isPending || reviews.eligibilityQuery.isError || !reviews.eligibleRentals.length} onClick={openCreate} ref={reviewCreateTriggerRef} type="button">후기 작성</button>
      </div>
      {reviews.eligibilityQuery.isError ? <p role="alert">후기 작성 가능 여부를 확인하지 못했습니다. <button onClick={() => void reviews.eligibilityQuery.refetch()} type="button">다시 시도</button></p> : null}
      {reviews.query.isPending ? <LoadingState className="route-loading--compact" label="후기를 불러오는 중입니다." /> : reviews.query.isError ? <p role="alert">후기를 불러오지 못했습니다. <button onClick={() => void reviews.query.refetch()} type="button">다시 시도</button></p> : reviewsEmpty ? <p className="product-empty-message">등록된 후기가 없습니다.</p> : (
        <>
          {visibleReviews.map(({ id, author, avatar, authorAvatarUrl, avatarClassName, body, rating, date, isMine }) => {
            const index = id
            return (
            <article className="review-item" key={id}>
              <header className="review-item__header">
                <div className={`review-avatar ${avatarClassName}`}><ReviewAuthorAvatar key={authorAvatarUrl ?? 'default'} path={authorAvatarUrl} fallback={avatar} /></div>
                <div className="review-item__meta">
                  <strong>{author}</strong>
                  <div><ReviewStars rating={rating} /><span>{date}</span></div>
                </div>
                {isMine ? <button
                  aria-expanded={reviewMenuIndex === index}
                  aria-haspopup="menu"
                  aria-label={`${author} 후기 메뉴`}
                  onClick={() => setReviewMenuIndex((current) => current === index ? null : index)}
                  ref={(element) => registerMenuButton(index, element)}
                  type="button"
                >
                  <img alt="" src={reviewMenuMoreIcon} />
                </button> : null}
              </header>
              <div className="review-item__body">{body.split('\n\n').map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
              {isMine && reviewMenuIndex === index && (
                <div className="review-item__menu" role="menu">
                  <button onClick={() => openEdit(index)} role="menuitem" type="button">수정</button>
                  <button onClick={() => openDelete(index)} role="menuitem" type="button">삭제</button>
                </div>
              )}
            </article>
          )})}
          {reviewPageCount > 1 ? <Pagination currentPage={reviewPage} onPageChange={changePage} totalPages={reviewPageCount} /> : null}
        </>
      )}
    </section>
  )
}
