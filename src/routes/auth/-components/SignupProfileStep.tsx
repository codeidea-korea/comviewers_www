import { useProfileForm } from './hooks/useProfileForm'
import { RelativeLink as Link } from '../../../components/navigation/RelativeLinkView'
import userProfileIcon from '../../../assets/figma/user-profile.svg'
import { Button } from '../../../components/ui/ButtonControl'
import { NativeSelect } from '../../../components/ui/SelectControl'
import { TextField } from '../../../components/ui/TextFieldControl'
import { ProfileImagePicker } from '../../../components/ui/ProfileImagePickerControl'
import { AuthHeading, AuthPage, AuthPanel, EmailAddressField, PasswordField } from '../AuthComponentsView'
import { messengerOptionLabel, messengerOptions, phonePrefixOptions } from '../../../lib/formOptions'
import { useSearchParams } from 'react-router'
import { SocialSignupProfileStep } from './SocialSignupProfileStep'

export function SignupProfileStep() {
  const [searchParams] = useSearchParams()
  if (searchParams.get('mode') === 'social') return <SocialSignupProfileStep />
  return <StandardSignupProfileStep />
}

function StandardSignupProfileStep() {
  const { profile, profilePreview, setProfilePreview, setProfileImage,
    error, setError, notice, profileImageError, usernameFeedback, fieldErrors, busy, complete, awaitingVerification, restartSignup,
    checkedUsername, checkUsername, setField, setFieldValue, submit } = useProfileForm()

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
      <div className="result-actions">
        {error ? <Button onClick={restartSignup} size="large" variant="secondary">다시 입력하기</Button> : null}
        <Button as={Link} size="large" to="/">메인으로</Button>
      </div>
    </AuthPanel></AuthPage>
  }

  return (
    <AuthPage variant="profile">
      <AuthPanel>
        <AuthHeading current={2} title="회원가입" total={2} />
        <form className="auth-form profile-form" onSubmit={submit}>
          <h2>회원정보 입력</h2>
          <ProfileImagePicker alt={profilePreview === userProfileIcon ? '' : '선택된 프로필 미리보기'} disabled={busy} onSelect={(source, file) => { setProfilePreview(source); setProfileImage(file); setError('') }} value={profilePreview} variant="auth" />
          {profileImageError ? <p aria-live="polite" className="profile-image-field__error" role="alert">* {profileImageError}</p> : null}
          <div className="field-with-action">
            <TextField
              error={fieldErrors.loginId || (usernameFeedback?.tone === 'error' ? usernameFeedback.message : undefined)}
              label={<><span className="required-mark">*</span>아이디</>}
              name="loginId"
              onChange={setField('loginId')}
              placeholder="아이디 입력"
              required
              success={usernameFeedback?.tone === 'success' ? usernameFeedback.message : undefined}
              value={profile.loginId}
            />
            <button disabled={busy} onClick={() => { void checkUsername() }} type="button">{checkedUsername === profile.loginId && checkedUsername ? '확인 완료' : '중복 확인'}</button>
          </div>
          <PasswordField error={fieldErrors.password} label={<><span className="required-mark">*</span>비밀번호</>} name="password" onChange={setField('password')} placeholder="비밀번호 입력" required value={profile.password} />
          <PasswordField error={fieldErrors.passwordConfirm} label={<><span className="required-mark">*</span>비밀번호 확인</>} name="passwordConfirm" onChange={setField('passwordConfirm')} placeholder="비밀번호 입력" required value={profile.passwordConfirm} />
          <TextField error={fieldErrors.name} label={<><span className="required-mark">*</span>이름</>} name="name" onChange={setField('name')} placeholder="이름 입력" required value={profile.name} />
          <TextField error={fieldErrors.nickname} label={<><span className="required-mark">*</span>닉네임</>} name="nickname" onChange={setField('nickname')} placeholder="닉네임 입력" required value={profile.nickname} />
          <div className="required-fieldset"><span className="required-mark">*</span><EmailAddressField domain={profile.emailDomain} domainPlaceholder="" error={fieldErrors.email} id={profile.emailId} onDomainChange={(value) => setFieldValue('emailDomain', value)} onIdChange={setField('emailId')} required /></div>
          <fieldset className="split-field"><legend>핸드폰</legend><div><NativeSelect aria-label="휴대전화 앞자리" onChange={setField('phone1')} value={profile.phone1}>{phonePrefixOptions.map((option) => <option key={option}>{option}</option>)}</NativeSelect><input aria-label="휴대전화 중간자리" inputMode="numeric" onChange={(event) => setFieldValue('phone2', event.target.value.replace(/\D/g, '').slice(0, 4))} value={profile.phone2} /><input aria-label="휴대전화 끝자리" inputMode="numeric" onChange={(event) => setFieldValue('phone3', event.target.value.replace(/\D/g, '').slice(0, 4))} value={profile.phone3} /></div>{fieldErrors.phone ? <p aria-live="polite" className="split-field__error">* {fieldErrors.phone}</p> : null}</fieldset>
          <fieldset className="split-field split-field--messenger"><legend>메신저 ID</legend><div><NativeSelect aria-label="메신저 선택" onChange={setField('messenger')} value={profile.messenger}><option value="">메신저 선택</option>{messengerOptions.map((option) => <option key={option} value={option}>{messengerOptionLabel(option)}</option>)}</NativeSelect><input aria-label="메신저 아이디" onChange={setField('messengerId')} value={profile.messengerId} /></div>{fieldErrors.messenger ? <p aria-live="polite" className="split-field__error">* {fieldErrors.messenger}</p> : null}</fieldset>
          {notice ? <p aria-live="polite" className="auth-notice">{notice}</p> : null}
          {error ? <p aria-live="polite" className="form-error">{error}</p> : null}
          <Button disabled={!complete || busy} size="large" type="submit">{busy ? '처리 중' : '회원가입'}</Button>
        </form>
      </AuthPanel>
    </AuthPage>
  )
}

