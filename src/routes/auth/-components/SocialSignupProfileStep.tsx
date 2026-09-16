import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { useAuthentication } from '@/app/session/AuthProvider'
import { RelativeLink as Link } from '@/components/navigation/RelativeLinkView'
import { Button } from '@/components/ui/ButtonControl'
import { TextField } from '@/components/ui/TextFieldControl'
import { LoadingState } from '@/components/ui/LoadingStateControl'
import { NativeSelect } from '@/components/ui/SelectControl'
import { messengerOptionLabel, messengerOptions, phonePrefixOptions } from '@/lib/formOptions'
import { AuthHeading, AuthPage, AuthPanel } from '../AuthComponentsView'
import { clearSignupAgreements, loadSignupAgreements } from './signupDraft'
import { ProfileImagePicker } from '@/components/ui/ProfileImagePickerControl'
import userProfileIcon from '@/assets/figma/user-profile.svg'
import { useSessionStore } from '@/app/session/SessionProvider'
import { createApiClient } from '@/api/httpClient'
import { createCustomerProfileMutations } from '@/api/customerProfileMutations'

const formSchema = z.object({
  name: z.string().trim().regex(/^[가-힣A-Za-z'-]{1,18}$/, '이름은 1~18자의 한글, 영문, 하이픈, 아포스트로피만 사용할 수 있습니다.'),
  nickname: z.string().trim().regex(/^[가-힣A-Za-z0-9]{1,18}$/, '닉네임은 1~18자의 문자와 숫자만 사용할 수 있습니다.'),
  phone1: z.string().regex(/^\d{2,4}$/, '휴대폰 번호는 숫자만 입력해 주세요.'),
  phone2: z.string().regex(/^\d{0,4}$/, '휴대폰 번호는 숫자만 입력해 주세요.'),
  phone3: z.string().regex(/^\d{0,4}$/, '휴대폰 번호는 숫자만 입력해 주세요.'),
  messengerType: z.string().max(50), messengerId: z.string().max(100),
}).refine(value => Boolean(value.messengerType.trim()) === Boolean(value.messengerId.trim()), {
  message: '메신저 종류와 ID를 함께 입력해 주세요.',
  path: ['messengerType'],
}).refine(value => Boolean(value.phone2) === Boolean(value.phone3), {
  message: '휴대폰 번호를 모두 입력해 주세요.',
  path: ['phone2'],
})

export function SocialSignupProfileStep() {
  const auth = useAuthentication()
  const sessionStore = useSessionStore()
  const navigate = useNavigate()
  const context = useQuery({ queryKey: ['auth', 'social-signup-context'], queryFn: () => auth.loadSocialSignupContext() })
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [phone1, setPhone1] = useState('010')
  const [phone2, setPhone2] = useState('')
  const [phone3, setPhone3] = useState('')
  const [messengerType, setMessengerType] = useState('')
  const [messengerId, setMessengerId] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState(userProfileIcon)
  const [signedUp, setSignedUp] = useState(false)
  const uploadedImage = useRef<{ file: File; attachmentId: number } | null>(null)

  useEffect(() => {
    if (context.data?.name && !name) setName(context.data.name)
  }, [context.data?.name, name])

  async function saveImage() {
    if (!imageFile) return
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/'
    const mutations = createCustomerProfileMutations(createApiClient({ baseUrl, getAccessToken: () => sessionStore.getAccessToken() }))
    let attachmentId = uploadedImage.current?.file === imageFile ? uploadedImage.current.attachmentId : undefined
    if (attachmentId === undefined) {
      const uploaded = await mutations.uploadImage(imageFile)
      uploadedImage.current = { file: imageFile, attachmentId: uploaded.attachmentId }
      attachmentId = uploaded.attachmentId
    }
    await mutations.patch({ profileImageAttachmentId: attachmentId })
  }

  async function retryImage() {
    if (busy) return
    setBusy(true); setError('')
    try { await saveImage(); navigate('/mypage', { replace: true }) }
    catch { setError('가입은 완료되었습니다. 프로필 이미지를 저장하지 못했습니다. 보안 검사·저장소 상태를 확인한 뒤 다시 시도하거나 내 정보에서 변경해 주세요.') }
    finally { setBusy(false) }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const parsed = formSchema.safeParse({ name, nickname, phone1, phone2, phone3, messengerType, messengerId })
    const focusField = (name: string) => {
      const field = event.currentTarget.elements.namedItem(name)
        ?? (name === 'phone2' ? event.currentTarget.elements.namedItem('phone-middle') : null)
      if (field instanceof HTMLElement) { field.focus(); field.scrollIntoView({ block: 'center' }) }
    }
    if (!parsed.success) { const issue = parsed.error.issues[0]; setError(issue?.message ?? '입력값을 확인해 주세요.'); focusField(String(issue?.path[0] ?? 'name')); return }
    const termsAgreements = loadSignupAgreements()
    if (termsAgreements.length === 0) { setError('약관 동의 단계부터 다시 진행해 주세요.'); return }
    setBusy(true); setError('')
    try {
      const phone = parsed.data.phone2 || parsed.data.phone3
        ? `${parsed.data.phone1}-${parsed.data.phone2}-${parsed.data.phone3}`
        : ''
      await auth.completeSocialSignup({
        name: parsed.data.name,
        nickname: parsed.data.nickname,
        phone,
        messengerType: parsed.data.messengerType,
        messengerId: parsed.data.messengerId,
        termsAgreements,
      })
      setSignedUp(true)
      clearSignupAgreements()
      try { await saveImage() }
      catch { setError('가입은 완료되었습니다. 프로필 이미지를 저장하지 못했습니다. 다시 시도하거나 내 정보에서 변경해 주세요.'); return }
      navigate('/mypage', { replace: true })
    } catch (cause) { setError(cause instanceof Error ? cause.message : '소셜 회원가입을 완료하지 못했습니다.') }
    finally { setBusy(false) }
  }

  return <AuthPage variant="profile"><AuthPanel>
    <AuthHeading current={2} title="간편 회원가입" total={2} />
    {context.isPending ? <LoadingState className="route-loading--compact" label="소셜 계정 정보를 확인하고 있습니다." /> : null}
    {context.isError ? <p role="alert">소셜 가입 정보가 만료되었거나 유효하지 않습니다. <Link to="/login">다시 로그인해 주세요.</Link></p> : null}
    {signedUp ? <section><p>회원가입이 완료되었습니다.</p>{error && <p role="alert">{error}</p>}<Button disabled={busy} onClick={() => { void retryImage() }} type="button">이미지 저장 다시 시도</Button><Link to="/mypage">마이페이지로 이동</Link></section> : context.data ? <form className="auth-form profile-form" onSubmit={submit}>
      <h2>회원정보 입력</h2>
      <ProfileImagePicker alt="선택한 프로필 이미지" disabled={busy} value={imagePreview} variant="auth"
        onSelect={(source, file) => { setImagePreview(source); setImageFile(file); setError('') }}/>
      <TextField label="이름" name="name" maxLength={18} onChange={(event) => setName(event.target.value)} placeholder={context.data.name ?? '이름 입력'} required value={name} />
      <TextField label="닉네임" name="nickname" maxLength={18} onChange={(event) => setNickname(event.target.value)} required value={nickname} />
      <fieldset className="email-field"><legend><span className="required-mark">*</span>E-mail</legend><div className="email-field__row"><input aria-label="이메일 아이디" readOnly value={context.data.email.split('@')[0] ?? ''} /><span>@</span><input aria-label="이메일 도메인" readOnly value={context.data.email.split('@')[1] ?? ''} /><NativeSelect aria-label="이메일 도메인 선택" disabled value={context.data.email.split('@')[1] ?? ''}><option>{context.data.email.split('@')[1] ?? ''}</option></NativeSelect></div></fieldset>
      <fieldset className="split-field"><legend>핸드폰</legend><div><NativeSelect aria-label="휴대전화 앞자리" name="phone-prefix" onChange={event => setPhone1(event.target.value)} value={phone1}>{phonePrefixOptions.map(option => <option key={option}>{option}</option>)}</NativeSelect><input aria-label="휴대전화 중간자리" inputMode="numeric" name="phone-middle" onChange={event => setPhone2(event.target.value.replace(/\D/g, '').slice(0, 4))} value={phone2} /><input aria-label="휴대전화 끝자리" inputMode="numeric" name="phone-last" onChange={event => setPhone3(event.target.value.replace(/\D/g, '').slice(0, 4))} value={phone3} /></div></fieldset>
      <fieldset className="split-field split-field--messenger"><legend>메신저 ID</legend><div><NativeSelect aria-label="메신저 선택" name="messengerType" value={messengerType} onChange={event => setMessengerType(event.target.value)}><option value="">메신저 선택</option>{messengerOptions.map(option => <option key={option} value={option}>{messengerOptionLabel(option)}</option>)}</NativeSelect><input aria-label="메신저 아이디" maxLength={100} name="messengerId" onChange={event => setMessengerId(event.target.value)} value={messengerId}/></div></fieldset>
      {error ? <p aria-live="polite" className="form-error">{error}</p> : null}
      <Button disabled={busy} size="large" type="submit">{busy ? '처리 중' : '회원가입'}</Button>
    </form> : null}
  </AuthPanel></AuthPage>
}
