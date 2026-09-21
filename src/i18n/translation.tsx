import { useSyncExternalStore } from 'react'
import { getTranslationLocale, subscribeTranslation, translate, type TranslationKey } from './translation-core'
export { getTranslationLocale, isTranslationLocale, setTranslationLocale, translate } from './translation-core'
export type { PageLocale, TranslationKey } from './translation-core'
type Values = Readonly<Record<string, string | number>>
export function useTranslation() {
  const locale = useSyncExternalStore(subscribeTranslation, getTranslationLocale, () => 'ko' as const)
  return { locale, t: translate }
}

/** React owns this text; Google must not replace its DOM nodes. */
export function TranslatedText({ id, values, className }: { id: TranslationKey; values?: Values; className?: string }) {
  const { t } = useTranslation()
  return <span className={[import.meta.env.DEV ? 'notranslate' : '', className].filter(Boolean).join(' ')} translate={import.meta.env.DEV ? 'no' : undefined}>{t(id, values)}</span>
}
