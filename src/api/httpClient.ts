import { z } from 'zod'

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
  signal?: AbortSignal
  authenticated?: boolean
  customerOrganizationId?: string
  idempotencyKey?: string
}

export interface ApiServerSentEvent {
  event: string
  data: string
  id?: string
}

export interface ApiEventStreamOptions extends Omit<ApiRequestOptions, 'method' | 'body' | 'signal'> {
  onOpen?: () => void
  onEvent: (event: ApiServerSentEvent) => void
  onDisconnect?: (error?: ApiClientError) => void
}

export interface ApiClient {
  request<T>(path: string, schema: z.ZodType<T>, options?: ApiRequestOptions): Promise<T>
  download(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>): Promise<Blob>
  eventStream(path: string, options: ApiEventStreamOptions): () => void
}

export type ApiClientErrorKind = 'configuration' | 'request' | 'authentication' | 'http' | 'api' | 'contract' | 'network'

const apiCodeMessages: Record<string, string> = {
  RF001: '수동 연장 결제 증빙 확인이 필요합니다. 고객센터에 환불 상담을 요청해 주세요.',
  U005: '이미 사용 중인 닉네임입니다.',
  A016: '입력하신 정보와 일치하는 회원정보가 없습니다.',
  A017: '비밀번호 재설정 링크가 올바르지 않거나 만료되었습니다.',
}

const errorMessages: Record<ApiClientErrorKind, string> = {
  configuration: '서비스 연결 설정을 확인해 주세요.',
  request: '요청 정보를 확인해 주세요.',
  authentication: '로그인이 필요합니다.',
  http: '요청을 처리하지 못했습니다.',
  api: '요청을 처리하지 못했습니다.',
  contract: '응답 정보를 확인할 수 없습니다.',
  network: '서버에 연결하지 못했습니다.',
}

export class ApiClientError extends Error {
  readonly kind: ApiClientErrorKind
  readonly status?: number
  readonly code?: string
  readonly retryAfter?: string

  constructor(kind: ApiClientErrorKind, status?: number, details: { code?: string; retryAfter?: string } = {}) {
    super(details.code && apiCodeMessages[details.code] ? apiCodeMessages[details.code] : errorMessages[kind])
    this.name = 'ApiClientError'
    this.kind = kind
    this.status = status
    this.code = details.code
    this.retryAfter = details.retryAfter
  }
}

interface ClientOptions {
  baseUrl: string
  getAccessToken?: () => string | null
  onAuthenticationFailure?: () => void
  fetch?: typeof fetch
}

interface ApiBase { origin: string; prefix: string; relative: boolean }
const relativeParsingOrigin = 'https://same-origin.invalid'
// ApiResponse.java omits null data; ErrorCode.SUCCESS is S000.
const envelopeSchema = z.object({ code: z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/), data: z.unknown().optional() })

function parseBase(baseUrl: string): ApiBase {
  if (!baseUrl || baseUrl !== baseUrl.trim()) throw new ApiClientError('configuration')
  if (baseUrl.startsWith('/')) {
    if (!/^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]*$/.test(baseUrl)) throw new ApiClientError('configuration')
    return { origin: relativeParsingOrigin, prefix: baseUrl.replace(/\/$/, ''), relative: true }
  }
  let url: URL
  try { url = new URL(baseUrl) } catch { throw new ApiClientError('configuration') }
  if (!/^https?:\/\/[^/\\?#\s]+\/?$/.test(baseUrl) || !['http:', 'https:'].includes(url.protocol)
    || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new ApiClientError('configuration')
  }
  return { origin: url.origin, prefix: '', relative: false }
}

function requestUrl(base: ApiBase, path: string, query: ApiRequestOptions['query']): string {
  if (!path.startsWith('/api/') || /[\\?#\s\u0000-\u001f\u007f]/.test(path)) throw new ApiClientError('request')
  for (const segment of path.split('/')) {
    let decoded: string
    try { decoded = decodeURIComponent(segment) } catch { throw new ApiClientError('request') }
    if (decoded === '.' || decoded === '..' || /[/\\?#%\s\u0000-\u001f\u007f]/.test(decoded)) {
      throw new ApiClientError('request')
    }
  }
  const url = new URL(`${base.origin}${base.prefix}${path}`)
  if (url.origin !== base.origin || !url.pathname.startsWith(`${base.prefix}/api/`)) throw new ApiClientError('request')
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined) continue
    if (typeof value === 'number' && !Number.isFinite(value)) throw new ApiClientError('request')
    url.searchParams.set(key, String(value))
  }
  return base.relative ? `${url.pathname}${url.search}` : url.href
}

function requestHeaders(options: ApiRequestOptions, getAccessToken: ClientOptions['getAccessToken']): Headers {
  const headers = new Headers({ Accept: 'application/json' })
  if (options.authenticated) {
    let token: string | null
    try { token = getAccessToken?.() ?? null } catch { throw new ApiClientError('authentication') }
    if (!token || !/^[A-Za-z0-9._~+/=-]+$/.test(token)) throw new ApiClientError('authentication')
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (options.customerOrganizationId !== undefined) {
    const organizationId = options.customerOrganizationId
    if (!options.authenticated || !/^[1-9]\d{0,18}$/.test(organizationId)
      || BigInt(organizationId) > 9223372036854775807n) throw new ApiClientError('request')
    headers.set('X-Customer-Organization-Id', options.customerOrganizationId)
  }
  if (options.idempotencyKey !== undefined) {
    if (!/^[A-Za-z0-9][A-Za-z0-9:._-]{0,99}$/.test(options.idempotencyKey)) throw new ApiClientError('request')
    headers.set('Idempotency-Key', options.idempotencyKey)
  }
  return headers
}

function parseData<T>(schema: z.ZodType<T>, data: unknown): T {
  try {
    const result = schema.safeParse(data)
    if (result.success) return result.data
  } catch { /* Schema transforms must not expose input or internal errors. */ }
  throw new ApiClientError('contract')
}

function rethrowTransportError(error: unknown, signal?: AbortSignal): never {
  signal?.throwIfAborted()
  if (error instanceof Error && error.name === 'AbortError') throw error
  throw new ApiClientError('network')
}

function parseEnvelope(text: string) {
  let payload: unknown
  try { payload = JSON.parse(text) } catch { return undefined }
  const result = envelopeSchema.safeParse(payload)
  return result.success ? result.data : undefined
}

function retryAfterHeader(response: Response): string | undefined {
  const value = response.headers.get('Retry-After')?.trim()
  if (!value) return undefined
  if (/^\d{1,20}$/.test(value)) return value
  if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(value)
    && Number.isFinite(Date.parse(value))) return value
  return undefined
}

function notifyAuthenticationFailure(response: Response, code: string | undefined, callback: ClientOptions['onAuthenticationFailure']) {
  const sessionFailure = code
    ? code === 'A001' || code === 'A002' || code === 'A003'
    : response.status === 401
  if (sessionFailure) callback?.()
}

function parseServerSentEvent(block: string): ApiServerSentEvent | undefined {
  let event = 'message'
  let id: string | undefined
  const data: string[] = []
  for (const line of block.split('\n')) {
    if (!line || line.startsWith(':')) continue
    const separator = line.indexOf(':')
    const field = separator < 0 ? line : line.slice(0, separator)
    const value = separator < 0 ? '' : line.slice(separator + 1).replace(/^ /, '')
    if (field === 'event') event = value
    else if (field === 'id') id = value
    else if (field === 'data') data.push(value)
  }
  return data.length ? { event, data: data.join('\n'), id } : undefined
}

async function readResponse<T>(response: Response, schema: z.ZodType<T>, signal?: AbortSignal, onAuthenticationFailure?: ClientOptions['onAuthenticationFailure']): Promise<T> {
  signal?.throwIfAborted()
  if (response.ok && response.status === 204) return parseData(schema, undefined)
  let text: string
  try { text = await response.text() } catch (error) { return rethrowTransportError(error, signal) }
  signal?.throwIfAborted()
  const envelope = parseEnvelope(text)
  const details = { code: envelope?.code, retryAfter: retryAfterHeader(response) }
  if (!response.ok) {
    notifyAuthenticationFailure(response, envelope?.code, onAuthenticationFailure)
    throw new ApiClientError('http', response.status, details)
  }
  if (!envelope) throw new ApiClientError('contract', response.status)
  if (envelope.code !== 'S000') {
    notifyAuthenticationFailure(response, envelope.code, onAuthenticationFailure)
    throw new ApiClientError('api', response.status, details)
  }
  return parseData(schema, envelope.data)
}

async function readBlobResponse(response: Response, signal?: AbortSignal, onAuthenticationFailure?: ClientOptions['onAuthenticationFailure']): Promise<Blob> {
  signal?.throwIfAborted()
  if (!response.ok) {
    let envelope: ReturnType<typeof parseEnvelope>
    try { envelope = parseEnvelope(await response.text()) } catch (error) { return rethrowTransportError(error, signal) }
    signal?.throwIfAborted()
    notifyAuthenticationFailure(response, envelope?.code, onAuthenticationFailure)
    const details = { code: envelope?.code, retryAfter: retryAfterHeader(response) }
    throw new ApiClientError('http', response.status, details)
  }
  try {
    return await response.blob()
  } catch (error) {
    return rethrowTransportError(error, signal)
  }
}
export function createApiClient({ baseUrl, getAccessToken, onAuthenticationFailure, fetch: fetchOverride }: ClientOptions): ApiClient {
  const base = parseBase(baseUrl)
  const send = fetchOverride ?? globalThis.fetch?.bind(globalThis)
  if (!send) throw new ApiClientError('configuration')

  return {
    async request<T>(path: string, schema: z.ZodType<T>, options: ApiRequestOptions = {}): Promise<T> {
      options.signal?.throwIfAborted()
      const url = requestUrl(base, path, options.query)
      const headers = requestHeaders(options, getAccessToken)
      const method = options.method ?? 'GET'
      if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) throw new ApiClientError('request')
      let body: BodyInit | undefined
      if (options.body !== undefined) {
        if (method === 'GET') throw new ApiClientError('request')
        if (options.body instanceof FormData) {
          body = options.body
        } else {
          try { body = JSON.stringify(options.body) } catch { throw new ApiClientError('request') }
          if (body === undefined) throw new ApiClientError('request')
          headers.set('Content-Type', 'application/json')
        }
      }
      let response: Response
      try {
        response = await send(url, { method, headers, body, signal: options.signal, credentials: 'omit', cache: 'no-store', redirect: 'error' })
      } catch (error) { return rethrowTransportError(error, options.signal) }
      return readResponse(response, schema, options.signal, onAuthenticationFailure)
    },
    async download(path: string, options: Omit<ApiRequestOptions, 'method' | 'body'> = {}): Promise<Blob> {
      options.signal?.throwIfAborted()
      const url = requestUrl(base, path, options.query)
      const headers = requestHeaders(options, getAccessToken)
      let response: Response
      try {
        response = await send(url, { method: 'GET', headers, signal: options.signal, credentials: 'omit', cache: 'no-store', redirect: 'error' })
      } catch (error) { return rethrowTransportError(error, options.signal) }
      return readBlobResponse(response, options.signal, onAuthenticationFailure)
    },
    eventStream(path: string, options: ApiEventStreamOptions): () => void {
      const controller = new AbortController()
      const url = requestUrl(base, path, options.query)
      const headers = requestHeaders(options, getAccessToken)
      headers.set('Accept', 'text/event-stream')
      let closed = false
      const disconnect = (error?: ApiClientError) => {
        if (!closed) options.onDisconnect?.(error)
      }
      void (async () => {
        let response: Response
        try {
          response = await send(url, { method: 'GET', headers, signal: controller.signal, credentials: 'omit', cache: 'no-store', redirect: 'error' })
        } catch (error) {
          if (controller.signal.aborted) return
          try { rethrowTransportError(error, controller.signal) } catch (reason) { disconnect(reason instanceof ApiClientError ? reason : undefined) }
          return
        }
        if (!response.ok) {
          // A failed optional event stream must not log out a session whose REST requests still work.
          // Regular API calls remain responsible for reporting an invalid or expired bearer token.
          disconnect(new ApiClientError('http', response.status, { retryAfter: retryAfterHeader(response) }))
          return
        }
        if (!response.body || !response.headers.get('Content-Type')?.toLowerCase().startsWith('text/event-stream')) {
          disconnect(new ApiClientError('contract', response.status))
          return
        }
        options.onOpen?.()
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        try {
          while (!closed) {
            const result = await reader.read()
            if (result.done) break
            buffer += decoder.decode(result.value, { stream: true }).replace(/\r\n/g, '\n')
            let boundary = buffer.indexOf('\n\n')
            while (boundary >= 0) {
              const parsed = parseServerSentEvent(buffer.slice(0, boundary))
              buffer = buffer.slice(boundary + 2)
              if (parsed) options.onEvent(parsed)
              boundary = buffer.indexOf('\n\n')
            }
          }
        } catch (error) {
          if (!controller.signal.aborted) disconnect(error instanceof ApiClientError ? error : new ApiClientError('network'))
          return
        } finally {
          reader.releaseLock()
        }
        if (!controller.signal.aborted) disconnect()
      })()
      return () => {
        closed = true
        controller.abort()
      }
    },
  }
}
