'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import ChatWidget from '@/components/ChatWidget'
import { apiClient } from '@/lib/api'

interface DashboardStats {
  totalCases: number
  activeCases: number
  completedCases: number
  totalRevenue: number
  monthlyRevenue: number
  averageRating: number
  totalReviews: number
}

interface RecentCase {
  id: string
  title: string
  status: string
  customerName: string
  createdAt: string
  urgency: string
}

export default function ProviderDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentCases, setRecentCases] = useState<RecentCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('🏠 Provider Dashboard - Auth state:', { 
      isAuthenticated, 
      isLoading, 
      user: user?.role, 
      userEmail: user?.email 
    })
    
    // Wait for authentication loading to complete
    if (isLoading) {
      console.log('⏳ Auth still loading, waiting...')
      return
    }
    
    // Redirect if not authenticated
    if (!isAuthenticated || !user) {
      console.log('❌ Not authenticated, redirecting to login')
      router.push('/auth/login')
      return
    }
    
    // Check if user is a service provider
    if (user.role !== 'service_provider' && user.role !== 'tradesperson') {
      console.log('❌ User is not a service provider, redirecting to home')
      router.push('/')
      return
    }
    
    // User is authenticated and is a service provider, load dashboard
    console.log('✅ Service provider authenticated, loading dashboard')
    loadDashboardData()
  }, [isAuthenticated, isLoading, user, router])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load dashboard stats (mock data for now)
      const mockStats: DashboardStats = {
        totalCases: 45,
        activeCases: 8,
        completedCases: 37,
        totalRevenue: 12500,
        monthlyRevenue: 2800,
        averageRating: 4.7,
        totalReviews: 23
      }
      
      const mockRecentCases: RecentCase[] = [
        {
          id: '1',
          title: 'Ремонт на електрическа инсталация',
          status: 'active',
          customerName: 'Иван Петров',
          createdAt: new Date().toISOString(),
          urgency: 'normal'
        },
        {
          id: '2',
          title: 'Монтаж на осветление',
          status: 'pending',
          customerName: 'Мария Георгиева',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          urgency: 'urgent'
        }
      ]

      setStats(mockStats)
      setRecentCases(mockRecentCases)
      
    } catch (err: any) {
      console.error('Error loading dashboard data:', err)
      setError('Неуспешно зареждане на данните за таблото')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50'
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'completed': return 'text-blue-600 bg-blue-50'
      case 'cancelled': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Активна'
      case 'pending': return 'Чакаща'
      case 'completed': return 'Завършена'
      case 'cancelled': return 'Отказана'
      default: return status
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'text-red-600'
      case 'normal': return 'text-gray-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Зареждане на табло...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800">❌ {error}</p>
            <button 
              onClick={loadDashboardData}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Опитай отново
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Добре дошли, {user?.firstName}! 👋
          </h1>
          <p className="text-gray-600">
            Управлявайте вашите заявки и следете статистиките си
          </p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 text-lg">📋</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Общо заявки</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCases}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 text-lg">⚡</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Активни заявки</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeCases}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <span className="text-yellow-600 text-lg">💰</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Месечен приход</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.monthlyRevenue} лв</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 text-lg">⭐</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Средна оценка</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.averageRating}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Recent Cases */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Последни заявки</h2>
                <a
                  href="/provider/cases"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Виж всички →
                </a>
              </div>
              
              {recentCases.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-gray-600 mb-4">Няма активни заявки</p>
                  <p className="text-sm text-gray-500">Новите заявки ще се появят тук</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentCases.map((case_) => (
                    <div key={case_.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">{case_.title}</h3>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(case_.status)}`}>
                            {getStatusLabel(case_.status)}
                          </span>
                          <span className={`text-xs font-medium ${getUrgencyColor(case_.urgency)}`}>
                            {case_.urgency === 'urgent' ? '🔥 Спешно' : '📅 Нормално'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>👤 {case_.customerName}</span>
                        <span>{new Date(case_.createdAt).toLocaleDateString('bg-BG')}</span>
                      </div>
                      
                      <div className="mt-3 flex space-x-2">
                        <button className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700">
                          Виж детайли
                        </button>
                        <button className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">
                          Приеми
                        </button>
                        <button className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-700">
                          Съобщение
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Бързи действия</h2>
              
              <div className="space-y-3">
                <a
                  href="/provider/cases"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center justify-center space-x-2"
                >
                  <span>📋</span>
                  <span>Управление на заявки</span>
                </a>
                
                <a
                  href="/provider/profile"
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 text-sm font-medium flex items-center justify-center space-x-2"
                >
                  <span>👤</span>
                  <span>Редактирай профил</span>
                </a>
                
                <a
                  href="/referrals"
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 text-sm font-medium flex items-center justify-center space-x-2"
                >
                  <span>🤝</span>
                  <span>Препоръки</span>
                </a>
                
                <a
                  href="/provider/analytics"
                  className="w-full bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 text-sm font-medium flex items-center justify-center space-x-2"
                >
                  <span>📊</span>
                  <span>Статистики</span>
                </a>
              </div>
            </div>

            {/* Profile Summary */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Профил</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Име:</span>
                  <span className="font-semibold">{user?.firstName} {user?.lastName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Имейл:</span>
                  <span className="font-semibold">{user?.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Роля:</span>
                  <span className="font-semibold">Доставчик на услуги</span>
                </div>
                {stats && (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Оценка:</span>
                      <span className="font-semibold">{stats.averageRating} ⭐</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Отзиви:</span>
                      <span className="font-semibold">{stats.totalReviews}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
      <ChatWidget />
    </div>
  )
}