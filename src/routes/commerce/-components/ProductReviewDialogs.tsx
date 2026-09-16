import type { Product } from '@/domain/products/types'
import type { ProductReviewController } from './hooks/useProductReviews'
import { Modal } from '../../../components/ui/ModalControl'
import { ProductReviewDialog } from '../../../components/commerce/ProductReviewDialogControl'

export function ProductReviewDialogs({ reviews, product }: { reviews: ProductReviewController; product: Product }) {
  const { reviewDialogMode, setReviewDialogMode, reviewDialogReturnFocusRef, deleteReviewIndex, setDeleteReviewIndex, confirmReviewDelete, reviewDeleteReturnFocusRef } = reviews
  return (<>
      <ProductReviewDialog product={product} initial={reviews.editingReview} eligibleRentals={reviews.eligibleRentals} pending={reviews.pending} error={reviews.error} onSubmit={(draft, rentalId) => void reviews.submitReview(draft, rentalId)} filled={reviewDialogMode === 'edit'} isOpen={reviewDialogMode !== null} onClose={() => setReviewDialogMode(null)} returnFocusRef={reviewDialogReturnFocusRef} />
      <Modal closeLabel="취소" confirmLabel="삭제" confirmDisabled={reviews.pending} isOpen={deleteReviewIndex !== null} onClose={() => { if (!reviews.pending) setDeleteReviewIndex(null) }} onConfirm={confirmReviewDelete} returnFocusRef={reviewDeleteReturnFocusRef} title="후기를 삭제하시겠습니까?">
        {reviews.error ? <p role="alert">{reviews.error}</p> : null}
        <p>삭제한 후기는 복구할 수 없습니다.<br />후기 삭제를 진행하시겠습니까?</p>
      </Modal>
  </>)
}
