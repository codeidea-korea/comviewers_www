import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react'
import type { SessionRole, SessionState, SessionStore } from './sessionStore'

const SessionContext = createContext<SessionStore | null>(null)
export function SessionProvider({ store, children }: { store: SessionStore; children: ReactNode }) {
  return <SessionContext.Provider value={store}>{children}</SessionContext.Provider>
}
export function useSessionStore(): SessionStore {
  const store = useContext(SessionContext)
  if (!store) throw new Error('SessionProvider is required')
  return store
}
export function useSession(): SessionState {
  const store = useSessionStore()
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}
/** UI guard only; server authorization remains mandatory. Apply when live routes are enabled. */
export function RequireSession({ children, fallback, roles, requireOrganization = false }: {
  children: ReactNode; fallback: ReactNode; roles?: readonly SessionRole[]; requireOrganization?: boolean
}) {
  const session = useSession()
  const allowed = session.status === 'authenticated' && Date.now() < session.expiresAt
    && (!roles || roles.includes(session.role)) && (!requireOrganization || (session.organizationId !== null && session.capabilityStatus === 'ready' && session.customerSession !== null))
  return allowed ? children : fallback
}
