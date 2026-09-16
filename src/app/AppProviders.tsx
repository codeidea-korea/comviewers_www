import { AuthProvider, type AuthAdapter } from './session/AuthProvider'
import { useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServiceProvider, type Services } from './ServiceProvider'
import { createSessionStore, type SessionState, type SessionStore } from './session/sessionStore'
import { SessionProvider, useSession, useSessionStore } from './session/SessionProvider'

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
  const [scope] = useState(() => {
    const client = new QueryClient({ defaultOptions: {
      queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false }, mutations: { retry: false },
    } })
    const services = createServices({ session: snapshot, getAccessToken: () =>
      store.getSnapshot().revision === snapshot.revision ? store.getAccessToken() : null,
      logout: () => { if (store.getSnapshot().revision === snapshot.revision) store.logout() } })
    return { client, services }
  })
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
  return <ScopedProviders key={snapshot.revision} snapshot={snapshot} store={store} createServices={createServices}>
    {children}
  </ScopedProviders>
}
export function AppProviders({ children, session, authAdapter, createServices }: AppProvidersProps) {
  const [store] = useState(() => session ?? createSessionStore())
  return <SessionProvider store={store}><AuthProvider adapter={authAdapter}><SessionScope createServices={createServices}>{children}</SessionScope></AuthProvider></SessionProvider>
}

