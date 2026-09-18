import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test, { after } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

import { ApiClientError, createApiClient } from '../src/api/httpClient.ts'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const server = await createServer({ root: projectRoot, logLevel: 'error', server: { middlewareMode: true, hmr: false } })
after(() => server.close())
const { createOperationRequestsApi } = await server.ssrLoadModule('/src/api/operationRequests.ts')

test('U46 authenticated SSE sends bearer and organization headers and parses wake-up metadata', async () => {
  let request
  let received
  const disconnected = new Promise((resolve) => {
    const client = createApiClient({
      baseUrl: 'https://api.example.test',
      getAccessToken: () => 'token_abc',
      fetch: async (url, init) => {
        request = { url: String(url), headers: new Headers(init.headers) }
        return new Response('event: chatUpdated\ndata: {"type":"chatMessageCreated","operationRequestId":12}\n\n', {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream; charset=UTF-8' },
        })
      },
    })
    client.eventStream('/api/v1/operation-requests/12/chat/events', {
      authenticated: true,
      customerOrganizationId: '8',
      onEvent: (event) => { received = event },
      onDisconnect: resolve,
    })
  })

  await disconnected
  assert.equal(request.url, 'https://api.example.test/api/v1/operation-requests/12/chat/events')
  assert.equal(request.headers.get('Authorization'), 'Bearer token_abc')
  assert.equal(request.headers.get('X-Customer-Organization-Id'), '8')
  assert.equal(request.headers.get('Accept'), 'text/event-stream')
  assert.deepEqual(received, { event: 'chatUpdated', data: '{"type":"chatMessageCreated","operationRequestId":12}', id: undefined })
})

test('U46 reuses one physical subscription and dispatches only chat wake-up events', () => {
  let streamOptions
  let streamCount = 0
  let closeCount = 0
  const client = {
    request: async () => undefined,
    download: async () => new Blob(),
    eventStream: (_path, options) => {
      streamCount += 1
      streamOptions = options
      return () => { closeCount += 1 }
    },
  }
  const api = createOperationRequestsApi(client, '8')
  const received = []
  const stopFirst = api.subscribeChatEvents(12, (event) => received.push(`first:${event.event}`))
  const stopSecond = api.subscribeChatEvents(12, (event) => received.push(`second:${event.event}`))

  assert.equal(streamCount, 1)
  streamOptions.onEvent({ event: 'connected', data: '{"type":"connected","operationRequestId":12}' })
  streamOptions.onEvent({ event: 'chatUpdated', data: '{"type":"chatMessageCreated","operationRequestId":13}' })
  streamOptions.onEvent({ event: 'chatUpdated', data: '{"type":"chatMessageCreated"}' })
  streamOptions.onEvent({ event: 'chatUpdated', data: '{"type":"chatMessageCreated","operationRequestId":12}' })
  assert.deepEqual(received, ['first:chatUpdated', 'second:chatUpdated'])

  stopFirst()
  assert.equal(closeCount, 0)
  stopSecond()
  assert.equal(closeCount, 1)
})

test('U46 does not reconnect an unauthorized or forbidden stream', async () => {
  let streamOptions
  let streamCount = 0
  const client = {
    request: async () => undefined,
    download: async () => new Blob(),
    eventStream: (_path, options) => {
      streamCount += 1
      streamOptions = options
      return () => undefined
    },
  }
  const api = createOperationRequestsApi(client, '8')
  const stop = api.subscribeChatEvents(12, () => undefined)

  streamOptions.onDisconnect(new ApiClientError('http', 401))
  await new Promise((resolve) => setTimeout(resolve, 25))
  assert.equal(streamCount, 1)
  stop()
})

test('U46 keeps REST as the query source of truth with bounded fallback and stream invalidation', () => {
  const view = readFileSync(`${projectRoot}src/routes/mypage/-components/inquiries/InquiryPagesContent.tsx`, 'utf8')

  assert.match(view, /api\.subscribeChatEvents\(id/)
  assert.match(view, /invalidateQueries\(\{ queryKey: chatKey \}\)/)
  assert.match(view, /refetchInterval: 60_000/)
  const api = readFileSync(`${projectRoot}src/api/operationRequests.ts`, 'utf8')
  assert.match(api, /parsed\.data\.operationRequestId === operationRequestId/)
  assert.match(api, /error\.kind === 'network'/)
  assert.match(api, /\(error\.status \?\? 0\) >= 500/)
})

test('U46-02 refreshes the exact detail chat after inquiry targets are added', () => {
  const addition = readFileSync(`${projectRoot}src/routes/mypage/-components/InquiryTargetAddition.tsx`, 'utf8')

  assert.match(addition, /const chatKey = \['operation-requests', api\.organizationId, 'chat', requestId\] as const/)
  assert.match(addition, /invalidateQueries\(\{ queryKey: chatKey, exact: true \}\)/)
})
