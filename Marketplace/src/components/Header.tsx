'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Navigation } from '@/components/ui/Navigation'
import { useRouter } from 'next/navigation'

export function Header() {
  const { user, isAuthenticated, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <Navigation 
      user={user ? {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      } : undefined}
      unreadCount={0} // TODO: Connect to notification system
      onLogout={handleLogout}
    />
  )
}
