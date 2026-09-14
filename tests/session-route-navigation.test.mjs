import assert from 'node:assert/strict'
import test from 'node:test'

import { isMyPageOnlyPathAllowed, loginPathWithReturnTo } from '../src/app/session/sessionRouteNavigation.ts'

test('로그인 필요 팝업은 현재 보호 경로를 returnTo로 보존한다', () => {
  assert.equal(
    loginPathWithReturnTo({ pathname: '/checkout', search: '?cartItemId=33', hash: '#payment' }),
    '/login?returnTo=%2Fcheckout%3FcartItemId%3D33%23payment',
  )
})

test('C매니저는 PDF의 마이페이지 대시보드와 허용된 하위 메뉴에 접근한다', () => {
  assert.equal(isMyPageOnlyPathAllowed('/mypage'), true)
  assert.equal(isMyPageOnlyPathAllowed('/mypage/rcpc'), true)
  assert.equal(isMyPageOnlyPathAllowed('/mypage/favorites'), true)
  assert.equal(isMyPageOnlyPathAllowed('/mypage/inquiries/12'), true)
  assert.equal(isMyPageOnlyPathAllowed('/mypage/orders'), false)
})
