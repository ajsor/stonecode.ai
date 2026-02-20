import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense, type ReactNode, type LazyExoticComponent, type ComponentType } from 'react'

// Lazy load pages for code splitting
const LandingPage = lazy(() => import('./pages/landing/LandingPage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const AcceptInvitePage = lazy(() => import('./pages/auth/AcceptInvitePage'))
const PortalLayout = lazy(() => import('./components/layout/PortalLayout'))
const Dashboard = lazy(() => import('./pages/portal/Dashboard'))
const ProfilePage = lazy(() => import('./pages/portal/ProfilePage'))
const SecurityPage = lazy(() => import('./pages/portal/SecurityPage'))
const ColorSettingsPage = lazy(() => import('./pages/portal/ColorSettingsPage'))
const AdminLayout = lazy(() => import('./components/layout/AdminLayout'))
const UsersPage = lazy(() => import('./pages/portal/admin/UsersPage'))
const InvitationsPage = lazy(() => import('./pages/portal/admin/InvitationsPage'))
const FeaturesPage = lazy(() => import('./pages/portal/admin/FeaturesPage'))

// Loading component
function PageLoader(): ReactNode {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    </div>
  )
}

// Wrap lazy components with Suspense
function withSuspense(Component: LazyExoticComponent<ComponentType<unknown>>): ReactNode {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: withSuspense(LandingPage),
  },
  {
    path: '/login',
    element: withSuspense(LoginPage),
  },
  {
    path: '/accept-invite',
    element: withSuspense(AcceptInvitePage),
  },
  {
    path: '/portal',
    element: withSuspense(PortalLayout),
    children: [
      {
        index: true,
        element: <Navigate to="/portal/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: withSuspense(Dashboard),
      },
      {
        path: 'profile',
        element: withSuspense(ProfilePage),
      },
      {
        path: 'profile/security',
        element: withSuspense(SecurityPage),
      },
      {
        path: 'profile/color-settings',
        element: withSuspense(ColorSettingsPage),
      },
      {
        path: 'admin',
        element: withSuspense(AdminLayout),
        children: [
          {
            index: true,
            element: <Navigate to="/portal/admin/users" replace />,
          },
          {
            path: 'users',
            element: withSuspense(UsersPage),
          },
          {
            path: 'invitations',
            element: withSuspense(InvitationsPage),
          },
          {
            path: 'features',
            element: withSuspense(FeaturesPage),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
