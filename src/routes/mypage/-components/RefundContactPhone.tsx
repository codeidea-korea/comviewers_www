import { useEffect, useRef } from 'react'
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

export function RefundContactPhone({ disabled, onChange, value }: { disabled: boolean; onChange: (value: string) => void; value: string }) {
  const validationRef = useRef<HTMLInputElement>(null)
  const parts = phoneParts(value)
  useEffect(() => {
    validationRef.current?.setCustomValidity(/^(?:[0-9+() -]{8,30})?$/.test(value) ? '' : '연락처를 확인해 주세요.')
  }, [value])
  const changePart = (index: number, next: string) => {
    if (!parts) return
    const updated = parts.map((part, partIndex) => partIndex === index ? next : part)
    onChange(updated.some(Boolean) ? updated.join('-') : '')
  }
  return <fieldset className="refund-application__phone" disabled={disabled}>
    <legend>연락처</legend>
    {parts ? <div>
      <NativeSelect aria-label="연락처 앞자리" value={parts[0]} onChange={event => changePart(0, event.target.value)}>{phonePrefixOptions.map(prefix => <option key={prefix}>{prefix}</option>)}</NativeSelect>
      <input aria-label="연락처 중간자리" inputMode="numeric" maxLength={4} ref={validationRef} value={parts[1]} onChange={event => changePart(1, event.target.value.replace(/\D/g, ''))}/>
      <input aria-label="연락처 끝자리" inputMode="numeric" maxLength={4} value={parts[2]} onChange={event => changePart(2, event.target.value.replace(/\D/g, ''))}/>
    </div> : <input aria-label="연락처" maxLength={30} value={value} pattern="[0-9+() -]{8,30}" inputMode="tel" placeholder="연락처 숫자만 입력" onChange={event => onChange(event.target.value)}/>}
  </fieldset>
}
