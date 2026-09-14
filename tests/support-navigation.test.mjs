import assert from 'node:assert/strict'
import test from 'node:test'

import { supportReturnTo } from '../src/routes/support/supportNavigation.ts'

test('고객센터 목록 복귀는 정확한 목록 경로와 검색 조건만 허용한다', () => {
  assert.equal(supportReturnTo('/support'), '/support')
  assert.equal(supportReturnTo('/support?keyword=%EA%B3%B5%EC%A7%80&sort=views'), '/support?keyword=%EA%B3%B5%EC%A7%80&sort=views')
  assert.equal(supportReturnTo('/support/123?sort=views'), '/support')
  assert.equal(supportReturnTo('/supportevil?sort=views'), '/support')
  assert.equal(supportReturnTo('//malicious.example/support'), '/support')
  assert.equal(supportReturnTo('https://malicious.example/support'), '/support')
  assert.equal(supportReturnTo('/support?sort=views#hidden'), '/support')
})
