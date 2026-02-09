import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function AdminLayout() {
  const navigate = useNavigate()
  const { profile, isLoading } = useAuth()

  const isAdmin = profile?.is_admin === true

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/portal/dashboard')
    }
  }, [isAdmin, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return <Outlet />
}
