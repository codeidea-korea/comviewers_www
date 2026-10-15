import { useUiTranslation } from '@/i18n/uiTranslation'
import { useEffect, useRef } from 'react'
import defaultCheckIcon from '../../assets/figma/auth-checkbox-check.svg'
import type { CSSProperties, InputHTMLAttributes } from 'react'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checkIcon?: string
  indeterminate?: boolean
  inputClassName?: string
  variant?: 'box' | 'switch'
  visualClassName?: string
}

type CheckboxStyle = CSSProperties & { '--checkbox-check-icon': string }

export function Checkbox({
  checked,
  children,
  checkIcon = defaultCheckIcon,
  className = '',
  indeterminate = false,
  inputClassName,
  variant = 'box',
  visualClassName = 'checkbox__visual',
  ...inputProps
}: CheckboxProps) {
  const { uiText } = useUiTranslation()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate
  }, [indeterminate])

  const inputStyle: CheckboxStyle = { ...inputProps.style, '--checkbox-check-icon': `url("${checkIcon}")` }

  const input = (
    <input
      {...inputProps} aria-label={inputProps['aria-label'] ? uiText(inputProps['aria-label']) : undefined}
      checked={checked}
      className={`checkbox__input checkbox__input--${variant}${inputClassName ? ` ${inputClassName}` : ''}`}
      ref={inputRef}
      style={inputStyle}
      type="checkbox"
    />
  )

  if (children === undefined) return input

  return (
    <label className={className}>
      {input}
      {visualClassName ? <span aria-hidden="true" className={visualClassName}><img alt="" src={checkIcon} /></span> : null}
      <span>{typeof children === 'string' ? uiText(children) : children}</span>
    </label>
  )
}
