import { RelativeLink as Link } from '../../components/navigation/RelativeLinkView'
import { Button } from '../../components/ui/ButtonControl'
import { AuthHeading, AuthPage, AuthPanel } from './AuthComponentsView'
import { SignupTermsStep } from './-components/SignupTermsStep'
import { SignupProfileStep } from './-components/SignupProfileStep'
import { useLocation } from 'react-router'

function CompletePage() {
  const state = useLocation().state as { username?: string; name?: string; email?: string } | null
  const result = { email: 'email@mydomain.com', username: 'loginid', name: '김컴뷰', ...state }
  return (
    <AuthPage variant="signup-complete"><AuthPanel result>
      <AuthHeading title="회원가입 신청이 완료되었습니다." />
      <div className="result-copy"><p><strong>{result.name}</strong>님의 회원가입을 위한 <u>이메일 인증</u>이 필요합니다.</p><p>입력하신 이메일 주소로 인증 메일을 발송했습니다.<br />이메일 인증을 완료하면 회원가입이 최종 완료되며 서비스를 이용할 수 있습니다.</p><dl><div><dt>이름</dt><dd>{result.name}</dd></div><div><dt>아이디</dt><dd>{result.username}</dd></div><div><dt>Email</dt><dd>{result.email}</dd></div></dl></div>
      <Button as={Link} size="large" to="/">메인으로</Button>
    </AuthPanel></AuthPage>
  )
}

export function SignupPages({ page }: { page: string }) {
  if (page === 'terms') return <SignupTermsStep />
  if (page === 'profile') return <SignupProfileStep />
  return <CompletePage />
}
