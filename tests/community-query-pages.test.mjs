import assert from 'node:assert/strict'
import test from 'node:test'
import { createCommunityApi } from '../src/api/community.ts'

test('댓글 페이지를 합치면 순서·내용·작성자·전체 건수가 유지되고 취소 신호가 전달된다', async () => {
  const signal = new AbortController().signal
  const rows = Array.from({ length: 113 }, (_, i) => ({ id: i + 1, parentCommentId: i === 1 ? 1 : null,
    author: `작성자${i}`, mine: i === 0, content: `내용${i}`, status: 'published',
    createdAt: '2026-11-24T10:00:00', updatedAt: '2026-11-24T10:00:00' }))
  const calls = []
  const api = createCommunityApi({ request: async (path, schema, options) => {
    calls.push(path)
    assert.equal(options.signal, signal)
    assert.equal(path, '/api/v1/community/posts/7/comments/page')
    assert.equal(options.query.size, 50)
    const offset = options.query.afterId ?? 0
    const items = rows.slice(offset, offset + 50)
    return schema.parse({ items, totalCount: rows.length, nextCursor: offset + 50 < rows.length ? items.at(-1).id : null })
  } }, true)
  const loaded = []
  let cursor = null
  do {
    const page = await api.commentPage(7, cursor, signal)
    assert.equal(page.totalCount, 113)
    loaded.push(...page.items)
    cursor = page.nextCursor
  } while (cursor !== null)
  assert.deepEqual(loaded, rows)
  assert.equal(calls.length, 3)
})

test('게시글 상세는 댓글 전체 조회 없이 요청하고 취소 신호를 유지한다', async () => {
  const signal = new AbortController().signal
  const api = createCommunityApi({ request: async (path, schema, options) => {
    assert.equal(path, '/api/v1/community/posts/7')
    assert.deepEqual(options.query, { includeComments: false })
    assert.equal(options.signal, signal)
    return schema.parse(null)
  } }, false)
  assert.equal(await api.post(7, signal), null)
})
