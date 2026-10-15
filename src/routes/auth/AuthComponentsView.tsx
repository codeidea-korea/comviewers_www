import { useAuthTranslation } from '@/routes/auth/authTranslation'
import { useState, type ReactNode, type ChangeEvent, type ComponentProps } from 'react'
import { RelativeLink as Link } from '../../components/navigation/RelativeLinkView'
import { AppShell } from '../../components/layout/AppShellView'
import { TextField } from '../../components/ui/TextFieldControl'
import { Checkbox } from '../../components/ui/CheckboxControl'
import { NativeSelect } from '../../components/ui/SelectControl'
import googleIcon from '../../assets/figma/social-google.png'
import naverIcon from '../../assets/figma/social-naver.svg'
import kakaoIcon from '../../assets/figma/social-kakao.png'
import { emailDomainOptions } from '../../lib/formOptions'
import type { SocialAuthProvider } from '../../app/session/AuthProvider'
import './auth-publishing.css'

export function AuthPage({ children, isolated = false, variant, translateContent = false }: { children: ReactNode; isolated?: boolean; variant?: string; translateContent?: boolean }) {
  const variantClass = variant ? ` auth-page--${variant}` : ''
  if (isolated) {
    return <main className={`auth-page auth-page--isolated notranslate${variantClass}`} translate="no">{children}</main>
  }

  return (
    <AppShell className="auth-shell">
      <section className={`auth-page${translateContent ? '' : ' notranslate'}${variantClass}`} translate={translateContent ? 'yes' : 'no'}>
        {children}
      </section>
    </AppShell>
  )
}

export function AuthPanel({ children, compact = false, result = false }: { children: ReactNode; compact?: boolean; result?: boolean }) {
  return (
    <div className={`auth-panel${compact ? ' auth-panel--compact' : ''}${result ? ' auth-panel--result' : ''}`}>
      {children}
    </div>
  )
}

export function AuthHeading({ current, description, title, total }: { current?: number; description?: ReactNode; title: ReactNode; total?: number }) {
  const { authText, t } = useAuthTranslation()
  return (
    <header className="auth-heading notranslate" translate="no">
      <div>
        <h1>{typeof title === 'string' ? authText(title) : title}</h1>
        {description ? <p>{typeof description === 'string' ? authText(description) : description}</p> : null}
      </div>
      {current ? (
        <p aria-label={t('auth.progress', { total: total ?? current, current })} className="auth-progress">
          <strong>{String(current).padStart(2, '0')}</strong>
          <span aria-hidden="true" className="auth-progress__slash">/</span>
          <span aria-hidden="true">{String(total).padStart(2, '0')}</span>
        </p>
      ) : null}
    </header>
  )
}

export function PasswordField({ displayAsText = false, ...props }: ComponentProps<typeof TextField> & { displayAsText?: boolean }) {
  const { authText } = useAuthTranslation()
  const [visible, setVisible] = useState(displayAsText)
  return (
    <TextField
      {...props}
      onTrailingIconClick={() => setVisible((value) => !value)}
      trailingActionLabel={authText(visible ? '비밀번호 숨기기' : '비밀번호 보기')}
      trailingActionPressed={visible}
      trailingIcon={visible ? 'eye-off' : 'eye'}
      type={visible ? 'text' : 'password'}
    />
  )
}

function AuthCheckbox(props: ComponentProps<typeof Checkbox>) {
  return <Checkbox {...props} className="auth-checkbox notranslate" visualClassName="auth-checkbox__visual" />
}

export { AuthCheckbox as Checkbox }

export function EmailAddressField({ domain, domainPlaceholder = '직접 입력', error, id, onDomainChange, onIdChange, required = false }: { domain: string; domainPlaceholder?: string; error?: string; id: string; onDomainChange: (value: string) => void; onIdChange: (event: ChangeEvent<HTMLInputElement>) => void; required?: boolean }) {
  const { authText } = useAuthTranslation()
  const [domainSelection, setDomainSelection] = useState(() => emailDomainOptions.includes(domain) ? domain : '')
  return (
    <fieldset className="email-field">
      <legend>E-mail</legend>
      <div className="email-field__row">
        <input aria-label={authText("이메일 아이디")} name="emailId" onChange={onIdChange} placeholder={authText("이메일")} required={required} value={id} />
        <span>@</span>
        <input aria-label={authText("이메일 도메인")} name="emailDomain" onChange={(event) => { setDomainSelection(''); onDomainChange(event.target.value) }} placeholder={authText(domainPlaceholder)} required={required} value={domain} />
        <NativeSelect aria-label={authText("이메일 도메인 선택")} onChange={(event) => { const value = event.target.value; setDomainSelection(value); if (value) onDomainChange(value) }} value={domainSelection}>
          <option value="">{authText("직접입력")}</option>
          {emailDomainOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </NativeSelect>
      </div>
      {error ? <p className="email-field__error">* {authText(error)}</p> : null}
    </fieldset>
  )
}

export function SocialLoginButtons({ allowedProviders, disabledProvider, onSelect, title = '간편 로그인/회원가입' }: { allowedProviders?: readonly SocialAuthProvider[]; disabledProvider?: SocialAuthProvider | null; onSelect: (provider: SocialAuthProvider) => void; title?: string }) {
  const { authText } = useAuthTranslation()
  return (
    <div className="social-login social-login--stacked">
      <h2>{authText(title)}</h2>
      <div className="social-login__buttons">
        {(!allowedProviders || allowedProviders.includes('google')) && <button className="social-button social-button--google" disabled={disabledProvider === 'google'} onClick={() => onSelect('google')} type="button"><img alt="" src={googleIcon} />{authText("Google 계정으로 로그인")}</button>}
        {(!allowedProviders || allowedProviders.includes('naver')) && <button className="social-button social-button--naver" disabled={disabledProvider === 'naver'} onClick={() => onSelect('naver')} type="button"><img alt="" src={naverIcon} />{authText("네이버 계정으로 로그인")}</button>}
        {(!allowedProviders || allowedProviders.includes('kakao')) && <button className="social-button social-button--kakao" disabled={disabledProvider === 'kakao'} onClick={() => onSelect('kakao')} type="button"><img alt="" src={kakaoIcon} />{authText("카카오 계정으로 로그인")}</button>}
      </div>
    </div>
  )
}

export function AuthLinks() {
  const { authText } = useAuthTranslation()
  return (
    <nav aria-label={authText("계정 메뉴")} className="auth-links">
      <Link to="/account/find-id">{authText("아이디 찾기")}</Link>
      <Link to="/account/find-password">{authText("비밀번호 찾기")}</Link>
      <Link to="/signup/terms">{authText("회원가입")}</Link>
    </nav>
  )
}
