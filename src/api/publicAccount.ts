import { z } from 'zod'
import { signupCompletionErrorMessage, signupRegistrationErrorMessage } from '@/domain/auth/signupRegistrationError'
import { ApiClientError, createApiClient } from './httpClient'

const id = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
const dateTime = z.iso.datetime({ local: true })
const signupTerm = z.object({
  termsPolicyVersionId: id,
  policyKey: z.string().min(1),
  policyType: z.string().min(1),
  name: z.string().min(1),
  required: z.boolean(),
  version: z.string().min(1),
  title: z.string().min(1),
  content: z.string(),
  contentHash: z.string().min(1),
  effectiveFrom: dateTime,
})
const verificationRequest = z.object({ requestId: z.string().min(1), expiresAt: dateTime })
const verificationConfirmation = z.object({ verificationProof: z.string().min(1), expiresAt: dateTime, requestId: z.string().optional().nullable() })
const registration = z.object({ userId: id, username: z.string().min(1), name: z.string().min(1), email: z.email() })

export type SignupTerm = z.infer<typeof signupTerm>
export interface RegistrationInput {
  username: string
  password: string
  name: string
  nickname: string
  phone: string
  messengerType: string
  messengerId: string
  email: string
  emailVerificationProof: string
  profileImageUploadKey?: string
  termsAgreements: readonly { termsPolicyVersionId: number; agreed: boolean }[]
}

export function createPublicAccountApi(baseUrl: string) {
  const client = createApiClient({ baseUrl })
  return {
    async preflightProfileImage(file: File) {
      const body = new FormData(); body.set('file', file)
      try {
        return await client.request('/api/auth/signup/profile-image/preflight', z.object({ ready: z.literal(true) }), { method: 'POST', body })
      } catch { throw new Error('프로필 이미지 업로드 준비를 완료하지 못했습니다. JPG·PNG 5MB 제한과 이미지 저장소·보안 검사 서비스 상태를 확인해 주세요.') }
    },
    async stageProfileImage(file: File, verificationProof: string) {
      const body = new FormData(); body.set('file', file); body.set('verificationProof', verificationProof)
      try {
        return await client.request('/api/auth/signup/profile-image', z.object({ uploadKey: z.string().uuid() }), { method: 'POST', body })
      } catch { throw new Error('프로필 이미지 업로드를 완료하지 못했습니다. 이메일 인증 유효시간, JPG·PNG 5MB 제한과 저장소·보안 검사 서비스 상태를 확인해 주세요.') }
    },
    usernameAvailability(username: string) {
      return client.request('/api/auth/signup/username-availability', z.object({ available: z.boolean() }), {
        method: 'POST', body: { username: z.string().regex(/^[A-Za-z0-9_]{3,20}$/).parse(username) },
      })
    },
    async signupTerms(signal?: AbortSignal) {
      const response = await client.request('/api/auth/signup/terms', z.object({ terms: signupTerm.array().min(1) }), { signal })
      return response.terms
    },
    async requestEmailVerification(email: string) {
      try {
        return await client.request('/api/auth/email-verifications', verificationRequest, { method: 'POST', body: { email } })
      } catch (cause) {
        const message = cause instanceof ApiClientError ? signupRegistrationErrorMessage(cause.code) : undefined
        if (message) throw new Error(message)
        throw cause
      }
    },
    confirmEmailVerification(token: string) {
      return client.request('/api/auth/email-verifications/confirm', verificationConfirmation, { method: 'POST', body: { token } })
    },
    async register(input: RegistrationInput) {
      try {
        return await client.request('/api/auth/register', registration, { method: 'POST', body: input })
      } catch (cause) {
        const message = cause instanceof ApiClientError ? signupCompletionErrorMessage(cause.code) : undefined
        if (message) throw new Error(message)
        throw cause
      }
    },
    recoverId(name: string, email: string) {
      return client.request('/api/auth/id-recovery', z.object({ maskedUsername: z.string().min(3).max(20) }), {
        method: 'POST', body: { name, email },
      })
    },
    requestPasswordReset(username: string, email: string) {
      return client.request('/api/auth/password-reset', z.undefined(), { method: 'POST', body: { username, email } })
    },
    confirmPasswordReset(token: string, newPassword: string, newPasswordConfirm: string) {
      return client.request('/api/auth/password-reset/confirm', z.undefined(), {
        method: 'POST', body: { token, newPassword, newPasswordConfirm },
      })
    },
  }
}

export type PublicAccountApi = ReturnType<typeof createPublicAccountApi>

let cached: PublicAccountApi | null | undefined
export function getPublicAccountApi(): PublicAccountApi | null {
  if (cached !== undefined) return cached
  const baseUrl = import.meta.env.VITE_API_BASE_URL
  cached = baseUrl ? createPublicAccountApi(baseUrl) : null
  return cached
}
