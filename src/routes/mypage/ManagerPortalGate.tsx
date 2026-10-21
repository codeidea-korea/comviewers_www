import { useUiTranslation } from '@/i18n/uiTranslation'
import { useEffect, useState, type FormEvent } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router'
import { useAuthentication } from '@/app/session/AuthProvider'
import { useSession, useSessionStore } from '@/app/session/SessionProvider'
import { PopupLayer } from '@/components/ui/PopupLayerControl'
import { ManagerField } from './-components/modals/ManagerForms'
import { RequiredPasswordChangeModal } from '@/routes/auth/-components/modals/RequiredPasswordChangeModal'
import eyeIcon from '@/assets/figma/eye.svg'
import eyeOffIcon from '@/assets/figma/eye-off.svg'
import './managerPortal.css'

const codePattern = /^ORG_[A-Za-z0-9_]{1,46}$/i

export function ManagerPortalGate() {
  const { uiText } = useUiTranslation()
  const { organizationCode = '' } = useParams()
  const navigate = useNavigate()
  const session = useSession()
  const store = useSessionStore()
  const auth = useAuthentication()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [passwordChangedNotice, setPasswordChangedNotice] = useState('')
  const organization = session.status === 'authenticated'
    ? session.organizations.find(item => item.role === 'c_manager' && item.organizationNo?.toLowerCase() === organizationCode.toLowerCase())
    : null

  useEffect(() => {
    if (session.status === 'authenticated' && session.role === 'C_MANAGER' && organization && session.organizationId !== organization.id) {
      store.selectOrganization(organization.id)
    }
  }, [organization, session, store])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError('')
    setPasswordChangedNotice('')
    try {
      await auth.managerLogin(organizationCode, loginId, password)
    } catch {
      setError("아이디 또는 비밀번호를 확인해 주세요.")
    } finally {
      setPassword('')
      setPending(false)
    }
  }

  if (!codePattern.test(organizationCode)) return <main className="manager-portal-notice"><p>{uiText("담당자 접속 링크를 확인해 주세요.")}</p></main>
  if (auth.restoring) return <main className="manager-portal-notice"><p role="status">{uiText("로그인 상태를 확인하고 있습니다.")}</p></main>
  if (session.status === 'password-change-required' && session.role === 'USER' && auth.requiredPasswordChange) {
    return <RequiredPasswordChangeModal onClose={() => { void auth.logout() }}
      onComplete={() => setPasswordChangedNotice('비밀번호가 변경되었습니다. 새 비밀번호로 담당자 로그인해 주세요.')} />
  }
  if (session.status === 'authenticated' && session.role !== 'C_MANAGER') return <main className="manager-portal-notice"><p>{uiText("담당자 계정으로 로그인해야 합니다.")}</p><button onClick={() => { void auth.logout() }} type="button">{uiText("로그아웃")}</button></main>
  if (session.status === 'authenticated') {
    if (!organization) return <main className="manager-portal-notice"><p role="alert">{uiText("이 조직의 담당자 권한이 없습니다.")}</p></main>
    if (session.organizationId !== organization.id || session.capabilityStatus === 'pending') return <main className="manager-portal-notice"><p role="status">{uiText("담당 RCPC 권한을 확인하고 있습니다.")}</p></main>
    if (session.capabilityStatus !== 'ready' || session.customerSession?.memberRole !== 'c_manager' || !session.customerSession.myPageOnly) {
      return <main className="manager-portal-notice"><p role="alert">{uiText("담당자 권한을 확인하지 못했습니다.")}</p><button onClick={() => store.retryCustomerSession()} type="button">{uiText("다시 확인")}</button></main>
    }
    return <Outlet />
  }

  return <main className="manager-portal-entry"><div className="manager-portal-entry__preview" aria-hidden="true"><h1>{uiText("담당 RCPC")}</h1><p>{uiText("로그인 후 배정된 RCPC 정보를 확인할 수 있습니다.")}</p></div>
    <PopupLayer className="manager-portal-overlay" dialogClassName="manager-modal manager-modal--login manager-portal-login" isOpen onClose={() => navigate('/', { replace: true })} showTitle={false} title={uiText("담당자 로그인")}>
      <h2>{uiText("담당자 로그인")}</h2>
      <form onSubmit={event => { void submit(event) }}>
        <ManagerField autoComplete="username" label={uiText("아이디")} name="manager-login-id" placeholder={uiText("아이디")} showRequired={false} value={loginId} onChange={event => setLoginId(event.target.value)} help={uiText("* 5~16자의 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.")} />
        <ManagerField autoComplete="current-password" label={uiText("비밀번호")} name="manager-login-password" placeholder={uiText("비밀번호")} showRequired={false} type={passwordVisible ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} trailingIcon={passwordVisible ? eyeOffIcon : eyeIcon} onTrailingAction={() => setPasswordVisible(value => !value)} help={uiText("* 8~16자의 영문, 숫자, 특수문자(!, @, #, $, %)만 사용할 수 있습니다.")} />
        {error ? <p role="alert">{uiText(error)}</p> : null}
        {passwordChangedNotice ? <p role="status">{uiText(passwordChangedNotice)}</p> : null}
        {auth.logoutNotice ? <p role="alert">{uiText(auth.logoutNotice)}</p> : null}
        <div className="manager-portal-login__actions"><button onClick={() => navigate('/', { replace: true })} type="button">{uiText("취소")}</button><button disabled={pending || !loginId.trim() || !password} type="submit">{pending ? uiText("확인 중…") : uiText("로그인")}</button></div>
      </form>
    </PopupLayer>
  </main>
}
