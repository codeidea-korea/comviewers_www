import { useAuthTranslation } from '@/routes/auth/authTranslation'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { useAuthentication } from '@/app/session/AuthProvider'
import { getPublicAccountApi } from '@/api/publicAccount'
import { ApiClientError } from '@/api/httpClient'
import { AppShell } from '@/components/layout/AppShellView'
import { RelativeLink as Link } from '@/components/navigation/RelativeLinkView'
import { Toast, useToastMessage } from '@/components/ui/ToastControl'
import { Button } from '@/components/ui/ButtonControl'
import { deliverEmailVerification, listenForSignupCompletion, listenForSignupProgress, requestSignupRetry, verificationTokenFromLink, type EmailVerificationResult, type SignupRegistrationProgress } from './-components/emailVerificationChannel'
import { SignupRegistrationStatus } from './-components/SignupRegistrationStatus'

const expiredLinkMessage = '이메일 인증 유효시간이 만료되었습니다. 회원가입을 다시 시도해 주세요.'
const invalidLinkMessage = '이미 사용되었거나 유효하지 않은 링크입니다.'
const deliveryRetryAttempts = 5
const deliveryRetryDelayMs = 1000

function wait(ms: number) {
  return new Promise(resolve => { window.setTimeout(resolve, ms) })
}

export function EmailVerificationPage() {
  const { authText } = useAuthTranslation()
  const { search } = useLocation()
  const { restoring } = useAuthentication()
  // Router's original query survives auth-scope remounts after URL sanitization.
  const [token] = useState(() => new URLSearchParams(search).get('token') ?? '')
  const [urlSanitized, setUrlSanitized] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [signupCompleted, setSignupCompleted] = useState(false)
  const stopCompletionListener = useRef<(() => void) | null>(null)
  const stopProgressListener = useRef<(() => void) | null>(null)
  const verification = useRef<EmailVerificationResult | null>(null)
  const delivered = useRef(false)
  const completed = useRef(false)
  const active = useRef(true)
  const generation = useRef(0)
  const retrying = useRef(false)
  const confirming = useRef(false)
  const [progress, setProgress] = useState<SignupRegistrationProgress | null>(null)
  const [originalScreenNeeded, setOriginalScreenNeeded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { message: toastMessage, toastKey, setMessage } = useToastMessage()
  useLayoutEffect(() => {
    window.history.replaceState(window.history.state, '', window.location.pathname)
    setUrlSanitized(true)
  }, [])
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
      generation.current += 1
      stopCompletionListener.current?.()
      stopProgressListener.current?.()
      verification.current = null
    }
  }, [])
  useEffect(() => {
    if (!progress || signupCompleted || !['processing', 'waiting'].includes(progress.state)) return
    const staleAt = progress.state === 'waiting' && progress.retryAt
      ? Math.max(Date.now(), progress.retryAt) + 30_000
      : Date.now() + 30_000
    const timeout = window.setTimeout(() => {
      if (!completed.current) setProgress({ requestId: progress.requestId, state: 'retry' })
    }, Math.min(staleAt - Date.now(), 31 * 60_000))
    return () => window.clearTimeout(timeout)
  }, [progress, signupCompleted])

  async function retryRegistration() {
    const value = verification.current
    if (!value || retrying.current || completed.current) return
    retrying.current = true
    const currentGeneration = generation.current
    setOriginalScreenNeeded(false)
    setProgress({ requestId: value.requestId, state: 'processing' })
    try {
      const acknowledged = delivered.current
        ? await requestSignupRetry(value.requestId)
        : await deliverEmailVerification(value)
      if (!active.current || generation.current !== currentGeneration || completed.current) return
      delivered.current = acknowledged || delivered.current
      if (!acknowledged) {
        setOriginalScreenNeeded(true)
        setProgress({ requestId: value.requestId, state: 'retry' })
      }
    } catch {
      if (active.current && generation.current === currentGeneration && !completed.current) {
        setOriginalScreenNeeded(true)
        setProgress({ requestId: value.requestId, state: 'retry' })
      }
    } finally { retrying.current = false }
  }

  async function confirm() {
    // Restoration remounts this page; settle it before consuming the one-use link.
    if (busy || restoring || confirming.current || verification.current) return
    let linkToken: string
    try { linkToken = verificationTokenFromLink(token) }
    catch { setError(invalidLinkMessage); return }
    confirming.current = true
    const currentGeneration = generation.current
    setBusy(true); setError('')
    try {
      const api = getPublicAccountApi()
      if (!api) throw new Error('이메일 인증 서비스를 이용할 수 없습니다.')
      const value = await api.confirmEmailVerification(linkToken)
      if (!active.current || generation.current !== currentGeneration) return
      if (!value.requestId) throw new Error('인증 결과를 연결할 수 없습니다. 원래 화면에서 인증 메일을 다시 요청해 주세요.')
      const message = { ...value, requestId: value.requestId }
      verification.current = message
      stopCompletionListener.current?.()
      stopProgressListener.current?.()
      stopCompletionListener.current = listenForSignupCompletion(message.requestId, (signupBonusPoints) => {
        if (!active.current || generation.current !== currentGeneration || completed.current) return
        completed.current = true
        verification.current = null
        stopProgressListener.current?.()
        setProgress(null)
        setOriginalScreenNeeded(false)
        setSignupCompleted(true)
        if (signupBonusPoints === 100) setMessage('회원가입 축하 포인트 100P가 지급되었습니다.')
      })
      stopProgressListener.current = listenForSignupProgress(message.requestId, (nextProgress) => {
        if (active.current && generation.current === currentGeneration && !completed.current) {
          setOriginalScreenNeeded(false)
          if (nextProgress.state === 'restart' || nextProgress.state === 'check-login') verification.current = null
          setProgress(nextProgress)
        }
      })
      setEmailVerified(true)
      setProgress({ requestId: message.requestId, state: 'processing' })
      for (let attempt = 0; attempt < deliveryRetryAttempts; attempt += 1) {
        if (!active.current || generation.current !== currentGeneration || completed.current) return
        const acknowledged = await deliverEmailVerification(message)
        if (!active.current || generation.current !== currentGeneration || completed.current) return
        if (acknowledged) { delivered.current = true; break }
        if (attempt < deliveryRetryAttempts - 1) await wait(deliveryRetryDelayMs)
      }
      if (!delivered.current && !completed.current) {
        setOriginalScreenNeeded(true)
        setProgress({ requestId: message.requestId, state: 'retry' })
      }
    } catch (cause) {
      if (!active.current || generation.current !== currentGeneration || completed.current) return
      if (verification.current) {
        setOriginalScreenNeeded(true)
        setProgress({ requestId: verification.current.requestId, state: 'retry' })
        return
      }
      if (cause instanceof ApiClientError && cause.code === 'A027') {
        setError(expiredLinkMessage)
      } else if (cause instanceof ApiClientError && cause.code === 'A028') {
        setError(invalidLinkMessage)
      } else if (cause instanceof ApiClientError && cause.code === 'A009') {
        setError(cause.message === expiredLinkMessage ? expiredLinkMessage : invalidLinkMessage)
      } else {
        setError(cause instanceof Error ? cause.message : '이메일 인증을 완료하지 못했습니다.')
      }
    }
    finally {
      confirming.current = false
      if (active.current && generation.current === currentGeneration) setBusy(false)
    }
  }

  if (!urlSanitized) return null

  return (
    <AppShell>
      <section className="not-ready-page email-verification-page notranslate" translate="no">
        <div className="auth-panel auth-panel--result">
          <p className="eyebrow">EMAIL VERIFICATION</p>
          <h1>{signupCompleted ? authText("회원가입이 완료되었습니다") : emailVerified ? authText("이메일 인증이 완료되었습니다") : authText("이메일 인증")}</h1>
          {error ? <p role="alert">{authText(error)}</p> : null}
          {signupCompleted ? (
            <Button as={Link} size="large" to="/">{authText("메인으로")}</Button>
          ) : emailVerified ? (
            <>
              <SignupRegistrationStatus progress={progress} onRetry={() => { void retryRegistration() }} />
              {originalScreenNeeded ? (
                <p><Link to="/signup/profile">{authText('회원가입 화면으로')}</Link></p>
              ) : null}
            </>
          ) : token ? (
            <>
              <Button disabled={busy || restoring} size="large" onClick={() => { void confirm() }}>
                {busy ? authText("인증 중…") : authText("이메일 인증하기")}
              </Button>
            </>
          ) : (
            <>
              <p role="alert">{authText(invalidLinkMessage)}</p>
              <Button as={Link} size="large" to="/">{authText("메인으로")}</Button>
            </>
          )}
        </div>
      </section>
      <Toast message={authText(toastMessage)} toastKey={toastKey} />
    </AppShell>
  )
}
