import { useUiTranslation } from '@/i18n/uiTranslation'
import { useEffect, useId, useRef, useState } from 'react'
import type { PageLocale } from '../../i18n/translation'

export type LanguageChoice = 'ko' | 'en' | 'ja' | 'zh-CN' | 'zh-TW'

const languages: readonly { value: LanguageChoice; label: string }[] = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'zh-CN', label: '简体中文' },
  { value: 'zh-TW', label: '繁體中文' },
]

export function LanguageMenu({ locale, onSelect, status, triggerLabel }: {
  locale: PageLocale
  triggerLabel?: string
  onSelect: (value: LanguageChoice) => void
  status?: 'idle' | 'loading' | 'ready' | 'error'
}) {
  const { uiText } = useUiTranslation()
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selected = languages.find(language => language.value === locale)

  useEffect(() => {
    if (locale === 'vi') onSelect('ko')
  }, [locale, onSelect])

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return <div className="language-menu" ref={rootRef}>
    <button
      aria-controls={menuId}
      aria-expanded={open}
      aria-label={uiText('언어: {language}', { language: selected?.label ?? '한국어' })}
      className="language-menu__trigger"
      onClick={() => setOpen(current => !current)}
      ref={triggerRef}
      type="button"
    >{triggerLabel ?? selected?.label ?? '한국어'}<span aria-hidden="true" className="language-menu__chevron" /></button>
    {open ? <div aria-label={uiText('번역 언어')} className="language-menu__list" id={menuId} role="group">
      {languages.map(language => <button
        aria-pressed={language.value === locale}
        key={language.value}
        onClick={() => { setOpen(false); onSelect(language.value) }}
        type="button"
      >{language.label}</button>)}
    </div> : null}
    {status === 'loading' ? <span className="language-menu__status" role="status">{uiText('번역기 불러오는 중…')}</span> : null}
    {status === 'error' ? <span className="language-menu__status language-menu__status--error" role="alert">{uiText('번역기를 불러오지 못했습니다.')}</span> : null}
  </div>
}
