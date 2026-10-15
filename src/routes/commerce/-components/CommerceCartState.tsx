import type { ReactNode } from 'react'
import { LoadingState } from '@/components/ui/LoadingStateControl'
import { TranslatedText } from '@/i18n/translation'

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
      {onRetry ? <button onClick={onRetry} type="button"><TranslatedText id="common.retry" /></button> : null}
      {errorAction}
    </> : null}
    {status === 'empty' ? children : null}
  </section>
}
