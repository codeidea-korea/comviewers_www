import type { AriaAttributes, InputHTMLAttributes, MouseEventHandler, ReactNode } from 'react'
import type { ButtonIcon } from './ButtonControl'
import { useId } from 'react'
import { Icon } from './IconControl'

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  appearance?: 'underline' | 'box'
  controlClassName?: string
  error?: ReactNode
  helperText?: ReactNode
  inputClassName?: string
  label?: ReactNode
  labelAction?: ReactNode
  messages?: ReadonlyArray<{ text: string; tone?: 'default' | 'error' | 'success' }>
  success?: ReactNode
  trailingContent?: ReactNode
  trailingIcon?: ButtonIcon
  trailingActionLabel?: string
  trailingActionPressed?: AriaAttributes['aria-pressed']
  onTrailingIconClick?: MouseEventHandler<HTMLButtonElement>
}

const mergeClasses = (...classNames: Array<string | false | undefined>) => classNames.filter(Boolean).join(' ')

export function TextField({
  appearance = 'underline',
  className = '',
  controlClassName = '',
  disabled = false,
  error,
  helperText,
  id,
  inputClassName = '',
  label,
  labelAction,
  messages,
  success,
  trailingContent,
  trailingIcon,
  trailingActionLabel,
  trailingActionPressed,
  onTrailingIconClick,
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const message = error || success || helperText
  const hasMessage = Boolean(message || messages?.length)
  const messageId = hasMessage ? `${inputId}-message` : undefined
  const state = error ? 'error' : success ? 'success' : 'default'
  const rootClasses = `text-field text-field--${appearance} text-field--${state}`

  return (
    <div className={mergeClasses(rootClasses, className)}>
      <label className="text-field__label" htmlFor={inputId}>{label}</label>
      {labelAction ? <span className="text-field__label-action">{labelAction}</span> : null}
      <span className={`text-field__control ${controlClassName}`.trim()}>
        <input
          aria-describedby={messageId}
          aria-invalid={Boolean(error)}
          disabled={disabled}
          id={inputId}
          className={inputClassName}
          {...inputProps}
        />
        {trailingIcon && onTrailingIconClick ? (
          <button
            aria-label={trailingActionLabel}
            aria-pressed={trailingActionPressed}
            className="text-field__trailing-action"
            disabled={disabled}
            onClick={onTrailingIconClick}
            type="button"
          >
            <Icon name={disabled ? 'eye-disabled' : trailingIcon} />
          </button>
        ) : null}
        {trailingIcon && !onTrailingIconClick ? <Icon name={disabled ? 'eye-disabled' : trailingIcon} /> : null}
        {trailingContent}
      </span>
      {messages?.length ? (
        <span className="text-field__messages" id={messageId}>
          {messages.map((item) => <span className={`text-field__message text-field__message--${item.tone || 'default'}`} key={item.text}>* {item.text}</span>)}
        </span>
      ) : message ? <span className="text-field__message" id={messageId}>* {message}</span> : null}
    </div>
  )
}
