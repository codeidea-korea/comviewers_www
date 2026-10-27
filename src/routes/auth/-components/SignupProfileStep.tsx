import { useAuthTranslation } from '@/routes/auth/authTranslation'
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
import { SignupRegistrationStatus } from './SignupRegistrationStatus'

export function SignupProfileStep() {
  const [searchParams] = useSearchParams()
  if (searchParams.get('mode') === 'social') return <SocialSignupProfileStep />
  return <StandardSignupProfileStep />
}

function StandardSignupProfileStep() {
  const { authText, t, locale } = useAuthTranslation()
  const { profile, profilePreview, setProfilePreview, setProfileImage,
    error, setError, notice, profileImageError, usernameFeedback, fieldErrors, busy, complete, awaitingVerification, restartSignup, resendVerification,
    checkedUsername, checkUsername, setField, setFieldValue, submit, registrationProgress, retryRegistration } = useProfileForm()

  if (awaitingVerification) {
    return <AuthPage variant="signup-complete"><AuthPanel result>
      <AuthHeading title={authText("회원가입 신청이 완료되었습니다.")} />
      <div className="result-copy signup-request-copy">
        <p>{locale === 'ko' ? <><strong>{profile.name}</strong>님의 회원가입을 위한 <u>{authText("이메일 인증")}</u>이 필요합니다.</> : t('auth.signupForName', { name: profile.name })}</p>
        <p>{authText("입력하신 이메일 주소로 인증 메일을 발송했습니다.")}<br />{authText("이메일 인증을 완료하면 회원가입이 최종 완료되며 서비스를 이용할 수 있습니다.")}</p>
        <p>{authText('다른 기기에서 이메일을 인증해도 이 화면에서 자동으로 가입이 완료됩니다. 완료될 때까지 이 화면을 닫거나 새로고침하지 마세요.')}</p>
        <p>{authText("인증 링크는 발송 후 24시간 동안 유효합니다.")}<br />{authText("메일 재발송 시 이전 링크는 즉시 만료되며, 인증을 완료한 링크는 다시 사용할 수 없습니다.")}</p>
        <dl><div><dt>{authText("이름")}</dt><dd>{profile.name}</dd></div><div><dt>{authText("아이디")}</dt><dd>{profile.loginId}</dd></div><div><dt>Email</dt><dd>{profile.emailId}@{profile.emailDomain}</dd></div></dl>
        {notice ? <p aria-live="polite" className="auth-notice">{authText(notice)}</p> : null}
        {error ? <p aria-live="polite" className="form-error">{authText(error)}</p> : null}
      </div>
      <SignupRegistrationStatus progress={registrationProgress} onRetry={retryRegistration} onRestart={restartSignup} />
      <div className="result-actions signup-request-actions">
        {!registrationProgress ? <Button disabled={busy} onClick={() => { void resendVerification() }} size="large" variant="secondary">{busy ? authText("발송 중…") : authText("인증 메일 재발송")}</Button> : null}
        {error ? <Button onClick={restartSignup} size="large" variant="secondary">{authText("다시 입력하기")}</Button> : null}
        <Button as={Link} size="large" to="/">{authText("메인으로")}</Button>
      </div>
    </AuthPanel></AuthPage>
  }

  return (
    <AuthPage variant="profile">
      <AuthPanel>
        <AuthHeading current={2} title={authText("회원가입")} total={2} />
        <form className="auth-form profile-form" onSubmit={submit}>
          <h2>{authText("회원정보 입력")}</h2>
          <ProfileImagePicker alt={profilePreview === userProfileIcon ? '' : authText("선택된 프로필 미리보기")} disabled={busy} onSelect={(source, file) => { setProfilePreview(source); setProfileImage(file); setError('') }} value={profilePreview} variant="auth" />
          {profileImageError ? <p aria-live="polite" className="profile-image-field__error" role="alert">{authText(profileImageError)}</p> : null}
          <div className="field-with-action">
            <TextField
              error={authText(fieldErrors.loginId || (usernameFeedback?.tone === 'error' ? usernameFeedback.message : undefined))}
              label={<><span className="required-mark">*</span>{authText("아이디")}</>}
              helperText={authText("3~20자의 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.")}
              maxLength={20}
              name="loginId"
              onChange={setField('loginId')}
              placeholder={authText("아이디 입력")}
              required
              success={authText(usernameFeedback?.tone === 'success' ? usernameFeedback.message : undefined)}
              value={profile.loginId}
            />
            <Button disabled={busy} onClick={() => { void checkUsername() }} size="small" variant="secondary" type="button">{checkedUsername === profile.loginId && checkedUsername ? authText("확인 완료") : authText("중복 확인")}</Button>
          </div>
          <PasswordField error={authText(fieldErrors.password)} helperText={authText("8~16자의 영문, 숫자, 특수문자(!, @, #, $, %, )만 사용할 수 있습니다.")} label={<><span className="required-mark">*</span>{authText("비밀번호")}</>} maxLength={16} name="password" onChange={setField('password')} placeholder={authText("비밀번호 입력")} required value={profile.password} />
          <PasswordField error={authText(fieldErrors.passwordConfirm)} label={<><span className="required-mark">*</span>{authText("비밀번호 확인")}</>} maxLength={16} name="passwordConfirm" onChange={setField('passwordConfirm')} placeholder={authText("비밀번호 입력")} required value={profile.passwordConfirm} />
          <TextField error={authText(fieldErrors.name)} helperText={authText("1~18자, 한글, 영문자, 하이픈(-), 아포스트로피(')")} label={<><span className="required-mark">*</span>{authText("이름")}</>} maxLength={18} name="name" onChange={setField('name')} placeholder={authText("이름 입력")} required value={profile.name} />
          <TextField error={authText(fieldErrors.nickname)} helperText={authText("1~18자의 문자, 숫자만 사용할 수 있습니다.")} label={<><span className="required-mark">*</span>{authText("닉네임")}</>} maxLength={18} name="nickname" onChange={setField('nickname')} placeholder={authText("닉네임 입력")} required value={profile.nickname} />
          <div className="required-fieldset"><span className="required-mark">*</span><EmailAddressField domain={profile.emailDomain} domainPlaceholder="" error={authText(fieldErrors.email)} id={profile.emailId} onDomainChange={(value) => setFieldValue('emailDomain', value)} onIdChange={setField('emailId')} required /></div>
          <fieldset className="split-field"><legend>{authText("핸드폰")}</legend><div><NativeSelect aria-label={authText("휴대전화 앞자리")} name="phone1" onChange={setField('phone1')} value={profile.phone1}>{phonePrefixOptions.map((option) => <option key={option}>{option}</option>)}</NativeSelect><input aria-label={authText("휴대전화 중간자리")} name="phone2" inputMode="numeric" maxLength={4} onChange={(event) => setFieldValue('phone2', event.target.value)} value={profile.phone2} /><input aria-label={authText("휴대전화 끝자리")} name="phone3" inputMode="numeric" maxLength={4} onChange={(event) => setFieldValue('phone3', event.target.value)} value={profile.phone3} /></div>{fieldErrors.phone ? <p aria-live="polite" className="split-field__error">* {authText(fieldErrors.phone)}</p> : null}</fieldset>
          <fieldset className="split-field split-field--messenger"><legend>{authText("메신저 ID")}</legend><div><NativeSelect aria-label={authText("메신저 선택")} name="messenger" onChange={setField('messenger')} value={profile.messenger}><option value="">{authText("메신저 선택")}</option>{messengerOptions.map((option) => <option key={option} value={option}>{authText(messengerOptionLabel(option))}</option>)}</NativeSelect><input aria-label={authText("메신저 아이디")} name="messengerId" onChange={setField('messengerId')} value={profile.messengerId} /></div>{fieldErrors.messenger ? <p aria-live="polite" className="split-field__error">* {authText(fieldErrors.messenger)}</p> : null}</fieldset>
          {notice ? <p aria-live="polite" className="auth-notice">{authText(notice)}</p> : null}
          {error ? <p aria-live="polite" className="form-error">{authText(error)}</p> : null}
          <Button disabled={!complete || busy} size="large" type="submit">{busy ? authText("처리 중") : authText("회원가입")}</Button>
        </form>
      </AuthPanel>
    </AuthPage>
  )
}

