import assert from 'node:assert/strict'
import test from 'node:test'
import { extensionBlocked } from '../src/routes/mypage/-components/rcpcPresentation.ts'

const available = {
  rentalStatus: 'active',
  serverStatus: 'running',
  usageStatus: 'using',
}

test('이용 중 RCPC만 연장 선택을 허용한다', () => {
  assert.equal(extensionBlocked(available), false)
  assert.equal(extensionBlocked({ ...available, usageStatus: 'ended' }), true)
  assert.equal(extensionBlocked({ ...available, serverStatus: 'ended' }), true)
  assert.equal(extensionBlocked({ ...available, serverStatus: 'format_waiting' }), true)
  assert.equal(extensionBlocked({ ...available, rentalStatus: 'expired' }), true)
})
