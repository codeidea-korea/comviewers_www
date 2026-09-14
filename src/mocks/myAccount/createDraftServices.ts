import { profileDraftSchema, inquiryDraftSchema, inquiryDraftTypeSchema, type AccountDraftServices, type ProfileDraft, type InquiryDraft } from '@/domain/myAccount/draftServices'
import type { MyAccountSnapshot } from '@/domain/myAccount/services'

export function createAccountDraftServices(read: () => MyAccountSnapshot): AccountDraftServices {
  let profile: ProfileDraft | null = null
  let inquiries: InquiryDraft[] = []
  return {
    async getProfileDraft() { return profile ? profileDraftSchema.parse(profile) : null },
    async saveProfileDraft(input) { profile = profileDraftSchema.parse(input); return profileDraftSchema.parse(profile) },
    async listInquiryDrafts() { return inquiryDraftSchema.array().parse(inquiries) },
    async saveInquiryDraft(input) {
      const parsed = inquiryDraftSchema.parse(input)
      const account = read()
      if (parsed.rcpcIds.some((id) => !account.rcpcs.some((pc) => pc.rcpcId === id))) throw new Error('문의 대상 RCPC를 확인해 주세요.')
      if (new Set(parsed.rcpcIds).size !== parsed.rcpcIds.length) throw new Error('문의 대상이 중복되었습니다.')
      if (!parsed.inquiryId && parsed.key !== `new:${inquiryDraftTypeSchema.options.indexOf(parsed.type)}:${[...parsed.rcpcIds].sort().join(',')}`) throw new Error('문의 초안을 확인해 주세요.')
      if (parsed.inquiryId) {
        const inquiry = account.inquiries.find((item) => item.inquiryId === parsed.inquiryId)
        if (!inquiry || parsed.key !== `reply:${parsed.inquiryId}` || parsed.rcpcIds.some((id) => !inquiry.rcpcIds.includes(id))) throw new Error('문의 내용을 확인해 주세요.')
      }
      inquiries = [...inquiries.filter((draft) => draft.key !== parsed.key), parsed]
      return inquiryDraftSchema.parse(parsed)
    },
  }
}
