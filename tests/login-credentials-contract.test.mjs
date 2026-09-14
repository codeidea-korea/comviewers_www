import assert from 'node:assert/strict'
import test from 'node:test'

import {
  LOGIN_ID_HELPER_TEXT,
  LOGIN_PASSWORD_HELPER_TEXT,
  loginCredentialsSchema,
} from '../src/domain/auth/loginCredentials.ts'

test('U05-01 로그인 아이디는 3~20자의 영문, 숫자, 밑줄만 허용한다', () => {
  for (const username of ['abc', 'A_1', 'a'.repeat(20)]) {
    assert.equal(loginCredentialsSchema.safeParse({ username, password: 'Password1!', autoLogin: false }).success, true)
  }
  for (const username of ['ab', 'a'.repeat(21), '한글id', 'id-with-dash', 'id with space', ' abc', 'abc ']) {
    assert.equal(loginCredentialsSchema.safeParse({ username, password: 'Password1!', autoLogin: false }).success, false)
  }
  assert.equal(LOGIN_ID_HELPER_TEXT, '3~20자의 영문, 숫자, 밑줄(_)만 사용할 수 있습니다.')
})

test('U05-02 로그인 비밀번호는 8~16자의 영문, 숫자와 PDF 허용 특수문자만 허용한다', () => {
  for (const password of ['12345678', 'Password1!', 'A1@#$%bc', 'a'.repeat(16)]) {
    assert.equal(loginCredentialsSchema.safeParse({ username: 'user_01', password, autoLogin: false }).success, true)
  }
  for (const password of ['1234567', 'a'.repeat(17), 'Password1^', '비밀번호123!', 'Pass word1!']) {
    assert.equal(loginCredentialsSchema.safeParse({ username: 'user_01', password, autoLogin: false }).success, false)
  }
  assert.equal(
    LOGIN_PASSWORD_HELPER_TEXT,
    '8~16자의 영문, 숫자, 특수문자(!, @, #, $, %)만 사용할 수 있습니다.',
  )
})
