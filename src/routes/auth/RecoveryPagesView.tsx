import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { getPublicAccountApi } from '@/api/publicAccount'
import { ApiClientError } from '@/api/httpClient'
import { RelativeLink as Link } from '@/components/navigation/RelativeLinkView'
import { Button } from '@/components/ui/ButtonControl'
import { Modal } from '@/components/ui/ModalControl'
import { TextField } from '@/components/ui/TextFieldControl'
import { AuthHeading, AuthPage, AuthPanel, EmailAddressField, PasswordField } from './AuthComponentsView'
import { LoginPage } from './LoginPageView'
import { formatPasswordResetCountdown as countdown, passwordResetCountdownLabel, readPasswordResetRetryAt, resolvePasswordResetRateLimit, resolvePasswordResetRetryAt, writePasswordResetRetryAt } from './passwordResetCooldown'

const idRecoveryResultKey = 'comviewers.id-recovery.result'
const passwordResetRequestKey = 'comviewers.password-reset.request'

interface PasswordResetRequestState {
  requested: true
  username: string
  email: string
}

function readSessionObject<T>(key: string, validate: (value: unknown) => value is T): T | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(key) ?? 'null')
    return validate(value) ? value : null
  } catch { return null }
}

function writeSessionObject(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)) }
  catch { /* The current navigation still carries the result when browser storage is unavailable. */ }
}

function isMaskedUsernameState(value: unknown): value is { maskedUsername: string } {
  if (!value || typeof value !== 'object') return false
  const maskedUsername = Reflect.get(value, 'maskedUsername')
  return typeof maskedUsername === 'string' && maskedUsername.length >= 3 && maskedUsername.length <= 20
}

function isPasswordResetRequestState(value: unknown): value is PasswordResetRequestState {
  if (!value || typeof value !== 'object') return false
  return Reflect.get(value, 'requested') === true
    && typeof Reflect.get(value, 'username') === 'string'
    && typeof Reflect.get(value, 'email') === 'string'
}
function readRetryAt() {
  return readPasswordResetRetryAt(sessionStorage)
}
function useResetCooldown() {
  const [retryAt, setRetryAt] = useState(readRetryAt)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  function store(next: number) {
    const current = Date.now()
    setRetryAt(next); setNow(current)
    writePasswordResetRetryAt(sessionStorage, next)
  }
  return {
    retryAt,
    remaining: Math.max(0, Math.ceil((retryAt - now) / 1000)),
    start(retryAfter?: string) { store(resolvePasswordResetRetryAt(retryAfter)) },
    startAt(retryAt: number) { store(retryAt) },
  }
}
function useEmailFields(filled = false) {
  const [emailId, setEmailId] = useState(filled ? 'user123' : '')
  const [emailDomain, setEmailDomain] = useState(filled ? 'gmail.com' : '')
  return { emailId, emailDomain, email: `${emailId}@${emailDomain}`, setEmailId, setEmailDomain }
}

function FindIdPage() {
  const navigate = useNavigate()
  const api = getPublicAccountApi()
  const [name, setName] = useState('')
  const email = useEmailFields()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!api) { setError('계정 복구 API 설정이 필요합니다.'); return }
    setBusy(true); setError('')
    try {
      const result = await api.recoverId(name.trim(), email.email)
      writeSessionObject(idRecoveryResultKey, { maskedUsername: result.maskedUsername })
      navigate('/account/find-id/complete', { state: { maskedUsername: result.maskedUsername } })
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : '아이디 찾기를 요청하지 못했습니다.') }
    finally { setBusy(false) }
  }
  return <AuthPage variant="find-id"><AuthPanel>
    <AuthHeading description="회원가입 시 등록한 이름과 이메일을 입력해 주세요." title="아이디 찾기" />
    <form className="auth-form" onSubmit={submit}>
      <TextField label="이름" onChange={(event) => setName(event.target.value)} placeholder="이름 입력" required value={name} />
      <EmailAddressField domain={email.emailDomain} domainPlaceholder="" error={error} id={email.emailId} onDomainChange={email.setEmailDomain} onIdChange={(event) => email.setEmailId(event.target.value)} required />
      <Button disabled={busy || !name || !email.emailId || !email.emailDomain} size="large" type="submit">{busy ? '요청 중' : '아이디 찾기'}</Button>
    </form>
  </AuthPanel></AuthPage>
}

function FindIdCompletePage() {
  const locationState = useLocation().state
  const [result] = useState(() => isMaskedUsernameState(locationState)
    ? locationState
    : readSessionObject(idRecoveryResultKey, isMaskedUsernameState))
  const maskedUsername = result?.maskedUsername
  return <AuthPage variant="find-id-complete"><AuthPanel result><AuthHeading title="아이디 찾기" description={maskedUsername ? '아이디 찾기가 완료되었습니다.' : '아이디 찾기 요청 정보가 없습니다.'} />{maskedUsername ? <dl className="single-result"><dt>아이디</dt><dd>{maskedUsername}</dd></dl> : null}<div className="result-actions"><Button as={Link} size="large" to="/account/find-password" variant="secondary">비밀번호 찾기</Button><Button as={Link} size="large" to="/login">로그인하기</Button></div></AuthPanel></AuthPage>
}

function FindPasswordPage() {
  const navigate = useNavigate()
  const api = getPublicAccountApi()
  const [loginId, setLoginId] = useState('')
  const email = useEmailFields()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const cooldown = useResetCooldown()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || cooldown.remaining > 0) return
    if (!api) { setError('계정 복구 API 설정이 필요합니다.'); return }
    setBusy(true); setError('')
    try {
      await api.requestPasswordReset(loginId.trim(), email.email)
      const request = { requested: true, username: loginId.trim(), email: email.email } as const
      writeSessionObject(passwordResetRequestKey, request)
      cooldown.start()
      navigate('/account/find-password/sent', { state: request })
    }
    catch (cause) {
      const retryAt = cause instanceof ApiClientError ? resolvePasswordResetRateLimit(cause) : null
      if (retryAt !== null) cooldown.startAt(retryAt)
      setError(cause instanceof Error ? cause.message : '비밀번호 재설정을 요청하지 못했습니다.')
    }
    finally { setBusy(false) }
  }
  return <AuthPage variant="find-password"><AuthPanel>
    <AuthHeading description={<>회원가입 시 등록한 아이디와 이메일 주소를 입력해 주세요.<br />회원정보 확인 후 비밀번호 재설정 메일을 보내드립니다.</>} title="비밀번호 찾기" />
    <form className="auth-form" onSubmit={submit}>
      <TextField label="아이디" onChange={(event) => setLoginId(event.target.value)} placeholder="아이디" required value={loginId} />
      <EmailAddressField domain={email.emailDomain} domainPlaceholder="" error={error} id={email.emailId} onDomainChange={email.setEmailDomain} onIdChange={(event) => email.setEmailId(event.target.value)} required />
      <Button disabled={busy || cooldown.remaining > 0 || !loginId || !email.emailId || !email.emailDomain} size="large" type="submit">{busy ? '요청 중' : cooldown.remaining > 0 ? `${countdown(cooldown.remaining)} 후 다시 요청` : '비밀번호 재설정'}</Button>
    </form>
  </AuthPanel></AuthPage>
}

function PasswordSentPage() {
  const locationState = useLocation().state
  const [state] = useState(() => isPasswordResetRequestState(locationState)
    ? locationState
    : readSessionObject(passwordResetRequestKey, isPasswordResetRequestState))
  const api = getPublicAccountApi()
  const cooldown = useResetCooldown()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  async function resend() {
    if (busy || cooldown.remaining > 0 || !api || !state?.username || !state.email) return
    setBusy(true); setNotice('')
    try { await api.requestPasswordReset(state.username, state.email); cooldown.start(); setNotice('메일 재발송 요청이 접수되었습니다.') }
    catch (cause) {
      const retryAt = cause instanceof ApiClientError ? resolvePasswordResetRateLimit(cause) : null
      if (retryAt !== null) {
        cooldown.startAt(retryAt)
      } else {
        setNotice('메일 재발송을 요청하지 못했습니다. 잠시 후 다시 시도해 주세요.')
      }
    }
    finally { setBusy(false) }
  }
  return <AuthPage variant="password-sent"><AuthPanel result><AuthHeading title="비밀번호 찾기" /><div className="result-copy">
    <p>{state?.requested ? <>입력하신 이메일 주소로 <strong>비밀번호 재설정 메일</strong>을 발송했습니다.<br />메일의 링크를 통해 새 비밀번호를 설정해 주세요.</> : '비밀번호 재설정 요청 정보가 없습니다.'}</p>
    {state?.email ? <dl><div><dt>Email</dt><dd>{state.email}</dd></div></dl> : null}
    <hr />
    <p><strong>비밀번호 재설정 메일을 받지 못하셨나요?</strong><br />스팸메일함을 확인하거나 메일을 다시 보내 주세요.</p>
    {state?.username && state.email && cooldown.remaining > 0 ? <p aria-label={passwordResetCountdownLabel(cooldown.remaining)} aria-live="off" className="resend-timer" role="timer">남은 시간 {countdown(cooldown.remaining)}</p> : null}
    {notice ? <p role="status">{notice}</p> : null}
  </div><div className="result-actions">{state?.username && state.email ? <Button disabled={busy || cooldown.remaining > 0 || !api} onClick={() => { void resend() }} size="large" type="button" variant="secondary">{busy ? '요청 중' : '메일 다시 보내기'}</Button> : <Button as={Link} size="large" to="/account/find-password" variant="secondary">다시 요청</Button>}<Button as={Link} size="large" to="/login">로그인하기</Button></div></AuthPanel></AuthPage>
}

function ResetPasswordPage() {
  const api = getPublicAccountApi()
  const navigate = useNavigate()
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') ?? '')
  useEffect(() => {
    window.history.replaceState(window.history.state, '', window.location.pathname)
  }, [])
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [complete, setComplete] = useState(false)
  const validPassword = /^[A-Za-z0-9!@#$%]{8,16}$/.test(password)
  async function submit() {
    if (!api || !token) { setError('비밀번호 재설정 링크가 올바르지 않습니다.'); return }
    if (!validPassword) { setError('비밀번호는 8~16자의 영문, 숫자, ! @ # $ %만 사용할 수 있습니다.'); return }
    if (password !== confirmation) { setError('비밀번호가 일치하지 않습니다.'); return }
    setBusy(true); setError('')
    try { await api.confirmPasswordReset(token, password, confirmation); setComplete(true) }
    catch (cause) { setError(cause instanceof Error ? cause.message : '비밀번호를 재설정하지 못했습니다.') }
    finally { setBusy(false) }
  }
  const helperText = '8~16자의 영문, 숫자, 특수문자(!, @, #, $, %)만 사용할 수 있습니다.'
  return <><LoginPage />
    <Modal className="modal--wide modal--password-reset" confirmDisabled={busy || !validPassword || password !== confirmation} confirmLabel={busy ? '변경 중…' : '확인'} isOpen={!complete} onClose={() => navigate('/login', { replace: true })} onConfirm={() => { void submit() }} showClose={false} title="비밀번호 재설정">
      <div className="popup-form">
        <PasswordField autoComplete="new-password" helperText={helperText} label="새 비밀번호" maxLength={16} onChange={(event) => { setPassword(event.target.value); setError('') }} required value={password} />
        <PasswordField autoComplete="new-password" error={confirmation && password !== confirmation ? '비밀번호가 일치하지 않습니다.' : undefined} helperText={helperText} label="비밀번호 확인" maxLength={16} onChange={(event) => { setConfirmation(event.target.value); setError('') }} required value={confirmation} />
        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </div>
    </Modal>
    <Modal confirmLabel="로그인하기" isOpen={complete} onClose={() => navigate('/login', { replace: true, state: { passwordReset: true } })} onConfirm={() => navigate('/login', { replace: true, state: { passwordReset: true } })} showClose={false} title="비밀번호가 변경되었습니다."><p>새로 설정한 비밀번호로 다시 로그인해 주세요.</p></Modal>
  </>
}

export function RecoveryPages({ page }: { page: string }) {
  if (page === 'find-id') return <FindIdPage />
  if (page === 'find-id-complete') return <FindIdCompletePage />
  if (page === 'find-password') return <FindPasswordPage />
  if (page === 'reset-password') return <ResetPasswordPage />
  return <PasswordSentPage />
}
