import { useServices } from '@/app/ServiceProvider'
import type { CustomerProfilePatch, createCustomerProfileMutations } from '@/api/customerProfileMutations'
import type { CustomerWithdrawalApi } from '@/api/customerWithdrawal'
import type { AccountProfileRead } from '@/api/myAccountSchemas'
import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'
import type { AccountProfile } from '@/domain/myAccount/services'
import type { ProfileDraft } from '@/domain/myAccount/draftServices'
import { HttpProfilePage } from './-components/http/HttpAccountPages'
import { useProfileDraft } from './-components/hooks/useAccountDrafts'
import { AccountQueryState } from './-components/AccountQueryState'
import { useMyAccount } from './-components/hooks/useMyAccount'
import { MyPageLayout } from './MypageComponentsView'

type ProfileMutations = ReturnType<typeof createCustomerProfileMutations>
type SavedProfile = Awaited<ReturnType<ProfileMutations['patch']>>

function previewProfile(profile: AccountProfile, draft: ProfileDraft | null | undefined): AccountProfileRead {
  const messenger = draft?.messenger ?? profile.messenger
  return {
    username: profile.userId,
    socialLoginOnly: false,
    name: draft?.name ?? profile.name,
    nickname: draft?.nickname ?? profile.nickname,
    nicknameChangedAt: null,
    nicknameChangeAvailableAt: null,
    phone: draft?.phone ?? profile.phone,
    messengerType: messenger,
    messengerId: draft?.messengerId ?? '',
    email: draft?.email ?? profile.email,
    marketingEmailAgreed: Boolean(profile.marketingAgreedAt),
    marketingEmailConsentChangedAt: profile.marketingAgreedAt || null,
    updatedAt: null,
    profileImageAttachmentId: null,
  }
}

function PreviewProfilePage() {
  const account = useMyAccount()
  const draft = useProfileDraft()
  if (!account.data || draft.isPending || draft.isError) {
    return <MyPageLayout title="내 정보 수정"><AccountQueryState pending={account.isPending || draft.isPending} error={account.error ?? draft.error} retry={() => { void account.refetch(); void draft.refetch() }}/></MyPageLayout>
  }
  const profile = previewProfile(account.data.profile, draft.data)
  const readApi: Pick<MyAccountReadServices, 'profile'> = { profile: async () => profile }
  const saved = (input: CustomerProfilePatch = {}): SavedProfile => ({
    username: profile.username,
    socialLoginOnly: profile.socialLoginOnly,
    name: input.name ?? profile.name,
    nickname: input.nickname ?? profile.nickname,
    nicknameChangedAt: profile.nicknameChangedAt,
    nicknameChangeAvailableAt: profile.nicknameChangeAvailableAt,
    phone: input.phone ?? profile.phone,
    messengerType: input.messengerType ?? profile.messengerType,
    messengerId: input.messengerId ?? profile.messengerId,
    email: profile.email ?? '',
    marketingEmailAgreed: input.marketingEmailAgreed ?? profile.marketingEmailAgreed,
    marketingEmailConsentChangedAt: profile.marketingEmailConsentChangedAt,
    updatedAt: new Date().toISOString(),
    profileImageAttachmentId: input.removeProfileImage ? null : input.profileImageAttachmentId ?? null,
  })
  const mutations: ProfileMutations = {
    uploadImage: async () => ({ attachmentId: 1 }),
    downloadImage: async () => new Blob(),
    patch: async input => {
      const next = saved(input)
      await draft.save.mutateAsync({
        name: next.name ?? '',
        nickname: next.nickname ?? '',
        email: next.email,
        phone: next.phone ?? '',
        messenger: next.messengerType ?? '',
        messengerId: next.messengerId ?? '',
      })
      return next
    },
    confirmPassword: async () => ({ confirmed: true as const }),
    changePassword: async () => undefined,
    requestEmailChange: async () => ({ requestId: crypto.randomUUID(), expiresAt: new Date(Date.now() + 30 * 60_000).toISOString() }),
    confirmEmailChange: async () => saved(),
  }
  const withdrawal: CustomerWithdrawalApi = {
    eligibility: async () => ({
      eligible: false,
      policyStatus: 'confirmed',
      policyVersion: 'preview',
      temporarySafetyGuard: false,
      activeOrProcessingRentalCount: 1,
      pendingOrPaidOrderCount: 1,
      openRefundCount: 0,
      pointBalance: 0,
      pendingPointAccrualCount: 0,
      reservedCouponCount: 0,
      availableCouponCount: 0,
      restrictions: [
        { code: 'active_rental', message: '이용 중인 RCPC', value: 1 },
        { code: 'pending_order', message: '처리 중인 주문 또는 환불', value: 1 },
      ],
      checkedAt: new Date().toISOString(),
    }),
    create: async () => ({
      id: 1,
      requestNo: 'preview',
      status: 'completed',
      reason: null,
      restrictionSnapshot: null,
      requestedAt: new Date().toISOString(),
      reviewedAt: null,
      cancelledAt: null,
      completedAt: new Date().toISOString(),
    }),
  }
  return <HttpProfilePage api={readApi} mutations={mutations} withdrawal={withdrawal}/>
}

export function ProfilePage() {
  const { myAccount } = useServices()
  return myAccount.readApi
    ? <HttpProfilePage api={myAccount.readApi} mutations={myAccount.profileMutations} withdrawal={myAccount.withdrawalApi}/>
    : <PreviewProfilePage/>
}
