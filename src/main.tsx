import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './router'
import { AuthProvider } from './contexts/AuthContext'
import { FeatureFlagProvider } from './contexts/FeatureFlagContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <FeatureFlagProvider>
        <RouterProvider router={router} />
      </FeatureFlagProvider>
    </AuthProvider>
  </StrictMode>,
)
