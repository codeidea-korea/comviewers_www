import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServices } from '@/app/ServiceProvider'
import { inquiryDraftSchema, profileDraftSchema, type InquiryDraft, type ProfileDraft } from '@/domain/myAccount/draftServices'
const inquiryKey = ['my-account', 'inquiry-drafts'] as const
const profileKey = ['my-account', 'profile-draft'] as const
export function useInquiryDrafts() {
  const repository = useServices().myAccount
  const client = useQueryClient()
  const query = useQuery({ queryKey: inquiryKey, queryFn: async () => inquiryDraftSchema.array().parse(await repository.listInquiryDrafts()) })
  const save = useMutation({ mutationFn: async (input: InquiryDraft) => inquiryDraftSchema.parse(await repository.saveInquiryDraft(inquiryDraftSchema.parse(input))), onSuccess: () => client.invalidateQueries({ queryKey: inquiryKey }) })
  return { ...query, save }
}
export function useProfileDraft() {
  const repository = useServices().myAccount
  const client = useQueryClient()
  const query = useQuery({ queryKey: profileKey, queryFn: async () => { const draft = await repository.getProfileDraft(); return draft ? profileDraftSchema.parse(draft) : null } })
  const save = useMutation({ mutationFn: async (input: ProfileDraft) => profileDraftSchema.parse(await repository.saveProfileDraft(profileDraftSchema.parse(input))), onSuccess: (draft) => client.setQueryData(profileKey, draft) })
  return { ...query, save }
}
