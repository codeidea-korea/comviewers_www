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
const verificationRequest = z.object({ requestId: z.string().min(1), expiresAt: dateTime, signupSessionSecret: z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional().nullable() })
const verificationConfirmation = z.object({ verificationProof: z.string().min(1).optional().nullable(), expiresAt: dateTime, requestId: z.string().optional().nullable() })
const verificationStatus = z.object({ status: z.enum(['pending', 'verified', 'completed', 'expired', 'invalid']), expiresAt: dateTime.nullish().transform(value => value ?? null) })
export type EmailVerificationStatus = z.infer<typeof verificationStatus>
export type EmailVerificationStatusCredentials = { requestId: string; signupSessionSecret: string } | { token: string }
const registration = z.object({ userId: id, username: z.string().min(1), name: z.string().min(1), email: z.email(), signupBonusPoints: z.number().int().nonnegative().optional() })

export type SignupTerm = z.infer<typeof signupTerm>
export class NicknameUnavailableError extends Error {}
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
  marketingEmailAgreed?: boolean
  termsAgreements: readonly { termsPolicyVersionId: number; agreed: boolean }[]
}

export function createPublicAccountApi(baseUrl: string) {
  const client = createApiClient({ baseUrl })
  return {
    async preflightProfileImage(file: File) {
      const body = new FormData(); body.set('file', file)
      try {
        return await client.request('/api/auth/signup/profile-image/preflight', z.object({ ready: z.literal(true) }), { method: 'POST', body })
      } catch { throw new Error('프로필 이미지 업로드 준비를 완료하지 못했습니다. JPG·PNG 5MB 제한을 확인하고 잠시 후 다시 시도해 주세요.') }
    },
    async stageProfileImage(file: File, verificationProof: string, signal?: AbortSignal) {
      const body = new FormData(); body.set('file', file); body.set('verificationProof', verificationProof)
      try {
        return await client.request('/api/auth/signup/profile-image', z.object({ uploadKey: z.string().uuid() }), { method: 'POST', body, signal })
      } catch (cause) {
        signal?.throwIfAborted()
        const message = '프로필 이미지 업로드를 완료하지 못했습니다. 이메일 인증 유효시간과 JPG·PNG 5MB 제한을 확인하고 잠시 후 다시 시도해 주세요.'
        if (cause instanceof ApiClientError) throw new ApiClientError(cause.kind, cause.status, { code: cause.code, retryAfter: cause.retryAfter, message })
        throw cause
      }
    },
    usernameAvailability(username: string) {
      return client.request('/api/auth/signup/username-availability', z.object({ available: z.boolean() }), {
        method: 'POST', body: { username: z.string().regex(/^[A-Za-z0-9_]{3,20}$/).parse(username) },
      })
    },
    nicknameAvailability(nickname: string) {
      return client.request('/api/auth/signup/nickname-availability', z.object({ available: z.boolean() }), {
        method: 'POST', body: { nickname: z.string().trim().regex(/^[가-힣A-Za-z0-9]{1,18}$/).parse(nickname) },
      })
    },
    async signupTerms(signal?: AbortSignal) {
      const response = await client.request('/api/auth/signup/terms', z.object({ terms: signupTerm.array().min(1) }), { signal })
      return response.terms
    },
    async requestEmailVerification(email: string, nickname: string) {
      try {
        return await client.request('/api/auth/email-verifications', verificationRequest, { method: 'POST', body: { email, nickname, crossDevice: true } })
      } catch (cause) {
        if (cause instanceof ApiClientError && cause.code === 'U005') {
          throw new NicknameUnavailableError(signupRegistrationErrorMessage(cause.code) ?? '이미 사용 중인 닉네임입니다.')
        }
        const message = cause instanceof ApiClientError ? signupRegistrationErrorMessage(cause.code) : undefined
        if (message) throw new Error(message)
        throw cause
      }
    },
    confirmEmailVerification(token: string) {
      return client.request('/api/auth/email-verifications/confirm', verificationConfirmation, { method: 'POST', body: { token } })
    },
    emailVerificationStatus(credentials: EmailVerificationStatusCredentials, signal?: AbortSignal) {
      return client.request('/api/auth/email-verifications/status', verificationStatus, { method: 'POST', body: credentials, signal })
    },
    async register(input: RegistrationInput, signal?: AbortSignal) {
      try {
        return await client.request('/api/auth/register', registration, { method: 'POST', body: input, signal })
      } catch (cause) {
        const message = cause instanceof ApiClientError ? signupCompletionErrorMessage(cause.code) : undefined
        if (cause instanceof ApiClientError && message) {
          throw new ApiClientError(cause.kind, cause.status, { code: cause.code, retryAfter: cause.retryAfter, message })
        }
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
    validatePasswordResetToken(token: string) {
      return client.request('/api/auth/password-reset/validate', z.undefined(), { method: 'POST', body: { token } })
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
  cached = createPublicAccountApi(baseUrl || '/')
  return cached
}
