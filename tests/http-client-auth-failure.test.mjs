import assert from 'node:assert/strict'
import test from 'node:test'
import { createApiClient } from '../src/api/httpClient.ts'
import { z } from 'zod'

function unauthorized(code) {
  const body = code ? JSON.stringify({ code, message: 'failure' }) : ''
  return async () => new Response(body, {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function requestWith(code) {
  let logoutCount = 0
  const client = createApiClient({
    baseUrl: 'https://api.example.test',
    getAccessToken: () => 'qa-token',
    onAuthenticationFailure: () => { logoutCount += 1 },
    fetch: unauthorized(code),
  })
  await assert.rejects(
    client.request('/api/v1/my/password/confirm', z.unknown(), { authenticated: true }),
  )
  return logoutCount
}

test('A004 credential mismatch remains a form error without clearing the session', async () => {
  assert.equal(await requestWith('A004'), 0)
})

test('session authentication errors clear the session', async () => {
  for (const code of ['A001', 'A002', 'A003']) {
    assert.equal(await requestWith(code), 1)
  }
})

test('a code-less HTTP 401 clears the session', async () => {
  assert.equal(await requestWith(undefined), 1)
})
