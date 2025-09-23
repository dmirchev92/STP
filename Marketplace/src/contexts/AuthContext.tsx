'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'customer' | 'tradesperson' | 'service_provider'
  phoneNumber?: string
  companyName?: string
  serviceCategory?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  register: (userData: any) => Promise<boolean>
  refreshToken: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing auth token on app load
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const userData = localStorage.getItem('user_data')
      
      console.log('🔍 AuthContext - Checking auth status:', { 
        hasToken: !!token, 
        hasUserData: !!userData,
        tokenPreview: token ? token.substring(0, 20) + '...' : null
      })
      
      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)
          console.log('✅ AuthContext - Loaded user from localStorage:', parsedUser)
        } catch (parseError) {
          console.error('❌ AuthContext - Error parsing user data:', parseError)
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user_data')
        }
      } else {
        console.log('⚠️ AuthContext - No token or user data found')
      }
    } catch (error) {
      console.error('❌ AuthContext - Auth check error:', error)
      // Clear potentially corrupted data
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_data')
    } finally {
      setIsLoading(false)
      console.log('✅ AuthContext - Auth check complete, isLoading set to false')
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 AuthContext - Starting login process...')
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.129:3000/api/v1'}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      })

      const result = await response.json()
      console.log('🔐 AuthContext - Login response:', result)

      if (result.success && result.data?.tokens?.accessToken) {
        console.log('✅ AuthContext - Login successful, updating state...')
        
        // Store tokens and user data
        localStorage.setItem('auth_token', result.data.tokens.accessToken)
        if (result.data.tokens.refreshToken) {
          localStorage.setItem('refresh_token', result.data.tokens.refreshToken)
        }
        localStorage.setItem('user_data', JSON.stringify(result.data.user))
        
        // Update state immediately
        setUser(result.data.user)
        setIsLoading(false)
        
        console.log('✅ AuthContext - User state updated:', result.data.user)
        
        // Dispatch custom event for any components listening
        window.dispatchEvent(new CustomEvent('auth-state-changed', { 
          detail: { user: result.data.user, isAuthenticated: true }
        }))
        
        return true
      } else {
        console.error('❌ AuthContext - Login failed:', result)
        return false
      }
    } catch (error) {
      console.error('❌ AuthContext - Login error:', error)
      return false
    }
  }

  const register = async (userData: any): Promise<boolean> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.129:3000/api/v1'}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      })

      const result = await response.json()

      if (result.success && result.data?.tokens?.accessToken) {
        localStorage.setItem('auth_token', result.data.tokens.accessToken)
        if (result.data.tokens.refreshToken) {
          localStorage.setItem('refresh_token', result.data.tokens.refreshToken)
        }
        localStorage.setItem('user_data', JSON.stringify(result.data.user))
        setUser(result.data.user)
        return true
      }
      return false
    } catch (error) {
      console.error('Registration error:', error)
      return false
    }
  }

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const refreshTokenValue = localStorage.getItem('refresh_token')
      if (!refreshTokenValue) {
        return false
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.129:3000/api/v1'}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshTokenValue })
      })

      const result = await response.json()

      if (result.success && result.data?.accessToken) {
        localStorage.setItem('auth_token', result.data.accessToken)
        if (result.data.refreshToken) {
          localStorage.setItem('refresh_token', result.data.refreshToken)
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Token refresh error:', error)
      return false
    }
  }, [])

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_data')
    setUser(null)
  }

  // Auto-refresh token every 90 minutes (before 2h expiration)
  useEffect(() => {
    if (!user) return

    const interval = setInterval(async () => {
      const success = await refreshToken()
      if (!success) {
        console.log('Token refresh failed, logging out user')
        logout()
      }
    }, 90 * 60 * 1000) // 90 minutes

    return () => clearInterval(interval)
  }, [user, refreshToken])

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    register,
    refreshToken
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
