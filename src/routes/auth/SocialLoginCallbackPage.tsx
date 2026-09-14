import { Navigate } from 'react-router'
import { useEffect, useRef, useState } from 'react'
import { useAuthentication } from '@/app/session/AuthProvider'
import { useSession } from '@/app/session/SessionProvider'
import { RelativeLink as Link } from '@/components/navigation/RelativeLinkView'
import { AuthHeading, AuthPage, AuthPanel } from './AuthComponentsView'
import { LoadingState } from '@/components/ui/LoadingStateControl'

export function SocialLoginCallbackPage() {
  const auth = useAuthentication()
  const session = useSession()
  const result = new URLSearchParams(window.location.search).get('result')
  const attemptedRestore = useRef(false)
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'pending' | 'failed'>('idle')

  useEffect(() => {
    if (result !== 'login' || session.status === 'authenticated' || auth.restoring || attemptedRestore.current) return
    attemptedRestore.current = true
    setRestoreStatus('pending')
    void auth.restoreSession()
      .then(() => setRestoreStatus('idle'))
      .catch(() => setRestoreStatus('failed'))
  }, [auth, auth.restoring, result, session.status])

  if (result === 'signup_required') return <Navigate replace to="/signup/terms?mode=social" />
  if (result === 'login' && session.status === 'authenticated') return <Navigate replace to="/mypage" />

  const waiting = result === 'login' && (auth.restoring || restoreStatus === 'pending' || restoreStatus === 'idle')
  return <AuthPage><AuthPanel result>
    <AuthHeading title="간편 로그인" />
    {waiting ? <LoadingState className="route-loading--compact" label="로그인 상태를 확인하고 있습니다." /> : <p role="alert">간편 로그인을 완료하지 못했습니다. 다시 시도해 주세요.</p>}
    {!waiting ? <Link to="/login">로그인 화면으로 돌아가기</Link> : null}
  </AuthPanel></AuthPage>
}
