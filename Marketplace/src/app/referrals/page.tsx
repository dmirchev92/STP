'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { apiClient } from '@/lib/api'

interface ReferredUser {
  referredUser: {
    id: string
    firstName: string
    lastName: string
    businessName?: string
  }
  totalClicks: number
  validClicks: number
  monthlyClicks: number
  status: string
  profileUrl: string
}

interface ReferralReward {
  id: string
  rewardType: 'discount_10' | 'discount_50' | 'free_month'
  rewardValue: number
  clicksRequired: number
  clicksAchieved: number
  earnedAt: string
  status: 'earned' | 'applied' | 'expired'
}

interface ReferralDashboard {
  referralCode: string
  referralLink: string
  referredUsers: ReferredUser[]
  totalRewards: ReferralReward[]
}

export default function ReferralDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [dashboard, setDashboard] = useState<ReferralDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    console.log('🔍 Referrals page - Auth state:', { 
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
    
    // Redirect if not authenticated after loading is complete
    if (!isAuthenticated || !user) {
      console.log('❌ Not authenticated after loading complete, redirecting to login')
      router.push('/auth/login')
      return
    }
    
    // User is authenticated, fetch dashboard
    console.log('✅ User authenticated, fetching dashboard for role:', user.role)
    fetchDashboard()
  }, [isAuthenticated, isLoading, user, router])

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🤝 Fetching referral dashboard...')
      const response = await apiClient.getReferralDashboard()
      console.log('🤝 Referral dashboard response:', response)
      console.log('🤝 Referral dashboard data:', response.data)
      
      if (response.data?.success) {
        console.log('🤝 Setting dashboard data:', response.data.data)
        console.log('🤝 Referred users:', response.data.data?.referredUsers)
        
        // Fix the referral link to use local development URL
        const dashboardData = {
          ...response.data.data,
          referralLink: response.data.data.referralLink?.replace(
            'https://marketplace.servicetextpro.com',
            'http://192.168.0.129:3002'
          )
        }
        
        console.log('🤝 Fixed dashboard data with local URL:', dashboardData)
        setDashboard(dashboardData)
      } else {
        console.error('🤝 Dashboard fetch failed:', response.data?.message)
        throw new Error(response.data?.message || 'Failed to fetch referral dashboard')
      }
    } catch (err: any) {
      console.error('❌ Error fetching referral dashboard:', err)
      
      if (err.response?.status === 401) {
        setError('Сесията ви е изтекла. Моля влезте отново.')
        router.push('/auth/login')
      } else {
        setError(err.response?.data?.message || 'Failed to load referral dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  const copyReferralLink = async () => {
    if (!dashboard?.referralLink) {
      console.log('❌ No referral link to copy')
      return
    }

    // Fix the referral link to use local development URL
    const localReferralLink = dashboard.referralLink.replace(
      'https://marketplace.servicetextpro.com',
      'http://192.168.0.129:3002'
    )

    console.log('📋 Copying referral link:', localReferralLink)

    try {
      await navigator.clipboard.writeText(localReferralLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
      console.log('✅ Referral link copied successfully')
    } catch (err) {
      console.error('❌ Failed to copy link:', err)
      // Fallback: try to select and copy manually
      try {
        const textArea = document.createElement('textarea')
        textArea.value = localReferralLink
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
        console.log('✅ Referral link copied using fallback method')
      } catch (fallbackErr) {
        console.error('❌ Fallback copy method also failed:', fallbackErr)
        alert('Неуспешно копиране. Моля копирайте ръчно: ' + localReferralLink)
      }
    }
  }

  const getRewardTypeLabel = (type: string) => {
    switch (type) {
      case 'discount_10': return '10% отстъпка'
      case 'discount_50': return '50% отстъпка'
      case 'free_month': return 'Безплатен месец'
      default: return type
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50'
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'inactive': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getRewardStatusColor = (status: string) => {
    switch (status) {
      case 'earned': return 'text-green-600 bg-green-50'
      case 'applied': return 'text-blue-600 bg-blue-50'
      case 'expired': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Зареждане на препоръчителна система...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800">❌ {error || 'Неуспешно зареждане на данните'}</p>
            <button 
              onClick={fetchDashboard}
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
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">🤝 Препоръчителна система</h1>
              <p className="text-gray-600">Управлявайте вашите препоръки и следете наградите си</p>
            </div>
            <button
              onClick={fetchDashboard}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <span>🔄</span>
              <span>{loading ? 'Зареждане...' : 'Обнови'}</span>
            </button>
          </div>
        </div>

        {/* Referral Link Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🔗 Вашата препоръчителна връзка</h2>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-4">
                <p className="text-sm text-gray-600 mb-1">Препоръчителен код:</p>
                <p className="font-mono text-lg font-bold text-blue-600">{dashboard.referralCode}</p>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Пълна връзка:</p>
                <p className="text-sm text-gray-800 break-all">
                  {dashboard.referralLink}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={copyReferralLink}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                copiedLink 
                  ? 'bg-green-600 text-white' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {copiedLink ? '✓ Копирано!' : '📋 Копирай връзката'}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Присъедини се към ServiceText Pro и получи достъп до най-добрите майстори в България! ${dashboard.referralLink}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              📱 Сподели в WhatsApp
            </a>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Referred Users */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">👥 Препоръчани потребители</h2>
              
              {dashboard.referredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🤷‍♂️</div>
                  <p className="text-gray-600 mb-4">Все още няма препоръчани потребители</p>
                  <p className="text-sm text-gray-500">Споделете вашата препоръчителна връзка с колеги и приятели!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboard.referredUsers.map((user, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {user.referredUser.firstName?.charAt(0)}{user.referredUser.lastName?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {user.referredUser.businessName || `${user.referredUser.firstName} ${user.referredUser.lastName}`}
                            </h3>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                              {user.status === 'active' ? 'Активен' : user.status === 'pending' ? 'Чакащ' : 'Неактивен'}
                            </span>
                          </div>
                        </div>
                        <a
                          href={user.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          👁️ Виж профила
                        </a>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-gray-900">{user.totalClicks}</div>
                          <div className="text-gray-600">Общо кликове</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{user.validClicks}</div>
                          <div className="text-gray-600">Валидни кликове</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{user.monthlyClicks}</div>
                          <div className="text-gray-600">Този месец</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rewards Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🎁 Награди</h2>
              
              {dashboard.totalRewards.length === 0 ? (
                <div className="text-center py-6">
                  <div className="text-4xl mb-2">🎯</div>
                  <p className="text-gray-600 text-sm">Все още няма спечелени награди</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboard.totalRewards.map((reward) => (
                    <div key={reward.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">
                          {getRewardTypeLabel(reward.rewardType)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRewardStatusColor(reward.status)}`}>
                          {reward.status === 'earned' ? 'Спечелена' : reward.status === 'applied' ? 'Приложена' : 'Изтекла'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>{reward.clicksAchieved} от {reward.clicksRequired} кликове</p>
                        <p>Спечелена: {new Date(reward.earnedAt).toLocaleDateString('bg-BG')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reward Tiers Info */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Нива на награди</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                  <span>50 кликове</span>
                  <span className="font-semibold text-green-600">10% отстъпка</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                  <span>100 кликове</span>
                  <span className="font-semibold text-blue-600">50% отстъпка</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                  <span>500 кликове</span>
                  <span className="font-semibold text-purple-600">Безплатен месец</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Важни правила</h4>
                <ul className="text-xs text-yellow-700 space-y-1">
                  <li>• Максимум 25 валидни кликове на месец</li>
                  <li>• Препоръчаният трябва да остане активен</li>
                  <li>• Самокликванията не се броят</li>
                  <li>• Наградите изтичат след 6 месеца</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
