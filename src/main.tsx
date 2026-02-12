import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './router'
import { AuthProvider } from './contexts/AuthContext'
import { FeatureFlagProvider } from './contexts/FeatureFlagContext'
import { WidgetProvider } from './contexts/WidgetContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <FeatureFlagProvider>
        <WidgetProvider>
          <RouterProvider router={router} />
        </WidgetProvider>
      </FeatureFlagProvider>
    </AuthProvider>
  </StrictMode>,
)
