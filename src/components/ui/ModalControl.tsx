import type { ReactNode } from 'react'
import type { ButtonOwnProps } from './ButtonControl'
import type { DialogLayerProps } from './DialogLayerControl'
import { Button } from './ButtonControl'
import { DialogLayer } from './DialogLayerControl'

export interface ModalProps extends Pick<DialogLayerProps, 'isOpen' | 'onClose' | 'returnFocusRef' | 'title'> {
  children?: ReactNode
  className?: string
  closeLabel?: string
  closeVariant?: ButtonOwnProps['variant']
  confirmDisabled?: boolean
  confirmFirst?: boolean
  confirmLabel?: string
  confirmVariant?: ButtonOwnProps['variant']
  onConfirm?: () => void
  showClose?: boolean
}

export function Modal({
  children,
  className = '',
  closeLabel = '닫기',
  closeVariant = 'secondary',
  confirmDisabled = false,
  confirmFirst = false,
  confirmLabel = '확인',
  confirmVariant = 'primary',
  isOpen,
  onClose,
  onConfirm,
  returnFocusRef,
  showClose = true,
  title,
}: ModalProps) {
  return (
    <DialogLayer backdropClassName="modal-backdrop" dialogClassName={`modal ${className}`.trim()} isOpen={isOpen} onClose={onClose} returnFocusRef={returnFocusRef} title={title}>
        <div className="modal__content">{children}</div>
        <div className="modal__actions">
          {confirmFirst && onConfirm ? <Button disabled={confirmDisabled} onClick={onConfirm} size="large" variant={confirmVariant}>{confirmLabel}</Button> : null}
          {showClose ? <Button onClick={onClose} size="large" variant={closeVariant}>{closeLabel}</Button> : null}
          {!confirmFirst && onConfirm ? <Button disabled={confirmDisabled} onClick={onConfirm} size="large" variant={confirmVariant}>{confirmLabel}</Button> : null}
        </div>
    </DialogLayer>
  )
}

