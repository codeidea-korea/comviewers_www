import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { useAuthentication } from '../../app/session/AuthProvider'
import { SessionNotice } from '../../app/session/SessionControls'
import { useSession } from '../../app/session/SessionProvider'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/ButtonControl'
import { TextField } from '../../components/ui/TextFieldControl'
import { LoadingState } from '../../components/ui/LoadingStateControl'
import { restoreRememberedLoginId } from '../../domain/auth/loginCredentials'
import type { FormEvent } from 'react'
import { AuthHeading, AuthLinks, AuthPage, AuthPanel, Checkbox, PasswordField, SocialLoginButtons } from './AuthComponentsView'
import { clearSocialLink } from './socialLinkIntent'
import { RequiredPasswordChangeModal } from './-components/modals/RequiredPasswordChangeModal'

const rememberedIdKey = 'comviewers.login.remembered-id'
function readRememberedId() {
  try { return restoreRememberedLoginId(localStorage.getItem(rememberedIdKey)).slice(0, 20) }
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
  const [requiredCredentials, setRequiredCredentials] = useState<{ username: string; currentPassword: string } | null>(null)
  useEffect(() => { clearSocialLink() }, [])

  function rememberLoginId(username: string) {
    try {
      if (rememberId) localStorage.setItem(rememberedIdKey, username)
      else localStorage.removeItem(rememberedIdKey)
    } catch { /* Browser storage restrictions must not prevent an authenticated login. */ }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setLoginError('')
    setSocialError('')
    try {
      const status = await auth.login(loginId, password, autoLogin)
      if (status === 'authenticated') {
        rememberLoginId(loginId.trim())
        navigate(returnPath, { replace: true })
      } else {
        // Keep the verified temporary credential only in this mounted login flow.
        setRequiredCredentials({ username: loginId.trim(), currentPassword: password })
      }
    } catch { setLoginError('아이디 또는 비밀번호가 일치하지 않습니다.') }
    finally { setPassword(''); setPending(false) }
  }

  if (auth.restoring) return <AuthPage><AuthPanel><LoadingState label="로그인 상태를 확인하고 있습니다." /></AuthPanel></AuthPage>
  if (session.status === 'authenticated' && Date.now() < session.expiresAt) return <Navigate to={returnPath} replace />

  return (
    <AuthPage>
      <AuthPanel>
        <AuthHeading title="로그인" />{!requiredCredentials ? <SessionNotice /> : null}
        <form className="auth-form auth-form--login" noValidate onSubmit={submit}>
          <TextField
            autoComplete="username"
            disabled={pending}
            helperText="3~20자의 영문, 숫자, 밑줄(_)만 사용할 수 있습니다."
            label="아이디"
            maxLength={20}
            onChange={(event) => setLoginId(event.target.value)}
            placeholder="로그인 아이디를 입력해 주세요."
            required
            value={loginId}
          />
          <PasswordField
            autoComplete="current-password"
            disabled={pending}
            helperText="8~16자의 영문, 숫자, 특수문자(!, @, #, $, %, )만 사용할 수 있습니다."
            label="비밀번호"
            displayAsText={false}
            maxLength={16}
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
          {loginError ? <p aria-live="polite" className="auth-notice auth-notice--error">{loginError}</p> : null}
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
      {requiredCredentials && session.status === 'password-change-required' ? <RequiredPasswordChangeModal
        username={requiredCredentials.username} currentPassword={requiredCredentials.currentPassword}
        onClose={() => { setRequiredCredentials(null); void auth.logout() }}
        onComplete={() => { rememberLoginId(requiredCredentials.username); setRequiredCredentials(null); navigate(returnPath, { replace: true }) }}
      /> : null}
    </AuthPage>
  )
}

