import { useAuthTranslation } from '@/routes/auth/authTranslation'
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
import { formatPasswordResetCountdown as countdown, formatPasswordResetRetryTime, readPasswordResetRetryAt, resolvePasswordResetRateLimit, resolvePasswordResetRetryAt, writePasswordResetRetryAt } from './passwordResetCooldown'

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
  const { authText } = useAuthTranslation()
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
    <AuthHeading description={authText("회원가입 시 등록한 이름과 이메일을 입력해 주세요.")} title={authText("아이디 찾기")} />
    <form className="auth-form" onSubmit={submit}>
      <TextField label={authText("이름")} onChange={(event) => setName(event.target.value)} placeholder={authText("이름 입력")} required value={name} />
      <EmailAddressField domain={email.emailDomain} domainPlaceholder="" error={authText(error)} id={email.emailId} onDomainChange={email.setEmailDomain} onIdChange={(event) => email.setEmailId(event.target.value)} required />
      <Button disabled={busy || !name || !email.emailId || !email.emailDomain} size="large" type="submit">{busy ? authText("요청 중") : authText("아이디 찾기")}</Button>
    </form>
  </AuthPanel></AuthPage>
}

function FindIdCompletePage() {
  const { authText } = useAuthTranslation()
  const locationState = useLocation().state
  const [result] = useState(() => isMaskedUsernameState(locationState)
    ? locationState
    : readSessionObject(idRecoveryResultKey, isMaskedUsernameState))
  const maskedUsername = result?.maskedUsername
  return <AuthPage variant="find-id-complete"><AuthPanel result><AuthHeading title={authText("아이디 찾기")} description={maskedUsername ? authText("아이디 찾기가 완료되었습니다.") : authText("아이디 찾기 요청 정보가 없습니다.")} />{maskedUsername ? <dl className="single-result"><dt>{authText("아이디")}</dt><dd>{maskedUsername}</dd></dl> : null}<div className="result-actions"><Button as={Link} size="large" to="/account/find-password" variant="secondary">{authText("비밀번호 찾기")}</Button><Button as={Link} size="large" to="/login">{authText("로그인하기")}</Button></div></AuthPanel></AuthPage>
}

function FindPasswordPage() {
  const { authText, t } = useAuthTranslation()
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
    <AuthHeading description={<>{authText("회원가입 시 등록한 아이디와 이메일 주소를 입력해 주세요.")}<br />{authText("회원정보 확인 후 비밀번호 재설정 메일을 보내드립니다.")}</>} title={authText("비밀번호 찾기")} />
    <form className="auth-form" onSubmit={submit}>
      <TextField label={authText("아이디")} onChange={(event) => setLoginId(event.target.value)} placeholder={authText("아이디")} required value={loginId} />
      <EmailAddressField domain={email.emailDomain} domainPlaceholder="" error={authText(error)} id={email.emailId} onDomainChange={email.setEmailDomain} onIdChange={(event) => email.setEmailId(event.target.value)} required />
      <Button disabled={busy || cooldown.remaining > 0 || !loginId || !email.emailId || !email.emailDomain} size="large" type="submit">{busy ? authText("요청 중") : cooldown.remaining > 0 ? t('auth.retryCountdown', { time: countdown(cooldown.remaining) }) : authText("비밀번호 재설정")}</Button>
    </form>
  </AuthPanel></AuthPage>
}

function PasswordSentPage() {
  const { authText, t, locale } = useAuthTranslation()
  const locationState = useLocation().state
  const [state] = useState(() => isPasswordResetRequestState(locationState)
    ? locationState
    : readSessionObject(passwordResetRequestKey, isPasswordResetRequestState))
  const api = getPublicAccountApi()
  const cooldown = useResetCooldown()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  async function resend() {
    if (busy || cooldown.remaining > 0 || !api || !state?.username || !state.email) return
    setBusy(true); setNotice(''); setError('')
    try { await api.requestPasswordReset(state.username, state.email); cooldown.start(); setNotice('메일 재발송 요청이 접수되었습니다.') }
    catch (cause) {
      const retryAt = cause instanceof ApiClientError ? resolvePasswordResetRateLimit(cause) : null
      if (retryAt !== null) {
        cooldown.startAt(retryAt)
      } else {
        setError(cause instanceof Error ? cause.message : '메일 재발송을 요청하지 못했습니다. 잠시 후 다시 시도해 주세요.')
      }
    }
    finally { setBusy(false) }
  }
  return <AuthPage variant="password-sent"><AuthPanel result><AuthHeading title={authText("비밀번호 찾기")} /><div className="result-copy">
    <p>{state?.requested ? <>{locale === 'ko' ? <>입력하신 이메일 주소로 <strong>비밀번호 재설정 메일</strong>을 발송했습니다.</> : t('auth.resetEmailSent')}<br />{authText("메일의 링크를 통해 새 비밀번호를 설정해 주세요.")}</> : authText("비밀번호 재설정 요청 정보가 없습니다.")}</p>
    {state?.email ? <dl><div><dt>Email</dt><dd>{state.email}</dd></div></dl> : null}
    <hr />
    <p><strong>{authText("비밀번호 재설정 메일을 받지 못하셨나요?")}</strong><br />{authText("스팸메일함을 확인하거나 메일을 다시 보내 주세요.")}</p>
    {state?.username && state.email && cooldown.remaining > 0 ? <p aria-label={t('auth.resendCountdown', { time: countdown(cooldown.remaining) })} aria-live="off" className="resend-timer" role="timer">{locale === 'ko' ? <><b>{formatPasswordResetRetryTime(cooldown.retryAt)}</b>부터 메일을 다시 보낼 수 있습니다. 남은 시간 </> : t('auth.resendAt', { time: formatPasswordResetRetryTime(cooldown.retryAt) })} <strong>{countdown(cooldown.remaining)}</strong></p> : null}
    {notice ? <p role="status">{authText(notice)}</p> : null}
    {error ? <p className="form-error" role="alert">{authText(error)}</p> : null}
  </div><div className="result-actions">{state?.username && state.email ? <Button disabled={busy || cooldown.remaining > 0 || !api} onClick={() => { void resend() }} size="large" type="button" variant="secondary">{busy ? authText("요청 중") : authText("메일 다시 보내기")}</Button> : <Button as={Link} size="large" to="/account/find-password" variant="secondary">{authText("다시 요청")}</Button>}<Button as={Link} size="large" to="/login">{authText("로그인하기")}</Button></div></AuthPanel></AuthPage>
}

function ResetPasswordPage() {
  const { authText } = useAuthTranslation()
  const api = getPublicAccountApi()
  const navigate = useNavigate()
  const { search } = useLocation()
  const [mobileViewport, setMobileViewport] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 767px)').matches)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const media = window.matchMedia('(max-width: 767px)')
    const updateViewport = () => setMobileViewport(media.matches)
    media.addEventListener('change', updateViewport)
    return () => media.removeEventListener('change', updateViewport)
  }, [])
  // Router's original query survives session-scope remounts after URL sanitization.
  const [token] = useState(() => new URLSearchParams(search).get('token') ?? '')
  useEffect(() => {
    window.history.replaceState(window.history.state, '', window.location.pathname)
  }, [])
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmationTouched, setConfirmationTouched] = useState(false)
  const [passwordPolicyError, setPasswordPolicyError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [complete, setComplete] = useState(false)
  const [linkState, setLinkState] = useState<'checking' | 'ready' | 'invalid' | 'unavailable'>('checking')
  const [validationAttempt, setValidationAttempt] = useState(0)
  useEffect(() => {
    if (!api || !token) { setLinkState('invalid'); return }
    let current = true
    setLinkState('checking')
    void api.validatePasswordResetToken(token)
      .then(() => { if (current) setLinkState('ready') })
      .catch((cause: unknown) => {
        if (current) setLinkState(cause instanceof ApiClientError && cause.code === 'A017' ? 'invalid' : 'unavailable')
      })
    return () => { current = false }
  }, [api, token, validationAttempt])
  const validPasswordFormat = /^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[!@#$%])[A-Za-z0-9!@#$%]{8,16}$/.test(password)
  const validPassword = validPasswordFormat
  const invalidPasswordCharacters = /[^A-Za-z0-9!@#$%]/.test(password)
  const passwordError = passwordPolicyError || (passwordTouched && invalidPasswordCharacters
    ? '비밀번호에 사용할 수 없는 문자가 포함되어 있습니다. 영문, 숫자, 특수문자(!, @, #, $, %)만 사용해 주세요.'
    : passwordTouched && !validPasswordFormat ? '비밀번호는 8~16자로 영문, 숫자, 특수문자(!, @, #, $, %)를 각각 1개 이상 포함해 주세요.' : undefined)
  const confirmationError = confirmationTouched && password !== confirmation ? '비밀번호가 일치하지 않습니다.' : undefined
  async function submit() {
    if (!api || !token || linkState !== 'ready') return
    if (!validPassword) { setError(passwordError || '비밀번호는 8~16자로 영문, 숫자, 특수문자(!, @, #, $, %)를 각각 1개 이상 포함해 주세요.'); return }
    if (password !== confirmation) { setError('비밀번호가 일치하지 않습니다.'); return }
    setBusy(true); setError('')
    try { await api.confirmPasswordReset(token, password, confirmation); setComplete(true) }
    catch (cause) {
      if (cause instanceof ApiClientError && cause.code === 'A006') setPasswordPolicyError('8~16자로 영문, 숫자, 특수문자(!, @, #, $, %)를 각각 1개 이상 포함해 주세요.')
      else if (cause instanceof ApiClientError && cause.code === 'A026') setPasswordPolicyError('기존 비밀번호와 다른 비밀번호를 입력해 주세요.')
      else if (cause instanceof ApiClientError && cause.code === 'A017') setLinkState('invalid')
      else setError(cause instanceof Error ? cause.message : '비밀번호를 재설정하지 못했습니다.')
    }
    finally { setBusy(false) }
  }
  const helperText = '8~16자로 영문, 숫자, 특수문자(!, @, #, $, %)를 각각 1개 이상 포함해 주세요.'
  const resetContent = <>
      {linkState === 'checking' ? <p role="status">{authText("재설정 링크를 확인하고 있습니다.")}</p> : null}
      {linkState === 'invalid' ? <p role="alert">{authText("재설정 링크가 유효하지 않거나 만료되었거나 이미 사용되었습니다.")}<Link to="/account/find-password">{authText("비밀번호 재설정 메일을 다시 요청해 주세요.")}</Link></p> : null}
      {linkState === 'unavailable' ? <div><p role="alert">{authText("재설정 링크를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.")}</p><Button onClick={() => setValidationAttempt(attempt => attempt + 1)} type="button" variant="secondary">{authText("다시 시도")}</Button></div> : null}
      {linkState === 'ready' ? <div className="popup-form">
        <PasswordField autoComplete="new-password" error={authText(passwordError)} helperText={authText(helperText)} label={authText("새 비밀번호")} maxLength={16} onChange={(event) => { setPasswordTouched(true); setPasswordPolicyError(''); setPassword(event.target.value); setError('') }} required value={password} />
        <PasswordField autoComplete="new-password" error={authText(confirmationError)} helperText={authText(helperText)} label={authText("비밀번호 확인")} maxLength={16} onChange={(event) => { setConfirmationTouched(true); setConfirmation(event.target.value); setError('') }} required value={confirmation} />
        {error ? <p className="form-error" role="alert">{authText(error)}</p> : null}
      </div> : null}
    </>
  const goToLogin = () => navigate('/login', { replace: true, state: complete ? { passwordReset: true } : undefined })
  if (mobileViewport) return <AuthPage variant="reset-password"><AuthPanel>
    <AuthHeading title={complete ? authText("비밀번호가 변경되었습니다.") : authText("비밀번호 재설정")} />
    <div className="auth-form">
      {complete ? <p>{authText("새로 설정한 비밀번호로 다시 로그인해 주세요.")}</p> : resetContent}
      {!complete && linkState === 'ready' ? <Button disabled={busy || !validPassword || password !== confirmation} onClick={() => { void submit() }} size="large" type="button">{busy ? authText("변경 중…") : authText("확인")}</Button> : null}
      {complete || linkState === 'invalid' || linkState === 'unavailable' ? <Button onClick={goToLogin} size="large" type="button">{authText("로그인하기")}</Button> : null}
    </div>
  </AuthPanel></AuthPage>
  return <><LoginPage redirectAuthenticated={false} />
    <Modal className="modal--wide modal--password-reset" confirmDisabled={busy || !validPassword || password !== confirmation} confirmLabel={busy ? authText("변경 중…") : authText("확인")} isOpen={!complete} onClose={goToLogin} onConfirm={linkState === 'ready' ? () => { void submit() } : undefined} showClose={linkState !== 'ready'} title={authText("비밀번호 재설정")}>
      {resetContent}
    </Modal>
    <Modal confirmLabel={authText("로그인하기")} isOpen={complete} onClose={() => navigate('/login', { replace: true, state: { passwordReset: true } })} onConfirm={() => navigate('/login', { replace: true, state: { passwordReset: true } })} showClose={false} title={authText("비밀번호가 변경되었습니다.")}><p>{authText("새로 설정한 비밀번호로 다시 로그인해 주세요.")}</p></Modal>
  </>
}

export function RecoveryPages({ page }: { page: string }) {
  if (page === 'find-id') return <FindIdPage />
  if (page === 'find-id-complete') return <FindIdCompletePage />
  if (page === 'find-password') return <FindPasswordPage />
  if (page === 'reset-password') return <ResetPasswordPage />
  return <PasswordSentPage />
}
