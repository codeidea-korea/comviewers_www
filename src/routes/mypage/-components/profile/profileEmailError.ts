import { ApiClientError } from '@/api/httpClient'
import { getTranslationLocale } from '@/i18n/translation-core'
import { translateUiText } from '@/i18n/uiTranslation'

const codeMessages: Readonly<Record<string, string>> = {
  A001: '로그인이 필요합니다.',
  A002: '로그인이 필요합니다.',
  A003: '로그인이 필요합니다.',
  A004: '현재 비밀번호를 확인해 주세요.',
  A005: '이메일을 변경할 권한이 없습니다.',
  A007: '요청이 많습니다. 잠시 후 다시 시도해 주세요.',
  A008: '인증 요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  A009: '이메일 인증 정보가 유효하지 않거나 만료되었습니다. 인증을 다시 요청해 주세요.',
  A010: '이메일 인증 요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  A025: '소셜 계정으로 다시 인증해 주세요.',
  A027: '이메일 인증 정보가 유효하지 않거나 만료되었습니다. 인증을 다시 요청해 주세요.',
  A028: '이메일 인증 정보가 유효하지 않거나 만료되었습니다. 인증을 다시 요청해 주세요.',
  U002: '이미 사용 중인 이메일입니다. 다른 이메일을 입력해 주세요.',
  C001: '변경할 이메일 정보를 확인해 주세요.',
  C005: '변경할 이메일 정보를 확인해 주세요.',
  U003: '변경할 이메일 정보를 확인해 주세요.',
}

/** Use stable API codes for translated notices; keep the original Korean error copy. */
export function profileEmailError(error: unknown, stage: 'request' | 'confirm'): string {
  const fallback = stage === 'request'
    ? '이메일 인증 요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.'
    : '이메일 변경을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  const original = error instanceof Error ? error.message : ''
  if (getTranslationLocale() === 'ko') return original || fallback
  if (error instanceof ApiClientError) {
    const message = error.code ? codeMessages[error.code] : undefined
    if (message) return translateUiText(message)
    if (error.kind === 'authentication') return translateUiText('로그인이 필요합니다.')
    if (error.kind === 'network') return translateUiText('서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    if (error.kind === 'request') return translateUiText('변경할 이메일 정보를 확인해 주세요.')
  }
  const translated = translateUiText(original)
  return translated && translated !== original ? translated : translateUiText(fallback)
}
