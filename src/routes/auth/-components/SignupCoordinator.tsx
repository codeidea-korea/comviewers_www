import { useAuthTranslation } from '@/routes/auth/authTranslation'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { getPublicAccountApi } from '@/api/publicAccount'
import { Toast, useToastMessage } from '@/components/ui/ToastControl'
import { clearSignupAgreements } from './signupDraft'
import { deliverSignupCompletion, listenForEmailVerification, listenForSignupRetry, type SignupRegistrationProgress } from './emailVerificationChannel'
import { useSignupRegistration, type PendingSignup, type PendingSignupSubmission } from './hooks/useSignupRegistration'
export type { PendingSignupSubmission } from './hooks/useSignupRegistration'

interface SignupCoordinatorValue {
  awaitingEmail: string
  busy: boolean
  error: string
  registrationProgress: SignupRegistrationProgress | null
  retryRegistration: () => void
  begin: (requestId: string, email: string, submission: PendingSignupSubmission) => void
  resend: () => Promise<boolean>
  cancel: () => void
}

const SignupCoordinatorContext = createContext<SignupCoordinatorValue | null>(null)

export function SignupCoordinatorProvider({ children }: { children: ReactNode }) {
  const { authText } = useAuthTranslation()
  const api = getPublicAccountApi()
  const navigate = useNavigate()
  const { message, toastKey, setMessage } = useToastMessage()
  const pending = useRef<PendingSignup | null>(null)
  const resending = useRef(false)
  const [requestId, setRequestId] = useState('')
  const [awaitingEmail, setAwaitingEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const registrationCompleted = useCallback((current: PendingSignup, registration: Awaited<ReturnType<NonNullable<typeof api>['register']>>) => {
    if (pending.current !== current) return
    pending.current = null
    setRequestId('')
    setAwaitingEmail('')
    setError('')
    deliverSignupCompletion(current.requestId, registration.signupBonusPoints)
    try { clearSignupAgreements() }
    catch { console.warn('Signup agreement storage could not be cleared after registration.') }
    if (registration.signupBonusPoints === 100) setMessage('회원가입 축하 포인트 100P가 지급되었습니다.')
    navigate('/signup/complete', {
      replace: true,
      state: { username: registration.username, name: registration.name, email: current.email },
    })
  }, [navigate, setMessage])
  const discardSubmission = useCallback((current: PendingSignup) => {
    if (pending.current === current) pending.current = null
  }, [])
  const registration = useSignupRegistration(api, registrationCompleted, discardSubmission)
  const { accept: acceptVerification, cancel: cancelRegistration } = registration
  const registrationBusy = registration.progress?.state === 'processing' || registration.progress?.state === 'waiting'

  const cancel = useCallback(() => {
    cancelRegistration()
    pending.current = null
    setRequestId('')
    setAwaitingEmail('')
    setError('')
  }, [cancelRegistration])

  const begin = useCallback((nextRequestId: string, email: string, submission: PendingSignupSubmission) => {
    if (resending.current) return
    cancelRegistration()
    pending.current = { requestId: nextRequestId, email, submission }
    setRequestId(nextRequestId)
    setAwaitingEmail(email)
    setError('')
  }, [cancelRegistration])

  const resend = useCallback(async () => {
    const current = pending.current
    if (!api || !current || registration.progress || resending.current) return false
    resending.current = true
    setBusy(true)
    setError('')
    try {
      const requested = await api.requestEmailVerification(current.email, current.submission.registration.nickname)
      if (pending.current !== current) return false
      pending.current = { ...current, requestId: requested.requestId }
      setRequestId(requested.requestId)
      return true
    } catch (cause) {
      if (pending.current === current) setError(cause instanceof Error ? cause.message : '인증 메일을 다시 보내지 못했습니다.')
      return false
    } finally {
      resending.current = false
      setBusy(false)
    }
  }, [api, registration.progress])

  useEffect(() => listenForEmailVerification(requestId, (result) => {
    const current = pending.current
    if (!api || resending.current || !current || current.requestId !== result.requestId) return
    setError('')
    acceptVerification(current, result)
  }), [api, acceptVerification, requestId])

  useEffect(() => listenForSignupRetry(requestId, registration.retry), [registration.retry, requestId])
  useEffect(() => () => { pending.current = null }, [])

  return <SignupCoordinatorContext.Provider value={{ awaitingEmail, begin, resend, busy: busy || registrationBusy, cancel, error,
    registrationProgress: registration.progress, retryRegistration: registration.retry }}>
    {children}
    <Toast message={authText(message)} toastKey={toastKey} />
  </SignupCoordinatorContext.Provider>
}

export function useSignupCoordinator() {
  const value = useContext(SignupCoordinatorContext)
  if (!value) throw new Error('SignupCoordinatorProvider is required')
  return value
}
