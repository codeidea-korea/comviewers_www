import assert from 'node:assert/strict'
import test from 'node:test'

import { profileEmailChange } from '../src/routes/mypage/-components/http/profileEmailChange.ts'

test('blank optional email does not block unrelated profile changes', () => {
  assert.deepEqual(profileEmailChange(null, '', ''), {
    nextEmail: '',
    wantsEmailChange: false,
  })
  assert.deepEqual(profileEmailChange('', '', ''), {
    nextEmail: '',
    wantsEmailChange: false,
  })
})

test('clearing or partially editing an existing email remains a requested change', () => {
  assert.equal(profileEmailChange('owner@example.com', '', '').wantsEmailChange, true)
  assert.deepEqual(profileEmailChange(null, 'owner', ''), {
    nextEmail: 'owner@',
    wantsEmailChange: true,
  })
  assert.deepEqual(profileEmailChange(null, '', 'example.com'), {
    nextEmail: '@example.com',
    wantsEmailChange: true,
  })
})

test('an unchanged complete email does not request verification', () => {
  assert.deepEqual(profileEmailChange('owner@example.com', 'owner', 'example.com'), {
    nextEmail: 'owner@example.com',
    wantsEmailChange: false,
  })
})
