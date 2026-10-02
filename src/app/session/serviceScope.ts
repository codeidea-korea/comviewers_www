import type { SessionState, SessionStore } from './sessionStore'

/** Credential refresh retains a scope; a different principal or capability invalidates old services. */
export function createServiceScope(store: SessionStore, session: SessionState) {
  const isCurrent = () => {
    const current = store.getSnapshot()
    return current.scopeRevision === session.scopeRevision && current.status === session.status
      && (current.status !== 'authenticated' || session.status !== 'authenticated'
        || (current.capabilityStatus === session.capabilityStatus && current.customerSession === session.customerSession))
  }
  return {
    session,
    getAccessToken: () => isCurrent() ? store.getAccessToken() : null,
    logout: () => { if (isCurrent()) store.logout() },
  }
}
