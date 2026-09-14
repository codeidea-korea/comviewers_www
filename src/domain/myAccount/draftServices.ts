import { z } from 'zod'
export const profileDraftSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해 주세요.').max(18), nickname: z.string().trim().min(1, '닉네임을 입력해 주세요.').max(18),
  imagePreview: z.string().max(7 * 1024 * 1024).regex(/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+$/).optional(),
  email: z.email('이메일 주소를 확인해 주세요.'), phone: z.string().max(30), messenger: z.string().max(100), messengerId: z.string().max(100),
})
export const inquiryDraftTypeSchema = z.enum(['AS·점검 요청', '변경·교체·추가 요청', '해지신청', '기타 문의'])
export const inquiryDraftSchema = z.object({
  key: z.string().min(1).max(2000), inquiryId: z.string().nullable(), type: inquiryDraftTypeSchema,
  rcpcIds: z.array(z.string().min(1)).max(100), message: z.string().trim().min(1, '문의 내용을 입력해 주세요.').max(5000, '문의 내용은 5,000자 이하로 입력해 주세요.'),
}).superRefine((draft, context) => {
  if (draft.type !== '기타 문의' && draft.rcpcIds.length === 0) context.addIssue({ code: 'custom', path: ['rcpcIds'], message: '문의할 RCPC를 선택해 주세요.' })
})
export type ProfileDraft = z.infer<typeof profileDraftSchema>
export type InquiryDraft = z.infer<typeof inquiryDraftSchema>
export interface AccountDraftServices {
  getProfileDraft(): Promise<ProfileDraft | null>
  saveProfileDraft(input: ProfileDraft): Promise<ProfileDraft>
  listInquiryDrafts(): Promise<InquiryDraft[]>
  saveInquiryDraft(input: InquiryDraft): Promise<InquiryDraft>
}
