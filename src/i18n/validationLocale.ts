import { config } from 'zod'
import { en, ja, ko, vi, zhCN, zhTW } from 'zod/locales'

const validationLocales = { ko, en, ja, vi, 'zh-CN': zhCN, 'zh-TW': zhTW } as const

/** Only library-generated copy changes; explicit messages and validation rules stay intact. */
export function setValidationLocale(locale: keyof typeof validationLocales) {
  config(validationLocales[locale]())
}
