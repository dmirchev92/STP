'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'

interface ReferralStats {
  referralCode: string
  referralLink: string
  totalReferrals: number
  totalClicks: number
  monthlyClicks: number
  earnedRewards: number
  nextRewardProgress: {
    current: number
    target: number
    rewardType: string
  }
}

export default function ReferralWidget() {
  const { user, isAuthenticated } = useAuth()
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user && (user.role === 'service_provider' || user.role === 'tradesperson')) {
      fetchReferralStats()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, user])

  const fetchReferralStats = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getReferralDashboard()
      
      if (response.data?.success) {
        const data = response.data.data
        
        // Calculate next reward progress
        const totalClicks = data.referredUsers?.reduce((sum: number, user: any) => sum + user.validClicks, 0) || 0
        let nextReward = { current: totalClicks, target: 50, rewardType: '10% отстъпка' }
        
        if (totalClicks >= 500) {
          nextReward = { current: totalClicks, target: 500, rewardType: 'Постигнато максимално ниво!' }
        } else if (totalClicks >= 100) {
          nextReward = { current: totalClicks, target: 500, rewardType: 'Безплатен месец' }
        } else if (totalClicks >= 50) {
          nextReward = { current: totalClicks, target: 100, rewardType: '50% отстъпка' }
        }

        setStats({
          referralCode: data.referralCode,
          referralLink: data.referralLink,
          totalReferrals: data.referredUsers?.length || 0,
          totalClicks: totalClicks,
          monthlyClicks: data.referredUsers?.reduce((sum: number, user: any) => sum + user.monthlyClicks, 0) || 0,
          earnedRewards: data.totalRewards?.length || 0,
          nextRewardProgress: nextReward
        })
      }
    } catch (error) {
      console.error('Error fetching referral stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyReferralLink = async () => {
    if (!stats?.referralLink) return

    try {
      await navigator.clipboard.writeText(stats.referralLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  // Don't show widget for customers
  if (!isAuthenticated || !user || (user.role !== 'service_provider' && user.role !== 'tradesperson')) {
    return null
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🤝 Препоръчителна система</h3>
        <p className="text-gray-600 text-sm">Неуспешно зареждане на данните за препоръки.</p>
      </div>
    )
  }

  const progressPercentage = Math.min((stats.nextRewardProgress.current / stats.nextRewardProgress.target) * 100, 100)

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">🤝 Препоръчителна система</h3>
        <a
          href="/referrals"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Виж всички →
        </a>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{stats.totalReferrals}</div>
          <div className="text-xs text-gray-600">Препоръки</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{stats.totalClicks}</div>
          <div className="text-xs text-gray-600">Общо кликове</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{stats.monthlyClicks}</div>
          <div className="text-xs text-gray-600">Този месец</div>
        </div>
        <div className="text-center p-3 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">{stats.earnedRewards}</div>
          <div className="text-xs text-gray-600">Награди</div>
        </div>
      </div>

      {/* Progress to Next Reward */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Следваща награда</span>
          <span className="text-sm text-gray-600">
            {stats.nextRewardProgress.current}/{stats.nextRewardProgress.target} кликове
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-600 mt-1">{stats.nextRewardProgress.rewardType}</p>
      </div>

      {/* Referral Link */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-3">
            <p className="text-xs text-gray-600 mb-1">Вашият код:</p>
            <p className="font-mono text-sm font-bold text-blue-600">{stats.referralCode}</p>
          </div>
          <button
            onClick={copyReferralLink}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              copiedLink 
                ? 'bg-green-600 text-white' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {copiedLink ? '✓' : '📋'}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Присъедини се към ServiceText Pro и получи достъп до най-добрите майстори в България! ${stats.referralLink}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-green-600 text-white text-center py-2 px-3 rounded-lg hover:bg-green-700 text-sm font-medium"
        >
          📱 WhatsApp
        </a>
        <a
          href="/referrals"
          className="flex-1 bg-gray-200 text-gray-800 text-center py-2 px-3 rounded-lg hover:bg-gray-300 text-sm font-medium"
        >
          📊 Детайли
        </a>
      </div>
    </div>
  )
}
