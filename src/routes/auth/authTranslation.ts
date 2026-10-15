import { useTranslation } from '@/i18n/translation'
import { authTranslations } from '@/i18n/auth-translations'
import { translateUiText } from '@/i18n/uiTranslation'

const sourceKeys = new Map<string, typeof authTranslations[number]['key']>(authTranslations.map(entry => [entry.ko, entry.key]))

/** Account copy and registered shared errors follow the selected language. */
export function useAuthTranslation() {
  const { t, locale } = useTranslation()
  function authText(source: string): string
  function authText(source: string | undefined): string | undefined
  function authText(source: string | undefined) {
    if (source === undefined) return undefined
    const key = sourceKeys.get(source)
    return key ? t(key) : translateUiText(source)
  }
  return { authText, locale, t }
}
