import { useEffect, useState } from 'react'
import { getPublicAccountApi } from '@/api/publicAccount'
import { deliverEmailVerification, verificationTokenFromLink, type EmailVerificationResult } from './-components/emailVerificationChannel'

// Keep this callback free of shared layouts and third-party assets while a link token is present.
export function EmailVerificationPage() {
  const [token] = useState(() => new URL(window.location.href).searchParams.get('token') ?? '')
  const [result, setResult] = useState<EmailVerificationResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { window.history.replaceState(window.history.state, '', window.location.pathname) }, [])
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
  return <main><h1>이메일 인증</h1>{result ? <><p role="status">이메일 인증을 완료했습니다. 인증을 요청한 화면으로 돌아가 계속해 주세요.</p><button type="button" onClick={() => deliverEmailVerification(result)}>원래 화면에 인증 결과 다시 전달</button></> : <><p>이 링크로 이메일 인증을 완료합니다. 인증을 요청한 화면을 열어 두세요.</p><button type="button" disabled={!token || busy} onClick={() => { void confirm() }}>{busy ? '인증 중…' : '이메일 인증하기'}</button></>}{error && <p role="alert">{error}</p>}{!token && !result && <p role="alert">유효한 이메일 인증 링크로 접속해 주세요.</p>}</main>
}
