'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import UnifiedCaseModal from '@/components/UnifiedCaseModal'
import ChatWidget from '@/components/ChatWidget'
import { apiClient } from '@/lib/api'

export default function CreateCasePage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [caseModalOpen, setCaseModalOpen] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, router])

  // Open modal automatically when page loads
  useEffect(() => {
    if (isAuthenticated) {
      setCaseModalOpen(true)
    }
  }, [isAuthenticated])

  const handleCaseSubmit = async (formData: any) => {
    try {
      // Prepare case data for open case (no specific provider)
      const caseData = {
        ...formData,
        providerId: null, // No specific provider
        providerName: null,
        isOpenCase: true, // This is an open case for all providers
        customerId: user?.id, // Add customer ID
        category: formData.serviceType || 'general' // Map service type to category
      }

      console.log('Creating open case with data:', caseData)
      
      // Submit the case using the API client
      const response = await apiClient.createCase(caseData)
      
      if (response.data?.success) {
        // Close modal and show success message
        setCaseModalOpen(false)
        
        const successMessage = 'Заявката е създадена и е достъпна за всички специалисти! Ще получите потвърждение скоро.'
        
        alert(successMessage)
        
        // Redirect to dashboard or home
        router.push('/dashboard')
      } else {
        throw new Error(response.data?.message || 'Failed to create case')
      }
    } catch (error) {
      console.error('Error creating case:', error)
      alert('Възникна грешка при създаването на заявката. Моля, опитайте отново.')
    }
  }

  const handleModalClose = () => {
    setCaseModalOpen(false)
    // Redirect back to home when modal is closed
    router.push('/')
  }

  if (!isAuthenticated) {
    return null // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Създай нова заявка
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Опишете услугата, която търсите и ние ще ви свържем с подходящи майстори
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Как работи?
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">1. Опишете проблема</h3>
                <p className="text-gray-600 text-sm">
                  Разкажете какво точно ви трябва и кога
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔍</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">2. Получете оферти</h3>
                <p className="text-gray-600 text-sm">
                  Специалистите ще ви изпратят своите предложения
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✅</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">3. Изберете най-добрия</h3>
                <p className="text-gray-600 text-sm">
                  Сравнете офертите и изберете подходящия майстор
                </p>
              </div>
            </div>
          </div>

          {/* Create Case Button */}
          <div className="text-center">
            <button
              onClick={() => setCaseModalOpen(true)}
              className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 px-8 rounded-lg hover:from-green-700 hover:to-blue-700 text-lg font-medium shadow-lg hover:shadow-xl transition-all"
            >
              📋 Създай заявка сега
            </button>
          </div>
        </div>
      </main>
      
      <Footer />

      {/* Case Creation Modal - Same as in search page */}
      <UnifiedCaseModal
        isOpen={caseModalOpen}
        onClose={handleModalClose}
        onSubmit={handleCaseSubmit}
        providerName="Всички специалисти" // For open cases
        providerId={undefined} // No specific provider
        providerCategory="general" // General category for open cases
        customerPhone={user?.phoneNumber || ''}
        mode="direct"
      />

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  )
}