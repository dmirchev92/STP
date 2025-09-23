'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import ReferralWidget from '@/components/ReferralWidget'

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated || (user?.role !== 'tradesperson' && user?.role !== 'service_provider')) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">⚙️ Настройки</h1>
          <p className="text-gray-600">Управлявайте вашия профил и настройки</p>
        </div>


        {/* Referral Widget */}
        <ReferralWidget />

        {/* Profile Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">👤 Профил</h2>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg border-b border-gray-100">
              <span className="text-gray-700">Редактирай профил</span>
              <span className="text-gray-400 text-xl">›</span>
            </button>
            <button className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg border-b border-gray-100">
              <span className="text-gray-700">Смени парола</span>
              <span className="text-gray-400 text-xl">›</span>
            </button>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🔔 Известия</h2>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg border-b border-gray-100">
              <span className="text-gray-700">Push известия</span>
              <span className="text-gray-400 text-xl">›</span>
            </button>
            <button className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg border-b border-gray-100">
              <span className="text-gray-700">Email известия</span>
              <span className="text-gray-400 text-xl">›</span>
            </button>
          </div>
        </div>

        {/* Information Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">ℹ️ Информация</h2>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg border-b border-gray-100">
              <span className="text-gray-700">Условия за ползване</span>
              <span className="text-gray-400 text-xl">›</span>
            </button>
            <button className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg border-b border-gray-100">
              <span className="text-gray-700">Политика за поверителност</span>
              <span className="text-gray-400 text-xl">›</span>
            </button>
            <button className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg border-b border-gray-100">
              <span className="text-gray-700">За приложението</span>
              <span className="text-gray-400 text-xl">›</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
