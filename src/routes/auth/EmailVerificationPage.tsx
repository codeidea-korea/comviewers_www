import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getPublicAccountApi } from '@/api/publicAccount'
import { ApiClientError } from '@/api/httpClient'
import { AppShell } from '@/components/layout/AppShellView'
import { RelativeLink as Link } from '@/components/navigation/RelativeLinkView'
import { Toast, useToastMessage } from '@/components/ui/ToastControl'
import { Button } from '@/components/ui/ButtonControl'
import { deliverEmailVerification, listenForSignupCompletion, verificationTokenFromLink } from './-components/emailVerificationChannel'

const expiredLinkMessage = '이메일 인증 유효시간이 만료되었습니다. 회원가입을 다시 시도해 주세요.'
const invalidLinkMessage = '이미 사용되었거나 유효하지 않은 링크입니다.'
const deliveryRetryAttempts = 5
const deliveryRetryDelayMs = 1000

function wait(ms: number) {
  return new Promise(resolve => { window.setTimeout(resolve, ms) })
}

export function EmailVerificationPage() {
  const [token] = useState(() => new URL(window.location.href).searchParams.get('token') ?? '')
  const [urlSanitized, setUrlSanitized] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [signupCompleted, setSignupCompleted] = useState(false)
  const stopCompletionListener = useRef<(() => void) | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { message: toastMessage, toastKey, setMessage } = useToastMessage()
  useLayoutEffect(() => {
    window.history.replaceState(window.history.state, '', window.location.pathname)
    setUrlSanitized(true)
  }, [])
  useEffect(() => () => { stopCompletionListener.current?.() }, [])

  async function confirm() {
    if (busy) return
    let linkToken: string
    try { linkToken = verificationTokenFromLink(token) }
    catch { setError(invalidLinkMessage); return }
    setBusy(true); setError('')
    try {
      const api = getPublicAccountApi()
      if (!api) throw new Error('이메일 인증 서비스를 이용할 수 없습니다.')
      const value = await api.confirmEmailVerification(linkToken)
      if (!value.requestId) throw new Error('인증 결과를 연결할 수 없습니다. 원래 화면에서 인증 메일을 다시 요청해 주세요.')
      const message = { ...value, requestId: value.requestId }
      stopCompletionListener.current?.()
      stopCompletionListener.current = listenForSignupCompletion(message.requestId, (signupBonusPoints) => {
        setSignupCompleted(true)
        if (signupBonusPoints === 100) setMessage('회원가입 축하 포인트 100P가 지급되었습니다.')
      })
      setEmailVerified(true)
      for (let attempt = 0; attempt < deliveryRetryAttempts; attempt += 1) {
        if (await deliverEmailVerification(message)) break
        if (attempt < deliveryRetryAttempts - 1) await wait(deliveryRetryDelayMs)
      }
    } catch (cause) {
      setError(cause instanceof ApiClientError && cause.code === 'A009'
        ? cause.message === expiredLinkMessage ? expiredLinkMessage : invalidLinkMessage
        : cause instanceof Error ? cause.message : '이메일 인증을 완료하지 못했습니다.')
    }
    finally { setBusy(false) }
  }

  if (!urlSanitized) return null

  return (
    <AppShell>
      <section className="not-ready-page email-verification-page">
        <div className="auth-panel auth-panel--result">
          <p className="eyebrow">EMAIL VERIFICATION</p>
          <h1>{signupCompleted ? '회원가입이 완료되었습니다' : emailVerified ? '이메일 인증이 완료되었습니다' : '이메일 인증'}</h1>
          {error ? <p role="alert">{error}</p> : null}
          {signupCompleted ? (
            <Button as={Link} size="large" to="/">메인으로</Button>
          ) : emailVerified ? null : token ? (
            <>
              <Button disabled={busy} size="large" onClick={() => { void confirm() }}>
                {busy ? '인증 중…' : '이메일 인증하기'}
              </Button>
            </>
          ) : (
            <>
              <p role="alert">{invalidLinkMessage}</p>
              <Button as={Link} size="large" to="/">메인으로</Button>
            </>
          )}
        </div>
      </section>
      <Toast message={toastMessage} toastKey={toastKey} />
    </AppShell>
  )
}
