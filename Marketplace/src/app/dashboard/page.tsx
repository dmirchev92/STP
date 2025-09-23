'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, StatusBadge, RatingBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'

interface Case {
  id: string
  service_type: string
  description: string
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled' | 'wip' | 'closed'
  category: string
  priority: string
  address: string
  phone: string
  preferred_date: string
  preferred_time: string
  provider_id?: string
  provider_name?: string
  customer_id?: string
  created_at: string
  updated_at: string
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const router = useRouter()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    viewMode: 'available', // 'available' or 'assigned'
    page: 1,
    limit: 10
  })

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchCases()
      fetchStats()
    }
  }, [isAuthenticated, user, filters])

  const fetchCases = async () => {
    try {
      setLoading(true)
      let filterParams: any = {
        status: filters.status,
        category: filters.category,
        page: filters.page,
        limit: filters.limit,
      }

      if (user?.role === 'tradesperson' || user?.role === 'service_provider') {
        if (filters.viewMode === 'assigned') {
          // Show only cases assigned to me
          filterParams.providerId = user.id
        } else {
          // Show available cases (I created AND unassigned cases only)
          filterParams.createdByUserId = user.id
          filterParams.onlyUnassigned = 'true' // Only show cases without a provider_id
        }
      } else {
        // For customers, show their own cases
        filterParams.customerId = user?.id
      }
      
      console.log('🔍 Dashboard - User:', user)
      console.log('🔍 Dashboard - Filter params:', filterParams)
      
      const response = await apiClient.getCasesWithFilters(filterParams)
      console.log('🔍 Dashboard - API response:', response.data)
      if (response.data?.success) {
        setCases(response.data.data.cases || [])
      }
    } catch (error) {
      console.error('Error fetching cases:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await apiClient.getCaseStats(
        user?.role === 'tradesperson' || user?.role === 'service_provider' ? user.id : undefined
      )
      if (response.data?.success) {
        setStats(response.data.data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleStatusChange = async (caseId: string, newStatus: string) => {
    try {
      if (newStatus === 'accepted') {
        await apiClient.acceptCase(caseId, user!.id, `${user!.firstName} ${user!.lastName}`)
        alert('Заявката беше приета успешно!')
      } else if (newStatus === 'declined') {
        await apiClient.assignCase(caseId, 'decline', 'Declined by provider')
        alert('Заявката беше отказана успешно!')
      } else if (newStatus === 'completed') {
        await apiClient.completeCase(caseId, 'Completed successfully')
        alert('Заявката беше завършена успешно!')
      }
      
      // Refresh cases
      fetchCases()
      fetchStats()
    } catch (error) {
      console.error('Error updating case status:', error)
      alert('Възникна грешка при обновяването на статуса')
    }
  }

  const toggleCaseExpansion = (caseId: string) => {
    setExpandedCases(prev => {
      const newSet = new Set(prev)
      if (newSet.has(caseId)) {
        newSet.delete(caseId)
      } else {
        newSet.add(caseId)
      }
      return newSet
    })
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      open: 'bg-green-100 text-green-800',
      wip: 'bg-yellow-100 text-yellow-800', 
      closed: 'bg-gray-100 text-gray-800'
    }
    const labels = {
      open: 'Отворена',
      wip: 'В процес',
      closed: 'Затворена'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const getCategoryDisplayName = (category: string) => {
    const categoryNames: { [key: string]: string } = {
      'electrician': 'Електротехник',
      'plumber': 'Водопроводчик',
      'hvac': 'Климатик',
      'carpenter': 'Дърводелец',
      'painter': 'Бояджия',
      'locksmith': 'Ключар',
      'cleaner': 'Почистване',
      'gardener': 'Градинар',
      'handyman': 'Майстор за всичко',
      'appliance_repair': 'Ремонт на уреди',
      'general': 'Общи'
    }
    return categoryNames[category] || category
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-slate-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Зареждане...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-slate-600 transition-colors">
                ServiceText Pro
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">
                {user.firstName} {user.lastName}
              </span>
              <button
                onClick={handleLogout}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                Изход
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Управление на заявки
          </h1>
          <p className="text-gray-600">
            {user.role === 'customer' ? 'Вашите заявки за услуги' : 'Заявки за вашите услуги'}
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {stats.statusStats?.map((stat: any) => (
              <Card key={stat.status} variant="elevated" hover padding="lg" className="group">
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-2">
                        {stat.status === 'open' ? 'Отворени заявки' : 
                         stat.status === 'wip' ? 'В процес' : 'Завършени'}
                      </p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-slate-600 to-slate-700 bg-clip-text text-transparent">
                        {stat.count}
                      </p>
                    </div>
                    <div className={`p-4 rounded-2xl transition-all duration-300 group-hover:scale-110 ${
                      stat.status === 'open' ? 'bg-gradient-to-br from-green-100 to-green-200' : 
                      stat.status === 'wip' ? 'bg-gradient-to-br from-yellow-100 to-yellow-200' : 
                      'bg-gradient-to-br from-slate-100 to-slate-200'
                    }`}>
                      <span className="text-3xl">
                        {stat.status === 'open' ? '📋' : stat.status === 'wip' ? '⚡' : '✅'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <Card variant="elevated" padding="lg" className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🔍</span>
              Филтри и действия
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* View Mode Filter - Only for service providers */}
              {(user?.role === 'tradesperson' || user?.role === 'service_provider') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Преглед на заявки
                  </label>
                  <select
                    value={filters.viewMode}
                    onChange={(e) => setFilters({
                      ...filters, 
                      viewMode: e.target.value, 
                      status: e.target.value === 'assigned' ? filters.status : '', // Clear status when switching to available
                      page: 1
                    })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 bg-white hover:border-slate-300"
                  >
                    <option value="available">📋 Налични заявки за поемане</option>
                    <option value="assigned">✅ Възложени на мен заявки</option>
                  </select>
                </div>
              )}

              {/* Status Filter - Only show when viewing assigned cases */}
              {(user?.role === 'tradesperson' || user?.role === 'service_provider') && filters.viewMode === 'assigned' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Статус
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value, page: 1})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 bg-white hover:border-slate-300"
                  >
                    <option value="">Всички статуси</option>
                    <option value="pending">⏳ Очакват</option>
                    <option value="accepted">✅ Приети</option>
                    <option value="declined">❌ Отказани</option>
                    <option value="completed">🏁 Завършени</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Категория
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({...filters, category: e.target.value, page: 1})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 bg-white hover:border-slate-300"
                >
                  <option value="">Всички категории</option>
                  <option value="electrician">⚡ Електротехник</option>
                  <option value="plumber">🔧 Водопроводчик</option>
                  <option value="hvac">❄️ Климатик</option>
                  <option value="carpenter">🪚 Дърводелец</option>
                  <option value="painter">🎨 Бояджия</option>
                  <option value="locksmith">🔐 Ключар</option>
                  <option value="cleaner">🧹 Почистване</option>
                  <option value="gardener">🌱 Градинар</option>
                  <option value="handyman">🔨 Майстор за всичко</option>
                  <option value="appliance_repair">🔧 Ремонт на уреди</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <Button
                  variant="construction"
                  size="lg"
                  className="w-full"
                  leftIcon={<span>➕</span>}
                  onClick={() => router.push('/create-case')}
                >
                  Нова заявка
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cases List */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📋</span>
              Заявки за услуги
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Зареждане на заявки...</p>
              </div>
            ) : cases.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-gray-600 text-lg mb-4">Няма намерени заявки</p>
                <Button
                  variant="construction"
                  onClick={() => router.push('/create-case')}
                  leftIcon={<span>➕</span>}
                >
                  Създай първата си заявка
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {cases.map((case_) => (
                  <Card 
                    key={case_.id} 
                    variant="outline" 
                    hover 
                    padding="lg" 
                    className="group cursor-pointer"
                    onClick={() => toggleCaseExpansion(case_.id)}
                  >
                    <CardContent>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
                                <span className="text-xl">
                                  {case_.category === 'electrician' ? '⚡' :
                                   case_.category === 'plumber' ? '🔧' :
                                   case_.category === 'hvac' ? '❄️' :
                                   case_.category === 'carpenter' ? '🪚' :
                                   case_.category === 'painter' ? '🎨' :
                                   case_.category === 'locksmith' ? '🔐' :
                                   case_.category === 'cleaner' ? '🧹' :
                                   case_.category === 'gardener' ? '🌱' :
                                   case_.category === 'handyman' ? '🔨' : '🔧'}
                                </span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-slate-600 transition-colors duration-200">
                                  {expandedCases.has(case_.id) ? case_.description : `${case_.description.substring(0, 80)}...`}
                                </h3>
                                <span className="text-slate-500 transition-colors">
                                  {expandedCases.has(case_.id) ? '▼' : '▶'}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                                <span className="flex items-center gap-1">
                                  📍 {case_.address}
                                </span>
                                <span className="flex items-center gap-1">
                                  📅 {new Date(case_.created_at).toLocaleDateString('bg-BG')}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <StatusBadge status={case_.status as any} />
                                <Badge variant="primary">
                                  {getCategoryDisplayName(case_.category)}
                                </Badge>
                                
                                {/* Assignment Status Badge */}
                                {case_.provider_id === user?.id ? (
                                  <Badge variant="success">
                                    ✅ Възложена на мен
                                  </Badge>
                                ) : case_.provider_id && case_.provider_id !== user?.id ? (
                                  <Badge variant="outline">
                                    👤 Възложена на {case_.provider_name || 'друг изпълнител'}
                                  </Badge>
                                ) : !case_.provider_id && filters.viewMode === 'available' ? (
                                  <Badge variant="construction">
                                    🟢 Отворена за поемане
                                  </Badge>
                                ) : case_.customer_id === user?.id ? (
                                  <Badge variant="info">
                                    📝 Моя заявка
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">
                                    ⏳ Очаква изпълнител
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Expanded Details */}
                              {expandedCases.has(case_.id) && (
                                <div className="mt-4 p-4 bg-slate-50 rounded-lg border-l-4 border-blue-500">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="font-semibold text-slate-700">Телефон:</span>
                                      <span className="ml-2 text-slate-600">{case_.phone}</span>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-slate-700">Приоритет:</span>
                                      <span className="ml-2 text-slate-600">{case_.priority}</span>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-slate-700">Предпочитана дата:</span>
                                      <span className="ml-2 text-slate-600">{case_.preferred_date}</span>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-slate-700">Предпочитано време:</span>
                                      <span className="ml-2 text-slate-600">{case_.preferred_time}</span>
                                    </div>
                                    <div className="md:col-span-2">
                                      <span className="font-semibold text-slate-700">Пълно описание:</span>
                                      <p className="mt-1 text-slate-600">{case_.description}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-4">
                          {user?.role === 'tradesperson' || user?.role === 'service_provider' ? (
                            <div className="flex gap-2">
                              {case_.status === 'pending' && (
                                <>
                                  <Button
                                    variant="construction"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStatusChange(case_.id, 'accepted')
                                    }}
                                    leftIcon={<span>✅</span>}
                                  >
                                    Приеми
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStatusChange(case_.id, 'declined')
                                    }}
                                    leftIcon={<span>❌</span>}
                                  >
                                    Откажи
                                  </Button>
                                </>
                              )}
                              {case_.status === 'accepted' && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleStatusChange(case_.id, 'completed')
                                  }}
                                  leftIcon={<span>🏁</span>}
                                >
                                  Завърши
                                </Button>
                              )}
                            </div>
                          ) : (
                            <div className="text-right">
                              <p className="text-sm text-gray-500 mb-1">Изпълнител:</p>
                              <div className="flex items-center gap-2">
                                {case_.provider_name ? (
                                  <>
                                    <Avatar name={case_.provider_name} size="sm" />
                                    <span className="text-sm font-medium text-gray-900">
                                      {case_.provider_name}
                                    </span>
                                  </>
                                ) : (
                                  <Badge variant="outline">Очаква се</Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
