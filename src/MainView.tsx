import { createRuntimeConfiguration } from './app/runtimeConfig'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './AppView'
import { AppProviders } from './app/AppProviders'
import { getRuntimeBasename } from './lib/navigation'
import { installInputModality } from './lib/inputModality'
import { SignupCoordinatorProvider } from './routes/auth/-components/SignupCoordinator'
import './styles/index.css'

const disposeInputModality = installInputModality()
if (import.meta.hot) import.meta.hot.dispose(disposeInputModality)

const basename = getRuntimeBasename()
const runtime = createRuntimeConfiguration(import.meta.env.VITE_API_BASE_URL)

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element is missing')
createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <AppProviders {...runtime}><SignupCoordinatorProvider><App /></SignupCoordinatorProvider></AppProviders>
    </BrowserRouter>
  </StrictMode>,
)

