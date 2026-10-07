import { Navigate } from 'react-router'
import { useEffect } from 'react'
import { useAuthentication } from '@/app/session/AuthProvider'
import { useSession } from '@/app/session/SessionProvider'
import { RelativeLink as Link } from '@/components/navigation/RelativeLinkView'
import { AuthHeading, AuthPage, AuthPanel } from './AuthComponentsView'
import { LoadingState } from '@/components/ui/LoadingStateControl'
import { clearSocialLink } from './socialLinkIntent'

export function SocialLoginCallbackPage() {
  const auth = useAuthentication()
  const session = useSession()
  const result = new URLSearchParams(window.location.search).get('result')
  useEffect(() => { clearSocialLink() }, [])

  if (result === 'signup_required') return <Navigate replace to="/signup/terms?mode=social" />
  if (result === 'login' && !auth.restoring && session.status === 'authenticated') {
    return <Navigate replace to="/mypage" />
  }
  if (result === 'reauth_success' && !auth.restoring && session.status === 'authenticated') {
    return <Navigate replace to="/mypage/profile" />
  }

  const waiting = (result === 'login' || result === 'reauth_success') && auth.restoring
  // Treat an older API's link_required result as the same duplicate-email failure.
  const duplicateEmail = result === 'email_duplicate' || result === 'link_required'
  const message = duplicateEmail
    ? '이미 가입된 이메일입니다. 기존 가입 방식으로 로그인해 주세요.'
    : result === 'link_error' || result === 'linked'
      ? '기존 계정 연결은 지원하지 않습니다. 기존 가입 방식으로 로그인해 주세요.'
      : result === 'reauth_error'
        ? '간편 로그인 본인 확인을 완료하지 못했습니다. 가입한 계정으로 다시 시도해 주세요.'
      : '간편 로그인을 완료하지 못했습니다. 다시 시도해 주세요.'
  return <AuthPage><AuthPanel result>
    <AuthHeading title="간편 로그인" />
    {waiting ? <LoadingState className="route-loading--compact" label="로그인 상태를 확인하고 있습니다." /> : <p role="alert">{message}</p>}
    {!waiting ? <Link className="button button--large button--primary" to={result === 'reauth_error' || result === 'reauth_success' ? '/mypage/profile' : '/login'}>{result === 'reauth_error' || result === 'reauth_success' ? '내 정보 수정으로 돌아가기' : '기존 가입 방식으로 로그인하기'}</Link> : null}
  </AuthPanel></AuthPage>
}
