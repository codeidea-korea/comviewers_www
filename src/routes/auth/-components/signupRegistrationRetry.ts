import { ApiClientError } from '@/api/httpClient'

export const maximumAutomaticSignupRetries = 3
export const maximumSignupRetryWaitMillis = 30 * 60_000

export function verificationExpiryMillis(value: string): number {
  // API LocalDateTime values are KST, including on browsers in other time zones.
  const normalized = value.replace(' ', 'T')
  return Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized) ? normalized : `${normalized}+09:00`)
}

export function signupRetryDelayMillis(cause: unknown, now: number): number | null {
  if (!(cause instanceof ApiClientError)) return null
  // Both responses are emitted before the registration transaction is entered.
  const limited = cause.status === 429 && cause.code === 'A007'
  const unavailable = cause.status === 503 && cause.code === 'A008'
  if (!limited && !unavailable) return null
  const header = cause.retryAfter?.trim()
  if (header && /^\d+$/.test(header)) {
    return Math.max(1000, Number(header) * 1000 + 1000)
  }
  if (header) {
    const retryAt = Date.parse(header)
    if (Number.isFinite(retryAt)) return Math.max(1000, retryAt - now + 1000)
  }
  return limited ? 60_000 : 30_000
}

export function signupNeedsLoginCheck(cause: unknown): boolean {
  // A missing/invalid response can follow a committed registration. Do not replay it.
  return !(cause instanceof ApiClientError)
    || cause.kind === 'network'
    || cause.kind === 'contract'
    || (cause.status !== undefined && cause.status >= 500)
    || cause.code === 'U002'
}
