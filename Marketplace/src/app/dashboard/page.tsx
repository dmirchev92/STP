'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, StatusBadge, RatingBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Header } from '@/components/Header'

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
  
  // Prevent duplicate requests
  const fetchingRef = useRef(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
      return
    }
    
    // Check if user is a service provider - dashboard is only for SPs
    if (!isLoading && isAuthenticated && user && user.role !== 'service_provider' && user.role !== 'tradesperson') {
      console.log('❌ User is not a service provider, redirecting to home. Role:', user.role)
      router.push('/')
      return
    }
  }, [isAuthenticated, isLoading, user, router])

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchCases()
      fetchStats()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id, filters.status, filters.category, filters.viewMode, filters.page])

  const fetchCases = async () => {
    // Prevent duplicate requests
    if (fetchingRef.current) {
      console.log('⏭️ Skipping duplicate fetchCases request')
      return
    }
    
    try {
      fetchingRef.current = true
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
          // For available cases, show all unassigned cases (not just created by me)
          filterParams.onlyUnassigned = 'true' // Show cases without provider_id
          // Remove the createdByUserId filter to show ALL unassigned cases
          // filterParams.createdByUserId = user.id // REMOVED - this was limiting to own cases
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
        const cases = response.data.data.cases || []
        console.log('🔍 Dashboard - Cases found:', cases.length, cases)
        
        // Debug: Show status values of all cases
        cases.forEach((caseItem: any, index: number) => {
          console.log(`🔍 Dashboard - Case ${index + 1}: ID=${caseItem.id}, Status="${caseItem.status}", Title="${caseItem.title || caseItem.description?.substring(0, 30)}"`)
        })
        
        setCases(cases)
      } else {
        console.error('🔍 Dashboard - API response not successful:', response.data)
        setCases([])
      }
    } catch (error) {
      console.error('Error fetching cases:', error)
    } finally {
      setLoading(false)
      fetchingRef.current = false
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
      console.log('🔄 Dashboard - Updating case status:', caseId, 'to', newStatus)
      
      if (newStatus === 'accepted') {
        await apiClient.acceptCase(caseId, user!.id, `${user!.firstName} ${user!.lastName}`)
        alert('Заявката беше приета успешно!')
      } else if (newStatus === 'declined') {
        await apiClient.assignCase(caseId, 'decline', 'Declined by provider')
        alert('Заявката беше отказана успешно!')
      } else if (newStatus === 'completed') {
        // Use the direct status update endpoint (now properly implemented in backend)
        console.log('🏁 Dashboard - Updating case status to completed...')
        const response = await apiClient.updateCaseStatusDirect(caseId, 'completed', 'Completed successfully')
        console.log('🏁 Dashboard - Status update response:', response.data)
        alert('Заявката беше завършена успешно!')
      }
      
      console.log('🔄 Dashboard - Refreshing cases after status change...')
      // Add small delay to ensure backend has updated
      setTimeout(() => {
        fetchCases()
        fetchStats()
      }, 500)
      
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white/30 mx-auto"></div>
          <p className="mt-4 text-slate-200">Зареждане...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <Header />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Управление на заявки
          </h1>
          <p className="text-slate-300">
            {user.role === 'customer' ? 'Вашите заявки за услуги' : 'Заявки за вашите услуги'}
          </p>
        </div>

        {/* View Mode Toggle - Prominent for Service Providers */}
        {(user?.role === 'tradesperson' || user?.role === 'service_provider') && (
          <div className="flex items-center justify-center space-x-4 mb-8">
            <button
              onClick={() => setFilters({...filters, viewMode: 'available', status: '', page: 1})}
              className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 ${
                filters.viewMode === 'available'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/50'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20 border border-white/20'
              }`}
            >
              📋 Налични заявки
            </button>
            <button
              onClick={() => setFilters({...filters, viewMode: 'assigned', status: '', page: 1})}
              className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 ${
                filters.viewMode === 'assigned'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/50'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20 border border-white/20'
              }`}
            >
              ✅ Моите заявки
            </button>
          </div>
        )}

        {/* Stats Cards - Clickable */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {/* Available Cases */}
            <button
              onClick={() => setFilters({...filters, viewMode: 'available', status: '', page: 1})}
              className="text-left"
            >
              <Card variant="elevated" hover padding="lg" className="group cursor-pointer h-full">
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-300 mb-2">
                        Налични заявки
                      </p>
                      <p className="text-3xl font-bold text-white">
                        {stats.available || 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl transition-all duration-300 group-hover:scale-110 bg-gradient-to-br from-green-500/20 to-green-400/20 border border-green-400/30">
                      <span className="text-3xl">📋</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>

            {/* Accepted Cases */}
            <button
              onClick={() => setFilters({...filters, viewMode: 'assigned', status: 'accepted', page: 1})}
              className="text-left"
            >
              <Card variant="elevated" hover padding="lg" className="group cursor-pointer h-full">
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-300 mb-2">
                        Приети
                      </p>
                      <p className="text-3xl font-bold text-white">
                        {stats.accepted || 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl transition-all duration-300 group-hover:scale-110 bg-gradient-to-br from-blue-500/20 to-blue-400/20 border border-blue-400/30">
                      <span className="text-3xl">✅</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>

            {/* WIP Cases */}
            <button
              onClick={() => setFilters({...filters, viewMode: 'assigned', status: 'wip', page: 1})}
              className="text-left"
            >
              <Card variant="elevated" hover padding="lg" className="group cursor-pointer h-full">
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-300 mb-2">
                        В процес
                      </p>
                      <p className="text-3xl font-bold text-white">
                        {stats.wip || 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl transition-all duration-300 group-hover:scale-110 bg-gradient-to-br from-yellow-500/20 to-yellow-400/20 border border-yellow-400/30">
                      <span className="text-3xl">⚡</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>

            {/* Completed Cases */}
            <button
              onClick={() => setFilters({...filters, viewMode: 'assigned', status: 'completed', page: 1})}
              className="text-left"
            >
              <Card variant="elevated" hover padding="lg" className="group cursor-pointer h-full">
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-300 mb-2">
                        Завършени
                      </p>
                      <p className="text-3xl font-bold text-white">
                        {stats.completed || 0}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl transition-all duration-300 group-hover:scale-110 bg-gradient-to-br from-purple-500/20 to-purple-400/20 border border-purple-400/30">
                      <span className="text-3xl">🏁</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          </div>
        )}

        {/* Filters */}
        <Card variant="elevated" padding="lg" className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🔍</span>
              Допълнителни филтри
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Status Filter - Only show when viewing assigned cases */}
              {(user?.role === 'tradesperson' || user?.role === 'service_provider') && filters.viewMode === 'assigned' && (
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-3">
                    Статус
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value, page: 1})}
                    className="w-full px-4 py-3 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all duration-200 bg-white/10 text-white hover:border-white/30 backdrop-blur-sm [&>option]:bg-slate-800 [&>option]:text-white"
                  >
                    <option value="" className="bg-slate-800 text-white">Всички статуси</option>
                    <option value="pending" className="bg-slate-800 text-white">🆕 Нови</option>
                    <option value="accepted" className="bg-slate-800 text-white">✅ Приети</option>
                    <option value="declined" className="bg-slate-800 text-white">❌ Отказани</option>
                    <option value="completed" className="bg-slate-800 text-white">🏁 Завършени</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-3">
                  Категория
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({...filters, category: e.target.value, page: 1})}
                  className="w-full px-4 py-3 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all duration-200 bg-white/10 text-white hover:border-white/30 backdrop-blur-sm [&>option]:bg-slate-800 [&>option]:text-white"
                >
                  <option value="" className="bg-slate-800 text-white">Всички категории</option>
                  <option value="electrician" className="bg-slate-800 text-white">⚡ Електротехник</option>
                  <option value="plumber" className="bg-slate-800 text-white">🔧 Водопроводчик</option>
                  <option value="hvac" className="bg-slate-800 text-white">❄️ Климатик</option>
                  <option value="carpenter" className="bg-slate-800 text-white">🪚 Дърводелец</option>
                  <option value="painter" className="bg-slate-800 text-white">🎨 Бояджия</option>
                  <option value="locksmith" className="bg-slate-800 text-white">🔐 Ключар</option>
                  <option value="cleaner" className="bg-slate-800 text-white">🧹 Почистване</option>
                  <option value="gardener" className="bg-slate-800 text-white">🌱 Градинар</option>
                  <option value="handyman" className="bg-slate-800 text-white">🔨 Майстор за всичко</option>
                  <option value="appliance_repair" className="bg-slate-800 text-white">🔧 Ремонт на уреди</option>
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
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white/60 mx-auto mb-4"></div>
                <p className="text-slate-300 font-medium">Зареждане на заявки...</p>
              </div>
            ) : cases.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-slate-300 text-lg mb-4">Няма намерени заявки</p>
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
                              <div className="w-12 h-12 bg-gradient-to-br from-white/10 to-white/20 border border-white/20 rounded-xl flex items-center justify-center">
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
                                <h3 className="text-lg font-semibold text-white group-hover:text-slate-200 transition-colors duration-200">
                                  {expandedCases.has(case_.id) ? case_.description : `${case_.description.substring(0, 80)}...`}
                                </h3>
                                <span className="text-slate-500 transition-colors">
                                  {expandedCases.has(case_.id) ? '▼' : '▶'}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-slate-300 mb-3">
                                <span className="flex items-center gap-1">
                                  📍 {case_.address}
                                </span>
                                <span className="flex items-center gap-1">
                                  📅 {new Date(case_.created_at).toLocaleDateString('bg-BG')}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <StatusBadge status={case_.status as any} />
                                <Badge variant="primary" className="text-white">
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
                                    🆕 Нова заявка
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Expanded Details */}
                              {expandedCases.has(case_.id) && (
                                <div className="mt-4 p-4 bg-white/5 rounded-lg border-l-4 border-blue-400/60 backdrop-blur-sm">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="font-semibold text-slate-200">Телефон:</span>
                                      <span className="ml-2 text-slate-300">{case_.phone}</span>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-slate-200">Приоритет:</span>
                                      <span className="ml-2 text-slate-300">{case_.priority}</span>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-slate-200">Предпочитана дата:</span>
                                      <span className="ml-2 text-slate-300">{case_.preferred_date}</span>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-slate-200">Предпочитано време:</span>
                                      <span className="ml-2 text-slate-300">{case_.preferred_time}</span>
                                    </div>
                                    <div className="md:col-span-2">
                                      <span className="font-semibold text-slate-200">Пълно описание:</span>
                                      <p className="mt-1 text-slate-300">{case_.description}</p>
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
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStatusChange(case_.id, 'declined')
                                    }}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 border-2 border-red-500 text-white hover:bg-red-700 hover:border-red-600 transition-all duration-200"
                                  >
                                    <span className="text-red-800 drop-shadow-lg" style={{textShadow: '0 0 4px rgba(255,255,255,1), 1px 1px 2px rgba(255,255,255,1), -1px -1px 2px rgba(255,255,255,1), 0px 1px 0px rgba(255,255,255,1), 0px -1px 0px rgba(255,255,255,1), 1px 0px 0px rgba(255,255,255,1), -1px 0px 0px rgba(255,255,255,1)'}}>❌</span>
                                    Откажи
                                  </button>
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
                              <p className="text-sm text-slate-300 mb-1">Изпълнител:</p>
                              <div className="flex items-center gap-2">
                                {case_.provider_name ? (
                                  <>
                                    <Avatar name={case_.provider_name} size="sm" />
                                    <span className="text-sm font-medium text-white">
                                      {case_.provider_name}
                                    </span>
                                  </>
                                ) : (
                                  <Badge variant="outline">Изчаква</Badge>
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
