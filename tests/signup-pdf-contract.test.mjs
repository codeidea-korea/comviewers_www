import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { signupRegistrationErrorMessage } from '../src/domain/auth/signupRegistrationError.ts'

test('signup source keeps the PDF-specified optional consent and validation copy', async () => {
  const [terms, profileImage, profileForm] = await Promise.all([
    readFile(new URL('../src/routes/auth/-components/SignupTermsStep.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/ui/ProfileImagePickerControl.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/routes/auth/-components/hooks/useProfileForm.ts', import.meta.url), 'utf8'),
  ])

  assert.match(terms, /\[선택\] 광고성 정보 수신 동의\(이메일\)/)
  assert.match(profileImage, /권장 크기: 500 × 500px/)
  assert.match(profileForm, /비밀번호는 8~16자의 영문, 숫자 및 허용된 특수문자를 사용해 주세요\./)
})

test('U08-05 회원가입 오류는 첫 유효성 오류 행으로 이동한다', async () => {
  const [profileStep, profileForm] = await Promise.all([
    readFile(new URL('../src/routes/auth/-components/SignupProfileStep.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/routes/auth/-components/hooks/useProfileForm.ts', import.meta.url), 'utf8'),
  ])

  for (const field of ['loginId', 'password', 'passwordConfirm', 'name', 'nickname']) {
    assert.match(profileStep, new RegExp(`name=["']${field}["']`))
  }
  assert.match(profileForm, /focusInvalidField\(String\(issue\?\.path\[0\]/)
  assert.match(profileForm, /target\.focus\(\)/)
  assert.match(profileForm, /target\.scrollIntoView\(\{ block: 'center' \}\)/)
  assert.match(profileForm, /focusInvalidField\('loginId'\)/)
})

test('회원가입 이메일은 퍼블리싱 원본의 아이디·도메인 입력·도메인 선택 구조를 유지한다', async () => {
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
