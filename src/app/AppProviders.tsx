import { AuthProvider, type AuthAdapter } from './session/AuthProvider'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServiceProvider, type Services } from './ServiceProvider'
import { createSessionStore, type SessionState, type SessionStore } from './session/sessionStore'
import { SessionProvider, useSession, useSessionStore } from './session/SessionProvider'
import { PublicCatalogQueryProvider } from './PublicCatalogQueryProvider'
import { createServiceScope } from './session/serviceScope'

export interface ServiceScope {
  readonly session: SessionState
  readonly getAccessToken: () => string | null
  readonly logout: () => void
}
export type ServiceFactory = (scope: ServiceScope) => Services
export interface AppProvidersProps {
  children: ReactNode
  session?: SessionStore
  authAdapter?: AuthAdapter
  /** Return new repository instances per scope; never reuse mutable services between sessions. */
  createServices: ServiceFactory
}
function ScopedProviders({ children, createServices, snapshot, store }: {
  children: ReactNode; createServices: ServiceFactory; snapshot: SessionState; store: SessionStore
}) {
  const capabilityStatus = snapshot.status === 'authenticated' ? snapshot.capabilityStatus : null
  const customerSession = snapshot.status === 'authenticated' ? snapshot.customerSession : null
  // Read a new service snapshot only when authority changes, not when credentials rotate.
  const scope = useMemo(() => {
    const client = new QueryClient({ defaultOptions: {
      queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false }, mutations: { retry: false },
    } })
    const services = createServices(createServiceScope(store, store.getSnapshot()))
    return { client, services }
    // Authority changes intentionally invalidate this snapshot; credential revision does not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createServices, store, capabilityStatus, customerSession])
  useEffect(() => () => {
    void scope.client.cancelQueries()
    scope.client.clear()
  }, [scope])
  return <QueryClientProvider client={scope.client}>
    <ServiceProvider services={scope.services}>{children}</ServiceProvider>
  </QueryClientProvider>
}
function SessionScope({ children, createServices }: { children: ReactNode; createServices: ServiceFactory }) {
  const snapshot = useSession()
  const store = useSessionStore()
  return <ScopedProviders key={snapshot.scopeRevision} snapshot={snapshot} store={store} createServices={createServices}>
    {children}
  </ScopedProviders>
}
export function AppProviders({ children, session, authAdapter, createServices }: AppProvidersProps) {
  const [store] = useState(() => session ?? createSessionStore())
  return <PublicCatalogQueryProvider>
    <SessionProvider store={store}>
      <AuthProvider adapter={authAdapter}>
        <SessionScope createServices={createServices}>{children}</SessionScope>
      </AuthProvider>
    </SessionProvider>
  </PublicCatalogQueryProvider>
}

