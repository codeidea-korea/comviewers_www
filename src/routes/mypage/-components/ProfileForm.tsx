import type { AccountProfile } from '@/domain/myAccount/services'
import type { FormEvent,MouseEvent } from 'react'
import { useRef, useState } from 'react'
import { useLocation,useNavigate,useSearchParams } from 'react-router'
import { profileDraftSchema, type ProfileDraft } from '@/domain/myAccount/draftServices'
import { useProfileDraft } from './hooks/useAccountDrafts'
import eyeIcon from '../../../assets/figma/eye.svg'
import profileImage from '../../../assets/figma/store/profile-sample.png'
import { Checkbox } from '../../../components/ui/CheckboxControl'
import { Modal } from '../../../components/ui/ModalControl'
import { ProfileImagePicker } from '../../../components/ui/ProfileImagePickerControl'
import { NativeSelect } from '../../../components/ui/SelectControl'
import { TextField } from '../../../components/ui/TextFieldControl'
import { usePublishingPopupPreview } from '../../../lib/usePublishingPopupPreview'
import { emailDomainOptions,messengerOptionLabel,messengerOptions,phonePrefixOptions } from '../../../mocks/selectOptions'
import { MyPageLayout } from '../MypageComponentsView'

export function ProfileForm({ profile, draft }: { profile: AccountProfile; draft?: ProfileDraft | null }) {
  const initialProfile = { ...profile, ...draft }
  const savedDraft = useProfileDraft()
  const busy = useRef(false)
  const navigate = useNavigate()
  const { state: navigationState } = useLocation()
  const [params] = useSearchParams()
  const filledPreview = import.meta.env.VITE_ENABLE_PUBLISHING_PREVIEWS === 'true' && params.get('publishingState') === 'filled'
  const [notice, setNotice] = useState('')
  const [marketing, setMarketing] = useState(true)
  const [profilePopup, setProfilePopup] = useState<string | null>(() => navigationState?.openProfilePasswordGate ? 'password-confirm-empty' : null)
  const [confirmedPassword, setConfirmedPassword] = useState(filledPreview ? 'incorrect' : '')
  const [passwordError, setPasswordError] = useState(filledPreview)
  const [newPassword, setNewPassword] = useState(filledPreview ? 'Pass1!23' : '')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState(filledPreview ? 'Pass1!23' : '')
  const [showConfirmedPassword, setShowConfirmedPassword] = useState(false)
  const [showProfilePassword, setShowProfilePassword] = useState(false)
  const [showProfilePasswordConfirm, setShowProfilePasswordConfirm] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false)
  const [emailDomain, setEmailDomain] = useState(initialProfile.email.split('@')[1] ?? '')
  const [phonePrefix, setPhonePrefix] = useState(initialProfile.phone.split('-')[0] ?? '')
  const [messenger, setMessenger] = useState(draft?.messenger ?? 'Nimbuzz 님버즈')
  const [profilePreview, setProfilePreview] = useState(draft?.imagePreview ?? profileImage)
  const [profileImageResetKey, setProfileImageResetKey] = useState(0)

  usePublishingPopupPreview({
    '회원탈퇴를 진행할 수 없습니다.': () => setProfilePopup('withdrawal-unavailable'),
    '회원탈퇴를 진행하시겠습니까?': () => setProfilePopup('withdrawal-confirm'),
    '비밀번호 확인': () => setProfilePopup(filledPreview ? 'password-confirm-filled' : 'password-confirm-empty'),
    '비밀번호 재설정': () => setProfilePopup(filledPreview ? 'password-reset-filled' : 'password-reset-empty'),
    '비밀번호가 변경되었습니다.': () => setProfilePopup('password-changed'),
    '프로필 이미지 업로드 실패': () => setProfilePopup('image-upload-failed'),
  })

  const closePopup = () => setProfilePopup(null)
  const resetProfileForm = (event: MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.form?.reset()
    setMarketing(true)
    setEmailDomain(initialProfile.email.split('@')[1] ?? '')
    setPhonePrefix(initialProfile.phone.split('-')[0] ?? '')
    setMessenger(draft?.messenger ?? 'Nimbuzz 님버즈')
    setProfileImageResetKey((current) => current + 1)
    setProfilePreview(draft?.imagePreview ?? profileImage)
    setNotice('')
  }
  const confirmCurrentPassword = () => {
    setNotice('현재 이용할 수 없습니다.')
    setConfirmedPassword('')
    closePopup()
  }
  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy.current) return
    const form = new FormData(event.currentTarget)
    const result = profileDraftSchema.safeParse({ name: form.get('name'), nickname: form.get('nickname'), email: `${form.get('emailLocal') ?? ''}@${emailDomain}`, phone: `${phonePrefix}-${form.get('phoneMiddle') ?? ''}-${form.get('phoneLast') ?? ''}`, messenger, messengerId: form.get('messengerId') ?? '', imagePreview: profilePreview.startsWith('data:') ? profilePreview : undefined })
    if (!result.success) { setNotice(result.error.issues[0]?.message ?? '입력값을 확인해 주세요.'); return }
    busy.current = true
    try { await savedDraft.save.mutateAsync(result.data); setNotice('입력 초안을 저장했습니다.') }
    catch { setNotice('초안을 저장하지 못했습니다. 다시 시도해 주세요.') }
    finally { busy.current = false }
  }
  const validNewPassword = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%])[A-Za-z\d!@#$%]{8,16}$/.test(newPassword)
    && newPassword === newPasswordConfirm

  return (
    <MyPageLayout title="내 정보 수정">
      <form className="profile-form profile-catalog" onSubmit={submitProfile}>
        <ProfileImagePicker alt="현재 프로필" inputClassName="sr-only" onError={() => setProfilePopup('image-upload-failed')} onSelect={(source: string, file: File) => { setProfilePreview(source); setNotice(`${file.name} 이미지를 선택했습니다.`) }} resetKey={profileImageResetKey} value={profilePreview} />
        <label className="profile-catalog__field"><span><b>*</b>아이디</span><input defaultValue={profile.userId} disabled /></label>
        <label className="profile-catalog__field"><span><b>*</b>비밀번호</span><div className="profile-catalog__password"><input disabled defaultValue="" type={showProfilePassword ? 'text' : 'password'} /><button aria-label={showProfilePassword ? '비밀번호 숨기기' : '비밀번호 보기'} aria-pressed={showProfilePassword} onClick={() => setShowProfilePassword((value) => !value)} type="button"><img alt="" src={eyeIcon} /></button></div><small>* 8~16자의 영문, 숫자, 특수문자(!, @, #, $, %, )만 사용할 수 있습니다.</small></label>
        <label className="profile-catalog__field"><span><b>*</b>비밀번호 확인</span><div className="profile-catalog__password"><input disabled defaultValue="" type={showProfilePasswordConfirm ? 'text' : 'password'} /><button aria-label={showProfilePasswordConfirm ? '비밀번호 확인 숨기기' : '비밀번호 확인 보기'} aria-pressed={showProfilePasswordConfirm} onClick={() => setShowProfilePasswordConfirm((value) => !value)} type="button"><img alt="" src={eyeIcon} /></button></div>{filledPreview ? <small className="is-error">* 비밀번호가 일치하지 않습니다.</small> : null}</label>
        <label className="profile-catalog__field"><span><b>*</b>이름</span><input defaultValue={initialProfile.name} name="name" /><small>* 1~18자, 한글, 영문자, 하이픈(-), 아포스트로피(')</small></label>
        <label className="profile-catalog__field"><span><b>*</b>닉네임</span><input defaultValue={initialProfile.nickname} name="nickname" /><small>* 닉네임은 마지막 수정 후 30일 이후 변경할 수 있습니다.</small></label>
        <div className="profile-catalog__email"><span><b>*</b>E-mail</span><div><input aria-label="프로필 이메일 아이디" defaultValue={initialProfile.email.split('@')[0]} name="emailLocal" /><i>@</i><input aria-label="프로필 이메일 도메인" onChange={(event) => setEmailDomain(event.target.value)} value={emailDomain} /><NativeSelect aria-label="이메일 도메인 선택" onChange={(event) => setEmailDomain(event.target.value)} value={emailDomain}>{emailDomainOptions.map((option) => <option key={option}>{option}</option>)}</NativeSelect></div><small>* 이메일을 변경하시면 회원 인증을 다시 하셔야 합니다.</small><label className="profile-check"><Checkbox disabled checked={marketing} onChange={(event) => setMarketing(event.target.checked)} /><span>[선택] 광고성 정보 수신 동의(이메일)</span><small className="profile-check__date">동의일자: {profile.marketingAgreedAt}</small></label></div>
        <div className="profile-catalog__phone"><span>핸드폰</span><div><NativeSelect aria-label="핸드폰 번호 앞자리" onChange={(event) => setPhonePrefix(event.target.value)} value={phonePrefix}>{phonePrefixOptions.map((option) => <option key={option}>{option}</option>)}</NativeSelect><input name="phoneMiddle" aria-label="핸드폰 번호 가운데 자리" defaultValue={initialProfile.phone.split('-')[1] ?? ''}/><input name="phoneLast" aria-label="핸드폰 번호 끝자리" defaultValue={initialProfile.phone.split('-')[2] ?? ''}/></div></div>
        <div className="profile-catalog__messenger"><span>메신저 ID</span><div><NativeSelect aria-label="메신저 선택" onChange={(event) => setMessenger(event.target.value)} value={messenger}>{messengerOptions.map((option) => <option key={option} value={option}>{messengerOptionLabel(option)}</option>)}</NativeSelect><input name="messengerId" defaultValue={draft?.messengerId ?? ''} aria-label="프로필 메신저 아이디" placeholder="메신저 ID 입력"/></div></div>
        <div className="profile-catalog__actions"><button disabled={savedDraft.save.isPending} type="submit">{savedDraft.save.isPending ? '저장 중…' : '입력 초안 저장'}</button><button onClick={resetProfileForm} type="button">취소</button></div>
        {notice ? <p aria-live="polite" className="mypage-notice">{notice}</p> : null}
        <button className="profile-catalog__withdraw" onClick={() => setNotice('현재 이용할 수 없습니다.')} type="button">회원탈퇴</button>
      </form>

      <Modal className="modal--withdrawal-unavailable" confirmLabel="확인" isOpen={profilePopup === 'withdrawal-unavailable'} onClose={closePopup} onConfirm={closePopup} showClose={false} title="회원탈퇴를 진행할 수 없습니다.">
        <div className="popup-copy"><p>현재 이용 중이거나 처리 중인 서비스가 있어 회원탈퇴가 제한됩니다. 아래 항목을 확인한 후 다시 시도해 주세요.</p><div className="popup-copy__box">• 이용 중인 RCPC<br />• 처리 중인 주문 또는 환불</div><p>모든 이용 및 처리가 완료된 후 회원탈퇴를 진행할 수 있습니다.</p></div>
      </Modal>
      <Modal closeLabel="취소" closeVariant="primary" confirmFirst confirmLabel="회원탈퇴" confirmVariant="secondary" isOpen={profilePopup === 'withdrawal-confirm'} onClose={closePopup} onConfirm={() => { setNotice('현재 이용할 수 없습니다.'); closePopup() }} title="회원탈퇴를 진행하시겠습니까?">
        <p>회원탈퇴 시 계정 정보와 보유 중인 포인트·쿠폰이 모두 삭제되며 복구할 수 없습니다.<br /><br />정말 회원탈퇴를 진행하시겠습니까?</p>
      </Modal>
      <Modal className={`modal--password-confirm${filledPreview ? ' is-filled' : ''}`} closeLabel="닫기" confirmDisabled={!confirmedPassword} confirmLabel="확인" isOpen={Boolean(profilePopup?.startsWith('password-confirm'))} onClose={closePopup} onConfirm={confirmCurrentPassword} title="비밀번호 확인">
        <div className="popup-form"><p>회원님의 정보를 안전하게 보호하기 위해 비밀번호를 한번 더 확인합니다.</p><TextField autoComplete="current-password" error={passwordError ? '비밀번호가 일치하지 않습니다.' : ''} label="비밀번호 확인" onChange={(event) => { setConfirmedPassword(event.target.value); setPasswordError(false) }} onTrailingIconClick={() => setShowConfirmedPassword((value) => !value)} trailingActionLabel={showConfirmedPassword ? '비밀번호 숨기기' : '비밀번호 보기'} trailingActionPressed={showConfirmedPassword} trailingIcon="eye" type={showConfirmedPassword ? 'text' : 'password'} value={confirmedPassword} /></div>
      </Modal>
      <Modal className="modal--wide modal--password-reset" confirmDisabled={!validNewPassword} confirmLabel="확인" isOpen={Boolean(profilePopup?.startsWith('password-reset'))} onClose={closePopup} onConfirm={confirmCurrentPassword} showClose={false} title="비밀번호 재설정">
        <div className="popup-form popup-form--stacked"><TextField autoComplete="new-password" helperText="8~16자의 영문, 숫자, 특수문자(!, @, #, $, %)만 사용할 수 있습니다." label="새 비밀번호" onChange={(event) => setNewPassword(event.target.value)} onTrailingIconClick={() => setShowNewPassword((value) => !value)} trailingActionLabel={showNewPassword ? '새 비밀번호 숨기기' : '새 비밀번호 보기'} trailingActionPressed={showNewPassword} trailingIcon="eye" type={showNewPassword ? 'text' : 'password'} value={newPassword} /><TextField autoComplete="new-password" error={newPasswordConfirm && newPassword !== newPasswordConfirm ? '비밀번호가 일치하지 않습니다.' : ''} label="비밀번호 확인" onChange={(event) => setNewPasswordConfirm(event.target.value)} onTrailingIconClick={() => setShowNewPasswordConfirm((value) => !value)} trailingActionLabel={showNewPasswordConfirm ? '비밀번호 확인 숨기기' : '비밀번호 확인 보기'} trailingActionPressed={showNewPasswordConfirm} trailingIcon="eye" type={showNewPasswordConfirm ? 'text' : 'password'} value={newPasswordConfirm} /></div>
      </Modal>
      <Modal confirmLabel="로그인하기" isOpen={profilePopup === 'password-changed'} onClose={closePopup} onConfirm={() => navigate('/login')} showClose={false} title="비밀번호가 변경되었습니다."><p>새로 설정한 비밀번호로 다시 로그인해 주세요.</p></Modal>
      <Modal confirmLabel="닫기" isOpen={profilePopup === 'image-upload-failed'} onClose={closePopup} onConfirm={closePopup} showClose={false} title="프로필 이미지 업로드 실패"><p>허용되지 않은 파일 형식 또는 용량입니다.</p></Modal>
    </MyPageLayout>
  )
}
