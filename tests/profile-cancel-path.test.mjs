import assert from 'node:assert/strict'
import test from 'node:test'
import { profileCancelPath } from '../src/routes/mypage/-components/profile/profileCancelPath.ts'

test('profile cancellation preserves the originating menu and its filters', () => {
  assert.equal(profileCancelPath({ returnTo: '/mypage/favorites' }), '/mypage/favorites')
  assert.equal(profileCancelPath({ returnTo: '/mypage/orders?status=paid#results' }), '/mypage/orders?status=paid#results')
})

test('direct entry and invalid return routes use the mypage fallback', () => {
  for (const state of [null, {}, { returnTo: 1 }, { returnTo: '/mypage/profile' }, { returnTo: '/mypage/profile/' }, { returnTo: '//example.test' }, { returnTo: '/mypage/../../login' }, { returnTo: '/mypage-other' }, { returnTo: '/mypage\\..\\login' }]) {
    assert.equal(profileCancelPath(state), '/mypage')
  }
})
