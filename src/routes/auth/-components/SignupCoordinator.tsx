import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { getPublicAccountApi, type RegistrationInput } from '@/api/publicAccount'
import { clearSignupAgreements } from './signupDraft'
import { listenForEmailVerification } from './emailVerificationChannel'

export interface PendingSignupSubmission {
  registration: Omit<RegistrationInput, 'emailVerificationProof' | 'profileImageUploadKey'>
  image: File | null
}

interface PendingSignup {
  requestId: string
  email: string
  submission: PendingSignupSubmission
}

interface SignupCoordinatorValue {
  awaitingEmail: string
  busy: boolean
  error: string
  begin: (requestId: string, email: string, submission: PendingSignupSubmission) => void
  cancel: () => void
}

const SignupCoordinatorContext = createContext<SignupCoordinatorValue | null>(null)

export function SignupCoordinatorProvider({ children }: { children: ReactNode }) {
  const api = getPublicAccountApi()
  const navigate = useNavigate()
  const pending = useRef<PendingSignup | null>(null)
  const registering = useRef(false)
  const [requestId, setRequestId] = useState('')
  const [awaitingEmail, setAwaitingEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const cancel = useCallback(() => {
    pending.current = null
    setRequestId('')
    setAwaitingEmail('')
    setError('')
  }, [])

  const begin = useCallback((nextRequestId: string, email: string, submission: PendingSignupSubmission) => {
    pending.current = { requestId: nextRequestId, email, submission }
    setRequestId(nextRequestId)
    setAwaitingEmail(email)
    setError('')
  }, [])

  useEffect(() => listenForEmailVerification(requestId, async (result) => {
    const current = pending.current
    if (!api || registering.current || !current || current.requestId !== result.requestId) return
    registering.current = true
    setBusy(true)
    setError('')
    try {
      let profileImageUploadKey: string | undefined
      if (current.submission.image) {
        const uploaded = await api.stageProfileImage(current.submission.image, result.verificationProof)
        profileImageUploadKey = uploaded.uploadKey
      }
      const registration = await api.register({
        ...current.submission.registration,
        emailVerificationProof: result.verificationProof,
        profileImageUploadKey,
      })
      clearSignupAgreements()
      pending.current = null
      setRequestId('')
      setAwaitingEmail('')
      navigate('/signup/complete', {
        replace: true,
        state: { username: registration.username, name: registration.name, email: current.email },
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '회원가입을 완료하지 못했습니다. 다시 신청해 주세요.')
    } finally {
      registering.current = false
      setBusy(false)
    }
  }), [api, navigate, requestId])

  return <SignupCoordinatorContext.Provider value={{ awaitingEmail, begin, busy, cancel, error }}>
    {children}
  </SignupCoordinatorContext.Provider>
}

export function useSignupCoordinator() {
  const value = useContext(SignupCoordinatorContext)
  if (!value) throw new Error('SignupCoordinatorProvider is required')
  return value
}
