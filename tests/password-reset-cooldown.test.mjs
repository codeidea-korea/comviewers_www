import assert from 'node:assert/strict'
import test from 'node:test'
import {
  formatPasswordResetCountdown,
  passwordResetCountdownLabel,
  readPasswordResetRetryAt,
  resolvePasswordResetRateLimit,
  resolvePasswordResetRetryAt,
  writePasswordResetRetryAt,
} from '../src/routes/auth/passwordResetCooldown.ts'

const fiveMinutes = 5 * 60 * 1000

test('password reset cooldown restores a server delta-seconds Retry-After value', () => {
  const now = Date.parse('2026-09-14T00:00:00.000Z')

  assert.equal(resolvePasswordResetRetryAt('143', now), now + 143_000)
})

test('password reset cooldown restores a server HTTP-date Retry-After value', () => {
  const now = Date.parse('2026-09-14T00:00:00.000Z')

  assert.equal(
    resolvePasswordResetRetryAt('Mon, 14 Sep 2026 00:02:30 GMT', now),
    now + 150_000,
  )
})

test('password reset cooldown falls back to the PDF five-minute limit without a usable header', () => {
  const now = Date.parse('2026-09-14T00:00:00.000Z')

  assert.equal(resolvePasswordResetRetryAt(undefined, now), now + fiveMinutes)
  assert.equal(resolvePasswordResetRetryAt('invalid', now), now + fiveMinutes)
})

test('password reset cooldown honors a longer generic rate-limit window', () => {
  const now = Date.parse('2026-09-14T00:00:00.000Z')

  assert.equal(resolvePasswordResetRetryAt('600', now), now + 600_000)
})

test('password reset rate-limit recovery distinguishes limited and ordinary failures', () => {
  const now = Date.parse('2026-09-14T00:00:00.000Z')

  assert.equal(resolvePasswordResetRateLimit({ status: 429, code: 'A007', retryAfter: '600' }, now), now + 600_000)
  assert.equal(resolvePasswordResetRateLimit({ status: 400, code: 'A007', retryAfter: '180' }, now), null)
  assert.equal(resolvePasswordResetRateLimit({ status: 429, code: 'A016', retryAfter: '180' }, now), null)
  assert.equal(resolvePasswordResetRateLimit({ status: 400, code: 'A016' }, now), null)
})

test('password reset cooldown survives a reload in the same tab session', () => {
  const values = new Map()
  const sameTabSession = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
  const retryAt = Date.parse('2026-09-14T00:05:00.000Z')

  writePasswordResetRetryAt(sameTabSession, retryAt)

  assert.equal(readPasswordResetRetryAt(sameTabSession), retryAt)
})

test('a separate tab session does not inherit another tab session cooldown', () => {
  const firstTabValues = new Map()
  const firstTabSession = {
    getItem: (key) => firstTabValues.get(key) ?? null,
    setItem: (key, value) => firstTabValues.set(key, value),
  }
  const separateTabSession = { getItem: () => null, setItem: () => undefined }

  writePasswordResetRetryAt(firstTabSession, Date.parse('2026-09-14T00:05:00.000Z'))

  assert.equal(readPasswordResetRetryAt(separateTabSession), 0)
})

test('password reset countdown exposes the visible time in an accessible label', () => {
  assert.equal(formatPasswordResetCountdown(299), '4:59')
  assert.equal(passwordResetCountdownLabel(299), '메일 다시 보내기까지 4:59 남음')
})
