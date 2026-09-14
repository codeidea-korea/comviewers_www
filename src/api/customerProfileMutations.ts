import { z } from 'zod'
import type { ApiClient } from './httpClient'

// Image bytes are uploaded separately; this patch links only an owned clean attachment.
export const customerProfilePatchSchema = z.object({
  name: z.string().regex(/^[가-힣A-Za-z'-]{1,18}$/).optional(),
  nickname: z.string().regex(/^[가-힣A-Za-z0-9]{1,18}$/).optional(),
  phone: z.string().regex(/^(?:|[0-9]{2,4}-[0-9]{1,4}-[0-9]{1,4})$/, '휴대폰 번호를 모두 입력해 주세요.').optional(),
  messengerType: z.string().max(50).optional(), messengerId: z.string().max(100).optional(),
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
      } catch { throw new Error('프로필 이미지 저장 또는 보안 검사를 완료하지 못했습니다. JPG·PNG 5MB 제한과 이미지 저장소·검사 서비스 준비 상태를 확인해 주세요.') }
    },
    downloadImage(signal?: AbortSignal) {
      return client.download('/api/v1/my/profile/image', { authenticated: true, signal })
    },
    patch(input: CustomerProfilePatch) {
      return client.request('/api/v1/my/profile', savedCustomerProfileSchema, {
        authenticated: true, method: 'PATCH', body: customerProfilePatchSchema.parse(input),
      })
    },
    confirmPassword(currentPassword: string) {
      return client.request('/api/v1/my/password/confirm', z.object({ confirmed: z.literal(true) }), {
        authenticated: true, method: 'POST', body: { currentPassword: z.string().min(1).max(100).parse(currentPassword) },
      })
    },
    changePassword(input: { currentPassword: string; newPassword: string; newPasswordConfirm: string }) {
      const body = z.object({ currentPassword: z.string().min(1).max(100), newPassword: z.string().min(8).max(16), newPasswordConfirm: z.string().min(8).max(16) })
        .refine((value) => value.newPassword === value.newPasswordConfirm, { path: ['newPasswordConfirm'] }).parse(input)
      return client.request('/api/v1/my/password', z.undefined(), { authenticated: true, method: 'POST', body })
    },
    requestEmailChange(input: { newEmail: string; currentPassword: string }) {
      return client.request('/api/v1/my/email-change/verifications', z.object({ requestId: z.string(), expiresAt: z.iso.datetime({ local: true }) }), {
        authenticated: true, method: 'POST', body: z.object({ newEmail: z.email().max(255), currentPassword: z.string().min(1).max(100) }).parse(input),
      })
    },
    confirmEmailChange(verificationProof: string) {
      return client.request('/api/v1/my/email-change/confirm', savedCustomerProfileSchema, {
        authenticated: true, method: 'POST', body: { verificationProof: z.string().min(1).max(200).parse(verificationProof) },
      })
    },
  }
}
