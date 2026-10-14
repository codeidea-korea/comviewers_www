import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServiceProvider } from '../../src/app/ServiceProvider'
import { SessionProvider } from '../../src/app/session/SessionProvider'
import { AuthProvider } from '../../src/app/session/AuthProvider'
import { CustomerCapabilityGate } from '../../src/app/session/SessionControls'
import { RecoveryPages } from '../../src/routes/auth/RecoveryPagesView'
import { LoginPage } from '../../src/routes/auth/LoginPageView'
import { AppProviders } from '../../src/app/AppProviders'
import { createSessionStore } from '../../src/app/session/sessionStore'
import { createAuthAdapter } from '../../src/api/auth'
import '../../src/styles/index.css'

const params = new URLSearchParams(location.search)
const role = params.get('qaRole') ?? 'USER'
const cold = params.get('qaCold') === '1'
const snapshot = role === 'anonymous' ? { status: 'anonymous', revision: 0 } : {
  status: 'authenticated', revision: 1, role, expiresAt: Date.now() + 3600000,
  organizationId: '1', organizationIds: ['1'], organizations: [{ id: '1', role: role === 'C_MANAGER' ? 'c_manager' : 'owner', name: 'QA', organizationNo: 'ORG_QA1' }],
  capabilityStatus: 'ready', customerSession: { memberRole: role === 'C_MANAGER' ? 'c_manager' : 'owner', displayName: 'QA', myPageOnly: role === 'C_MANAGER', commerceAvailable: true },
}
const store = { subscribe: () => () => {}, getSnapshot: () => snapshot }
const services = { cart: { count: async () => 0 }, myAccount: {}, products: {}, checkout: {}, storefront: {} }
const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
const routes = <CustomerCapabilityGate><Routes>
  <Route path="/account/reset-password" element={<RecoveryPages page="reset-password" />} />
  <Route path="/login" element={<LoginPage />} />
  <Route path="*" element={<output>QA redirected route</output>} />
</Routes></CustomerCapabilityGate>
const coldStore = createSessionStore()
const coldAdapter = createAuthAdapter('/backend')
window.qaReset = { scopes: [], snapshot: () => coldStore.getSnapshot() }
const coldServices = scope => { window.qaReset.scopes.push(scope.session.scopeRevision); return { ...services } }
createRoot(document.getElementById('root')).render(<BrowserRouter>{cold
  ? <StrictMode><AppProviders session={coldStore} authAdapter={coldAdapter} createServices={coldServices}>{routes}</AppProviders></StrictMode>
  : <QueryClientProvider client={client}><SessionProvider store={store}><AuthProvider><ServiceProvider services={services}>{routes}</ServiceProvider></AuthProvider></SessionProvider></QueryClientProvider>
}</BrowserRouter>)
