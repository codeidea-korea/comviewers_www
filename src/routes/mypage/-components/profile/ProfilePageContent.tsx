import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import type { createCustomerProfileMutations } from '@/api/customerProfileMutations'
import type { AccountProfileRead } from '@/api/myAccountSchemas'
import type { MyAccountReadServices } from '@/domain/myAccount/httpServices'
import { MyPageLayout } from '../../MypageComponentsView'
import { AccountQueryState } from '../AccountQueryState'
import { accountDate, AccountInfo, useAccountRead } from '../shared/AccountReadCommon'
import type { CustomerWithdrawalApi } from '@/api/customerWithdrawal'
import { Modal } from '@/components/ui/ModalControl'
import { TextField } from '@/components/ui/TextFieldControl'
import { ProfileEditor } from './ProfileEditor'

type ProfileMutations = ReturnType<typeof createCustomerProfileMutations>

export function ProfilePageContent({ api, mutations, withdrawal }: { api: Pick<MyAccountReadServices, 'profile'>; mutations?: ProfileMutations; withdrawal?: CustomerWithdrawalApi }) {
  const [confirmedPassword, setConfirmedPassword] = useState<string | null>(null)
  const result = useAccountRead(['profile'], (signal) => api.profile(signal))
  const profile = result.data
  if (result.isPending || result.isError || !profile) {
    return <MyPageLayout title="내 정보 수정"><section><AccountQueryState pending={result.isPending} error={result.error} retry={result.refetch}/></section></MyPageLayout>
  }
  if (mutations && profile.socialLoginOnly) return <SocialProfilePasswordNotice username={profile.username}/>
  if (mutations && confirmedPassword === null) return <ProfilePasswordGate mutations={mutations} onConfirmed={setConfirmedPassword}/>
  return <ConfirmedProfilePage profile={profile} mutations={mutations} withdrawal={withdrawal} currentPassword={confirmedPassword ?? ''}/>
}
function SocialProfilePasswordNotice({ username }: { username: string }) {
  const navigate = useNavigate()
  return <MyPageLayout title="내 정보 수정"><Modal className="modal--password-confirm" isOpen title="비밀번호 재설정이 필요합니다." closeLabel="닫기" confirmLabel="비밀번호 재설정" onClose={() => void navigate('/mypage')} onConfirm={() => void navigate('/account/find-password')}><div className="popup-form"><p>소셜 로그인으로 가입한 계정은 현재 비밀번호가 설정되어 있지 않습니다.<br/>로그인 아이디 <strong>{username}</strong>와 가입 이메일로 비밀번호를 재설정한 뒤 다시 시도해 주세요.</p></div></Modal></MyPageLayout>
}
function ProfilePasswordGate({ mutations, onConfirmed }: { mutations: ProfileMutations; onConfirmed: (password: string) => void }) {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const confirm = useMutation({ mutationFn: mutations.confirmPassword, onSuccess: () => onConfirmed(password) })
  return <MyPageLayout title="내 정보 수정"><Modal className={`modal--password-confirm${confirm.isError ? ' is-filled' : ''}`} isOpen title="비밀번호 확인" closeLabel="닫기" confirmLabel={confirm.isPending ? '확인 중…' : '확인'} confirmDisabled={!password || confirm.isPending} onClose={() => { if (!confirm.isPending) void navigate('/mypage') }} onConfirm={() => { if (password && !confirm.isPending) confirm.mutate(password) }}><div className="popup-form"><p>회원님의 정보를 안전하게 보호하기 위해 비밀번호를 한번 더 확인합니다.</p><TextField autoComplete="current-password" error={confirm.isError ? '비밀번호가 일치하지 않습니다.' : ''} label="비밀번호 확인" maxLength={100} onChange={event => { setPassword(event.target.value); confirm.reset() }} type="password" value={password}/></div></Modal></MyPageLayout>
}
function ConfirmedProfilePage({ profile, mutations, withdrawal, currentPassword }: { profile: AccountProfileRead; mutations?: ProfileMutations; withdrawal?: CustomerWithdrawalApi; currentPassword: string }) {
  return <MyPageLayout title="내 정보 수정"><section>{mutations
    ? <ProfileEditor key={profile.updatedAt ?? profile.username} mutations={mutations} profile={profile} withdrawal={withdrawal} currentPassword={currentPassword} />
    : <AccountInfo rows={[["아이디", profile.username], ["이름", profile.name], ["닉네임", profile.nickname], ["닉네임 변경 가능일", accountDate(profile.nicknameChangeAvailableAt)], ["이메일", profile.email], ["연락처", profile.phone], ["메신저", profile.messengerType], ["메신저 ID", profile.messengerId], ["마케팅 이메일", profile.marketingEmailAgreed ? '동의' : '미동의'], ["동의 상태 변경일", accountDate(profile.marketingEmailConsentChangedAt)]]}/>}</section></MyPageLayout>
}
