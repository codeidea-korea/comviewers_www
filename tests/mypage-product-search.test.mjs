import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveExactProductNo } from '../src/routes/mypage/-components/productSearchResolver.ts'

test('품번 Enter 검색은 debounce 값 대신 현재 입력으로 즉시 조회한다', async () => {
  const queries = []
  const match = await resolveExactProductNo('  QA-U25-CMANAGER  ', async (productNo, page, size) => {
    queries.push([productNo, page, size])
    return { items: [{ productNo: 'qa-u25-cmanager' }], totalPages: 1 }
  })

  assert.deepEqual(queries, [['QA-U25-CMANAGER', 0, 100]])
  assert.equal(match, 'qa-u25-cmanager')
})

test('정확한 품번이 첫 페이지 밖에 있어도 모든 검색 페이지에서 찾는다', async () => {
  const pages = []
  const match = await resolveExactProductNo('QA-EXACT', async (_productNo, page, size) => {
    pages.push([page, size])
    return page === 0
      ? { items: Array.from({ length: 100 }, (_, index) => ({ productNo: `QA-EXACT-${index}` })), totalPages: 2 }
      : { items: [{ productNo: 'QA-EXACT' }], totalPages: 2 }
  })

  assert.deepEqual(pages, [[0, 100], [1, 100]])
  assert.equal(match, 'QA-EXACT')
})

test('빈 품번은 API를 호출하지 않는다', async () => {
  let called = false
  const match = await resolveExactProductNo('   ', async () => {
    called = true
    return { items: [], totalPages: 0 }
  })

  assert.equal(called, false)
  assert.equal(match, null)
})
