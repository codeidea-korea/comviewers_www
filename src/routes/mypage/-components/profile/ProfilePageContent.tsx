import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import type { createCustomerProfileMutations } from '@/api/customerProfileMutations'
import type { AccountProfileRead } from '@/api/myAccountSchemas'
import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'
import { AccountQueryState } from '../AccountQueryState'
import { accountDate, AccountInfo, useAccountRead } from '../shared/AccountReadCommon'
import type { CustomerWithdrawalApi } from '@/api/customerWithdrawal'
import { Modal } from '@/components/ui/ModalControl'
import { TextField } from '@/components/ui/TextFieldControl'
import { ProfileEditor } from './ProfileEditor'
import { useAuthentication, type SocialAuthProvider } from '@/app/session/AuthProvider'
import { SocialLoginButtons } from '@/routes/auth/AuthComponentsView'

type ProfileMutations = ReturnType<typeof createCustomerProfileMutations>

export function ProfilePageContent({ api, mutations, withdrawal }: { api: Pick<MyAccountReadServices, 'profile'>; mutations?: ProfileMutations; withdrawal?: CustomerWithdrawalApi }) {
  const [confirmedPassword, setConfirmedPassword] = useState<string | null>(null)
  const result = useAccountRead(['profile'], (signal) => api.profile(signal))
  const profile = result.data
  if (result.isPending || result.isError || !profile) {
    return <section className="profile-settings-page__content"><AccountQueryState pending={result.isPending} error={result.error} retry={result.refetch}/></section>
  }
  if (mutations && profile.socialLoginOnly) return <SocialProfileGate mutations={mutations} profile={profile} withdrawal={withdrawal}/>
  if (mutations && confirmedPassword === null) return <ProfilePasswordGate mutations={mutations} onConfirmed={setConfirmedPassword}/>
  return <ConfirmedProfilePage profile={profile} mutations={mutations} withdrawal={withdrawal} currentPassword={confirmedPassword ?? ''}/>
}
function SocialProfileGate({ mutations, profile, withdrawal }: { mutations: ProfileMutations; profile: AccountProfileRead; withdrawal?: CustomerWithdrawalApi }) {
  const navigate = useNavigate()
  const auth = useAuthentication()
  const status = useQuery({ queryKey: ['my-account', 'social-reauth-status', profile.username], queryFn: mutations.socialReauthStatus, refetchOnMount: 'always' })
  const linked = useQuery({ queryKey: ['my-account', 'social-providers', profile.username], queryFn: () => auth.linkedSocialProviders(), enabled: status.data?.confirmed === false })
  const start = useMutation({ mutationFn: (provider: SocialAuthProvider) => mutations.startSocialReauth(provider), onSuccess: ({ authorizationUrl }) => window.location.assign(authorizationUrl) })
  if (status.data?.confirmed && !status.isFetching) return <ConfirmedProfilePage profile={profile} mutations={mutations} withdrawal={withdrawal} currentPassword=""/>
  return <Modal className="modal--social-reauth" isOpen title="간편 로그인으로 본인 확인" closeLabel="닫기" onClose={() => void navigate('/mypage')}><div className="popup-form"><p>회원님의 정보를 안전하게 보호하기 위해 가입한 간편 로그인 수단으로 다시 인증해 주세요.</p>
    {status.isPending || status.isFetching || (status.data?.confirmed === false && linked.isPending) ? <p role="status">로그인 수단을 확인하고 있습니다.</p> : null}
    {status.isError || linked.isError ? <p role="alert">본인 확인 정보를 불러오지 못했습니다. 다시 시도해 주세요.</p> : null}
    {linked.data?.length === 0 ? <p role="alert">연결된 간편 로그인 수단이 없습니다.</p> : null}
    {linked.data?.length ? <SocialLoginButtons allowedProviders={linked.data} onSelect={provider => { if (!start.isPending) start.mutate(provider) }} title="가입한 계정으로 인증"/> : null}
    {start.isError ? <p role="alert">간편 로그인 인증을 시작하지 못했습니다. 다시 시도해 주세요.</p> : null}
  </div></Modal>
}
function ProfilePasswordGate({ mutations, onConfirmed }: { mutations: ProfileMutations; onConfirmed: (password: string) => void }) {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const confirm = useMutation({ mutationFn: mutations.confirmPassword, onSuccess: () => onConfirmed(password) })
  return <Modal className={`modal--password-confirm${confirm.isError ? ' is-filled' : ''}`} isOpen title="비밀번호 확인" closeLabel="닫기" confirmLabel={confirm.isPending ? '확인 중…' : '확인'} confirmDisabled={!password || confirm.isPending} onClose={() => { if (!confirm.isPending) void navigate('/mypage') }} onConfirm={() => { if (password && !confirm.isPending) confirm.mutate(password) }}><div className="popup-form"><p>회원님의 정보를 안전하게 보호하기 위해 비밀번호를 한번 더 확인합니다.</p><TextField autoComplete="current-password" error={confirm.isError ? '비밀번호가 일치하지 않습니다.' : ''} label="비밀번호 확인" maxLength={100} onChange={event => { setPassword(event.target.value); confirm.reset() }} type="password" value={password}/></div></Modal>
}
function ConfirmedProfilePage({ profile, mutations, withdrawal, currentPassword }: { profile: AccountProfileRead; mutations?: ProfileMutations; withdrawal?: CustomerWithdrawalApi; currentPassword: string }) {
  return <section className="profile-settings-page__content">{mutations
    ? <ProfileEditor key={profile.updatedAt ?? profile.username} mutations={mutations} profile={profile} withdrawal={withdrawal} currentPassword={currentPassword} />
    : <AccountInfo rows={[["아이디", profile.username], ["이름", profile.name], ["닉네임", profile.nickname], ["닉네임 변경 가능일", accountDate(profile.nicknameChangeAvailableAt)], ["이메일", profile.email], ["연락처", profile.phone], ["메신저", profile.messengerType], ["메신저 ID", profile.messengerId], ["마케팅 이메일", profile.marketingEmailAgreed ? '동의' : '미동의'], ["동의 상태 변경일", accountDate(profile.marketingEmailConsentChangedAt)]]}/>}</section>
}
