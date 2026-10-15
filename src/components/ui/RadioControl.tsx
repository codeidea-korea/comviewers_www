import { useUiTranslation } from '@/i18n/uiTranslation'
import type { InputHTMLAttributes } from 'react'

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  iconClassName?: string
  offIcon?: string
  onIcon?: string
}

export function Radio({
  checked,
  children,
  className = '',
  iconClassName,
  offIcon,
  onIcon,
  ...inputProps
}: RadioProps) {
  const { uiText } = useUiTranslation()
  const input = <input {...inputProps} aria-label={inputProps['aria-label'] ? uiText(inputProps['aria-label']) : undefined} checked={checked} type="radio" />

  if (children === undefined) return input

  return (
    <label className={className}>
      {input}
      {offIcon && onIcon ? <img alt="" aria-hidden="true" className={iconClassName} src={checked ? onIcon : offIcon} /> : null}
      {typeof children === 'string' ? uiText(children) : children}
    </label>
  )
}

