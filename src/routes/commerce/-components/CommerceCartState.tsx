import type { ReactNode } from 'react'
import { LoadingState } from '@/components/ui/LoadingStateControl'

type Props = {
  status: 'loading' | 'error' | 'empty'
  loadingLabel: string
  errorMessage?: string
  onRetry?: () => void
  errorAction?: ReactNode
  children?: ReactNode
}

export function CommerceCartState({ status, loadingLabel, errorMessage, onRetry, errorAction, children }: Props) {
  return <section aria-busy={status === 'loading' ? true : undefined} className="cart-empty">
    {status === 'loading' ? <LoadingState label={loadingLabel} /> : null}
    {status === 'error' ? <>
      <p role="alert">{errorMessage}</p>
      {onRetry ? <button onClick={onRetry} type="button">다시 시도</button> : null}
      {errorAction}
    </> : null}
    {status === 'empty' ? children : null}
  </section>
}
