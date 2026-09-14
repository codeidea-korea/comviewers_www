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
  const input = <input {...inputProps} checked={checked} type="radio" />

  if (children === undefined) return input

  return (
    <label className={className}>
      {input}
      {offIcon && onIcon ? <img alt="" aria-hidden="true" className={iconClassName} src={checked ? onIcon : offIcon} /> : null}
      {children}
    </label>
  )
}

