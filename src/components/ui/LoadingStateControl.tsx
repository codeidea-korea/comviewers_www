import { useUiTranslation } from '@/i18n/uiTranslation'

export function LoadingState({ className = '', label }: { className?: string; label: string }) {
  const { uiText } = useUiTranslation()
  return (
    <div aria-live="polite" className={`route-loading ${className}`.trim()} role="status">
      <span aria-hidden="true" className="route-loading__indicator" />
      <span className="sr-only notranslate" translate="no">{uiText(label)}</span>
    </div>
  )
}
