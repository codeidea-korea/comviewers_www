import { PcSpecSummary } from '@/components/product/PcSpecSummary'
import { formatCpuCoreLine } from '@/domain/products/cpuCores'
import { useUiTranslation, translateUiText } from '@/i18n/uiTranslation'
import type { RefObject } from 'react'
import type { EligibleRental, ReviewDraft, ProductReview } from '@/domain/reviews/reviewRepository'
import type { Product } from '@/domain/products/types'

type ReviewProduct = Pick<Product, 'productId' | 'serverRoom' | 'pricingType' | 'title' | 'description' | 'os' | 'cpu' | 'ram' | 'disk' | 'gpu'> & Partial<Pick<Product, 'cpuCores'>>

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

// The repository appends these fixed UI statuses after product and server-room data.
function reviewPurchaseLabel(label: string) {
  const suffix = ['렌탈 구매확정', '부품 수령·구매확정'].find(status => label.endsWith(` · ${status}`))
  return suffix ? `${label.slice(0, -suffix.length)}${translateUiText(suffix)}` : label
}

export function ProductReviewCard({ filled = false, onCancel, onSubmit, section = true, initial, product, pending = false, error, eligibleRentals = [], eligibilityPending = false }: ReviewCardProps) {
  const { uiText } = useUiTranslation()
  const [rating, setRating] = useState(initial?.rating ?? (filled ? 4 : 0))
  const [content, setContent] = useState(initial?.body ?? (filled ? '상품을 만족스럽게 잘 쓰고 있습니다.' : ''))
  const [rentalId, setRentalId] = useState(initial?.rentalId ?? eligibleRentals[0]?.id ?? '')
  useEffect(() => {
    if (!initial && eligibleRentals.length && !eligibleRentals.some((rental) => rental.id === rentalId)) setRentalId(eligibleRentals[0].id)
  }, [eligibleRentals, initial, rentalId])
  const formContent = (
    <>
      <h2>{uiText(initial ? '후기 수정' : '후기 작성')}</h2>
      <p className="review-create-product"><span>{uiText('품번 {id}', { id: product?.productId ?? '89023' })}</span><small>{product?.serverRoom ?? 'IRC코리아/메가서버실'}</small></p>
      <p className="review-create-spec">{product?.pricingType === 'one_time' ? [product.title,product.description].filter(Boolean).join(' · ') : product ? <PcSpecSummary text={[[product.os, product.cpu].filter(Boolean).join(' / '), formatCpuCoreLine(product.cpuCores), [product.ram, product.disk, product.gpu].filter(Boolean).join(' / ')].filter(Boolean).join('\n')} /> : ''}</p>
      {!initial && eligibleRentals.length > 1 ? <label>{uiText('구매확정 상품')}<select disabled={pending} onChange={(event) => setRentalId(event.target.value)} value={rentalId}>{eligibleRentals.map((rental) => <option key={rental.id} value={rental.id}>{reviewPurchaseLabel(rental.label)}</option>)}</select></label> : null}
      {!initial && eligibilityPending ? <LoadingState className="route-loading--compact" label={uiText('후기 작성 가능 여부를 확인하고 있습니다.')} /> : !initial && !eligibleRentals.length && product ? <p role="status">{uiText('후기를 작성할 수 있는 구매확정 상품이 없습니다.')}</p> : null}
      <div className="review-create-rating"><span>{uiText('상품 만족도')}</span><div>{[1,2,3,4,5].map((star) => <button disabled={pending} aria-label={uiText('{rating}점', { rating: star })} aria-pressed={rating >= star} key={star} onClick={() => setRating(star)} type="button"><img alt="" src={rating >= star ? reviewStarFilled : reviewStarEmpty} /></button>)}</div></div>
      <label className="review-create-text"><span>{uiText('후기 내용 (10~500자)')}</span><textarea disabled={pending} onChange={(event) => setContent(event.target.value)} placeholder={uiText('상품의 성능, 접속 안정성, 이용환경 등 실제 사용 경험을\n작성해 주세요.')} value={content} /></label>
      <div className="review-create-feedback">{error ? <p role="alert" className="form-error">{uiText(error)}</p> : null}</div>
      <div className="review-create-actions"><button disabled={pending} onClick={onCancel} type="button">{uiText('취소')}</button><button disabled={pending || (!initial && !!product && !rentalId)} onClick={() => onSubmit({ rating, body: content }, rentalId)} type="button">{uiText(pending ? '저장 중…' : initial ? '후기 수정' : '후기 등록')}</button></div>
    </>
  )
  return section ? <section className={`review-create-card notranslate${filled ? ' review-create-card--filled' : ''}`} translate="no">{formContent}</section> : formContent
}

export function ProductReviewDialog({ filled = false, isOpen, onClose, returnFocusRef, pending, ...form }: ReviewDialogProps) {
  const { uiText } = useUiTranslation()
  return <PopupLayer className="review-create-backdrop notranslate" dialogClassName={`review-create-card${filled ? ' review-create-card--filled' : ''}`} isOpen={isOpen} onClose={() => { if (!pending) onClose() }} returnFocusRef={returnFocusRef} showTitle={false} title={uiText(form.initial ? '후기 수정' : '후기 작성')}><ProductReviewCard key={`${isOpen}-${form.initial?.id ?? 'new'}`} {...form} pending={pending} filled={filled} onCancel={onClose} section={false} /></PopupLayer>
}
