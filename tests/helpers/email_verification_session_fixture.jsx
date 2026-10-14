import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { AppProviders } from '../../src/app/AppProviders'
import { createSessionStore } from '../../src/app/session/sessionStore'
import { createAuthAdapter } from '../../src/api/auth'
import { useAuthentication } from '../../src/app/session/AuthProvider'
import { CustomerCapabilityGate } from '../../src/app/session/SessionControls'
import { EmailVerificationPage } from '../../src/routes/auth/EmailVerificationPage'
import { deliverSignupCompletion, listenForEmailVerification } from '../../src/routes/auth/-components/emailVerificationChannel'
import '../../src/styles/index.css'

const store = createSessionStore()
const adapter = createAuthAdapter('/backend')
window.qaEmail = { scopes: [], delivered: [], snapshot: () => store.getSnapshot(), complete: () => deliverSignupCompletion('qa-email-request', 100) }
listenForEmailVerification('qa-email-request', value => { window.qaEmail.delivered.push(value) })
const createServices = scope => {
  window.qaEmail.scopes.push(scope.session.scopeRevision)
  return { cart: { count: async () => 0 }, myAccount: {}, products: {}, checkout: {}, storefront: {} }
}
function AuthRestoreProbe() {
  window.qaEmail.restoring = useAuthentication().restoring
  return null
}
createRoot(document.getElementById('root')).render(<StrictMode><BrowserRouter><AppProviders session={store} authAdapter={adapter} createServices={createServices}><AuthRestoreProbe /><CustomerCapabilityGate><Routes>
  <Route path="/email-verification" element={<EmailVerificationPage />} />
  <Route path="*" element={<output>QA redirected route</output>} />
</Routes></CustomerCapabilityGate></AppProviders></BrowserRouter></StrictMode>)
