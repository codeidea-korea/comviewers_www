import { z } from 'zod'
import type { ApiClient } from './httpClient'
import type { SocialAuthProvider } from '@/app/session/AuthProvider'

// Image bytes are uploaded separately; this patch links only an owned clean attachment.
export const customerProfilePatchSchema = z.object({
  name: z.string().regex(/^[가-힣A-Za-z'-]{1,18}$/, '이름은 1~18자의 한글, 영문, 하이픈, 아포스트로피만 사용할 수 있습니다.').optional(),
  nickname: z.string().regex(/^[가-힣A-Za-z0-9]{1,18}$/, '닉네임은 1~18자의 한글, 영문, 숫자만 사용할 수 있습니다.').optional(),
  phone: z.string().regex(/^(?:|[0-9]{2,4}-[0-9]{1,4}-[0-9]{1,4})$/, '휴대폰 번호를 모두 입력해 주세요.').optional(),
  messengerType: z.string().max(50, '메신저 종류는 50자 이하로 입력해 주세요.').optional(), messengerId: z.string().max(100, '메신저 아이디는 100자 이하로 입력해 주세요.').optional(),
  marketingEmailAgreed: z.boolean().optional(),
  profileImageAttachmentId: z.number().int().positive().optional(), removeProfileImage: z.boolean().optional(),
}).strict().refine((input) => Object.values(input).some((value) => value !== undefined), '수정할 값을 입력해 주세요.')
const nullableText = z.string().nullable()
export const savedCustomerProfileSchema = z.object({
  username: z.string(), socialLoginOnly: z.boolean(), name: nullableText, nickname: nullableText,
  nicknameChangedAt: nullableText, nicknameChangeAvailableAt: nullableText,
  phone: nullableText, messengerType: nullableText, messengerId: nullableText, email: z.string(),
  marketingEmailAgreed: z.boolean(), marketingEmailConsentChangedAt: nullableText, updatedAt: nullableText,
  profileImageAttachmentId: z.number().int().positive().nullable(),
})
export type CustomerProfilePatch = z.infer<typeof customerProfilePatchSchema>
export function createCustomerProfileMutations(client: ApiClient) {
  return {
    async uploadImage(file: File) {
      const body = new FormData(); body.set('file', file)
      try {
        return await client.request('/api/v1/my/profile/image', z.object({ attachmentId: z.number().int().positive() }), {
          authenticated: true, method: 'POST', body,
        })
      } catch { throw new Error('프로필 이미지를 저장하지 못했습니다. JPG·PNG 5MB 제한을 확인하고 잠시 후 다시 시도해 주세요.') }
    },
    downloadImage(signal?: AbortSignal) {
      return client.download('/api/v1/my/profile/image', { authenticated: true, signal })
    },
    patch(input: CustomerProfilePatch) {
      return client.request('/api/v1/my/profile', savedCustomerProfileSchema, {
        authenticated: true, includeCredentials: true, method: 'PATCH', body: customerProfilePatchSchema.parse(input),
      })
    },
    socialReauthStatus() {
      return client.request('/api/v1/my/social-reauth/status', z.object({ confirmed: z.boolean() }), {
        authenticated: true, includeCredentials: true,
      })
    },
    startSocialReauth(provider: SocialAuthProvider) {
      return client.request(`/api/v1/my/social-reauth/${provider}`, z.object({ authorizationUrl: z.url() }), {
        authenticated: true, includeCredentials: true, method: 'POST',
      })
    },
    confirmPassword(currentPassword: string) {
      return client.request('/api/v1/my/password/confirm', z.object({ confirmed: z.literal(true) }), {
        authenticated: true, method: 'POST', body: { currentPassword: z.string().min(1, '현재 비밀번호를 확인해 주세요.').max(100, '현재 비밀번호를 확인해 주세요.').parse(currentPassword) },
      })
    },
    changePassword(input: { currentPassword: string; newPassword: string; newPasswordConfirm: string }) {
      const passwordMessage = '비밀번호는 8~16자로 영문, 숫자, 특수문자(!, @, #, $, %)를 각각 1개 이상 포함해 주세요.'
      const body = z.object({ currentPassword: z.string().min(1, '현재 비밀번호를 확인해 주세요.').max(100, '현재 비밀번호를 확인해 주세요.'), newPassword: z.string().min(8, passwordMessage).max(16, passwordMessage), newPasswordConfirm: z.string().min(8, passwordMessage).max(16, passwordMessage) })
        .refine((value) => value.newPassword === value.newPasswordConfirm, { path: ['newPasswordConfirm'], message: '비밀번호가 일치하지 않습니다.' }).parse(input)
      return client.request('/api/v1/my/password', z.undefined(), { authenticated: true, method: 'POST', body })
    },
    requestEmailChange(input: { newEmail: string; currentPassword?: string }) {
      return client.request('/api/v1/my/email-change/verifications', z.object({ requestId: z.string(), expiresAt: z.iso.datetime({ local: true }) }), {
        authenticated: true, includeCredentials: true, method: 'POST', body: z.object({ newEmail: z.email('이메일 주소를 확인해 주세요.').max(255, '이메일 주소는 255자 이하로 입력해 주세요.'), currentPassword: z.string().min(1, '현재 비밀번호를 확인해 주세요.').max(100, '현재 비밀번호를 확인해 주세요.').optional() }).parse(input),
      })
    },
    confirmEmailChange(verificationProof: string) {
      return client.request('/api/v1/my/email-change/confirm', savedCustomerProfileSchema, {
        authenticated: true, method: 'POST', body: { verificationProof: z.string().min(1).max(200).parse(verificationProof) },
      })
    },
  }
}
