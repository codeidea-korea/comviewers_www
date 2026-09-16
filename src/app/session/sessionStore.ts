import { customerSessionSchema, type CustomerSession } from '@/api/customerSession'
import { z } from 'zod'

const idSchema = z.union([z.string(), z.number().int().positive().safe()])
  .transform(String).refine(value => /^[1-9]\d{0,18}$/.test(value) && BigInt(value) <= 9223372036854775807n)
const roleSchema = z.enum(['USER', 'ADMIN', 'C_MANAGER'])
const loginSchema = z.object({
  userId: idSchema, role: roleSchema, status: z.literal('ACTIVE'),
  passwordChangeRequired: z.boolean(), accessToken: z.string().optional().nullable(),
  tokenType: z.string().optional().nullable(), expiresInMs: z.number().int().nonnegative().safe(),
})
const organizationIdsSchema = z.array(idSchema).refine(ids => new Set(ids).size === ids.length)
export const sessionOrganizationSchema = z.object({ id: idSchema, name: z.string().min(1), role: z.enum(['owner', 'c_manager']), organizationNo: z.string().optional() })
const organizationsSchema = z.array(sessionOrganizationSchema).refine(values => new Set(values.map(value => value.id)).size === values.length)
export type SessionOrganization = Readonly<z.infer<typeof sessionOrganizationSchema>>
export type SessionRole = z.infer<typeof roleSchema>
export type SessionState =
  | { readonly status: 'anonymous'; readonly revision: number }
  | { readonly status: 'password-change-required'; readonly revision: number; readonly userId: string; readonly role: SessionRole }
  | { readonly status: 'authenticated'; readonly revision: number; readonly userId: string; readonly role: SessionRole;
      readonly customerSession: CustomerSession | null; readonly capabilityStatus: 'unselected' | 'pending' | 'ready' | 'error'; readonly expiresAt: number; readonly organizations: readonly SessionOrganization[]; readonly organizationIds: readonly string[]; readonly organizationId: string | null }
export interface SessionStore {
  getSnapshot(): SessionState
  subscribe(listener: () => void): () => void
  getAccessToken(): string | null
  logout(): void
  selectOrganization(id: string | null): void
  retryCustomerSession(): void
  establishCustomerSession(response: unknown, context: { expectedRevision: number; organizationId: string }): void
  failCustomerSession(context: { expectedRevision: number; organizationId: string }): void
  /** Pass verified server data; capture expectedRevision before starting the login request. Stale responses never alter the current session. */
  establishFromVerifiedResponse(response: unknown, context: { expectedRevision: number; receivedAt: number; organizationIds?: readonly string[]; organizations?: readonly SessionOrganization[] }): void
}

export function createSessionStore(): SessionStore {
  let state: SessionState = Object.freeze({ status: 'anonymous', revision: 0 })
  let accessToken: string | null = null
  const listeners = new Set<() => void>()
  let timer: ReturnType<typeof setTimeout> | undefined
  const scheduleExpiry = () => {
    clearTimeout(timer)
    if (state.status === 'authenticated' && listeners.size > 0) {
      timer = setTimeout(() => {
        if (state.status === 'authenticated' && Date.now() >= state.expiresAt) logout()
        else scheduleExpiry()
      }, Math.max(0, Math.min(state.expiresAt - Date.now(), 2_147_483_647)))
    }
  }
  const publish = (next: SessionState, token: string | null) => {
    accessToken = token
    state = Object.freeze(next)
    scheduleExpiry()
    listeners.forEach(listener => listener())
  }
  const logout = () => publish({ status: 'anonymous', revision: state.revision + 1 }, null)
  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener)
      scheduleExpiry()
      return () => { listeners.delete(listener); scheduleExpiry() }
    },
    getAccessToken() {
      return state.status === 'authenticated' && Date.now() < state.expiresAt ? accessToken : null
    },
    logout,
    selectOrganization(id) {
      if (state.status !== 'authenticated' || Date.now() >= state.expiresAt) {
        logout()
        throw new Error('로그인이 필요합니다.')
      }
      if (id !== null && !state.organizationIds.includes(id)) throw new Error('조직을 확인해 주세요.')
      if (id !== state.organizationId) publish({ ...state, organizationId: id, customerSession: null, capabilityStatus: id === null ? 'unselected' : 'pending', revision: state.revision + 1 }, accessToken)
    },
    retryCustomerSession() {
      if (state.status === 'authenticated' && state.organizationId && Date.now() < state.expiresAt) publish({ ...state, customerSession: null, capabilityStatus: 'pending', revision: state.revision + 1 }, accessToken)
    },
    establishCustomerSession(response, { expectedRevision, organizationId }) {
      if (state.status !== 'authenticated' || state.revision !== expectedRevision || state.organizationId !== organizationId || Date.now() >= state.expiresAt) return
      const parsed = customerSessionSchema.safeParse(response)
      if (!parsed.success || parsed.data.customerOrganizationId !== organizationId) {
        publish({ ...state, customerSession: null, capabilityStatus: 'error', revision: state.revision + 1 }, accessToken)
        return
      }
      publish({ ...state, customerSession: Object.freeze(parsed.data), capabilityStatus: 'ready', revision: state.revision + 1 }, accessToken)
    },
    failCustomerSession({ expectedRevision, organizationId }) {
      if (state.status !== 'authenticated' || state.revision !== expectedRevision || state.organizationId !== organizationId) return
      publish({ ...state, customerSession: null, capabilityStatus: 'error', revision: state.revision + 1 }, accessToken)
    },
    establishFromVerifiedResponse(response, { expectedRevision, receivedAt, organizationIds, organizations }) {
      if (expectedRevision !== state.revision) throw new Error('이전 로그인 요청입니다. 다시 시도해 주세요.')
      const result = loginSchema.safeParse(response)
      const details = organizationsSchema.safeParse(organizations ?? [])
      const memberships = organizationIdsSchema.safeParse(organizationIds ?? (details.success ? details.data.map(item => item.id) : []))
      const consistent = organizations === undefined || (details.success && memberships.success && details.data.length === memberships.data.length && details.data.every(item => memberships.data.includes(item.id)))
      if (!result.success || !memberships.success || !details.success || !consistent || !Number.isSafeInteger(receivedAt) || receivedAt < 0 || receivedAt > Date.now()) { logout(); throw new Error('로그인 응답을 확인할 수 없습니다.') }
      const data = result.data
      const identity = { userId: data.userId, role: data.role, revision: state.revision + 1 }
      if (data.passwordChangeRequired) {
        publish({ ...identity, status: 'password-change-required' }, null)
        return
      }
      const expiresAt = receivedAt + data.expiresInMs
      if (data.tokenType !== 'Bearer' || !data.accessToken || !/^[A-Za-z0-9._~+/=-]+$/.test(data.accessToken)
        || data.expiresInMs <= 0 || expiresAt <= Date.now() || !Number.isSafeInteger(expiresAt)) {
        logout(); throw new Error('로그인 응답을 확인할 수 없습니다.')
      }
      const selectedOrganizationId = memberships.data.length === 1 ? memberships.data[0] : null
      publish({ ...identity, status: 'authenticated', expiresAt, customerSession: null, capabilityStatus: selectedOrganizationId ? 'pending' : 'unselected',
        organizations: Object.freeze(details.data.map(item => Object.freeze({ ...item }))),
        organizationIds: Object.freeze([...memberships.data]), organizationId: selectedOrganizationId }, data.accessToken)
    },
  }
}


