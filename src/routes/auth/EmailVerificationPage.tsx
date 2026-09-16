import { useLayoutEffect, useState } from 'react'
import { getPublicAccountApi } from '@/api/publicAccount'
import { AppShell } from '@/components/layout/AppShellView'
import { RelativeLink as Link } from '@/components/navigation/RelativeLinkView'
import { Button } from '@/components/ui/ButtonControl'
import { deliverEmailVerification, verificationTokenFromLink, type EmailVerificationResult } from './-components/emailVerificationChannel'

export function EmailVerificationPage() {
  const [token] = useState(() => new URL(window.location.href).searchParams.get('token') ?? '')
  const [urlSanitized, setUrlSanitized] = useState(false)
  const [result, setResult] = useState<EmailVerificationResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useLayoutEffect(() => {
    window.history.replaceState(window.history.state, '', window.location.pathname)
    setUrlSanitized(true)
  }, [])

  async function confirm() {
    if (busy) return
    setBusy(true); setError('')
    try {
      const api = getPublicAccountApi()
      if (!api) throw new Error('이메일 인증 서비스를 이용할 수 없습니다.')
      const value = await api.confirmEmailVerification(verificationTokenFromLink(token))
      if (!value.requestId) throw new Error('인증 결과를 연결할 수 없습니다. 원래 화면에서 인증 메일을 다시 요청해 주세요.')
      const message = { ...value, requestId: value.requestId }
      setResult(message); deliverEmailVerification(message)
    } catch (cause) { setError(cause instanceof Error ? cause.message : '이메일 인증을 완료하지 못했습니다.') }
    finally { setBusy(false) }
  }

  if (!urlSanitized) return null

  return (
    <AppShell>
      <section className="not-ready-page email-verification-page">
        <div className="auth-panel auth-panel--result">
          <p className="eyebrow">EMAIL VERIFICATION</p>
          <h1>{result ? '이메일 인증이 완료되었습니다' : '이메일 인증'}</h1>
          {result ? (
            <>
              <p role="status">인증을 요청한 화면으로 돌아가면 회원가입이 자동으로 계속됩니다.</p>
              <Button size="large" onClick={() => deliverEmailVerification(result)}>인증 결과 다시 전달</Button>
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
              <p role="alert">유효한 이메일 인증 링크로 접속해 주세요.</p>
              <Button as={Link} size="large" to="/">메인으로</Button>
            </>
          )}
        </div>
      </section>
    </AppShell>
  )
}
