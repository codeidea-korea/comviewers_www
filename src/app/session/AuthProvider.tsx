import type { CustomerSessionRequest } from '@/api/customerSession'
import { ApiClientError } from '@/api/httpClient'
import { loginCredentialsSchema } from '@/domain/auth/loginCredentials'
import type { SessionOrganization } from './sessionStore'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSession, useSessionStore } from './SessionProvider'

export type SocialAuthProvider = 'google' | 'naver' | 'kakao'
export interface SocialSignupContext { provider: SocialAuthProvider; email: string; name: string | null }
export interface SocialSignupInput {
  name: string
  nickname: string
  phone: string
  messengerType: string
  messengerId: string
  termsAgreements: readonly { termsPolicyVersionId: number; agreed: boolean }[]
}
export interface AuthResult { response: unknown; receivedAt: number; organizationIds?: readonly string[]; organizations?: readonly SessionOrganization[] }
export interface AuthAdapter {
  /** Return the server response with its original receipt timestamp and verified active membership IDs; never invent credentials. */
  login(input: { username: string; password: string; autoLogin: boolean }): Promise<AuthResult>
  restore?(): Promise<AuthResult>
  socialLoginUrl?(provider: SocialAuthProvider): string
  socialSignupContext?(): Promise<SocialSignupContext>
  completeSocialSignup?(input: SocialSignupInput): Promise<AuthResult>
  customerSession?(request: CustomerSessionRequest): Promise<unknown>
  logout?(input: { accessToken: string | null }): Promise<void>
}
interface AuthController {
  restoring: boolean
  logoutNotice: string
  socialLoginAvailable: boolean
  login(username: string, password: string, autoLogin?: boolean): Promise<'authenticated' | 'password-change-required'>
  restoreSession(): Promise<void>
  startSocialLogin(provider: SocialAuthProvider): void
  loadSocialSignupContext(): Promise<SocialSignupContext>
  completeSocialSignup(input: SocialSignupInput): Promise<void>
  logout(): Promise<void>
}
const AuthContext = createContext<AuthController | null>(null)
const AUTHENTICATION_ERROR_CODES = new Set(['A001', 'A002', 'A003'])
function isAuthenticationFailure(error: unknown): boolean {
  return error instanceof ApiClientError
    && (error.status === 401 || (error.code ? AUTHENTICATION_ERROR_CODES.has(error.code) : false))
}
export function AuthProvider({ children, adapter }: { children: ReactNode; adapter?: AuthAdapter }) {
  const store = useSessionStore()
  const session = useSession()
  const [logoutNotice, setLogoutNotice] = useState('')
  const [restoring, setRestoring] = useState(() => Boolean(adapter?.restore && store.getSnapshot().status === 'anonymous'))
  useEffect(() => {
    if (!adapter?.restore || store.getSnapshot().status !== 'anonymous') return
    let active = true
    const expectedRevision = store.getSnapshot().revision
    void adapter.restore().then(result => {
      if (!active || store.getSnapshot().revision !== expectedRevision) return
      store.establishFromVerifiedResponse(result.response, { expectedRevision, receivedAt: result.receivedAt, organizationIds: result.organizationIds, organizations: result.organizations })
    }).catch(() => {
      // An absent, expired or unavailable refresh session leaves anonymous state unchanged.
    }).finally(() => { if (active) setRestoring(false) })
    return () => { active = false }
  }, [adapter, store])
  useEffect(() => {
    if (session.status !== 'authenticated' || !session.organizationId || session.capabilityStatus !== 'pending') return
    const request = { expectedRevision: session.revision, organizationId: session.organizationId }
    const abort = new AbortController()
    const token = store.getAccessToken()
    const loadCustomerSession = adapter?.customerSession
    const load = loadCustomerSession && token
      ? Promise.resolve().then(() => loadCustomerSession({ accessToken: token, organizationId: request.organizationId, signal: abort.signal }))
      : Promise.reject(new Error('Customer capability adapter is required'))
    void load.then(response => { if (!abort.signal.aborted) store.establishCustomerSession(response, request) })
      .catch(error => {
        if (abort.signal.aborted || store.getSnapshot().revision !== request.expectedRevision) return
        if (isAuthenticationFailure(error)) store.logout()
        else store.failCustomerSession(request)
      })
    return () => abort.abort()
  }, [adapter, session, store])
  const controller = useMemo<AuthController>(() => ({
    restoring, logoutNotice, socialLoginAvailable: Boolean(adapter?.socialLoginUrl),
    async login(username, password, autoLogin = false) {
      if (restoring) throw new Error('로그인 상태를 확인하고 있습니다. 잠시 후 다시 시도해 주세요.')
      const credentials = loginCredentialsSchema.safeParse({ username, password, autoLogin })
      if (!credentials.success) throw new Error('아이디 또는 비밀번호가 일치하지 않습니다.')
      if (!adapter) throw new Error('현재 로그인할 수 없습니다. 잠시 후 다시 시도해 주세요.')
      setLogoutNotice('')
      const expectedRevision = store.getSnapshot().revision
      let result: Awaited<ReturnType<AuthAdapter['login']>>
      try { result = await adapter.login(credentials.data) }
      catch { throw new Error('아이디 또는 비밀번호가 일치하지 않습니다.') }
      store.establishFromVerifiedResponse(result.response, { expectedRevision, receivedAt: result.receivedAt, organizationIds: result.organizationIds, organizations: result.organizations })
      const session = store.getSnapshot()
      if (session.status === 'anonymous') throw new Error('로그인하지 못했습니다.')
      return session.status
    },
    async restoreSession() {
      if (!adapter?.restore) throw new Error('로그인 상태를 확인할 수 없습니다.')
      const expectedRevision = store.getSnapshot().revision
      let result: Awaited<ReturnType<NonNullable<AuthAdapter['restore']>>>
      try { result = await adapter.restore() }
      catch { throw new Error('로그인 상태를 확인하지 못했습니다. 다시 시도해 주세요.') }
      store.establishFromVerifiedResponse(result.response, {
        expectedRevision, receivedAt: result.receivedAt, organizationIds: result.organizationIds, organizations: result.organizations,
      })
      if (store.getSnapshot().status !== 'authenticated') throw new Error('로그인하지 못했습니다.')
    },
    startSocialLogin(provider) {
      if (!adapter?.socialLoginUrl) throw new Error('현재 소셜 로그인을 이용할 수 없습니다.')
      window.location.assign(adapter.socialLoginUrl(provider))
    },
    async loadSocialSignupContext() {
      if (!adapter?.socialSignupContext) throw new Error('소셜 회원가입 정보를 확인할 수 없습니다.')
      return adapter.socialSignupContext()
    },
    async completeSocialSignup(input) {
      if (!adapter?.completeSocialSignup) throw new Error('현재 소셜 회원가입을 이용할 수 없습니다.')
      const expectedRevision = store.getSnapshot().revision
      const result = await adapter.completeSocialSignup(input)
      store.establishFromVerifiedResponse(result.response, {
        expectedRevision, receivedAt: result.receivedAt, organizationIds: result.organizationIds, organizations: result.organizations,
      })
      if (store.getSnapshot().status !== 'authenticated') throw new Error('소셜 회원가입 후 로그인하지 못했습니다.')
    },
    async logout() {
      const accessToken = store.getAccessToken()
      store.logout()
      const loggedOutRevision = store.getSnapshot().revision
      setLogoutNotice('')
      if (adapter?.logout) {
        try { await adapter.logout({ accessToken }) }
        catch { if (store.getSnapshot().revision === loggedOutRevision) setLogoutNotice('이 기기에서는 로그아웃했습니다. 서버 로그아웃을 완료하지 못했습니다.') }
      }
    },
  }), [adapter, store, logoutNotice, restoring])
  return <AuthContext.Provider value={controller}>{children}</AuthContext.Provider>
}
export function useAuthentication(): AuthController {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider is required')
  return value
}

