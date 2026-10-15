import type { ReactNode } from 'react'
import { LoadingState } from '@/components/ui/LoadingStateControl'
import { TranslatedText } from '@/i18n/translation'
import { useUiTranslation } from '@/i18n/uiTranslation'

type Props = {
  status: 'loading' | 'error' | 'empty'
  loadingLabel: string
  errorMessage?: string
  onRetry?: () => void
  errorAction?: ReactNode
  children?: ReactNode
}

export function CommerceCartState({ status, loadingLabel, errorMessage, onRetry, errorAction, children }: Props) {
  const { uiText } = useUiTranslation()
  return <section aria-busy={status === 'loading' ? true : undefined} className="cart-empty">
    {status === 'loading' ? <LoadingState label={loadingLabel} /> : null}
    {status === 'error' ? <>
      <p role="alert">{uiText(errorMessage)}</p>
      {onRetry ? <button onClick={onRetry} type="button"><TranslatedText id="common.retry" /></button> : null}
      {errorAction}
    </> : null}
    {status === 'empty' ? children : null}
  </section>
}
