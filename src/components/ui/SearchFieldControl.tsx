import type { InputHTMLAttributes, KeyboardEvent, ReactNode } from 'react'
import { useId } from 'react'

export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onSubmit' | 'value'> {
  controlClassName?: string
  icon?: string
  iconClassName?: string
  label: ReactNode
  labelClassName?: string
  onSubmit?: (value: string) => void
  submitLabel?: string
  value?: string
}

export function SearchField({
  className = '',
  controlClassName = '',
  icon,
  iconClassName,
  label,
  labelClassName = 'sr-only',
  onSubmit,
  submitLabel,
  ...inputProps
}: SearchFieldProps) {
  const inputId = useId()
  const handleSubmit = () => onSubmit?.(inputProps.value ?? '')
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    inputProps.onKeyDown?.(event)
    if (event.key === 'Enter' && onSubmit && !event.defaultPrevented) {
      event.preventDefault()
      handleSubmit()
    }
  }
  const action = submitLabel ? (
    <button aria-label={submitLabel} onClick={handleSubmit} type="button"><img alt="" src={icon} /></button>
  ) : icon ? <img alt="" aria-hidden="true" className={iconClassName} src={icon} /> : null
  const control = <><input {...inputProps} id={inputId} onKeyDown={handleKeyDown} type="search" />{action}</>

  return (
    <div className={className} role="search">
      <label className={labelClassName} htmlFor={inputId}>{label}</label>
      {controlClassName ? <span className={controlClassName}>{control}</span> : control}
    </div>
  )
}

