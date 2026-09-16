import assert from 'node:assert/strict'
import test from 'node:test'

import { LOGIN_USERNAME_MAX_LENGTH, loginCredentialsSchema, restoreRememberedLoginId } from '../src/domain/auth/loginCredentials.ts'

test('U05-01 로그인 아이디는 기존 계정 형식을 서버로 전달하되 빈 값과 과도한 길이는 차단한다', () => {
  for (const username of ['ab', '한글id', 'id-with-dash', 'id with space', 'legacy.account']) {
    assert.equal(loginCredentialsSchema.safeParse({ username, password: 'legacy password', autoLogin: false }).success, true)
  }
  for (const username of ['', '   ', 'a'.repeat(51)]) {
    assert.equal(loginCredentialsSchema.safeParse({ username, password: 'legacy password', autoLogin: false }).success, false)
  }
})

test('U05-05 아이디 저장 복원 한도는 로그인 계약과 같아서 50자 아이디를 보존한다', () => {
  const rememberedId = 'a'.repeat(LOGIN_USERNAME_MAX_LENGTH)
  assert.equal(restoreRememberedLoginId(rememberedId), rememberedId)
  assert.equal(restoreRememberedLoginId('a'.repeat(LOGIN_USERNAME_MAX_LENGTH + 1)), rememberedId)
  assert.equal(restoreRememberedLoginId(null), '')
})

test('U05-02 로그인 비밀번호는 기존 계정 형식을 서버로 전달하되 빈 값과 과도한 길이는 차단한다', () => {
  for (const password of ['1234567', 'Password1^', '비밀번호123!', 'Pass word1!', 'a'.repeat(100)]) {
    assert.equal(loginCredentialsSchema.safeParse({ username: 'legacy.account', password, autoLogin: false }).success, true)
  }
  for (const password of ['', '   ', 'a'.repeat(101)]) {
    assert.equal(loginCredentialsSchema.safeParse({ username: 'legacy.account', password, autoLogin: false }).success, false)
  }
})
