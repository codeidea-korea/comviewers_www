import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { useAuthentication } from '../../app/session/AuthProvider'
import { SessionNotice } from '../../app/session/SessionControls'
import { useSession } from '../../app/session/SessionProvider'
import { useState } from 'react'
import { Button } from '../../components/ui/ButtonControl'
import { TextField } from '../../components/ui/TextFieldControl'
import { LoadingState } from '../../components/ui/LoadingStateControl'
import {
  LOGIN_ID_HELPER_TEXT,
  LOGIN_ID_PATTERN,
  LOGIN_PASSWORD_HELPER_TEXT,
  LOGIN_PASSWORD_PATTERN,
} from '../../domain/auth/loginCredentials'
import type { FormEvent } from 'react'
import { AuthHeading, AuthLinks, AuthPage, AuthPanel, Checkbox, PasswordField, SocialLoginButtons, usePublishingState } from './AuthComponentsView'

const rememberedIdKey = 'comviewers.login.remembered-id'
function readRememberedId() {
  try { return localStorage.getItem(rememberedIdKey)?.slice(0, 20) ?? '' }
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
  const isFilledPreview = usePublishingState('filled')
  const [savedId] = useState(readRememberedId)
  const [loginId, setLoginId] = useState(isFilledPreview ? 'id' : savedId)
  const [password, setPassword] = useState(isFilledPreview ? 'password' : '')
  const [autoLogin, setAutoLogin] = useState(isFilledPreview)
  const [rememberId, setRememberId] = useState(isFilledPreview || Boolean(savedId))
  const [notice, setNotice] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setNotice('')
    try {
      const status = await auth.login(loginId, password, autoLogin)
      if (status === 'authenticated') {
        try {
          if (rememberId) localStorage.setItem(rememberedIdKey, loginId.trim())
          else localStorage.removeItem(rememberedIdKey)
        } catch { /* Browser storage restrictions must not prevent an authenticated login. */ }
        navigate(returnPath, { replace: true })
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : '로그인하지 못했습니다.') }
    finally { setPassword(''); setPending(false) }
  }

  if (auth.restoring) return <AuthPage><AuthPanel><LoadingState label="로그인 상태를 확인하고 있습니다." /></AuthPanel></AuthPage>
  if (session.status === 'authenticated' && Date.now() < session.expiresAt) return <Navigate to={returnPath} replace />

  return (
    <AuthPage isolated={isFilledPreview}>
      <AuthPanel compact={isFilledPreview}>
        <AuthHeading title="로그인" /><SessionNotice />
        <form className="auth-form auth-form--login" noValidate onSubmit={submit}>
          <TextField
            autoComplete="username"
            minLength={3}
            maxLength={20}
            helperText={LOGIN_ID_HELPER_TEXT}
            label="아이디"
            onChange={(event) => setLoginId(event.target.value)}
            placeholder="로그인 아이디를 입력해 주세요."
            pattern={LOGIN_ID_PATTERN}
            required
            value={loginId}
          />
          <PasswordField
            autoComplete="current-password"
            minLength={8}
            maxLength={16}
            helperText={LOGIN_PASSWORD_HELPER_TEXT}
            label="비밀번호"
            displayAsText={isFilledPreview}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="비밀번호를 입력해 주세요."
            pattern={LOGIN_PASSWORD_PATTERN}
            required
            value={password}
          />
          <div className="auth-check-row">
            <Checkbox disabled={pending} checked={autoLogin} name="auto-login" onChange={(event) => setAutoLogin(event.target.checked)}>자동 로그인 사용</Checkbox>
            <Checkbox disabled={pending} checked={rememberId} name="remember-id" onChange={(event) => setRememberId(event.target.checked)}>아이디 저장</Checkbox>
          </div>
          <Button disabled={pending || !loginId || !password} size="large" type="submit">로그인</Button>
          <AuthLinks />
        </form>
        <SocialLoginButtons onSelect={(provider) => {
          setNotice('')
          try { auth.startSocialLogin(provider) }
          catch (error) { setNotice(error instanceof Error ? error.message : '현재 소셜 로그인을 이용할 수 없습니다.') }
        }} />
        {notice ? <p aria-live="polite" className="auth-notice">{notice}</p> : null}
      </AuthPanel>
    </AuthPage>
  )
}

