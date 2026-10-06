import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { passwordSchema, profileInputSchema } from '../src/routes/auth/-components/profileValidation.ts'
import { focusSignupField } from '../src/routes/auth/-components/focusSignupField.ts'
import { signupRegistrationErrorMessage } from '../src/domain/auth/signupRegistrationError.ts'

test('[source contract] signup source keeps the PDF-specified optional consent and validation copy', async () => {
  const [terms, profileImage] = await Promise.all([
    readFile(new URL('../src/routes/auth/-components/SignupTermsStep.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/ui/ProfileImagePickerControl.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(terms, /\[선택\] 광고성 정보 수신 동의\(이메일\)/)
  assert.match(profileImage, /권장 크기: 500 × 500px/)
})

test('signup password validation requires each character class and checks confirmation', () => {
  for (const value of ['abcdefgh', '12345678', '!!!!!!!!', 'Ab12345', 'Abcd1234']) assert.equal(passwordSchema.safeParse(value).success, false)
  assert.equal(passwordSchema.safeParse('Abcd123!').success, true)
  const profile = { loginId: 'tester', password: 'Abcd123!', passwordConfirm: 'Abcd123!', name: '사용자', nickname: '테스터', email: 'test@example.test', phone1: '010', phone2: '', phone3: '', messenger: '', messengerId: '' }
  assert.equal(profileInputSchema.safeParse(profile).success, true)
  const mismatch = profileInputSchema.safeParse({ ...profile, passwordConfirm: 'different' })
  assert.equal(mismatch.success, false)
  assert(mismatch.error.issues.some(issue => issue.path[0] === 'passwordConfirm'))
})

test('signup focus helper focuses and scrolls the invalid field within the submitted form', () => {
  const previous = globalThis.HTMLElement
  const calls = []
  class Element {
    focus() { calls.push('focus') }
    scrollIntoView(options) { calls.push(options) }
  }
  globalThis.HTMLElement = Element
  try {
    const field = new Element()
    const form = { elements: { namedItem: name => name === 'loginId' ? field : null }, querySelector: selector => selector.includes('이메일 아이디') ? field : null }
    focusSignupField(form, 'loginId')
    focusSignupField(form, 'email')
    focusSignupField(form, 'missing')
    assert.deepEqual(calls, ['focus', { block: 'center' }, 'focus', { block: 'center' }])
  } finally { if (previous === undefined) delete globalThis.HTMLElement; else globalThis.HTMLElement = previous }
})
test('[source contract] 회원가입 이메일은 퍼블리싱 원본의 아이디·도메인 입력·도메인 선택 구조를 유지한다', async () => {
  const authComponents = await readFile(new URL('../src/routes/auth/AuthComponentsView.tsx', import.meta.url), 'utf8')

  assert.match(authComponents, /<input aria-label="이메일 도메인"/)
  assert.match(authComponents, /<NativeSelect aria-label="이메일 도메인 선택"/)
  assert.match(authComponents, /<option value="">이메일 선택<\/option>/)
  assert.doesNotMatch(authComponents, /isDirectDomain \? <input aria-label="이메일 도메인"/)
})

test('signup registration maps only the duplicate account code to the PDF email message', () => {
  assert.equal(signupRegistrationErrorMessage('U002'), '이미 존재하는 이메일입니다.')
  assert.equal(signupRegistrationErrorMessage('U005'), undefined)
  assert.equal(signupRegistrationErrorMessage(undefined), undefined)
})
