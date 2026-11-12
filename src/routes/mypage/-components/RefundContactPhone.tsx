import { useUiTranslation } from '@/i18n/uiTranslation'
import { useEffect, useId, useRef } from 'react'
import { NativeSelect } from '@/components/ui/SelectControl'
import { phonePrefixOptions } from '@/lib/formOptions'

function phoneParts(value: string) {
  if (!value) return ['010', '', '']
  const separated = /^(\d{0,3})-(\d{0,4})-(\d{0,4})$/.exec(value)
  if (separated && (!separated[1] || phonePrefixOptions.includes(separated[1]))) return [separated[1] || '010', separated[2], separated[3]]
  const compact = /^[0-9 -]+$/.test(value) ? value.replace(/[ -]/g, '') : ''
  const complete = /^(01[016789])(\d{3,4})(\d{4})$/.exec(compact)
  return complete ? complete.slice(1) : null
}

export function RefundContactPhone({ disabled, error, onChange, onInvalid, value }: { disabled: boolean; error?: string; onChange: (value: string) => void; onInvalid: () => void; value: string }) {
  const { uiText, locale } = useUiTranslation()
  const errorId = useId()
  const validationRef = useRef<HTMLInputElement>(null)
  const parts = phoneParts(value)
  useEffect(() => {
    validationRef.current?.setCustomValidity(/^(?:[0-9+() -]{8,30})?$/.test(value) ? '' : uiText("연락처를 확인해 주세요."))
  }, [locale, uiText, value])
  const changePart = (index: number, next: string) => {
    if (!parts) return
    const updated = parts.map((part, partIndex) => partIndex === index ? next : part)
    onChange(updated.some(Boolean) ? updated.join('-') : '')
  }
  return <fieldset className="refund-application__phone" disabled={disabled} onInvalid={event => { event.preventDefault(); onInvalid() }}>
    <legend>{uiText("연락처")}</legend>
    {parts ? <div>
      <NativeSelect aria-label={uiText("연락처 앞자리")} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} value={parts[0]} onChange={event => changePart(0, event.target.value)}>{phonePrefixOptions.map(prefix => <option key={prefix}>{prefix}</option>)}</NativeSelect>
      <input aria-label={uiText("연락처 중간자리")} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} inputMode="numeric" maxLength={4} ref={validationRef} value={parts[1]} onChange={event => changePart(1, event.target.value.replace(/\D/g, ''))}/>
      <input aria-label={uiText("연락처 끝자리")} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} inputMode="numeric" maxLength={4} value={parts[2]} onChange={event => changePart(2, event.target.value.replace(/\D/g, ''))}/>
    </div> : <input aria-label={uiText("연락처")} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} maxLength={30} value={value} pattern="[0-9+() -]{8,30}" inputMode="tel" placeholder={uiText("연락처 숫자만 입력")} onChange={event => onChange(event.target.value)}/>}
    {error ? <small id={errorId} className="refund-application__field-error" role="alert">{error}</small> : null}
  </fieldset>
}
