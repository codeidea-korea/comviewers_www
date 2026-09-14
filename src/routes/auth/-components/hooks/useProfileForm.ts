import { useState, type ChangeEvent, type FormEvent } from 'react'
import { z } from 'zod'
import profileAuthFilled from '@/assets/figma/profile-auth-filled.png'
import userProfileIcon from '@/assets/figma/user-profile.svg'
import { getPublicAccountApi } from '@/api/publicAccount'
import { loadSignupAgreements } from '../signupDraft'
import { useSignupCoordinator } from '../SignupCoordinator'

const emptyProfile = { loginId: '', password: '', passwordConfirm: '', name: '', nickname: '', emailId: '', emailDomain: '', phone1: '010', phone2: '', phone3: '', messenger: '', messengerId: '' }
const filledProfile = { ...emptyProfile, loginId: 'user123', password: 'publishing', passwordConfirm: 'publishing', name: '김컴뷰', nickname: 'comview', emailId: 'user123', emailDomain: 'gmail.com', phone2: '1234', phone3: '5678', messenger: 'Nimbuzz 님버즈' }
const profileInputSchema = z.object({
  loginId: z.string().regex(/^[A-Za-z0-9_]{3,20}$/, '아이디는 3~20자의 영문, 숫자, 밑줄만 사용할 수 있습니다.'),
  password: z.string().regex(/^[A-Za-z0-9!@#$%]{8,16}$/, '비밀번호는 8~16자의 영문, 숫자 및 허용된 특수문자를 사용해 주세요.'), passwordConfirm: z.string(),
  name: z.string().trim().regex(/^[가-힣A-Za-z'-]{1,18}$/, '이름은 1~18자의 한글, 영문, 하이픈, 아포스트로피만 사용할 수 있습니다.'),
  nickname: z.string().trim().regex(/^[가-힣A-Za-z0-9]{1,18}$/, '닉네임은 1~18자의 문자와 숫자만 사용할 수 있습니다.'),
  email: z.email('이메일 주소를 확인해 주세요.').max(100),
  phone1: z.string().regex(/^\d{2,4}$/, '휴대폰 번호는 숫자만 입력해 주세요.'),
  phone2: z.string().regex(/^\d{0,4}$/, '휴대폰 번호는 숫자만 입력해 주세요.'),
  phone3: z.string().regex(/^\d{0,4}$/, '휴대폰 번호는 숫자만 입력해 주세요.'),
  messenger: z.string().max(50),
  messengerId: z.string().max(100),
}).refine((value) => value.password === value.passwordConfirm, { message: '비밀번호가 일치하지 않습니다.', path: ['passwordConfirm'] })
  .refine((value) => Boolean(value.phone2) === Boolean(value.phone3), { message: '휴대폰 번호를 모두 입력해 주세요.', path: ['phone2'] })
  .refine((value) => Boolean(value.messenger.trim()) === Boolean(value.messengerId.trim()), { message: '메신저 종류와 아이디를 함께 입력해 주세요.', path: ['messenger'] })

export function useProfileForm(filledPreview: boolean) {
  const api = getPublicAccountApi()
  const signupCoordinator = useSignupCoordinator()
  const [profile, setProfile] = useState(filledPreview ? filledProfile : emptyProfile)
  const [profilePreview, setProfilePreview] = useState(filledPreview ? profileAuthFilled : userProfileIcon)
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [checkedUsername, setCheckedUsername] = useState('')
  const email = `${profile.emailId}@${profile.emailDomain}`
  const complete = Boolean(profile.loginId && checkedUsername === profile.loginId && profile.password && profile.password === profile.passwordConfirm && profile.name && profile.nickname && profile.emailId && profile.emailDomain)

  function setFieldValue(name: keyof typeof emptyProfile, value: string) {
    if (signupCoordinator.awaitingEmail) setNotice('회원정보가 변경되었습니다. 회원가입을 다시 신청해 주세요.')
    signupCoordinator.cancel()
    setProfile((current) => ({ ...current, [name]: value }))
    if (name === 'loginId') setCheckedUsername('')
    setError('')
  }
  function setField(name: keyof typeof emptyProfile) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFieldValue(name, event.target.value)
  }

  async function checkUsername() {
    if (busy || !api) return
    if (!/^[A-Za-z0-9_]{3,20}$/.test(profile.loginId)) { setError('아이디는 3~20자의 영문, 숫자, 밑줄만 사용할 수 있습니다.'); return }
    setBusy(true); setError(''); setNotice(''); setCheckedUsername('')
    try {
      const result = await api.usernameAvailability(profile.loginId)
      if (result.available) { setCheckedUsername(profile.loginId); setNotice('사용 가능한 아이디입니다.') }
      else setError('이미 사용 중인 아이디입니다.')
    } catch { setError('아이디 중복 확인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.') }
    finally { setBusy(false) }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = event.currentTarget
    const focusInvalidField = (field: string) => {
      const selectors: Record<string, string> = {
        email: 'input[aria-label="이메일 아이디"]',
        phone1: 'select[aria-label="휴대전화 앞자리"]',
        phone2: 'input[aria-label="휴대전화 중간자리"]',
        phone3: 'input[aria-label="휴대전화 끝자리"]',
        messenger: 'select[aria-label="메신저 선택"]',
        messengerId: 'input[aria-label="메신저 아이디"]',
      }
      const selector = selectors[field]
      const target = form.elements.namedItem(field) ?? (selector ? form.querySelector(selector) : null)
      if (target instanceof HTMLElement) {
        target.focus()
        target.scrollIntoView({ block: 'center' })
      }
    }
    const result = profileInputSchema.safeParse({ ...profile, email })
    if (!result.success) {
      const issue = result.error.issues[0]
      setError(issue?.message ?? '입력값을 확인해 주세요.')
      focusInvalidField(String(issue?.path[0] ?? 'loginId'))
      return
    }
    if (checkedUsername !== profile.loginId) {
      setError('아이디 중복 확인을 진행해 주세요.')
      focusInvalidField('loginId')
      return
    }
    const agreements = loadSignupAgreements()
    if (!api || agreements.length === 0) { setError('약관 동의 단계부터 다시 진행해 주세요.'); return }
    setBusy(true); setError('')
    try {
      const requested = await api.requestEmailVerification(email)
      signupCoordinator.begin(requested.requestId, email, {
        image: profileImage,
        registration: {
          username: result.data.loginId,
          password: result.data.password,
          name: result.data.name,
          nickname: result.data.nickname,
          email: result.data.email,
          phone: profile.phone2 || profile.phone3 ? [profile.phone1, profile.phone2, profile.phone3].join('-') : '',
          messengerType: profile.messenger,
          messengerId: profile.messengerId,
          termsAgreements: agreements,
        },
      })
    } catch (cause) {
      signupCoordinator.cancel()
      setError(cause instanceof Error ? cause.message : '인증 메일을 보내지 못했습니다.'); return
    } finally { setBusy(false) }
    setNotice('이메일 인증을 완료하면 회원가입이 자동으로 완료됩니다.')
  }
  function selectProfileImage(file: File | null) {
    if (signupCoordinator.awaitingEmail) setNotice('프로필 이미지가 변경되었습니다. 회원가입을 다시 신청해 주세요.')
    signupCoordinator.cancel(); setProfileImage(file)
  }
  return { profile, profilePreview, setProfilePreview, setProfileImage: selectProfileImage,
    error: error || signupCoordinator.error, setError, notice, busy: busy || signupCoordinator.busy, complete,
    awaitingVerification: signupCoordinator.awaitingEmail === email, checkedUsername, checkUsername, setField, setFieldValue, submit }
}
