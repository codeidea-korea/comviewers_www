import { Navigate } from 'react-router'
import { useEffect } from 'react'
import { useAuthentication } from '@/app/session/AuthProvider'
import { useSession } from '@/app/session/SessionProvider'
import { RelativeLink as Link } from '@/components/navigation/RelativeLinkView'
import { AuthHeading, AuthPage, AuthPanel } from './AuthComponentsView'
import { LoadingState } from '@/components/ui/LoadingStateControl'
import { pendingSocialLink, rememberSocialLink, socialLinkDestination, socialLinkProvider } from './socialLinkIntent'

export function SocialLoginCallbackPage() {
  const auth = useAuthentication()
  const session = useSession()
  const result = new URLSearchParams(window.location.search).get('result')
  const provider = socialLinkProvider(new URLSearchParams(window.location.search).get('provider'))
  useEffect(() => {
    if (result === 'link_required' && provider) rememberSocialLink(provider)
  }, [provider, result])

  if (result === 'signup_required') return <Navigate replace to="/signup/terms?mode=social" />
  if (result === 'login' && !auth.restoring && session.status === 'authenticated') {
    const pendingProvider = pendingSocialLink()
    return <Navigate replace to={pendingProvider ? socialLinkDestination(pendingProvider) : '/mypage'} />
  }
  if (result === 'linked' && !auth.restoring && session.status === 'authenticated') return <Navigate replace to="/mypage/login-methods" />

  const waiting = (result === 'login' || result === 'linked') && auth.restoring
  const message = result === 'link_required'
    ? '이미 가입된 이메일입니다. 기존에 사용하던 계정으로 로그인하면 이 간편 로그인을 연결할 수 있습니다.'
    : result === 'link_error'
      ? '간편 로그인 계정을 연결하지 못했습니다. 다른 회원에 연결된 계정인지 확인하고 다시 시도해 주세요.'
      : '간편 로그인을 완료하지 못했습니다. 다시 시도해 주세요.'
  const canManageMethods = session.status === 'authenticated' && (result === 'link_required' || result === 'link_error')
  const nextPath = provider ? socialLinkDestination(provider) : '/mypage/login-methods'
  const loginPath = `/login?returnTo=${encodeURIComponent(nextPath)}`
  const actionPath = result === 'link_required'
    ? (canManageMethods ? nextPath : loginPath)
    : (canManageMethods ? '/mypage/login-methods' : '/login')
  const actionLabel = result === 'link_required'
    ? (canManageMethods ? '계정 연결 계속하기' : '기존 계정으로 로그인하기')
    : (canManageMethods ? '로그인 수단 관리로 이동' : '로그인 화면으로 돌아가기')
  return <AuthPage><AuthPanel result>
    <AuthHeading title="간편 로그인" />
    {waiting ? <LoadingState className="route-loading--compact" label="로그인 상태를 확인하고 있습니다." /> : <p role="alert">{message}</p>}
    {!waiting ? <Link className="button button--large button--primary" to={actionPath}>{actionLabel}</Link> : null}
  </AuthPanel></AuthPage>
}
