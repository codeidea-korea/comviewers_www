import { useTranslation } from './translation'
import { translate, type TranslationKey } from './translation-core'
import { translationOverrides } from './translation-overrides'

type Values = Readonly<Record<string, string | number>>
const sourceKeys = new Map<string, TranslationKey>(translationOverrides.map(entry => [entry.ko, entry.key] as const))

/** Translate registered interface copy only, without inspecting or changing the DOM. */
export function translateUiText(source: string, values?: Values): string
export function translateUiText(source: string | undefined, values?: Values): string | undefined
export function translateUiText(source: string | undefined, values: Values = {}) {
  if (source === undefined) return undefined
  const key = sourceKeys.get(source)
  return key ? translate(key, values) : source
}

/** Subscribe the rendering component so notices and helper labels follow language changes. */
export function useUiTranslation() {
  const { locale, t } = useTranslation()
  return { uiText: translateUiText, locale, t }
}
