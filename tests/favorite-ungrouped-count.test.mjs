import assert from 'node:assert/strict'
import test from 'node:test'
import { favoriteUngroupedCountQuery } from '../src/routes/mypage/-components/favoritesAccess.ts'

test('즐겨찾기 등록 팝업은 미분류 수량만 조회한다', () => {
  assert.deepEqual(favoriteUngroupedCountQuery, {
    favorite: true,
    ungrouped: true,
    page: 0,
    size: 1,
  })
  assert.equal('groupId' in favoriteUngroupedCountQuery, false)
})
