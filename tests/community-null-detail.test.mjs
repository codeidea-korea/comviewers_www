import assert from 'node:assert/strict'
import test from 'node:test'

import { createCommunityApi } from '../src/api/community.ts'
import { createApiClient } from '../src/api/httpClient.ts'

function nullDetailClient(omitData = false) {
  const envelope = { code: 'S000', message: 'success' }
  if (!omitData) envelope.data = null
  return createApiClient({
    baseUrl: 'https://api.example.test',
    fetch: async () => new Response(JSON.stringify(envelope), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  })
}

test('U54 community detail accepts the API not-found envelope as an empty detail', async () => {
  const api = createCommunityApi(nullDetailClient(), false)

  assert.equal(await api.post(404), null)
})

test('U57 support detail accepts the API not-found envelope as an empty detail', async () => {
  const api = createCommunityApi(nullDetailClient(), false)

  assert.equal(await api.article(404), null)
})

test('a serialized null detail omitted from the success envelope is also empty', async () => {
  const api = createCommunityApi(nullDetailClient(true), false)

  assert.equal(await api.post(404), null)
  assert.equal(await api.article(404), null)
})

test('U55 comment requests reject content longer than the PDF 1,000-character limit', async () => {
  const api = createCommunityApi(nullDetailClient(), true)
  const tooLongComment = '가'.repeat(1001)

  assert.throws(() => api.createComment(1, tooLongComment))
  assert.throws(() => api.updateComment(1, tooLongComment))
})
