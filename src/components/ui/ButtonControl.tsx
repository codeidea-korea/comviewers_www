import type { ButtonHTMLAttributes, ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import { Icon } from './IconControl'

export type ButtonIcon = 'chevron-left' | 'chevron-right' | 'eye' | 'eye-off' | 'eye-disabled'

export interface ButtonOwnProps {
  children?: ReactNode
  className?: string
  disabled?: boolean
  fullWidth?: boolean
  tabIndex?: number
  icon?: ButtonIcon
  leadingIcon?: ButtonIcon
  trailingIcon?: ButtonIcon
  size?: 'small' | 'medium' | 'large'
  variant?: 'primary' | 'secondary' | 'outline' | 'outline-dark'
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
}

export type ButtonProps<C extends ElementType = 'button'> = ButtonOwnProps & {
  as?: C
} & Omit<ComponentPropsWithoutRef<C>, keyof ButtonOwnProps | 'as'>

const mergeClasses = (...classNames: Array<string | false | undefined>) => classNames.filter(Boolean).join(' ')

export function Button<C extends ElementType = 'button'>({
  as,
  children,
  className = '',
  disabled = false,
  fullWidth = false,
  icon,
  leadingIcon,
  size = 'medium',
  trailingIcon = icon,
  variant = 'primary',
  type = 'button',
  ...buttonProps
}: ButtonProps<C>) {
  const Component: ElementType = as ?? 'button'
  const iconTone = disabled ? 'disabled' : ['primary', 'outline'].includes(variant) ? 'inverse' : 'default'
  const classes = mergeClasses(
    'button',
    `button--${size}`,
    `button--${variant}`,
    (leadingIcon || trailingIcon) && 'button--with-icon',
    fullWidth && 'button--full-width',
  )
  const disabledProps = Component === 'button'
    ? { disabled, type }
    : { 'aria-disabled': disabled || undefined, tabIndex: disabled ? -1 : buttonProps.tabIndex }

  return (
    <Component
      {...buttonProps}
      {...disabledProps}
      className={mergeClasses(classes, className)}
    >
      {leadingIcon ? <span className="button__icon button__icon--leading"><Icon name={leadingIcon} size={size === 'large' ? 20 : 18} tone={iconTone} /></span> : null}
      {children}
      {trailingIcon ? <span className="button__icon button__icon--trailing"><Icon name={trailingIcon} size={size === 'large' ? 20 : 18} tone={iconTone} /></span> : null}
    </Component>
  )
}
