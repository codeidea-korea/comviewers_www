import assert from 'node:assert/strict'
import test from 'node:test'

import { toRelativeHref } from '../src/lib/navigation.ts'
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

test('고객센터 상세 목록 링크는 검색 조건이 붙은 목록 경로를 점 경로로 축약하지 않는다', () => {
  assert.equal(
    toRelativeHref('/support?keyword=QA-U57%20%EA%B3%A0%EC%A0%95%20%EA%B3%B5%EC%A7%80&sort=views', '/support/123', '/'),
    '/support?keyword=QA-U57%20%EA%B3%A0%EC%A0%95%20%EA%B3%B5%EC%A7%80&sort=views',
  )
})
