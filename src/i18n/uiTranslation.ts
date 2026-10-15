import { useTranslation } from './translation'
import { getTranslationLocale, translate, type TranslationKey } from './translation-core'
import { translationOverrides } from './translation-overrides'
import { resolveValidationErrorText } from './validationErrorText'

type Values = Readonly<Record<string, string | number>>
const sourceKeys = new Map<string, TranslationKey>(translationOverrides.map(entry => [entry.ko, entry.key] as const))
const normalizeErrorCopy = (source: string) => source.trim().replace(/[.。]+$/u, '')
const errorEntries = translationOverrides.filter(entry => entry.key.startsWith('error')
  || /없습니다|못했습니다|수 없습니다|주세요|유효|만료|실패|오류|초과|지원하지/.test(entry.ko))
// Match complete registered notices only, including a notice stored before a language change.
const errorSourceKeys = new Map<string, TranslationKey>(errorEntries.flatMap(entry =>
  [entry.ko, entry.en, entry.ja, entry.vi, entry['zh-CN'], entry['zh-TW']]
    .map(source => [normalizeErrorCopy(source), entry.key] as const)))

function translateServerNotice(source: string): string | undefined {
  const fieldPatterns: readonly [RegExp, TranslationKey][] = [
    [/^필수 요청 헤더 '([A-Za-z][A-Za-z0-9_.\[\]-]{0,99})'가 없습니다\.?$/u, 'errorShared.header'],
    [/^필수 요청 값 '([A-Za-z][A-Za-z0-9_.\[\]-]{0,99})'을 입력해 주세요\.?$/u, 'errorShared.parameter'],
    [/^요청 값 '([A-Za-z][A-Za-z0-9_.\[\]-]{0,99})'의 형식을 확인해 주세요\.?$/u, 'errorShared.parameterType'],
  ]
  for (const [pattern, key] of fieldPatterns) {
    const match = source.match(pattern)
    if (match) return getTranslationLocale() === 'ko' ? source : translate(key, { name: match[1] ?? '' })
  }
  const serverRoomLimit = source.match(/^한 번에 최대 ([1-9]\d{0,5})개의 서버실을 신청할 수 있습니다\.?$/u)
  if (serverRoomLimit) return getTranslationLocale() === 'ko' ? source : translate('errorBackendContent.serverRoomLimit', { count: serverRoomLimit[1] ?? '' })
  const withdrawalPrefix = '회원 탈퇴 제한 사유를 먼저 해소해 주세요: '
  if (source.startsWith(withdrawalPrefix)) {
    const reasons = source.slice(withdrawalPrefix.length).split(', ')
    if (reasons.length > 0 && reasons.every(reason => sourceKeys.has(reason) || errorSourceKeys.has(normalizeErrorCopy(reason)))) {
      return getTranslationLocale() === 'ko' ? source : translate('errorBackendAccount.withdrawalRestrictions', { reasons: reasons.map(reason => translateUiText(reason)).join(', ') })
    }
  }
  const diagnostic = source.match(/^([^\r\n]+) \(오류 코드: ([A-Z][A-Z0-9_]{1,79}|[A-Za-z]{1,60}Error)\)$/u)
  if (diagnostic) {
    const message = diagnostic[1] ?? ''
    const code = diagnostic[2] ?? ''
    if (sourceKeys.has(message) || errorSourceKeys.has(normalizeErrorCopy(message))) {
      return translate('checkoutPage.copy169', { message: translateUiText(message), code })
    }
  }
  return undefined
}

/** Translate registered interface copy only, without inspecting or changing the DOM. */
export function translateUiText(source: string, values?: Values): string
export function translateUiText(source: string | undefined, values?: Values): string | undefined
export function translateUiText(source: string | undefined, values: Values = {}) {
  if (source === undefined) return undefined
  const key = sourceKeys.get(source)
  if (key) return translate(key, values)
  const errorKey = errorSourceKeys.get(normalizeErrorCopy(source))
  if (errorKey) return getTranslationLocale() === 'ko' && /[가-힣]/u.test(source) ? source : translate(errorKey, values)
  const validation = resolveValidationErrorText(source)
  if (validation) {
    const validationKey = sourceKeys.get(validation.source)
    if (validationKey) return translate(validationKey, { ...validation.values, ...values })
  }
  return translateServerNotice(source) ?? source
}

/** Subscribe the rendering component so notices and helper labels follow language changes. */
export function useUiTranslation() {
  const { locale, t } = useTranslation()
  return { uiText: translateUiText, locale, t }
}
