import { z } from 'zod'
import type { AuthAdapter, AuthResult, SocialSignupInput } from '@/app/session/AuthProvider'
import { loginCredentialsSchema } from '@/domain/auth/loginCredentials'
import { ApiClientError, createApiClient } from './httpClient'
import { createCustomerSessionLoader } from './customerSession'

const idSchema = z.union([z.string(), z.number().int().positive().safe()]).transform(String)
  .refine((id) => /^[1-9]\d{0,18}$/.test(id) && BigInt(id) <= 9223372036854775807n)
const stringIdSchema = z.string()
  .refine((id) => /^[1-9]\d{0,18}$/.test(id) && BigInt(id) <= 9223372036854775807n)
const tokenSchema = z.string().min(1).regex(/^[A-Za-z0-9._~+/=-]+$/)
const loginResponseSchema = z.object({
  userId: idSchema, role: z.enum(['USER', 'C_MANAGER']), status: z.literal('ACTIVE'), passwordChangeRequired: z.boolean(),
  accessToken: tokenSchema.nullish(), tokenType: z.literal('Bearer').nullish(), expiresInMs: z.number().int().nonnegative().safe(),
}).refine((value) => value.passwordChangeRequired || Boolean(value.accessToken && value.tokenType === 'Bearer' && value.expiresInMs > 0))
const organizationsSchema = z.array(z.object({ id: stringIdSchema, name: z.string().min(1), role: z.enum(['owner', 'c_manager']), organizationNo: z.string().optional() }))
  .refine((values) => new Set(values.map((value) => value.id)).size === values.length)
const socialSignupContextSchema = z.object({ provider: z.enum(['google', 'naver', 'kakao']), email: z.email().max(100), name: z.string().max(100).nullable() })
const socialProviderSchema = z.enum(['google', 'naver', 'kakao'])
const socialSignupInputSchema = z.object({
  name: z.string().trim().min(1).max(18),
  nickname: z.string().trim().regex(/^[가-힣A-Za-z0-9]{1,18}$/).or(z.literal('')),
  phone: z.string().regex(/^[0-9-]{0,30}$/), messengerType: z.string().max(50), messengerId: z.string().max(100),
  termsAgreements: z.array(z.object({ termsPolicyVersionId: z.number().int().positive().safe(), agreed: z.boolean() })).min(1).max(20),
})
const envelopeSchema = z.object({ code: z.string(), data: z.unknown().optional() })

/** Auth endpoints carry the HttpOnly refresh cookie. Other API requests retain bearer-only transport. */
export function createAuthAdapter(baseUrl: string): AuthAdapter {
  // Validate using the same base URL rules as the commerce client before constructing auth URLs.
  createApiClient({ baseUrl })
  const prefix = baseUrl.replace(/\/$/, '')
  async function request(method: 'GET' | 'POST', path: string, body?: unknown, accessToken?: string | null) {
    const headers = new Headers({ Accept: 'application/json' })
    if (body !== undefined) headers.set('Content-Type', 'application/json')
    if (accessToken) headers.set('Authorization', `Bearer ${tokenSchema.parse(accessToken)}`)
    let response: Response
    try { response = await fetch(`${prefix}${path}`, { method, credentials: 'include', cache: 'no-store', redirect: 'error', headers, body: body === undefined ? undefined : JSON.stringify(body) }) }
    catch { throw new ApiClientError('network') }
    const receivedAt = Date.now()
    let payload: unknown
    try { payload = await response.json() } catch { throw new ApiClientError('contract', response.status) }
    const envelope = envelopeSchema.safeParse(payload)
    if (!response.ok) throw new ApiClientError('http', response.status)
    if (!envelope.success) throw new ApiClientError('contract', response.status)
    if (envelope.data.code !== 'S000') throw new ApiClientError('api', response.status)
    return { data: envelope.data.data, receivedAt }
  }
  const post = (path: string, body?: unknown, accessToken?: string | null) => request('POST', path, body, accessToken)
  let restoreInFlight: Promise<AuthResult> | null = null
  async function establishResult(result: { data: unknown; receivedAt: number }, allowPasswordChange: boolean, expectedRole?: 'USER' | 'C_MANAGER'): Promise<AuthResult> {
      const login = loginResponseSchema.safeParse(result.data)
      if (!login.success || (expectedRole && login.data.role !== expectedRole) || (!allowPasswordChange && login.data.passwordChangeRequired)) {
        // A valid cookie may already have been issued for an account this application cannot accept.
        try { await post('/api/auth/logout') } catch { throw new ApiClientError('network') }
        throw new ApiClientError('contract')
      }
      if (login.data.passwordChangeRequired) return { response: login.data, receivedAt: result.receivedAt, organizationIds: [] }
      const client = createApiClient({ baseUrl, getAccessToken: () => login.data.accessToken ?? null })
      try {
        const organizations = await client.request('/api/v1/my/organizations', organizationsSchema, { authenticated: true })
        return { response: login.data, receivedAt: result.receivedAt, organizations, organizationIds: organizations.map((organization) => organization.id) }
      } catch (error) {
        try { await post('/api/auth/logout') } catch { throw new ApiClientError('network') }
        throw error
      }
  }
  return {
    customerSession: createCustomerSessionLoader(baseUrl),
    async login(input) {
      const parsed = loginCredentialsSchema.safeParse(input)
      if (!parsed.success) throw new ApiClientError('request')
      if (restoreInFlight) await restoreInFlight.catch(() => undefined)
      return establishResult(await post('/api/auth/login', parsed.data), true, 'USER')
    },
    async managerLogin(organizationCode, input) {
      const parsed = loginCredentialsSchema.safeParse({ ...input, autoLogin: false })
      if (!parsed.success || !/^ORG_[A-Za-z0-9_]{1,46}$/i.test(organizationCode)) throw new ApiClientError('request')
      if (restoreInFlight) await restoreInFlight.catch(() => undefined)
      const result = await establishResult(await post(`/api/auth/manager/${encodeURIComponent(organizationCode)}/login`, { username: parsed.data.username, password: parsed.data.password }), false, 'C_MANAGER')
      if (!result.organizations?.some(organization => organization.role === 'c_manager' && organization.organizationNo?.toLowerCase() === organizationCode.toLowerCase())) {
        try { await post('/api/auth/logout') } catch { throw new ApiClientError('network') }
        throw new ApiClientError('contract')
      }
      return result
    },
    restore() {
      if (restoreInFlight) return restoreInFlight
      const operation = post('/api/auth/refresh').then(result => establishResult(result, false))
      restoreInFlight = operation
      const clear = () => { if (restoreInFlight === operation) restoreInFlight = null }
      void operation.then(clear, clear)
      return operation
    },
    socialLoginUrl(provider) {
      return `${prefix}/api/auth/social/${provider}`
    },
    async socialSignupContext() {
      const result = await request('GET', '/api/auth/social/signup-context')
      const context = socialSignupContextSchema.safeParse(result.data)
      if (!context.success) throw new ApiClientError('contract')
      return context.data
    },
    async completeSocialSignup(input: SocialSignupInput) {
      const parsed = socialSignupInputSchema.safeParse(input)
      if (!parsed.success) throw new ApiClientError('request')
      return establishResult(await post('/api/auth/social/signup', parsed.data), false)
    },
    async linkedSocialProviders(accessToken) {
      const result = await request('GET', '/api/v1/my/social-identities', undefined, accessToken)
      const parsed = z.array(socialProviderSchema).safeParse(result.data)
      if (!parsed.success) throw new ApiClientError('contract')
      return parsed.data
    },
    async startSocialLink(provider, accessToken) {
      const parsed = socialProviderSchema.parse(provider)
      const result = await post(`/api/auth/social/link/${parsed}/authorization`, { confirmed: true }, accessToken)
      const data = z.object({ authorizationUrl: z.url() }).safeParse(result.data)
      if (!data.success) throw new ApiClientError('contract')
      const destination = new URL(data.data.authorizationUrl)
      if (destination.protocol !== 'https:' || !['accounts.google.com', 'kauth.kakao.com', 'nid.naver.com'].includes(destination.hostname)) {
        throw new ApiClientError('contract')
      }
      return destination.href
    },
    async logout({ accessToken }) {
      // Let an in-flight rotation settle before clearing its cookie.
      if (restoreInFlight) await restoreInFlight.catch(() => undefined)
      await post('/api/auth/logout', undefined, accessToken)
    },
  }
}
