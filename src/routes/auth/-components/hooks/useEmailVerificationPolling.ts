import { useEffect, useMemo, useState } from 'react'
import type { EmailVerificationStatus, EmailVerificationStatusCredentials, PublicAccountApi } from '@/api/publicAccount'
import { ApiClientError } from '@/api/httpClient'
import { verificationExpiryMillis } from '../signupRegistrationRetry'

interface Snapshot {
  identity: object
  result: EmailVerificationStatus | null
  unavailable: boolean
}

function retryDelay(cause: unknown) {
  const header = cause instanceof ApiClientError ? cause.retryAfter?.trim() : undefined
  if (!header) return 10_000
  const seconds = Number(header)
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - Date.now()
  return Number.isFinite(delay) ? Math.min(24 * 60 * 60_000, Math.max(3000, delay + 1000)) : 10_000
}

// Credentials stay in component memory and POST bodies; never put them in storage or URLs.
export function useEmailVerificationPolling(
  api: PublicAccountApi | null,
  credentials: EmailVerificationStatusCredentials | null,
  enabled: boolean,
  stopOnVerified = false,
  expiresAt?: string,
) {
  const identity = useMemo(() => ({}), [credentials])
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  useEffect(() => {
    if (!api || !credentials || !enabled) return
    let stopped = false
    let inFlight = false
    let nextAllowedAt = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let activeRequest: AbortController | null = null
    const poll = async () => {
      if (stopped || inFlight || Date.now() < nextAllowedAt) return
      clearTimeout(timer)
      if (expiresAt && Date.now() >= verificationExpiryMillis(expiresAt)) {
        stopped = true
        setSnapshot({ identity, result: { status: 'expired', expiresAt }, unavailable: false })
        return
      }
      inFlight = true
      const controller = new AbortController()
      activeRequest = controller
      const requestTimeout = setTimeout(() => controller.abort(), 15_000)
      let delay = 3000
      try {
        const result = await api.emailVerificationStatus(credentials, controller.signal)
        if (stopped) return
        setSnapshot({ identity, result, unavailable: false })
        stopped = ['completed', 'expired', 'invalid'].includes(result.status)
          || (stopOnVerified && result.status === 'verified')
      } catch (cause) {
        if (stopped) return
        delay = retryDelay(cause)
        setSnapshot({ identity, result: null, unavailable: true })
      } finally {
        inFlight = false
        clearTimeout(requestTimeout)
        activeRequest = null
        if (!stopped) {
          nextAllowedAt = Date.now() + delay
          timer = setTimeout(() => { void poll() }, delay)
        }
      }
    }
    const resume = () => { if (document.visibilityState === 'visible') void poll() }
    void poll()
    window.addEventListener('focus', resume)
    document.addEventListener('visibilitychange', resume)
    return () => {
      stopped = true
      clearTimeout(timer)
      activeRequest?.abort()
      window.removeEventListener('focus', resume)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [api, credentials, enabled, stopOnVerified, expiresAt, identity])
  return enabled && snapshot?.identity === identity ? snapshot : null
}
