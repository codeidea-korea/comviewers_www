import type { ReactNode } from 'react'
import type { ButtonOwnProps } from './ButtonControl'
import type { DialogLayerProps } from './DialogLayerControl'
import { Button } from './ButtonControl'
import { DialogLayer } from './DialogLayerControl'
import { TranslatedText, type TranslationKey } from '../../i18n/translation'

const commonActionKeys: Readonly<Record<string, TranslationKey>> = {
  확인: 'common.confirm',
  닫기: 'common.close',
  취소: 'common.cancel',
  '다시 시도': 'common.retry',
  로그인하기: 'auth.loginAction',
}

function ModalActionLabel({ label, translationKey }: { label: string; translationKey?: TranslationKey }) {
  const key = translationKey ?? commonActionKeys[label]
  return key ? <TranslatedText id={key} /> : label
}

export interface ModalProps extends Pick<DialogLayerProps, 'isOpen' | 'onClose' | 'returnFocusRef' | 'title' | 'titleTranslationKey'> {
  children?: ReactNode
  className?: string
  closeLabel?: string
  closeTranslationKey?: TranslationKey
  closeVariant?: ButtonOwnProps['variant']
  confirmDisabled?: boolean
  confirmFirst?: boolean
  confirmLabel?: string
  confirmTranslationKey?: TranslationKey
  confirmVariant?: ButtonOwnProps['variant']
  onConfirm?: () => void
  showClose?: boolean
}

export function Modal({
  children,
  className = '',
  closeLabel = '닫기',
  closeTranslationKey,
  closeVariant = 'secondary',
  confirmDisabled = false,
  confirmFirst = false,
  confirmLabel = '확인',
  confirmTranslationKey,
  confirmVariant = 'primary',
  isOpen,
  onClose,
  onConfirm,
  returnFocusRef,
  showClose = true,
  title,
  titleTranslationKey,
}: ModalProps) {
  return (
    <DialogLayer backdropClassName="modal-backdrop" dialogClassName={`modal ${className}`.trim()} isOpen={isOpen} onClose={onClose} returnFocusRef={returnFocusRef} title={title} titleTranslationKey={titleTranslationKey}>
        <div className="modal__content">{children}</div>
        <div className="modal__actions">
          {confirmFirst && onConfirm ? <Button disabled={confirmDisabled} onClick={onConfirm} size="large" variant={confirmVariant}><ModalActionLabel label={confirmLabel} translationKey={confirmTranslationKey} /></Button> : null}
          {showClose ? <Button onClick={onClose} size="large" variant={closeVariant}><ModalActionLabel label={closeLabel} translationKey={closeTranslationKey} /></Button> : null}
          {!confirmFirst && onConfirm ? <Button disabled={confirmDisabled} onClick={onConfirm} size="large" variant={confirmVariant}><ModalActionLabel label={confirmLabel} translationKey={confirmTranslationKey} /></Button> : null}
        </div>
    </DialogLayer>
  )
}

