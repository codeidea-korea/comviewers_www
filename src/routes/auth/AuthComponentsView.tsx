import { useState, type ReactNode, type ChangeEvent, type ComponentProps } from 'react'
import { RelativeLink as Link } from '../../components/navigation/RelativeLinkView'
import { AppShell } from '../../components/layout/AppShellView'
import { TextField } from '../../components/ui/TextFieldControl'
import { Checkbox } from '../../components/ui/CheckboxControl'
import { NativeSelect } from '../../components/ui/SelectControl'
import googleIcon from '../../assets/figma/social-google.svg'
import naverIcon from '../../assets/figma/social-naver.svg'
import kakaoIcon from '../../assets/figma/social-kakao.png'
import { emailDomainOptions } from '../../lib/formOptions'
import type { SocialAuthProvider } from '../../app/session/AuthProvider'
import './auth-publishing.css'

export function AuthPage({ children, isolated = false, variant }: { children: ReactNode; isolated?: boolean; variant?: string }) {
  const variantClass = variant ? ` auth-page--${variant}` : ''
  if (isolated) {
    return <main className={`auth-page auth-page--isolated${variantClass}`}>{children}</main>
  }

  return (
    <AppShell className="auth-shell">
      <section className={`auth-page${variantClass}`}>
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
  return (
    <header className="auth-heading">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {current ? (
        <p aria-label={`${total}단계 중 ${current}단계`} className="auth-progress">
          <strong>{String(current).padStart(2, '0')}</strong>
          <span aria-hidden="true" className="auth-progress__slash">/</span>
          <span aria-hidden="true">{String(total).padStart(2, '0')}</span>
        </p>
      ) : null}
    </header>
  )
}

export function PasswordField({ displayAsText = false, ...props }: ComponentProps<typeof TextField> & { displayAsText?: boolean }) {
  const [visible, setVisible] = useState(displayAsText)
  return (
    <TextField
      {...props}
      onTrailingIconClick={() => setVisible((value) => !value)}
      trailingActionLabel={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
      trailingActionPressed={visible}
      trailingIcon={visible ? 'eye-off' : 'eye'}
      type={visible ? 'text' : 'password'}
    />
  )
}

function AuthCheckbox(props: ComponentProps<typeof Checkbox>) {
  return <Checkbox {...props} className="auth-checkbox" visualClassName="auth-checkbox__visual" />
}

export { AuthCheckbox as Checkbox }

export function EmailAddressField({ domain, domainPlaceholder = '직접 입력', error, id, onDomainChange, onIdChange, required = false }: { domain: string; domainPlaceholder?: string; error?: string; id: string; onDomainChange: (value: string) => void; onIdChange: (event: ChangeEvent<HTMLInputElement>) => void; required?: boolean }) {
  return (
    <fieldset className="email-field">
      <legend>E-mail</legend>
      <div className="email-field__row">
        <input aria-label="이메일 아이디" onChange={onIdChange} placeholder="이메일" required={required} value={id} />
        <span>@</span>
        <input aria-label="이메일 도메인" onChange={(event) => onDomainChange(event.target.value)} placeholder={domainPlaceholder} required={required} value={domain} />
        <NativeSelect aria-label="이메일 도메인 선택" onChange={(event) => onDomainChange(event.target.value)} value={emailDomainOptions.includes(domain) ? domain : ''}>
          <option value="">이메일 선택</option>
          {emailDomainOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </NativeSelect>
      </div>
      {error ? <p className="email-field__error">* {error}</p> : null}
    </fieldset>
  )
}

export function SocialLoginButtons({ disabledProvider, onSelect }: { disabledProvider?: SocialAuthProvider | null; onSelect: (provider: SocialAuthProvider) => void }) {
  return (
    <div className="social-login">
      <h2>간편 로그인/회원가입</h2>
      <div className="social-login__buttons">
        <button className="social-button social-button--google" disabled={disabledProvider === 'google'} onClick={() => onSelect('google')} type="button"><img alt="" src={googleIcon} />Google 계정으로 로그인</button>
        <button className="social-button social-button--naver" disabled={disabledProvider === 'naver'} onClick={() => onSelect('naver')} type="button"><img alt="" src={naverIcon} />네이버 계정으로 로그인</button>
        <button className="social-button social-button--kakao" disabled={disabledProvider === 'kakao'} onClick={() => onSelect('kakao')} type="button"><img alt="" src={kakaoIcon} />카카오 계정으로 로그인</button>
      </div>
    </div>
  )
}

export function AuthLinks() {
  return (
    <nav aria-label="계정 메뉴" className="auth-links">
      <Link to="/account/find-id">아이디 찾기</Link>
      <Link to="/account/find-password">비밀번호 찾기</Link>
      <Link to="/signup/terms">회원가입</Link>
    </nav>
  )
}
