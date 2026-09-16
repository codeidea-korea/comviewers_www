import type { AriaRole, ReactNode } from 'react'
import { Button } from '../ui/ButtonControl'
import { LoadingState } from '../ui/LoadingStateControl'

export type AsyncContentStatus = 'loading' | 'error' | 'empty' | null

export function resolveAsyncContentStatus({
  isEmpty,
  isError,
  isPending,
}: {
  isEmpty: boolean
  isError: boolean
  isPending: boolean
}): AsyncContentStatus {
  if (isPending) return 'loading'
  if (isError) return 'error'
  if (isEmpty) return 'empty'
  return null
}

function mergeClasses(...classNames: Array<string | false | undefined>) {
  return classNames.filter(Boolean).join(' ')
}

export function EmptyState({
  children,
  className = '',
  role = 'status',
}: {
  children: ReactNode
  className?: string
  role?: AriaRole
}) {
  return <div className={mergeClasses('data-state', 'data-state--empty', className)} role={role}>{children}</div>
}

export function ErrorState({
  className = '',
  message,
  onRetry,
  retryLabel = '다시 시도',
}: {
  className?: string
  message: ReactNode
  onRetry?: () => void
  retryLabel?: string
}) {
  return (
    <div className={mergeClasses('data-state', 'data-state--error', className)} role="alert">
      <p className="data-state__message">{message}</p>
      {onRetry ? <Button onClick={onRetry} size="small" variant="secondary">{retryLabel}</Button> : null}
    </div>
  )
}

export function AsyncContentState({
  className = '',
  emptyMessage,
  errorMessage,
  loadingClassName = '',
  loadingLabel,
  onRetry,
  retryLabel,
  status,
}: {
  className?: string
  emptyMessage: ReactNode
  errorMessage: ReactNode
  loadingClassName?: string
  loadingLabel: string
  onRetry?: () => void
  retryLabel?: string
  status: AsyncContentStatus
}) {
  if (status === 'loading') {
    return (
      <div aria-busy="true" className={mergeClasses('data-state', 'data-state--loading', className)}>
        <LoadingState className={loadingClassName} label={loadingLabel} />
      </div>
    )
  }
  if (status === 'error') return <ErrorState className={className} message={errorMessage} onRetry={onRetry} retryLabel={retryLabel} />
  if (status === 'empty') return <EmptyState className={className}>{emptyMessage}</EmptyState>
  return null
}
