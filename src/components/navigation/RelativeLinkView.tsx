import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { toRelativeHref } from '../../lib/navigation'

export interface RelativeLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string
  replace?: boolean
  state?: unknown
}

function shouldUseBrowserDefault(event: MouseEvent<HTMLAnchorElement>, target?: string) {
  return event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey || Boolean(target && target !== '_self')
}

export const RelativeLink = forwardRef<HTMLAnchorElement, RelativeLinkProps>(function RelativeLink({
  children, onClick, replace = false, state, target, to, ...linkProps
}, ref) {
  const location = useLocation()
  const navigate = useNavigate()
  const href = toRelativeHref(to, window.location.pathname || location.pathname)
  const disabled = linkProps['aria-disabled'] === true || linkProps['aria-disabled'] === 'true'

  return (
    <a
      {...linkProps}
      href={href}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented || shouldUseBrowserDefault(event, target)) return
        if (disabled) {
          event.preventDefault()
          return
        }
        if (to.startsWith('/')) {
          event.preventDefault()
          window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
          void navigate(to, { replace, state })
        }
      }}
      ref={ref}
      target={target}
    >
      {children}
    </a>
  )
})
