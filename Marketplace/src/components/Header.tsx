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

  // Debug logging
  console.log('🎨 Header - User data:', user)
  console.log('🎨 Header - Profile image URL:', (user as any)?.profileImageUrl)

  return (
    <Navigation 
      user={user ? {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: (user as any).profileImageUrl || undefined
      } : undefined}
      unreadCount={0} // TODO: Connect to notification system
      onLogout={handleLogout}
    />
  )
}
