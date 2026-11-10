import type { RefObject } from 'react'
import { useUiTranslation } from '@/i18n/uiTranslation'
import { Modal } from '../ui/ModalControl'

export interface OrderPurchaseConfirmDialogProps {
  confirmDisabled?: boolean
  confirmLabel?: string
  error?: string
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => void
  points?: number | null
  rewardOnPayment?: boolean
  accruedPoints?: number | null
  returnFocusRef?: RefObject<HTMLElement | null>
}

export function OrderPurchaseConfirmDialog({ confirmDisabled = false, confirmLabel = '구매확정하기', error, isOpen, onClose, onConfirm = () => {}, points, rewardOnPayment = false, accruedPoints, returnFocusRef }: OrderPurchaseConfirmDialogProps) {
  const { uiText } = useUiTranslation()
  return <Modal className="modal--order-purchase" closeLabel={uiText('취소')} confirmDisabled={confirmDisabled} confirmLabel={uiText(confirmLabel)} isOpen={isOpen} onClose={onClose} onConfirm={onConfirm} returnFocusRef={returnFocusRef} title={uiText('구매확정')}><p>{rewardOnPayment
    ? <>{accruedPoints != null ? uiText('결제 완료 시 {points}점이 지급되었습니다. 지급된 포인트는 바로 사용할 수 있습니다.', { points: accruedPoints.toLocaleString('ko-KR') }) : uiText('구매 적립 포인트는 결제 완료 시 지급됩니다.')}<br /></>
    : points !== null && points !== undefined ? <>{uiText('구매확정 시 {points}점이 지급됩니다.', { points: points.toLocaleString('ko-KR') })}<br /></> : <>{uiText('구매확정 시 세팅비와 쿠폰 할인액을 제외한 렌탈금액을 기준으로 포인트가 지급됩니다.')}<br /></>}{uiText('구매확정 후에는 취소할 수 없습니다.')}<br />{uiText('중도해지·환불 시 구매 적립 포인트는 사용 여부와 관계없이 환불액에서 공제합니다. 결제에 사용한 포인트는 기존 기준에 따라 복원하며, 사용한 쿠폰은 복원하지 않습니다.')}</p>{error ? <p role="alert">{uiText(error)}</p> : null}</Modal>
}
