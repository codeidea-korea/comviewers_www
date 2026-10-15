import type { ChangeEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Modal } from './ModalControl'
import { useTranslation, type TranslationKey } from '../../i18n/translation'

const imageErrorKeys: Readonly<Record<string, TranslationKey>> = {
  'JPG, JPEG, PNG 형식의 5MB 이하 이미지를 선택해 주세요.': 'shell.profileImageInvalid',
  '이미지 미리보기를 불러오지 못했습니다. 다시 선택해 주세요.': 'shell.profileImagePreviewFailed',
}

export interface ProfileImagePickerProps {
  alt: string
  className?: string
  inputClassName?: string
  disabled?: boolean
  onError?: (message: string) => void
  onSelect?: (source: string, file: File) => void
  resetKey?: string | number
  value: string
  variant?: 'catalog' | 'auth'
}

export function ProfileImagePicker({ alt, className = '', inputClassName = '', disabled = false, onError, onSelect, resetKey = 0, value, variant = 'catalog' }: ProfileImagePickerProps) {
  const { t } = useTranslation()
  const readTokenRef = useRef(0)
  const [errorMessage, setErrorMessage] = useState('')
  const reportError = (message: string) => {
    if (onError) onError(message)
    else setErrorMessage(message)
  }
  useEffect(() => { readTokenRef.current += 1 }, [resetKey, value])
  useEffect(() => () => { readTokenRef.current += 1 }, [])

  const selectImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const token = readTokenRef.current + 1
    readTokenRef.current = token
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      event.target.value = ''
      reportError('JPG, JPEG, PNG 형식의 5MB 이하 이미지를 선택해 주세요.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => { if (readTokenRef.current === token) onSelect?.(String(reader.result), file) }
    reader.onerror = () => { if (readTokenRef.current === token) reportError('이미지 미리보기를 불러오지 못했습니다. 다시 선택해 주세요.') }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const input = <input accept=".jpg,.jpeg,.png" aria-label={t('shell.profileImageSelect')} className={inputClassName} disabled={disabled} onChange={selectImage} type="file" />
  const errorKey = imageErrorKeys[errorMessage]
  const errorDialog = <Modal isOpen={Boolean(errorMessage)} title="프로필 이미지 업로드 실패" titleTranslationKey="shell.profileImageUploadFailed" closeLabel="확인" onClose={() => setErrorMessage('')}><p className="notranslate" translate="no" role="alert">{errorKey ? t(errorKey) : errorMessage}</p></Modal>
  if (variant === 'auth') return <><div className={`profile-image-picker profile-image-field${className ? ` ${className}` : ''}`}><span className="notranslate" translate="no">{t('shell.profileImage')}</span><div className="profile-image-field__row"><div className="profile-image-preview"><img alt={alt} src={value} /></div><div className="profile-image-field__actions"><label className="file-button notranslate" translate="no">{t('shell.profileImageSelect')}{input}</label><small className="notranslate" translate="no">{t('shell.profileImageFormats')}<br />{t('shell.profileImageSizeAuth')}</small></div></div></div>{errorDialog}</>
  return <><section className={`profile-image-picker profile-catalog__image${className ? ` ${className}` : ''}`}><strong className="notranslate" translate="no">{t('shell.profileImage')}</strong><div><img alt={alt} src={value} /><label className="notranslate" translate="no">{t('shell.profileImageSelect')}{input}</label><p className="notranslate" translate="no">{t('shell.profileImageFormats')}<br />{t('shell.profileImageSizeCatalog')}</p></div></section>{errorDialog}</>
}
