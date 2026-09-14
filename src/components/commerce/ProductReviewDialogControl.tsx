import type { RefObject } from 'react'
import type { EligibleRental, ReviewDraft, ProductReview } from '@/domain/reviews/reviewRepository'
import type { Product } from '@/domain/products/types'

type ReviewProduct = Pick<Product, 'productId' | 'serverRoom' | 'pricingType' | 'title' | 'description' | 'os' | 'cpu' | 'ram' | 'disk' | 'gpu'>

interface ReviewCardProps {
  filled?: boolean; onCancel: () => void; onSubmit: (draft: ReviewDraft, rentalId: string) => void
  section?: boolean; initial?: ProductReview; product?: ReviewProduct; pending?: boolean; error?: string; eligibilityPending?: boolean
  eligibleRentals?: EligibleRental[]
}
interface ReviewDialogProps extends Omit<ReviewCardProps, 'onCancel' | 'section'> {
  isOpen: boolean; onClose: () => void; returnFocusRef?: RefObject<HTMLElement | null>
}
import { useEffect, useState } from 'react'
import { PopupLayer } from '../ui/PopupLayerControl'
import { LoadingState } from '../ui/LoadingStateControl'
import reviewStarEmpty from '../../assets/figma/review-star-empty.svg'
import reviewStarFilled from '../../assets/figma/review-star-filled.svg'

export function ProductReviewCard({ filled = false, onCancel, onSubmit, section = true, initial, product, pending = false, error, eligibleRentals = [], eligibilityPending = false }: ReviewCardProps) {
  const [rating, setRating] = useState(initial?.rating ?? (filled ? 4 : 0))
  const [content, setContent] = useState(initial?.body ?? (filled ? '상품을 만족스럽게 잘 쓰고 있습니다.' : ''))
  const [rentalId, setRentalId] = useState(initial?.rentalId ?? eligibleRentals[0]?.id ?? '')
  useEffect(() => {
    if (!initial && eligibleRentals.length && !eligibleRentals.some((rental) => rental.id === rentalId)) setRentalId(eligibleRentals[0].id)
  }, [eligibleRentals, initial, rentalId])
  const formContent = (
    <>
      <h2>{initial ? '후기 수정' : '후기 작성'}</h2>
      <p className="review-create-product"><span>품번 {product?.productId ?? '89023'}</span><small>{product?.serverRoom ?? 'IRC코리아/메가서버실'}</small></p>
      <p className="review-create-spec">{product?.pricingType === 'one_time' ? [product.title,product.description].filter(Boolean).join(' · ') : product ? [product.os, product.cpu, product.ram, product.disk, product.gpu].filter(Boolean).join(' / ') : ''}</p>
      {!initial && eligibleRentals.length > 1 ? <label>구매확정 상품<select disabled={pending} onChange={(event) => setRentalId(event.target.value)} value={rentalId}>{eligibleRentals.map((rental) => <option key={rental.id} value={rental.id}>{rental.label}</option>)}</select></label> : null}
      {!initial && eligibilityPending ? <LoadingState className="route-loading--compact" label="후기 작성 가능 여부를 확인하고 있습니다." /> : !initial && !eligibleRentals.length && product ? <p role="status">후기를 작성할 수 있는 구매확정 상품이 없습니다.</p> : null}
      <div className="review-create-rating"><span>상품 만족도</span><div>{[1,2,3,4,5].map((star) => <button disabled={pending} aria-label={`${star}점`} aria-pressed={rating >= star} key={star} onClick={() => setRating(star)} type="button"><img alt="" src={rating >= star ? reviewStarFilled : reviewStarEmpty} /></button>)}</div></div>
      <label className="review-create-text"><span>후기 내용 (10~500자)</span><textarea disabled={pending} maxLength={500} onChange={(event) => setContent(event.target.value)} placeholder={'상품의 성능, 접속 안정성, 이용환경 등 실제 사용 경험을\n작성해 주세요.'} value={content} /></label>
      {error ? <p role="alert" className="form-error">{error}</p> : null}
      <div className="review-create-actions"><button disabled={pending} onClick={onCancel} type="button">취소</button><button disabled={pending || !rating || (!initial && !!product && !rentalId)} onClick={() => onSubmit({ rating, body: content }, rentalId)} type="button">{pending ? '저장 중…' : initial ? '후기 수정' : '후기 등록'}</button></div>
    </>
  )
  return section ? <section className={`review-create-card${filled ? ' review-create-card--filled' : ''}`}>{formContent}</section> : formContent
}

export function ProductReviewDialog({ filled = false, isOpen, onClose, returnFocusRef, pending, ...form }: ReviewDialogProps) {
  return <PopupLayer className="review-create-backdrop" dialogClassName={`review-create-card${filled ? ' review-create-card--filled' : ''}`} isOpen={isOpen} onClose={() => { if (!pending) onClose() }} returnFocusRef={returnFocusRef} showTitle={false} title={form.initial ? '후기 수정' : '후기 작성'}><ProductReviewCard key={`${isOpen}-${form.initial?.id ?? 'new'}`} {...form} pending={pending} filled={filled} onCancel={onClose} section={false} /></PopupLayer>
}
