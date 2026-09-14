import { useProfileForm } from './hooks/useProfileForm'
import { RelativeLink as Link } from '../../../components/navigation/RelativeLinkView'
import userProfileIcon from '../../../assets/figma/user-profile.svg'
import { Button } from '../../../components/ui/ButtonControl'
import { NativeSelect } from '../../../components/ui/SelectControl'
import { TextField } from '../../../components/ui/TextFieldControl'
import { ProfileImagePicker } from '../../../components/ui/ProfileImagePickerControl'
import { AuthHeading, AuthPage, AuthPanel, EmailAddressField, PasswordField, usePublishingState } from '../AuthComponentsView'
import { messengerOptionLabel, messengerOptions, phonePrefixOptions } from '../../../mocks/selectOptions'
import { useSearchParams } from 'react-router'
import { SocialSignupProfileStep } from './SocialSignupProfileStep'

export function SignupProfileStep() {
  const [searchParams] = useSearchParams()
  if (searchParams.get('mode') === 'social') return <SocialSignupProfileStep />
  return <StandardSignupProfileStep />
}

function StandardSignupProfileStep() {
  const filledPreview = usePublishingState('filled')
  const { profile, profilePreview, setProfilePreview, setProfileImage,
    error, setError, notice, busy, complete, awaitingVerification, checkedUsername, checkUsername, setField, setFieldValue, submit } = useProfileForm(filledPreview)

  if (awaitingVerification) {
    return <AuthPage variant="signup-complete"><AuthPanel result>
      <AuthHeading title="회원가입 신청이 완료되었습니다." />
      <div className="result-copy signup-request-copy">
        <p><strong>{profile.name}</strong>님의 회원가입을 위한 <u>이메일 인증</u>이 필요합니다.</p>
        <p>입력하신 이메일 주소로 인증 메일을 발송했습니다.<br />이메일 인증을 완료하면 회원가입이 최종 완료되며 서비스를 이용할 수 있습니다.</p>
        <dl><div><dt>이름</dt><dd>{profile.name}</dd></div><div><dt>아이디</dt><dd>{profile.loginId}</dd></div><div><dt>Email</dt><dd>{profile.emailId}@{profile.emailDomain}</dd></div></dl>
        {notice ? <p aria-live="polite" className="auth-notice">{notice}</p> : null}
        {error ? <p aria-live="polite" className="form-error">{error}</p> : null}
      </div>
      <Button as={Link} size="large" to="/">메인으로</Button>
    </AuthPanel></AuthPage>
  }

  return (
    <AuthPage isolated={filledPreview} variant="profile">
      <AuthPanel compact={filledPreview}>
        <AuthHeading current={2} title="회원가입" total={2} />
        <form className="auth-form profile-form" onSubmit={submit}>
          <h2>회원정보 입력</h2>
          <ProfileImagePicker alt={profilePreview === userProfileIcon ? '' : '선택된 프로필 미리보기'} disabled={busy} onSelect={(source, file) => { setProfilePreview(source); setProfileImage(file); setError('') }} value={profilePreview} variant="auth" />
          <div className="field-with-action">
            <TextField
              helperText="3~20자의 영문, 숫자, 밑줄(_)만 사용할 수 있습니다."
              label={<><span className="required-mark">*</span>아이디</>}
              name="loginId"
              onChange={setField('loginId')}
              placeholder="아이디 입력"
              required
              value={profile.loginId}
            />
            <button disabled={busy} onClick={() => { void checkUsername() }} type="button">{checkedUsername === profile.loginId && checkedUsername ? '확인 완료' : '중복 확인'}</button>
          </div>
          <PasswordField helperText="8~16자의 영문, 숫자, 특수문자(!, @, #, $, %)만 사용할 수 있습니다." label={<><span className="required-mark">*</span>비밀번호</>} name="password" onChange={setField('password')} placeholder="비밀번호 입력" required value={profile.password} />
          <PasswordField error={profile.passwordConfirm && profile.password !== profile.passwordConfirm ? '비밀번호가 일치하지 않습니다.' : undefined} label={<><span className="required-mark">*</span>비밀번호 확인</>} name="passwordConfirm" onChange={setField('passwordConfirm')} placeholder="비밀번호 입력" required value={profile.passwordConfirm} />
          <TextField helperText="1~18자, 한글, 영문자, 하이픈(-), 아포스트로피(')" label={<><span className="required-mark">*</span>이름</>} name="name" onChange={setField('name')} placeholder="이름 입력" required value={profile.name} />
          <TextField helperText="1~18자의 문자, 숫자만 사용할 수 있습니다." label={<><span className="required-mark">*</span>닉네임</>} name="nickname" onChange={setField('nickname')} placeholder="닉네임 입력" required value={profile.nickname} />
          <div className="required-fieldset"><span className="required-mark">*</span><EmailAddressField domain={profile.emailDomain} domainPlaceholder="" id={profile.emailId} onDomainChange={(value) => setFieldValue('emailDomain', value)} onIdChange={setField('emailId')} required /></div>
          <fieldset className="split-field"><legend>핸드폰</legend><div><NativeSelect aria-label="휴대전화 앞자리" onChange={setField('phone1')} value={profile.phone1}>{phonePrefixOptions.map((option) => <option key={option}>{option}</option>)}</NativeSelect><input aria-label="휴대전화 중간자리" inputMode="numeric" onChange={(event) => setFieldValue('phone2', event.target.value.replace(/\D/g, '').slice(0, 4))} value={profile.phone2} /><input aria-label="휴대전화 끝자리" inputMode="numeric" onChange={(event) => setFieldValue('phone3', event.target.value.replace(/\D/g, '').slice(0, 4))} value={profile.phone3} /></div></fieldset>
          <fieldset className="split-field split-field--messenger"><legend>메신저 ID</legend><div><NativeSelect aria-label="메신저 선택" onChange={setField('messenger')} value={profile.messenger}><option value="">메신저 선택</option>{messengerOptions.map((option) => <option key={option} value={option}>{messengerOptionLabel(option)}</option>)}</NativeSelect><input aria-label="메신저 아이디" onChange={setField('messengerId')} value={profile.messengerId} /></div></fieldset>
          {notice ? <p aria-live="polite" className="auth-notice">{notice}</p> : null}
          {error ? <p aria-live="polite" className="form-error">{error}</p> : null}
          <Button disabled={!complete || busy} size="large" type="submit">{busy ? '처리 중' : '회원가입'}</Button>
        </form>
      </AuthPanel>
    </AuthPage>
  )
}

