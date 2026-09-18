import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'
import { customerProfilePatchSchema, type createCustomerProfileMutations } from '@/api/customerProfileMutations'
import type { AccountProfileRead } from '@/api/myAccountSchemas'
import { accountDate } from '../shared/AccountReadCommon'
import type { CustomerWithdrawalApi } from '@/api/customerWithdrawal'
import { ProfileImagePicker } from '@/components/ui/ProfileImagePickerControl'
import userProfileIcon from '@/assets/figma/user-profile.svg'
import type { CustomerProfilePatch } from '@/api/customerProfileMutations'
import { Modal } from '@/components/ui/ModalControl'
import { useAuthentication } from '@/app/session/AuthProvider'
import { Checkbox } from '@/components/ui/CheckboxControl'
import { NativeSelect } from '@/components/ui/SelectControl'
import eyeIcon from '@/assets/figma/eye.svg'
import { emailDomainOptions, messengerOptionLabel, messengerOptions, phonePrefixOptions } from '@/lib/formOptions'
import { listenForEmailVerification } from '@/routes/auth/-components/emailVerificationChannel'
import { profileEmailChange } from './profileEmailChange'
import { getChangedProfileFields, getProfileFieldErrors } from './profileEditorModel'
import { profileCancelPath } from './profileCancelPath'
import { Button } from '@/components/ui/ButtonControl'
type ProfileMutations = ReturnType<typeof createCustomerProfileMutations>

export function ProfileEditor({ mutations, profile, withdrawal, currentPassword }: { mutations: ProfileMutations; profile: AccountProfileRead; withdrawal?: CustomerWithdrawalApi; currentPassword: string }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const auth = useAuthentication()
  const [name, setName] = useState(profile.name ?? '')
  const [nickname, setNickname] = useState(profile.nickname ?? '')
  const initialPhone = (profile.phone ?? '').split('-')
  const [phonePrefix, setPhonePrefix] = useState(initialPhone[0] || '010')
  const [phoneMiddle, setPhoneMiddle] = useState(initialPhone[1] ?? '')
  const [phoneLast, setPhoneLast] = useState(initialPhone[2] ?? '')
  const [messengerType, setMessengerType] = useState(profile.messengerType ?? '')
  const [messengerId, setMessengerId] = useState(profile.messengerId ?? '')
  const [marketingEmailAgreed, setMarketingEmailAgreed] = useState(profile.marketingEmailAgreed)
  const initialEmail = (profile.email ?? '').split('@')
  const [emailLocal, setEmailLocal] = useState(initialEmail[0] ?? '')
  const [emailDomain, setEmailDomain] = useState(initialEmail[1] ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [validation, setValidation] = useState('')
  const [touched, setTouched] = useState({ password: false, passwordConfirm: false, name: false, nickname: false, email: false, phone: false, messenger: false })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [currentImage, setCurrentImage] = useState('')
  const [removeImage, setRemoveImage] = useState(false)
  const uploadedImage = useRef<{ file: File; attachmentId: number } | null>(null)
  useEffect(() => {
    if (!profile.profileImageAttachmentId) return
    const controller = new AbortController()
    let objectUrl = ''
    void mutations.downloadImage(controller.signal).then(blob => {
      if (controller.signal.aborted) return
      objectUrl = URL.createObjectURL(blob); setCurrentImage(objectUrl)
    }).catch(() => { if (!controller.signal.aborted) setValidation('현재 프로필 이미지를 불러오지 못했습니다.') })
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [mutations, profile.profileImageAttachmentId])
  const [withdrawalConfirmOpen, setWithdrawalConfirmOpen] = useState(false)
  const eligibility = useMutation({ mutationFn: () => withdrawal!.eligibility(), onSuccess: result => { if (result.eligible) setWithdrawalConfirmOpen(true) } })
  const requestWithdrawal = useMutation({ mutationFn: () => withdrawal!.create(''), onSuccess: async (result) => {
    eligibility.reset(); setWithdrawalConfirmOpen(false)
    if (result.status === 'completed' && result.completedAt) {
      await auth.logout(); void navigate('/', { replace: true })
    }
  } })
  const save = useMutation({ mutationFn: async (input: CustomerProfilePatch) => {
    let attachmentId: number | undefined
    if (imageFile) {
      if (uploadedImage.current?.file === imageFile) attachmentId = uploadedImage.current.attachmentId
      else {
        const result = await mutations.uploadImage(imageFile)
        uploadedImage.current = { file: imageFile, attachmentId: result.attachmentId }
        attachmentId = result.attachmentId
      }
    }
    return mutations.patch({ ...input, profileImageAttachmentId: attachmentId, removeProfileImage: removeImage })
  } })
  const passwordChange = useMutation({ mutationFn: () => mutations.changePassword({ currentPassword, newPassword, newPasswordConfirm }), onSuccess: async () => { await auth.logout(); void navigate('/login', { replace: true }) } })
  const emailRequest = useMutation({ mutationFn: (newEmail: string) => mutations.requestEmailChange({ newEmail, currentPassword }) })
  const [verificationProof, setVerificationProof] = useState('')
  const requestId = emailRequest.data?.requestId ?? ''
  useEffect(() => listenForEmailVerification(requestId, result => setVerificationProof(result.verificationProof)), [requestId])
  const confirmEmail = useMutation({ mutationFn: () => mutations.confirmEmailChange(verificationProof), onSuccess: async () => { await auth.logout(); void navigate('/login', { replace: true }) } })
  const resetEmailVerification = () => {
    if (emailRequest.isPending || confirmEmail.isPending) return
    setVerificationProof('')
    confirmEmail.reset()
    emailRequest.reset()
  }
  const wantsPasswordChange = Boolean(newPassword || newPasswordConfirm)
  const values = { name, nickname, emailLocal, emailDomain, phonePrefix, phoneMiddle, phoneLast, messengerType, messengerId, marketingEmailAgreed, newPassword, newPasswordConfirm }
  const fieldErrors = getProfileFieldErrors(values, currentPassword)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const { nextEmail, wantsEmailChange } = profileEmailChange(profile.email, emailLocal, emailDomain)
    setTouched({ password: true, passwordConfirm: true, name: true, nickname: true, email: true, phone: true, messenger: true })
    if (Object.values(fieldErrors).some(Boolean)) { setValidation(''); return }
    if (wantsPasswordChange && wantsEmailChange) { setValidation('비밀번호와 이메일 변경은 한 번씩 진행해 주세요.'); return }
    const changedProfile = getChangedProfileFields(profile, values)
    const hasProfileFields = Object.keys(changedProfile).length > 0
    const hasImageChange = Boolean(imageFile || removeImage)
    const parsed = hasProfileFields ? customerProfilePatchSchema.safeParse(changedProfile) : null
    if (parsed && !parsed.success) { setValidation(parsed.error.issues[0]?.message ?? '입력값을 확인해 주세요.'); return }
    if (!hasProfileFields && !hasImageChange && !wantsEmailChange && !wantsPasswordChange) { setValidation('변경할 정보를 입력해 주세요.'); return }
    setValidation('')
    try {
      if (hasProfileFields || hasImageChange) await save.mutateAsync(parsed?.data ?? {})
      if (wantsEmailChange) { resetEmailVerification(); await emailRequest.mutateAsync(nextEmail) }
      else if (wantsPasswordChange) await passwordChange.mutateAsync()
      else if (hasProfileFields || hasImageChange) await queryClient.invalidateQueries({ queryKey: ['my-account', 'read', 'profile'] })
    } catch { /* 각 mutation 오류를 아래에 표시한다. */ }
  }
  const pending = save.isPending || passwordChange.isPending || emailRequest.isPending
  const currentDomainOptions = emailDomain && !emailDomainOptions.includes(emailDomain) ? [emailDomain, ...emailDomainOptions] : emailDomainOptions
  return <><form className="profile-form profile-catalog" onSubmit={submit}>
    <ProfileImagePicker alt="프로필 이미지" disabled={save.isPending} inputClassName="sr-only" value={removeImage ? userProfileIcon : imagePreview || currentImage || userProfileIcon}
      onSelect={(source, file) => { setImageFile(file); setImagePreview(source); setRemoveImage(false); setValidation('') }}/>
    <label className="profile-catalog__field"><span><b>*</b> 아이디</span><input disabled value={profile.username}/></label>
    <label className="profile-catalog__field"><span><b>*</b> 비밀번호</span><div className="profile-catalog__password"><input autoComplete="new-password" maxLength={16} onChange={event => { setTouched(current => ({ ...current, password: true })); setNewPassword(event.target.value) }} type={showPassword ? 'text' : 'password'} value={newPassword}/><button aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} type="button"><img alt="" src={eyeIcon}/></button></div>{touched.password && fieldErrors.password ? <small className="is-error" role="alert">* {fieldErrors.password}</small> : null}</label>
    <label className="profile-catalog__field"><span><b>*</b> 비밀번호 확인</span><div className="profile-catalog__password"><input autoComplete="new-password" maxLength={16} onChange={event => { setTouched(current => ({ ...current, passwordConfirm: true })); setNewPasswordConfirm(event.target.value) }} type={showPasswordConfirm ? 'text' : 'password'} value={newPasswordConfirm}/><button aria-label={showPasswordConfirm ? '비밀번호 확인 숨기기' : '비밀번호 확인 보기'} aria-pressed={showPasswordConfirm} onClick={() => setShowPasswordConfirm(value => !value)} type="button"><img alt="" src={eyeIcon}/></button></div>{touched.passwordConfirm && fieldErrors.passwordConfirm ? <small className="is-error" role="alert">* {fieldErrors.passwordConfirm}</small> : null}</label>
    <label className="profile-catalog__field"><span><b>*</b> 이름</span><input maxLength={18} onChange={event => { setTouched(current => ({ ...current, name: true })); setName(event.target.value) }} value={name}/>{touched.name && fieldErrors.name ? <small className="is-error" role="alert">* {fieldErrors.name}</small> : null}</label>
    <label className="profile-catalog__field"><span><b>*</b> 닉네임</span><input maxLength={18} onChange={event => { setTouched(current => ({ ...current, nickname: true })); setNickname(event.target.value) }} value={nickname}/>{touched.nickname && fieldErrors.nickname ? <small className="is-error" role="alert">* {fieldErrors.nickname}</small> : <small>* 닉네임은 마지막 수정 후 30일 이후 변경할 수 있습니다.{profile.nicknameChangeAvailableAt ? ` (${accountDate(profile.nicknameChangeAvailableAt)})` : ''}</small>}</label>
    <div className="profile-catalog__email"><span><b>*</b> E-mail</span><div><input aria-label="프로필 이메일 아이디" autoComplete="email" maxLength={100} onChange={event => { setTouched(current => ({ ...current, email: true })); setEmailLocal(event.target.value) }} value={emailLocal}/><i>@</i><input aria-label="프로필 이메일 도메인" list="profile-email-domains" maxLength={100} onChange={event => { setTouched(current => ({ ...current, email: true })); setEmailDomain(event.target.value) }} value={emailDomain}/><datalist id="profile-email-domains">{currentDomainOptions.map(option => <option key={option} value={option}/>)}</datalist></div>{touched.email && fieldErrors.email ? <small className="is-error" role="alert">* {fieldErrors.email}</small> : <small>* 이메일을 변경하시면 회원 인증을 다시 하셔야 합니다.</small>}<label className="profile-check"><Checkbox checked={marketingEmailAgreed} onChange={event => setMarketingEmailAgreed(event.target.checked)}/><span>[선택] 광고성 정보 수신 동의(이메일)</span><small className="profile-check__date">{marketingEmailAgreed ? `동의일자: ${accountDate(profile.marketingEmailConsentChangedAt)}` : '미동의'}</small></label></div>
    <div className="profile-catalog__phone"><span>핸드폰</span><div><NativeSelect aria-label="핸드폰 번호 앞자리" onChange={event => setPhonePrefix(event.target.value)} value={phonePrefix}>{phonePrefixOptions.map(option => <option key={option}>{option}</option>)}</NativeSelect><input aria-label="핸드폰 번호 가운데 자리" inputMode="numeric" maxLength={4} onChange={event => { setTouched(current => ({ ...current, phone: true })); setPhoneMiddle(event.target.value.replace(/\D/g, '')) }} value={phoneMiddle}/><input aria-label="핸드폰 번호 끝자리" inputMode="numeric" maxLength={4} onChange={event => { setTouched(current => ({ ...current, phone: true })); setPhoneLast(event.target.value.replace(/\D/g, '')) }} value={phoneLast}/></div>{touched.phone && fieldErrors.phone ? <small className="is-error" role="alert">* {fieldErrors.phone}</small> : null}</div>
    <div className="profile-catalog__messenger"><span>메신저 ID</span><div><NativeSelect aria-label="메신저 선택" onChange={event => { setTouched(current => ({ ...current, messenger: true })); setMessengerType(event.target.value) }} value={messengerType}><option value="">선택 안 함</option>{messengerType && !messengerOptions.includes(messengerType) ? <option value={messengerType}>{messengerType}</option> : null}{messengerOptions.map(option => <option key={option} value={option}>{messengerOptionLabel(option)}</option>)}</NativeSelect><input aria-label="프로필 메신저 아이디" maxLength={100} onChange={event => { setTouched(current => ({ ...current, messenger: true })); setMessengerId(event.target.value) }} placeholder="메신저 ID 입력" value={messengerId}/></div>{touched.messenger && fieldErrors.messenger ? <small className="is-error" role="alert">* {fieldErrors.messenger}</small> : null}</div>
    <div className="profile-catalog__actions"><Button disabled={pending} size="large" variant="secondary" type="submit">{pending ? '처리 중…' : '정보 수정'}</Button><Button disabled={pending} size="large" onClick={() => void navigate(profileCancelPath(location.state), { replace: true })}>취소</Button></div>
    {validation ? <p className="mypage-notice" role="alert">{validation}</p> : null}
    {save.isError ? <p className="mypage-notice" role="alert">{save.error.message || '내 정보를 저장하지 못했습니다.'}</p> : null}
    {passwordChange.isError ? <p className="mypage-notice" role="alert">비밀번호를 변경하지 못했습니다.</p> : null}
    {emailRequest.isError ? <p className="mypage-notice" role="alert">인증 메일을 요청하지 못했습니다.</p> : null}
    {requestWithdrawal.isSuccess && requestWithdrawal.data.status !== 'completed' ? <p className="mypage-notice" role="status">회원탈퇴 처리 상태를 확인해 주세요.</p> : null}
    {withdrawal ? <button className="profile-catalog__withdraw" disabled={eligibility.isPending || requestWithdrawal.isPending} onClick={() => eligibility.mutate()} type="button">회원탈퇴</button> : null}
  </form>
  {withdrawal && eligibility.data && !eligibility.data.eligible ? <Modal className="modal--withdrawal-unavailable" isOpen title="회원탈퇴를 진행할 수 없습니다." closeLabel="확인" onClose={() => eligibility.reset()} onConfirm={() => eligibility.reset()} showClose={false}><div className="popup-copy"><p>현재 이용 중이거나 처리 중인 서비스가 있어 회원탈퇴가 제한됩니다. 아래 항목을 확인한 후 다시 시도해 주세요.</p><div className="popup-copy__box">{eligibility.data.restrictions.map(item => <span key={item.code}>• {item.message}<br/></span>)}</div><p>모든 이용 및 처리가 완료된 후 회원탈퇴를 진행할 수 있습니다.</p></div></Modal> : null}
  <Modal closeLabel="취소" closeVariant="primary" confirmFirst confirmDisabled={requestWithdrawal.isPending} confirmLabel={requestWithdrawal.isPending ? '처리 중…' : '회원탈퇴'} confirmVariant="secondary" isOpen={withdrawalConfirmOpen} onClose={() => { if (!requestWithdrawal.isPending) setWithdrawalConfirmOpen(false) }} onConfirm={() => { if (!requestWithdrawal.isPending) requestWithdrawal.mutate() }} title="회원탈퇴를 진행하시겠습니까?"><p>회원탈퇴 시 계정 정보와 보유 중인 포인트·쿠폰이 모두 삭제되며 복구할 수 없습니다.<br/><br/>정말 회원탈퇴를 진행하시겠습니까?</p></Modal>
  <Modal className="modal--wide" closeLabel="닫기" confirmDisabled={!verificationProof || confirmEmail.isPending} confirmLabel={confirmEmail.isPending ? '변경 중…' : '이메일 변경 완료'} isOpen={Boolean(requestId)} onClose={resetEmailVerification} onConfirm={() => { if (verificationProof && !confirmEmail.isPending) confirmEmail.mutate() }} title="이메일 인증"><div className="popup-form popup-form--stacked"><p>변경할 이메일로 보낸 인증 링크를 열어 주세요.</p>{verificationProof ? <p role="status">이메일 인증을 완료했습니다. 이메일 변경 완료를 눌러 적용해 주세요.</p> : null}{confirmEmail.isError ? <p role="alert">이메일 변경을 완료하지 못했습니다.</p> : null}</div></Modal></>
}

