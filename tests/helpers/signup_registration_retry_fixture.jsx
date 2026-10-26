import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { AppProviders } from '../../src/app/AppProviders'
import { createSessionStore } from '../../src/app/session/sessionStore'
import { getPublicAccountApi } from '../../src/api/publicAccount'
import { EmailVerificationPage } from '../../src/routes/auth/EmailVerificationPage'
import { SignupPages } from '../../src/routes/auth/SignupPagesView'
import { SignupCoordinatorProvider, useSignupCoordinator } from '../../src/routes/auth/-components/SignupCoordinator'
import { SignupRegistrationStatus } from '../../src/routes/auth/-components/SignupRegistrationStatus'
import { deliverEmailVerification } from '../../src/routes/auth/-components/emailVerificationChannel'

const store = createSessionStore()
const createServices = () => ({ cart: { count: async () => 0 }, myAccount: {}, products: {}, checkout: {}, storefront: {} })
const submitted = { username: 'qa_rejoin_same', password: 'QaRetry123!', name: 'Synthetic QA', nickname: 'QARetry', email: 'qa-retry@example.test',
  phone: '', messengerType: 'telegram', messengerId: 'qa_retry', termsAgreements: [{ termsPolicyVersionId: 1, agreed: true }] }

function OriginalSignup() {
  const coordinator = useSignupCoordinator()
  async function start() {
    const requested = await getPublicAccountApi().requestEmailVerification(submitted.email, submitted.nickname)
    const image = new URLSearchParams(location.search).has('image') ? new File(['synthetic-png'], 'qa.png', { type: 'image/png' }) : null
    coordinator.begin(requested.requestId, submitted.email, { registration: submitted, image })
  }
  useEffect(() => {
    window.qaSignup = { start, retry: coordinator.retryRegistration, cancel: coordinator.cancel,
      duplicate: value => deliverEmailVerification(value), progress: coordinator.registrationProgress, awaitingEmail: coordinator.awaitingEmail }
  })
  return <main>
    <button onClick={() => { void start() }} data-testid="begin-signup">Begin synthetic signup</button>
    <button onClick={coordinator.retryRegistration} data-testid="retry-origin">Retry original</button>
    <button onClick={coordinator.cancel} data-testid="cancel-origin">Cancel original</button>
    <output data-testid="registration-state">{coordinator.registrationProgress?.state ?? 'idle'}</output>
    <SignupRegistrationStatus progress={coordinator.registrationProgress} onRetry={coordinator.retryRegistration} onRestart={coordinator.cancel} />
  </main>
}

createRoot(document.getElementById('root')).render(<StrictMode><BrowserRouter><AppProviders session={store} createServices={createServices}>
  <SignupCoordinatorProvider><Routes>
    <Route path="/signup/profile" element={<OriginalSignup />} />
    <Route path="/email-verification" element={<EmailVerificationPage />} />
    <Route path="/signup/complete" element={<SignupPages page="complete" />} />
    <Route path="/login" element={<output>Login route</output>} />
    <Route path="*" element={<output>Fixture home</output>} />
  </Routes></SignupCoordinatorProvider>
</AppProviders></BrowserRouter></StrictMode>)
