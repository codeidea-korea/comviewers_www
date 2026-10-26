import { useCallback, useEffect, useRef, useState } from 'react'
import type { PublicAccountApi, RegistrationInput } from '@/api/publicAccount'
import {
  deliverSignupProgress,
  type EmailVerificationResult,
  type SignupRegistrationProgress,
  type SignupRegistrationState,
} from '../emailVerificationChannel'
import {
  maximumAutomaticSignupRetries,
  maximumSignupRetryWaitMillis,
  signupNeedsLoginCheck,
  signupRetryDelayMillis,
  verificationExpiryMillis,
} from '../signupRegistrationRetry'

export interface PendingSignupSubmission {
  registration: Omit<RegistrationInput, 'emailVerificationProof' | 'profileImageUploadKey'>
  image: File | null
}

export interface PendingSignup {
  requestId: string
  email: string
  submission: PendingSignupSubmission
}

interface VerifiedSignup {
  pending: PendingSignup
  verification: EmailVerificationResult
  expiresAt: number
  uploadKey?: string
  automaticRetries: number
  retryAt: number
}

type Registration = Awaited<ReturnType<PublicAccountApi['register']>>

export function useSignupRegistration(
  api: PublicAccountApi | null,
  onComplete: (pending: PendingSignup, registration: Registration) => void,
  onTerminal: (pending: PendingSignup) => void,
) {
  const verified = useRef<VerifiedSignup | null>(null)
  const active = useRef<AbortController | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptRef = useRef<() => void>(() => {})
  const [progress, setProgress] = useState<SignupRegistrationProgress | null>(null)
  const progressRef = useRef<SignupRegistrationProgress | null>(null)

  const clearTimer = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
  }, [])

  const publish = useCallback((requestId: string, state: SignupRegistrationState, retryAt?: number) => {
    const next = { requestId, state, retryAt }
    progressRef.current = next
    setProgress(next)
    deliverSignupProgress(next)
  }, [])

  const cancel = useCallback(() => {
    clearTimer()
    verified.current = null
    active.current?.abort()
    active.current = null
    progressRef.current = null
    setProgress(null)
  }, [clearTimer])

  useEffect(() => () => {
    clearTimer()
    verified.current = null
    active.current?.abort()
    active.current = null
  }, [clearTimer])

  const stop = useCallback((flow: VerifiedSignup, state: 'restart' | 'check-login') => {
    clearTimer()
    verified.current = null
    publish(flow.pending.requestId, state)
    onTerminal(flow.pending)
  }, [clearTimer, onTerminal, publish])

  const attempt = useCallback(async () => {
    const flow = verified.current
    if (!api || !flow) return
    if (active.current) {
      if (progressRef.current) deliverSignupProgress(progressRef.current)
      return
    }
    const now = Date.now()
    if (!Number.isFinite(flow.expiresAt) || now + 1000 >= flow.expiresAt) {
      stop(flow, 'restart')
      return
    }
    if (flow.retryAt > now) {
      publish(flow.pending.requestId, 'waiting', flow.retryAt)
      if (timer.current === null) {
        timer.current = setTimeout(() => { timer.current = null; attemptRef.current() }, flow.retryAt - now)
      }
      return
    }
    clearTimer()
    const controller = new AbortController()
    active.current = controller
    const isCurrent = () => verified.current?.pending === flow.pending && active.current === controller
    publish(flow.pending.requestId, 'processing')
    let registration: Registration
    let registrationStarted = false
    try {
      let uploadKey = flow.uploadKey
      if (flow.pending.submission.image && !uploadKey) {
        const uploaded = await api.stageProfileImage(flow.pending.submission.image, flow.verification.verificationProof, controller.signal)
        if (!isCurrent()) return
        uploadKey = uploaded.uploadKey
        verified.current = { ...flow, uploadKey }
      }
      if (!isCurrent()) return
      if (Date.now() + 1000 >= flow.expiresAt) {
        stop(flow, 'restart')
        return
      }
      registrationStarted = true
      registration = await api.register({
        ...flow.pending.submission.registration,
        emailVerificationProof: flow.verification.verificationProof,
        profileImageUploadKey: uploadKey,
      }, controller.signal)
      if (!isCurrent()) return
    } catch (cause) {
      if (!isCurrent() || controller.signal.aborted) return
      const failedAt = Date.now()
      const delay = signupRetryDelayMillis(cause, failedAt)
      if (delay !== null) {
        const retryAt = failedAt + delay
        if (!Number.isFinite(retryAt) || delay > maximumSignupRetryWaitMillis || retryAt + 1000 >= flow.expiresAt) {
          stop(flow, 'restart')
          return
        }
        const automatic = flow.automaticRetries < maximumAutomaticSignupRetries
        const latest = verified.current
        if (!latest) return
        verified.current = {
          ...latest,
          automaticRetries: flow.automaticRetries + (automatic ? 1 : 0),
          retryAt,
        }
        publish(flow.pending.requestId, 'waiting', retryAt)
        timer.current = setTimeout(() => {
          timer.current = null
          if (verified.current?.pending !== flow.pending) return
          if (automatic) attemptRef.current()
          else {
            publish(flow.pending.requestId, 'retry')
            timer.current = setTimeout(() => {
              if (verified.current?.pending === flow.pending) stop(flow, 'restart')
            }, Math.max(0, flow.expiresAt - Date.now() - 1000))
          }
        }, delay)
      } else {
        stop(flow, registrationStarted && signupNeedsLoginCheck(cause) ? 'check-login' : 'restart')
      }
      return
    } finally {
      if (active.current === controller) active.current = null
    }
    verified.current = null
    progressRef.current = null
    setProgress(null)
    onComplete(flow.pending, registration)
  }, [api, clearTimer, onComplete, publish, stop])

  useEffect(() => { attemptRef.current = () => { void attempt() } }, [attempt])

  const accept = useCallback((pending: PendingSignup, verification: EmailVerificationResult) => {
    if (progressRef.current?.requestId === pending.requestId) {
      // Repeated delivery is an acknowledgement/status refresh, never another POST.
      deliverSignupProgress(progressRef.current)
      return
    }
    verified.current = {
      pending, verification, expiresAt: verificationExpiryMillis(verification.expiresAt),
      automaticRetries: 0, retryAt: 0,
    }
    attemptRef.current()
  }, [])

  const retry = useCallback(() => {
    if (verified.current) attemptRef.current()
    else if (progressRef.current) deliverSignupProgress(progressRef.current)
  }, [])

  return { progress, accept, retry, cancel }
}
