import { useAuthTranslation } from '@/routes/auth/authTranslation'
import { RelativeLink as Link } from '../../components/navigation/RelativeLinkView'
import { Button } from '../../components/ui/ButtonControl'
import { AuthHeading, AuthPage, AuthPanel } from './AuthComponentsView'
import { SignupTermsStep } from './-components/SignupTermsStep'
import { SignupProfileStep } from './-components/SignupProfileStep'
import { useLocation } from 'react-router'

function CompletePage() {
  const { authText, locale } = useAuthTranslation()
  const state = useLocation().state as { username?: string; name?: string; email?: string } | null
  return (
    <AuthPage variant="signup-complete"><AuthPanel result>
      <AuthHeading title={authText("회원가입이 완료되었습니다.")} />
      <div className="result-copy"><p>{state?.name ? <><strong>{state.name}</strong>{locale === 'ko' ? '님의 ' : ' · '}</> : null}{authText("회원가입이 완료되었습니다.")}</p><p>{authText("이제 가입한 아이디와 비밀번호로 로그인할 수 있습니다.")}</p>{state ? <dl>{state.name ? <div><dt>{authText("이름")}</dt><dd>{state.name}</dd></div> : null}{state.username ? <div><dt>{authText("아이디")}</dt><dd>{state.username}</dd></div> : null}{state.email ? <div><dt>Email</dt><dd>{state.email}</dd></div> : null}</dl> : null}</div>
      <Button as={Link} size="large" to="/login">{authText("로그인하기")}</Button>
    </AuthPanel></AuthPage>
  )
}

export function SignupPages({ page }: { page: string }) {
  if (page === 'terms') return <SignupTermsStep />
  if (page === 'profile') return <SignupProfileStep />
  return <CompletePage />
}
