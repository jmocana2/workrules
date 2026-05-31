import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { initSentry, Sentry } from './lib/sentry'
import { QueryProvider } from './providers/QueryProvider'

initSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Algo ha ido mal. Recarga la página.</p>}>      <QueryProvider>
        <App />
      </QueryProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
