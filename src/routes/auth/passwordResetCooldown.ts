export const passwordResetCooldownMs = 5 * 60 * 1000
export const passwordResetCooldownStorageKey = 'comviewers.password-reset.retry-at'

type CooldownStorage = Pick<Storage, 'getItem' | 'setItem'>
type RateLimitResponse = { status?: number; code?: string; retryAfter?: string }

export function resolvePasswordResetRetryAt(retryAfter: string | undefined, now = Date.now()): number {
  let delay = passwordResetCooldownMs

  if (retryAfter && /^\d+$/.test(retryAfter)) {
    const seconds = Number(retryAfter)
    if (Number.isSafeInteger(seconds) && seconds <= Number.MAX_SAFE_INTEGER / 1000) delay = seconds * 1000
  } else if (retryAfter) {
    const deadline = Date.parse(retryAfter)
    if (Number.isFinite(deadline)) delay = deadline - now
  }

  return now + Math.max(0, delay)
}

export function resolvePasswordResetRateLimit(response: RateLimitResponse, now = Date.now()): number | null {
  if (response.status !== 429 || response.code !== 'A007') return null
  return resolvePasswordResetRetryAt(response.retryAfter, now)
}

export function readPasswordResetRetryAt(storage: CooldownStorage): number {
  try {
    const retryAt = Number(storage.getItem(passwordResetCooldownStorageKey))
    return Number.isSafeInteger(retryAt) && retryAt > 0 ? retryAt : 0
  } catch { return 0 }
}

export function writePasswordResetRetryAt(storage: CooldownStorage, retryAt: number): void {
  try { storage.setItem(passwordResetCooldownStorageKey, String(retryAt)) }
  catch { /* The current view keeps its in-memory deadline when tab storage is unavailable. */ }
}

export const formatPasswordResetCountdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

export const passwordResetCountdownLabel = (seconds: number) => `메일 다시 보내기까지 ${formatPasswordResetCountdown(seconds)} 남음`
