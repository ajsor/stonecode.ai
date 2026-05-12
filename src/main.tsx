import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './router'
import { AuthProvider } from './contexts/AuthContext'
import { FeatureFlagProvider } from './contexts/FeatureFlagContext'

// WidgetProvider lives inside PortalLayout — keeps widget code out of the
// entry chunk so the landing page doesn't pay for it.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <FeatureFlagProvider>
        <RouterProvider router={router} />
      </FeatureFlagProvider>
    </AuthProvider>
  </StrictMode>,
)
