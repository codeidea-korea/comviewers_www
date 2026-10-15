import { useTranslation } from '@/i18n/translation'
import { authTranslations } from '@/i18n/auth-translations'

const sourceKeys = new Map<string, typeof authTranslations[number]['key']>(authTranslations.map(entry => [entry.ko, entry.key]))

/** Only registered interface copy is translated; unknown API messages pass through. */
export function useAuthTranslation() {
  const { t, locale } = useTranslation()
  function authText(source: string): string
  function authText(source: string | undefined): string | undefined
  function authText(source: string | undefined) {
    if (source === undefined) return undefined
    const key = sourceKeys.get(source)
    return key ? t(key) : source
  }
  return { authText, locale, t }
}
