import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { useAuthentication } from '../../app/session/AuthProvider'
import { SessionNotice } from '../../app/session/SessionControls'
import { useSession } from '../../app/session/SessionProvider'
import { useState } from 'react'
import { Button } from '../../components/ui/ButtonControl'
import { TextField } from '../../components/ui/TextFieldControl'
import { LoadingState } from '../../components/ui/LoadingStateControl'
import { restoreRememberedLoginId } from '../../domain/auth/loginCredentials'
import type { FormEvent } from 'react'
import { AuthHeading, AuthLinks, AuthPage, AuthPanel, Checkbox, PasswordField, SocialLoginButtons } from './AuthComponentsView'

const rememberedIdKey = 'comviewers.login.remembered-id'
function readRememberedId() {
  try { return restoreRememberedLoginId(localStorage.getItem(rememberedIdKey)) }
  catch { return '' }
}

function safeReturnPath(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/mypage'
}

export function LoginPage() {
  const auth = useAuthentication()
  const session = useSession()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const returnPath = safeReturnPath(params.get('returnTo'))
  const [pending, setPending] = useState(false)
  const [savedId] = useState(readRememberedId)
  const [loginId, setLoginId] = useState(savedId)
  const [password, setPassword] = useState('')
  const [autoLogin, setAutoLogin] = useState(false)
  const [rememberId, setRememberId] = useState(Boolean(savedId))
  const [loginError, setLoginError] = useState('')
  const [socialError, setSocialError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setLoginError('')
    setSocialError('')
    try {
      const status = await auth.login(loginId, password, autoLogin)
      if (status === 'authenticated') {
        try {
          if (rememberId) localStorage.setItem(rememberedIdKey, loginId.trim())
          else localStorage.removeItem(rememberedIdKey)
        } catch { /* Browser storage restrictions must not prevent an authenticated login. */ }
        navigate(returnPath, { replace: true })
      }
    } catch { setLoginError('아이디 또는 비밀번호가 일치하지 않습니다.') }
    finally { setPassword(''); setPending(false) }
  }

  if (auth.restoring) return <AuthPage><AuthPanel><LoadingState label="로그인 상태를 확인하고 있습니다." /></AuthPanel></AuthPage>
  if (session.status === 'authenticated' && Date.now() < session.expiresAt) return <Navigate to={returnPath} replace />

  return (
    <AuthPage>
      <AuthPanel>
        <AuthHeading title="로그인" /><SessionNotice />
        <form className="auth-form auth-form--login" noValidate onSubmit={submit}>
          <TextField
            autoComplete="username"
            label="아이디"
            onChange={(event) => setLoginId(event.target.value)}
            placeholder="로그인 아이디를 입력해 주세요."
            required
            value={loginId}
          />
          <PasswordField
            autoComplete="current-password"
            label="비밀번호"
            displayAsText={false}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="비밀번호를 입력해 주세요."
            required
            value={password}
          />
          <div className="auth-check-row">
            <Checkbox disabled={pending} checked={autoLogin} name="auto-login" onChange={(event) => setAutoLogin(event.target.checked)}>자동 로그인 사용</Checkbox>
            <Checkbox disabled={pending} checked={rememberId} name="remember-id" onChange={(event) => setRememberId(event.target.checked)}>아이디 저장</Checkbox>
          </div>
          <Button disabled={pending || !loginId || !password} size="large" type="submit">로그인</Button>
          {loginError ? <p aria-live="polite" className="auth-notice">{loginError}</p> : null}
          <AuthLinks />
        </form>
        <SocialLoginButtons onSelect={(provider) => {
          setLoginError('')
          setSocialError('')
          try { auth.startSocialLogin(provider) }
          catch (error) { setSocialError(error instanceof Error ? error.message : '현재 소셜 로그인을 이용할 수 없습니다.') }
        }} />
        {socialError ? <p aria-live="polite" className="auth-notice">{socialError}</p> : null}
      </AuthPanel>
    </AuthPage>
  )
}

