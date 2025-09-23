'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Header } from '@/components/Header'
import ChatModal from '@/components/ChatModal'
import UnifiedCaseModal from '@/components/UnifiedCaseModal'
import ChatWidget from '@/components/ChatWidget'
import { Footer } from '@/components/Footer'
import { apiClient } from '@/lib/api'

interface ServiceProvider {
  id: string
  business_name: string
  service_category: string
  description: string
  experience_years: number
  hourly_rate: number
  city: string
  neighborhood: string
  phone_number: string
  email: string
  rating: number
  total_reviews: number
  first_name: string
  last_name: string
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [providers, setProviders] = useState<ServiceProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chatModalOpen, setChatModalOpen] = useState(false)
  const [caseModalOpen, setCaseModalOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null)
  const [realTimeUpdates, setRealTimeUpdates] = useState(0) // Counter to track updates
  const [socketService, setSocketService] = useState<any>(null)
  const [isSocketConnected, setIsSocketConnected] = useState(false)

  // Get search parameters
  const category = searchParams.get('category')
  const city = searchParams.get('city')
  const neighborhood = searchParams.get('neighborhood')

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setLoading(true)
        setError(null)

        const filters: any = {}
        if (category) filters.category = category
        if (city) filters.city = city
        if (neighborhood) filters.neighborhood = neighborhood

        console.log('🔍 Searching with filters:', filters)

        const response = await apiClient.searchProviders(filters)
        
        console.log('🔍 Full API response:', response)
        console.log('🔍 Response data:', response.data)
        const providersData = response.data?.data
        console.log('🔍 Providers array:', providersData)

        if (Array.isArray(providersData)) {
          console.log('✅ Setting providers:', providersData.length, 'items')
          setProviders(providersData as any)
        } else {
          console.log('❌ No providers found in response, setting empty array')
          setProviders([])
        }
        
      } catch (err) {
        console.error('❌ Error fetching providers:', err)
        setError('Failed to load service providers. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchProviders()
  }, [category, city, neighborhood])

  // Initialize socket service (client-side only)
  useEffect(() => {
    const initSocket = async () => {
      try {
        const { marketplaceSocket } = await import('@/lib/socket')
        setSocketService(marketplaceSocket)
        
        // Monitor connection status
        const checkConnection = () => {
          setIsSocketConnected(marketplaceSocket?.getConnectionStatus() || false)
        }
        
        checkConnection()
        const interval = setInterval(checkConnection, 1000)
        
        return () => clearInterval(interval)
      } catch (error) {
        console.error('Failed to load socket service:', error)
      }
    }
    
    initSocket()
  }, [])

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!socketService) {
      console.log('⚠️ Socket service not available yet')
      return
    }
    
    console.log('🔌 Setting up real-time provider updates...')
    
    // Listen for provider profile updates
    socketService.onProviderProfileUpdated((data: any) => {
      console.log('📡 Provider profile updated:', data.providerId, data.provider)
      
      setProviders(currentProviders => {
        const updatedProviders = [...currentProviders]
        const existingIndex = updatedProviders.findIndex(p => p.id === data.providerId)
        
        if (existingIndex >= 0) {
          // Update existing provider
          const updatedProvider = {
            ...updatedProviders[existingIndex],
            business_name: data.provider.business_name,
            service_category: data.provider.service_category,
            description: data.provider.description,
            experience_years: data.provider.experience_years,
            hourly_rate: data.provider.hourly_rate,
            city: data.provider.city,
            neighborhood: data.provider.neighborhood,
            phone_number: data.provider.phone_number,
            email: data.provider.email,
            first_name: data.provider.first_name,
            last_name: data.provider.last_name,
            rating: data.provider.rating || 0,
            total_reviews: data.provider.total_reviews || 0
          }
          
          updatedProviders[existingIndex] = updatedProvider
          console.log('✅ Updated existing provider in list:', data.providerId)
        } else {
          // Check if this new provider matches current search filters
          const matchesFilters = (
            (!category || data.provider.service_category === category) &&
            (!city || data.provider.city === city) &&
            (!neighborhood || data.provider.neighborhood === neighborhood)
          )
          
          if (matchesFilters) {
            // Add new provider to the list
            const newProvider = {
              id: data.provider.id,
              business_name: data.provider.business_name,
              service_category: data.provider.service_category,
              description: data.provider.description,
              experience_years: data.provider.experience_years,
              hourly_rate: data.provider.hourly_rate,
              city: data.provider.city,
              neighborhood: data.provider.neighborhood,
              phone_number: data.provider.phone_number,
              email: data.provider.email,
              first_name: data.provider.first_name,
              last_name: data.provider.last_name,
              rating: data.provider.rating || 0,
              total_reviews: data.provider.total_reviews || 0
            }
            
            updatedProviders.unshift(newProvider) // Add to beginning of list
            console.log('✅ Added new provider to list:', data.providerId)
          }
        }
        
        return updatedProviders
      })
      
      // Increment update counter to show visual feedback
      setRealTimeUpdates(prev => prev + 1)
    })

    // Join relevant rooms for targeted updates
    if (city) {
      socketService.joinLocationRoom(city, neighborhood || undefined)
    }
    if (category) {
      socketService.joinCategoryRoom(category)
    }

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up real-time listeners...')
      socketService.offProviderProfileUpdated()
      
      if (city) {
        socketService.leaveLocationRoom(city, neighborhood || undefined)
      }
      if (category) {
        socketService.leaveCategoryRoom(category)
      }
    }
  }, [socketService, category, city, neighborhood]) // Re-setup listeners when socket or search filters change

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
      'appliance_repair': 'Ремонт на уреди'
    }
    return categoryNames[category] || category
  }

  const getStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push('⭐')
    }
    if (hasHalfStar) {
      stars.push('⭐')
    }
    while (stars.length < 5) {
      stars.push('☆')
    }
    return stars.join('')
  }

  const handleStartChat = (provider: ServiceProvider) => {
    setSelectedProvider(provider)
    setChatModalOpen(true)
  }

  const handleCreateCase = (provider: ServiceProvider) => {
    console.log('Selected provider for case creation:', provider)
    console.log('Provider category:', (provider as any).serviceCategory || (provider as any).service_category)
    setSelectedProvider(provider)
    setCaseModalOpen(true)
  }

  const handleCaseSubmit = async (formData: any) => {
    try {
      // Prepare case data based on assignment type
      const caseData = {
        ...formData,
        // Only include provider info if assignment type is 'specific'
        providerId: formData.assignmentType === 'specific' ? selectedProvider?.id : null,
        providerName: formData.assignmentType === 'specific' 
          ? (selectedProvider as any)?.businessName || 
            (selectedProvider as any)?.business_name || 
            `${selectedProvider?.first_name || ''} ${selectedProvider?.last_name || ''}`.trim() || 
            'Специалист'
          : null,
        isOpenCase: formData.assignmentType === 'open'
      }

      console.log('Creating case with data:', caseData)
      
      // Submit the case using the API client
      const response = await apiClient.createCase(caseData)
      
      if (response.data?.success) {
        // Close modal and show success message
        setCaseModalOpen(false)
        setSelectedProvider(null)
        
        const successMessage = formData.assignmentType === 'specific'
          ? `Заявката е изпратена директно към ${
              (selectedProvider as any)?.businessName || 
              (selectedProvider as any)?.business_name || 
              selectedProvider?.first_name || 
              'специалиста'
            }! Ще получите потвърждение скоро.`
          : 'Заявката е създадена и е достъпна за всички специалисти! Ще получите потвърждение скоро.'
        
        alert(successMessage)
      } else {
        throw new Error(response.data?.message || 'Failed to create case')
      }
    } catch (error) {
      console.error('Error creating case:', error)
      alert('Възникна грешка при създаването на заявката. Моля, опитайте отново.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 relative overflow-hidden">
      {/* Industrial background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-200/20 to-slate-200/20 rounded-lg blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-gradient-to-br from-orange-200/20 to-slate-200/20 rounded-lg blur-3xl"></div>
      </div>
      
      <Header />
      
      <main className="relative z-10 container mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🔍</span>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-blue-600 bg-clip-text text-transparent">
                Намерени Услуги
              </h1>
            </div>
            
            {/* Real-time status indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isSocketConnected ? 'Актуални данни' : 'Без връзка'}
              </span>
              {realTimeUpdates > 0 && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {realTimeUpdates} обновления
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 text-sm text-gray-600">
            {category && (
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                📋 {getCategoryDisplayName(category)}
              </span>
            )}
            {city && (
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                🏙️ {city}
              </span>
            )}
            {neighborhood && (
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                📍 {neighborhood}
              </span>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Зареждане на услуги...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800">❌ {error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Опитай отново
            </button>
          </div>
        )}

        {/* Results */}
        {!loading && !error && (
          <>
            <div className="mb-6 bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-blue-600">📊</span>
                <p className="text-slate-700 font-semibold">
                  Намерени {providers.length} {providers.length === 1 ? 'услуга' : 'услуги'}
                </p>
              </div>
            </div>

            {providers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Няма намерени услуги
                </h3>
                <p className="text-gray-600 mb-6">
                  Опитайте с различни критерии за търсене
                </p>
                <a 
                  href="/" 
                  className="bg-gradient-to-r from-blue-600 to-orange-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                >
                  Върни се към началото
                </a>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {providers.map((provider) => (
                  <div key={provider.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-slate-200">
                    <div className="p-6">
                      {/* Provider Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
                              <span className="text-white text-sm font-bold">
                                {(provider as any).firstName?.charAt(0)}{(provider as any).lastName?.charAt(0)}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">
                              {(provider as any).businessName}
                            </h3>
                          </div>
                          <p className="text-sm text-slate-600 font-medium">
                            {(provider as any).firstName} {(provider as any).lastName}
                          </p>
                        </div>
                        <span className="bg-gradient-to-r from-blue-100 to-orange-100 text-slate-700 text-xs px-3 py-1 rounded-full font-semibold border border-blue-200">
                          {getCategoryDisplayName((provider as any).serviceCategory || (provider as any).service_category)}
                        </span>
                      </div>

                      {/* Rating */}
                      <div className="flex items-center mb-4 p-2 bg-slate-50 rounded-lg">
                        <span className="text-lg mr-2">{getStars(provider.rating)}</span>
                        <span className="text-sm text-slate-700 font-semibold">
                          {Number((provider as any).rating ?? 0).toFixed(1)} ({(provider as any).totalReviews ?? 0} отзива)
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-slate-700 text-sm mb-4 line-clamp-3 bg-slate-50 p-3 rounded-lg italic">
                        {(provider as any).description || 'Професионални услуги с качество и гаранция.'}
                      </p>

                      {/* Details */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-2">📍</span>
                          <span>{(provider as any).city}, {(provider as any).neighborhood}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-2">⭐</span>
                          <span>{(provider as any).experienceYears} години опит</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-2">📞</span>
                          <span>{(provider as any).phoneNumber}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <a
                          href={`/provider/${provider.id}`}
                          className="flex-1 bg-slate-600 text-white text-center py-2 px-4 rounded-md hover:bg-slate-700 transition-colors text-sm font-medium"
                        >
                          Виж повече
                        </a>
                        <button
                          onClick={() => handleCreateCase(provider)}
                          className="bg-orange-500 text-white py-2 px-4 rounded-md hover:bg-orange-600 transition-colors text-sm font-medium"
                        >
                          Заявка
                        </button>
                        <button
                          onClick={() => handleStartChat(provider)}
                          className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Чат
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Back to Home */}
        <div className="text-center mt-12">
          <a 
            href="/" 
            className="inline-flex items-center gap-2 bg-gradient-to-r from-slate-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300 font-medium"
          >
            <span>🏠</span>
            Върни се към началото
          </a>
        </div>
      </main>
      
      <Footer />

      {/* Chat Modal */}
      {selectedProvider && (
        <ChatModal
          provider={selectedProvider}
          isOpen={chatModalOpen}
          onClose={() => {
            setChatModalOpen(false)
            setSelectedProvider(null)
          }}
        />
      )}

      {/* Case Creation Modal */}
      {selectedProvider && (
        <UnifiedCaseModal
          isOpen={caseModalOpen}
          onClose={() => {
            setCaseModalOpen(false)
            setSelectedProvider(null)
          }}
          onSubmit={handleCaseSubmit}
          providerName={
            (selectedProvider as any).businessName || 
            (selectedProvider as any).business_name || 
            `${selectedProvider.first_name || ''} ${selectedProvider.last_name || ''}`.trim() || 
            'Специалист'
          }
          providerId={selectedProvider.id}
          providerCategory={
            (selectedProvider as any).serviceCategory || 
            (selectedProvider as any).service_category
          }
          customerPhone={user?.phoneNumber || ''}
          mode="direct"
        />
      )}

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  )
}
