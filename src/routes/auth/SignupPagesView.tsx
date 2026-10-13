import { RelativeLink as Link } from '../../components/navigation/RelativeLinkView'
import { Button } from '../../components/ui/ButtonControl'
import { AuthHeading, AuthPage, AuthPanel } from './AuthComponentsView'
import { SignupTermsStep } from './-components/SignupTermsStep'
import { SignupProfileStep } from './-components/SignupProfileStep'
import { useLocation } from 'react-router'

function CompletePage() {
  const state = useLocation().state as { username?: string; name?: string; email?: string } | null
  return (
    <AuthPage variant="signup-complete"><AuthPanel result>
      <AuthHeading title="회원가입이 완료되었습니다." />
      <div className="result-copy"><p>{state?.name ? <><strong>{state.name}</strong>님의 </> : null}회원가입이 완료되었습니다.</p><p>이제 가입한 아이디와 비밀번호로 로그인할 수 있습니다.</p>{state ? <dl>{state.name ? <div><dt>이름</dt><dd>{state.name}</dd></div> : null}{state.username ? <div><dt>아이디</dt><dd>{state.username}</dd></div> : null}{state.email ? <div><dt>Email</dt><dd>{state.email}</dd></div> : null}</dl> : null}</div>
      <Button as={Link} size="large" to="/login">로그인하기</Button>
    </AuthPanel></AuthPage>
  )
}

export function SignupPages({ page }: { page: string }) {
  if (page === 'terms') return <SignupTermsStep />
  if (page === 'profile') return <SignupProfileStep />
  return <CompletePage />
}
