import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getPublicAccountApi } from '@/api/publicAccount'
import { ApiClientError } from '@/api/httpClient'
import { AppShell } from '@/components/layout/AppShellView'
import { RelativeLink as Link } from '@/components/navigation/RelativeLinkView'
import { Toast, useToastMessage } from '@/components/ui/ToastControl'
import { Button } from '@/components/ui/ButtonControl'
import { deliverEmailVerification, listenForSignupCompletion, verificationTokenFromLink, type EmailVerificationResult } from './-components/emailVerificationChannel'

export function EmailVerificationPage() {
  const [token] = useState(() => new URL(window.location.href).searchParams.get('token') ?? '')
  const [urlSanitized, setUrlSanitized] = useState(false)
  const [result, setResult] = useState<EmailVerificationResult | null>(null)
  const [signupCompleted, setSignupCompleted] = useState(false)
  const [deliveryNotice, setDeliveryNotice] = useState('')
  const [sending, setSending] = useState(false)
  const stopCompletionListener = useRef<(() => void) | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { message: toastMessage, toastKey, setMessage } = useToastMessage()
  useLayoutEffect(() => {
    window.history.replaceState(window.history.state, '', window.location.pathname)
    setUrlSanitized(true)
  }, [])
  useEffect(() => () => { stopCompletionListener.current?.() }, [])

  async function sendResult(value: EmailVerificationResult) {
    setSending(true)
    try {
      const received = await deliverEmailVerification(value)
      setDeliveryNotice(received
        ? '인증 결과를 회원가입 화면에 전달했습니다. 가입 완료 안내를 확인해 주세요.'
        : '회원가입 화면이 열려 있지 않거나 이미 완료되었습니다. 원래 화면을 확인하고, 필요하면 같은 브라우저에서 가입을 다시 신청해 주세요.')
    } catch {
      setDeliveryNotice('인증 결과를 전달하지 못했습니다. 회원가입 화면을 확인한 뒤 다시 시도해 주세요.')
    } finally { setSending(false) }
  }

  async function confirm() {
    if (busy) return
    setBusy(true); setError('')
    try {
      const api = getPublicAccountApi()
      if (!api) throw new Error('이메일 인증 서비스를 이용할 수 없습니다.')
      const value = await api.confirmEmailVerification(verificationTokenFromLink(token))
      if (!value.requestId) throw new Error('인증 결과를 연결할 수 없습니다. 원래 화면에서 인증 메일을 다시 요청해 주세요.')
      const message = { ...value, requestId: value.requestId }
      stopCompletionListener.current?.()
      stopCompletionListener.current = listenForSignupCompletion(message.requestId, (signupBonusPoints) => {
        setSignupCompleted(true)
        if (signupBonusPoints === 100) setMessage('회원가입 축하 포인트 100P가 지급되었습니다.')
      })
      setResult(message)
      await sendResult(message)
    } catch (cause) {
      setError(cause instanceof ApiClientError && cause.code === 'A009'
        ? '이미 사용되었거나 유효하지 않은 링크입니다.'
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
          <h1>{signupCompleted ? '회원가입이 완료되었습니다' : result ? '이메일 인증이 완료되었습니다' : '이메일 인증'}</h1>
          {signupCompleted ? (
            <>
              <p role="status">이메일 인증과 회원가입이 완료되었습니다. 이제 로그인할 수 있습니다.</p>
              <Button as={Link} size="large" to="/login">로그인하기</Button>
            </>
          ) : result ? (
            <>
              <p>인증을 요청한 화면에서 회원가입이 계속됩니다.</p>
              {deliveryNotice ? <p role="status">{deliveryNotice}</p> : null}
              <Button disabled={sending} size="large" onClick={() => { void sendResult(result) }}>
                {sending ? '전달 중…' : '인증 결과 다시 전달'}
              </Button>
            </>
          ) : token ? (
            <>
              <p>아래 버튼을 누르면 이메일 인증이 완료됩니다.<br />인증을 요청한 화면은 닫지 말고 유지해 주세요.</p>
              {error ? <p role="alert">{error}</p> : null}
              <Button disabled={busy} size="large" onClick={() => { void confirm() }}>
                {busy ? '인증 중…' : '이메일 인증하기'}
              </Button>
            </>
          ) : (
            <>
              <p role="alert">이미 사용되었거나 유효하지 않은 링크입니다.</p>
              <Button as={Link} size="large" to="/">메인으로</Button>
            </>
          )}
        </div>
      </section>
      <Toast message={toastMessage} toastKey={toastKey} />
    </AppShell>
  )
}
