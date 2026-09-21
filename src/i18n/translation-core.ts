import { translationLocales, translationOverrides, type TranslationLocale } from './translation-overrides'

export type TranslationKey = typeof translationOverrides[number]['key']
export type PageLocale = 'ko' | TranslationLocale
type Values = Readonly<Record<string, string | number>>
const storageKey = 'comviewers.translation.locale'
const entries = new Map<TranslationKey, typeof translationOverrides[number]>(translationOverrides.map(entry => [entry.key, entry] as const))

export function isTranslationLocale(value: string): value is TranslationLocale {
  return translationLocales.some(locale => locale === value)
}

function storedLocale(): PageLocale {
  if (!import.meta.env?.DEV || typeof window === 'undefined') return 'ko'
  try {
    const value = window.sessionStorage.getItem(storageKey) ?? 'ko'
    return isTranslationLocale(value) ? value : 'ko'
  } catch {
    // Storage may be disabled; the in-memory language still works.
    return 'ko'
  }
}

let currentLocale = storedLocale()
let listeners: readonly (() => void)[] = []
export function subscribeTranslation(listener: () => void) {
  listeners = [...listeners, listener]
  return () => { listeners = listeners.filter(item => item !== listener) }
}

export function getTranslationLocale(): PageLocale { return currentLocale }

export function setTranslationLocale(value: string) {
  const next = import.meta.env?.DEV && isTranslationLocale(value) ? value : 'ko'
  if (currentLocale === next) return
  currentLocale = next
  try { window.sessionStorage.setItem(storageKey, next) }
  catch { console.warn('Translation language is available for this page but could not be saved.') }
  listeners.forEach(listener => listener())
}

export function translate(key: TranslationKey, values: Values = {}): string {
  const entry = entries.get(key)
  if (!entry) return key
  return entry[currentLocale].replace(/\{([a-zA-Z]+)\}/g, (token, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : token)
}
