import type { Product } from '@/domain/products/types'
import type { ProductReviewController } from './hooks/useProductReviews'
import { Modal } from '../../../components/ui/ModalControl'
import { ProductReviewCard, ProductReviewDialog } from '../../../components/commerce/ProductReviewDialogControl'

export function ProductReviewDialogs({ preview, visualComposite, product }: { preview: ProductReviewController; visualComposite: boolean; product: Product }) {
  const { reviewDialogMode, setReviewDialogMode, reviewDialogReturnFocusRef, deleteReviewIndex, setDeleteReviewIndex, confirmReviewDelete, reviewDeleteReturnFocusRef } = preview
  return (<>
      {visualComposite
        ? <div aria-label="후기 작성 상태 비교" className="review-create-backdrop is-composite" inert role="region"><ProductReviewCard onCancel={() => {}} onSubmit={() => {}} /><ProductReviewCard filled onCancel={() => {}} onSubmit={() => {}} /></div>
        : <ProductReviewDialog product={product} initial={preview.editingReview} eligibleRentals={preview.eligibleRentals} pending={preview.pending} error={preview.error} onSubmit={(draft, rentalId) => void preview.submitReview(draft, rentalId)} filled={reviewDialogMode === 'edit'} isOpen={reviewDialogMode !== null} onClose={() => setReviewDialogMode(null)} returnFocusRef={reviewDialogReturnFocusRef} />}
      <Modal closeLabel="취소" confirmLabel="삭제" confirmDisabled={preview.pending} isOpen={deleteReviewIndex !== null} onClose={() => { if (!preview.pending) setDeleteReviewIndex(null) }} onConfirm={confirmReviewDelete} returnFocusRef={reviewDeleteReturnFocusRef} title="후기를 삭제하시겠습니까?">
        {preview.error ? <p role="alert">{preview.error}</p> : null}
        <p>삭제한 후기는 복구할 수 없습니다.<br />후기 삭제를 진행하시겠습니까?</p>
      </Modal>
  </>)
}
