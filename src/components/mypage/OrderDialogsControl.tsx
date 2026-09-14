import type { RefObject } from 'react'
import { Modal } from '../ui/ModalControl'

export interface OrderPurchaseConfirmDialogProps {
  confirmDisabled?: boolean
  confirmLabel?: string
  error?: string
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => void
  points?: number | null
  returnFocusRef?: RefObject<HTMLElement | null>
}

export function OrderPurchaseConfirmDialog({ confirmDisabled = false, confirmLabel = '구매확정하기', error, isOpen, onClose, onConfirm = () => {}, points, returnFocusRef }: OrderPurchaseConfirmDialogProps) {
  return <Modal className="modal--order-purchase" closeLabel="취소" confirmDisabled={confirmDisabled} confirmLabel={confirmLabel} isOpen={isOpen} onClose={onClose} onConfirm={onConfirm} returnFocusRef={returnFocusRef} title="구매확정"><p>{points !== null && points !== undefined ? <>구매확정 시 {points.toLocaleString('ko-KR')}점이 지급됩니다.<br /></> : <>구매확정 시 세팅비를 제외한 렌탈금액의 1%가 포인트로 적립되며, 1포인트 미만은 버립니다.<br /></>}구매확정 후에는 취소할 수 없습니다.<br />중도해지·환불 시 구매확정으로 지급된 포인트는 전액 회수합니다. 결제에 사용한 포인트는 최종 환불 인정금액의 사용 비율에 따라 부분 복원하며, 사용한 쿠폰은 복원하지 않습니다.</p>{error ? <p role="alert">{error}</p> : null}</Modal>
}
