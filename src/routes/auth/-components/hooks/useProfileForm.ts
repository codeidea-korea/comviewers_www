import { useState, type ChangeEvent, type FormEvent } from 'react'
import { z } from 'zod'
import userProfileIcon from '@/assets/figma/user-profile.svg'
import { getPublicAccountApi } from '@/api/publicAccount'
import { loadSignupAgreements } from '../signupDraft'
import { useSignupCoordinator } from '../SignupCoordinator'

const emptyProfile = { loginId: '', password: '', passwordConfirm: '', name: '', nickname: '', emailId: '', emailDomain: '', phone1: '010', phone2: '', phone3: '', messenger: '', messengerId: '' }
type UsernameFeedback = Readonly<{ message: string; tone: 'error' | 'success' }> | null
type Profile = typeof emptyProfile
type FieldErrorKey = 'loginId' | 'password' | 'passwordConfirm' | 'name' | 'nickname' | 'email' | 'phone' | 'messenger'
type FieldErrors = Readonly<Partial<Record<FieldErrorKey, string>>>
const fieldValidationOrder: readonly FieldErrorKey[] = ['loginId', 'password', 'passwordConfirm', 'name', 'nickname', 'email', 'phone', 'messenger']
const loginIdSchema = z.string().regex(/^[A-Za-z0-9_]{3,20}$/, '아이디는 3~20자의 영문, 숫자, 밑줄만 사용할 수 있습니다.')
const passwordSchema = z.string().regex(/^[A-Za-z0-9!@#$%]{8,16}$/, '비밀번호는 8~16자의 영문, 숫자 및 허용된 특수문자를 사용해 주세요.')
const nameSchema = z.string().trim().regex(/^[가-힣A-Za-z'-]{1,18}$/, '이름은 1~18자의 한글, 영문, 하이픈, 아포스트로피만 사용할 수 있습니다.')
const nicknameSchema = z.string().trim().regex(/^[가-힣A-Za-z0-9]{1,18}$/, '닉네임은 1~18자의 한글, 영문, 숫자만 사용할 수 있습니다.')
const emailSchema = z.email('이메일 주소를 확인해 주세요.').max(100, '이메일은 100자 이하로 입력해 주세요.')

const profileInputSchema = z.object({
  loginId: loginIdSchema,
  password: passwordSchema, passwordConfirm: z.string().min(1, '비밀번호 확인을 입력해 주세요.'),
  name: nameSchema,
  nickname: nicknameSchema,
  email: emailSchema,
  phone1: z.string().regex(/^\d{2,4}$/, '휴대폰 번호는 숫자만 입력해 주세요.'),
  phone2: z.string().regex(/^\d{0,4}$/, '휴대폰 번호는 숫자만 입력해 주세요.'),
  phone3: z.string().regex(/^\d{0,4}$/, '휴대폰 번호는 숫자만 입력해 주세요.'),
  messenger: z.string().max(50),
  messengerId: z.string().max(100),
}).refine((value) => value.password === value.passwordConfirm, { message: '비밀번호가 일치하지 않습니다.', path: ['passwordConfirm'] })
  .refine((value) => Boolean(value.phone2) === Boolean(value.phone3), { message: '휴대폰 번호를 모두 입력해 주세요.', path: ['phone2'] })
  .refine((value) => Boolean(value.messenger.trim()) === Boolean(value.messengerId.trim()), { message: '메신저 종류와 아이디를 함께 입력해 주세요.', path: ['messenger'] })

function schemaMessage(schema: z.ZodType<string>, value: string): string | undefined {
  const result = schema.safeParse(value)
  return result.success ? undefined : result.error.issues[0]?.message
}

function fieldValidationMessage(field: FieldErrorKey, profile: Profile): string | undefined {
  const email = `${profile.emailId}@${profile.emailDomain}`
  switch (field) {
    case 'loginId': return schemaMessage(loginIdSchema, profile.loginId)
    case 'password': return schemaMessage(passwordSchema, profile.password)
    case 'passwordConfirm':
      if (!profile.passwordConfirm) return '비밀번호 확인을 입력해 주세요.'
      return profile.password === profile.passwordConfirm ? undefined : '비밀번호가 일치하지 않습니다.'
    case 'name': return schemaMessage(nameSchema, profile.name)
    case 'nickname': return schemaMessage(nicknameSchema, profile.nickname)
    case 'email': return schemaMessage(emailSchema, email)
    case 'phone':
      if (!profile.phone2 && !profile.phone3) return undefined
      if (!profile.phone2 || !profile.phone3) return '휴대폰 번호를 모두 입력해 주세요.'
      return /^\d{2,4}$/.test(profile.phone1) && /^\d{1,4}$/.test(profile.phone2) && /^\d{1,4}$/.test(profile.phone3)
        ? undefined : '휴대폰 번호는 숫자만 입력해 주세요.'
    case 'messenger':
      if (Boolean(profile.messenger.trim()) !== Boolean(profile.messengerId.trim())) return '메신저 종류와 아이디를 함께 입력해 주세요.'
      if (profile.messenger.length > 50 || profile.messengerId.length > 100) return '메신저 정보를 입력 가능한 길이로 줄여 주세요.'
      return undefined
  }
}

function allFieldErrors(profile: Profile): FieldErrors {
  return Object.fromEntries(fieldValidationOrder.flatMap((field) => {
    const message = fieldValidationMessage(field, profile)
    return message ? [[field, message]] : []
  }))
}

function affectedFields(name: keyof Profile, profile: Profile, currentErrors: FieldErrors): readonly FieldErrorKey[] {
  switch (name) {
    case 'loginId': return ['loginId']
    case 'password': return profile.passwordConfirm || currentErrors.passwordConfirm ? ['password', 'passwordConfirm'] : ['password']
    case 'passwordConfirm': return ['passwordConfirm']
    case 'name': return ['name']
    case 'nickname': return ['nickname']
    case 'emailId':
    case 'emailDomain': return ['email']
    case 'phone1':
    case 'phone2':
    case 'phone3': return ['phone']
    case 'messenger':
    case 'messengerId': return ['messenger']
  }
}

export function useProfileForm() {
  const api = getPublicAccountApi()
  const signupCoordinator = useSignupCoordinator()
  const [profile, setProfile] = useState(emptyProfile)
  const [profilePreview, setProfilePreview] = useState(userProfileIcon)
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [profileImageError, setProfileImageError] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [checkedUsername, setCheckedUsername] = useState('')
  const [usernameFeedback, setUsernameFeedback] = useState<UsernameFeedback>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const email = `${profile.emailId}@${profile.emailDomain}`
  const complete = Boolean(profile.loginId && profile.password && profile.password === profile.passwordConfirm && profile.name && profile.nickname && profile.emailId && profile.emailDomain)
    && !Object.values(fieldErrors).some(Boolean)

  function setFieldValue(name: keyof typeof emptyProfile, value: string) {
    if (signupCoordinator.awaitingEmail) setNotice('회원정보가 변경되었습니다. 회원가입을 다시 신청해 주세요.')
    else if (name === 'loginId') setNotice('')
    signupCoordinator.cancel()
    const nextProfile = { ...profile, [name]: value }
    setProfile(nextProfile)
    setFieldErrors((current) => affectedFields(name, nextProfile, current).reduce<FieldErrors>((next, field) => ({
      ...next,
      [field]: fieldValidationMessage(field, nextProfile) ?? '',
    }), current))
    if (name === 'loginId') { setCheckedUsername(''); setUsernameFeedback(null) }
    setError('')
  }
  function setField(name: keyof typeof emptyProfile) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFieldValue(name, event.target.value)
  }

  async function checkUsername() {
    if (busy || !api) return
    if (!/^[A-Za-z0-9_]{3,20}$/.test(profile.loginId)) {
      setFieldErrors((current) => ({ ...current, loginId: '아이디는 3~20자의 영문, 숫자, 밑줄만 사용할 수 있습니다.' }))
      return
    }
    setBusy(true); setError(''); setNotice(''); setCheckedUsername(''); setUsernameFeedback(null)
    try {
      const result = await api.usernameAvailability(profile.loginId)
      if (result.available) {
        setCheckedUsername(profile.loginId)
        setUsernameFeedback({ message: '사용 가능한 아이디입니다.', tone: 'success' })
      } else setUsernameFeedback({ message: '이미 사용 중인 아이디입니다.', tone: 'error' })
    } catch {
      setUsernameFeedback({ message: '아이디 중복 확인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.', tone: 'error' })
    }
    finally { setBusy(false) }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = event.currentTarget
    const focusInvalidField = (field: string) => {
      const selectors: Record<string, string> = {
        email: 'input[aria-label="이메일 아이디"]',
        phone: 'select[aria-label="휴대전화 앞자리"]',
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
    const validationErrors = allFieldErrors(profile)
    setFieldErrors(validationErrors)
    const firstInvalidField = fieldValidationOrder.find((field) => validationErrors[field])
    if (firstInvalidField) {
      focusInvalidField(firstInvalidField)
      return
    }
    if (!result.success) {
      const issue = result.error.issues[0]
      setError(issue?.message ?? '입력값을 확인해 주세요.')
      focusInvalidField(String(issue?.path[0] ?? 'loginId'))
      return
    }
    if (checkedUsername !== profile.loginId) {
      setUsernameFeedback({ message: '아이디 중복 확인을 진행해 주세요.', tone: 'error' })
      focusInvalidField('loginId')
      return
    }
    const agreements = loadSignupAgreements()
    if (!api || agreements.length === 0) { setError('약관 동의 단계부터 다시 진행해 주세요.'); return }
    setBusy(true); setError('')
    try {
      if (profileImage) {
        setProfileImageError('')
        try { await api.preflightProfileImage(profileImage) }
        catch (cause) {
          setProfileImageError(cause instanceof Error ? cause.message : '프로필 이미지 업로드 준비 상태를 확인하지 못했습니다.')
          return
        }
      }
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
    signupCoordinator.cancel(); setProfileImageError(''); setProfileImage(file)
  }
  return { profile, profilePreview, setProfilePreview, setProfileImage: selectProfileImage,
    error: error || signupCoordinator.error, setError, notice, profileImageError, setProfileImageError, usernameFeedback, fieldErrors, busy: busy || signupCoordinator.busy, complete,
    awaitingVerification: signupCoordinator.awaitingEmail === email, restartSignup: signupCoordinator.cancel,
    checkedUsername, checkUsername, setField, setFieldValue, submit }
}
