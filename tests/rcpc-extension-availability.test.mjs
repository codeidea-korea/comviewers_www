import assert from 'node:assert/strict'
import test from 'node:test'
import { extensionBlocked } from '../src/routes/mypage/-components/rcpcPresentation.ts'

const available = {
  rentalStatus: 'active',
  serverStatus: 'running',
  usageStatus: 'using',
}

test('이용 중이거나 연장대기 중인 RCPC는 연장 선택을 허용하고 종료된 계약은 차단한다', () => {
  assert.equal(extensionBlocked(available), false)
  assert.equal(extensionBlocked({ ...available, usageStatus: 'extension_waiting', serverStatus: 'extension_waiting' }), false)
  assert.equal(extensionBlocked({ ...available, usageStatus: 'ended' }), true)
  assert.equal(extensionBlocked({ ...available, serverStatus: 'ended' }), true)
  assert.equal(extensionBlocked({ ...available, serverStatus: 'format_waiting' }), true)
  assert.equal(extensionBlocked({ ...available, rentalStatus: 'terminated' }), true)
  assert.equal(extensionBlocked({ ...available, rentalStatus: 'refunded' }), true)
})
