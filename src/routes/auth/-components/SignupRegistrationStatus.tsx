import { Button } from '@/components/ui/ButtonControl'
import { RelativeLink as Link } from '@/components/navigation/RelativeLinkView'
import { useAuthTranslation } from '@/routes/auth/authTranslation'
import type { SignupRegistrationProgress } from './emailVerificationChannel'

interface Props {
  progress: SignupRegistrationProgress | null
  onRetry: () => void
  onRestart?: () => void
}

export function SignupRegistrationStatus({ progress, onRetry, onRestart }: Props) {
  const { authText } = useAuthTranslation()
  if (!progress) return null
  if (progress.state === 'processing' || progress.state === 'waiting') {
    return <p aria-live="polite">{authText('가입 처리 중…')}</p>
  }
  if (progress.state === 'retry') {
    return <Button size="large" onClick={onRetry}>{authText('다시 시도')}</Button>
  }
  if (progress.state === 'check-login') {
    return <Button as={Link} size="large" to="/login">{authText('로그인하기')}</Button>
  }
  return onRestart
    ? <Button size="large" onClick={onRestart}>{authText('다시 입력하기')}</Button>
    : <Button as={Link} size="large" to="/signup/profile">{authText('다시 입력하기')}</Button>
}
