'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Header } from '@/components/Header'
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
  address: string
  phone_number: string
  email: string
  website_url: string
  rating: number
  total_reviews: number
  first_name: string
  last_name: string
  is_verified: boolean
}

export default function ProviderDetailPage() {
  const params = useParams()
  const [provider, setProvider] = useState<ServiceProvider | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showContactForm, setShowContactForm] = useState(false)
  const [clickTracked, setClickTracked] = useState(false)

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        setLoading(true)
        setError(null)

        const providerId = params.id as string
        console.log('🔍 Fetching provider:', providerId)

        const response = await apiClient.getProvider(providerId)
        
        const data = response.data?.data || response.data?.provider
        if (data) {
          setProvider(data)
        } else {
          setError('Service provider not found')
        }
        
      } catch (err) {
        console.error('❌ Error fetching provider:', err)
        setError('Failed to load service provider details')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchProvider()
    }
  }, [params.id])

  // Separate useEffect for click tracking to prevent duplicate calls
  useEffect(() => {
    if (!provider || !params.id) return

    const providerId = params.id as string
    
    // Use user-based tracking - 1 click per user per profile forever
    // Get current user ID to create unique tracking key
    const userData = localStorage.getItem('user_data')
    let currentUserId = null
    
    try {
      if (userData) {
        const user = JSON.parse(userData)
        currentUserId = user.id
      }
    } catch (e) {
      console.error('Error parsing user data:', e)
    }
    
    // Create unique key combining user ID and profile ID
    const userClickKey = currentUserId ? `user_${currentUserId}_clicked_profile_${providerId}` : `anonymous_clicked_profile_${providerId}`
    const hasUserClickedBefore = localStorage.getItem(userClickKey)
    const canTrackClick = !hasUserClickedBefore
    
    console.log(`[CLICK TRACKING] Provider: ${providerId}, User: ${currentUserId || 'anonymous'}, Can track: ${canTrackClick}, Click tracked state: ${clickTracked}`)
    
    if (canTrackClick && !clickTracked) {
      const trackClick = async () => {
        try {
          // Mark as tracked immediately to prevent duplicate calls
          setClickTracked(true)
          localStorage.setItem(userClickKey, 'true')
          
          const trackUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.129:3000/api/v1'}/referrals/track/${providerId}`;
          console.log(`[FRONTEND] Tracking profile click: ${trackUrl}`);
          
          // Get or generate visitor ID
          let visitorId = localStorage.getItem('visitor_id');
          if (!visitorId) {
            visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('visitor_id', visitorId);
            console.log(`[FRONTEND] Generated new visitor ID: ${visitorId}`);
          } else {
            console.log(`[FRONTEND] Using existing visitor ID: ${visitorId}`);
          }
          
          // Check if user is authenticated and get their user ID
          const userData = localStorage.getItem('user_data')
          const customerUserId = userData ? JSON.parse(userData).id : null
          
          console.log(`[FRONTEND] Customer user ID: ${customerUserId || 'null (not authenticated)'}`)
          
          const trackResponse = await apiClient.trackReferralClick(providerId, {
            customerUserId,
            visitorId
          });
          
          console.log(`[FRONTEND] Track response:`, trackResponse.data);
          
        } catch (trackErr) {
          console.error('Error tracking profile click:', trackErr)
          // Reset tracking state on error so it can be retried
          setClickTracked(false)
          localStorage.removeItem(userClickKey)
        }
      }

      trackClick()
    }
  }, [provider, params.id, clickTracked])

  const getCategoryDisplayName = (category: string | undefined) => {
    if (!category) return 'Общи';
    
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

  // Mock reviews data
  const mockReviews = [
    {
      id: 1,
      customer_name: "Мария Георгиева",
      rating: 5,
      comment: "Отличен специалист! Бързо и качествено оправи течта в банята. Препоръчвам!",
      date: "2024-01-15"
    },
    {
      id: 2,
      customer_name: "Петър Димитров",
      rating: 4,
      comment: "Много професионален подход. Дойде точно навреме и свърши работата перфектно.",
      date: "2024-01-10"
    },
    {
      id: 3,
      customer_name: "Анна Стоянова",
      rating: 5,
      comment: "Страхотен майстор! Смени цялата инсталация в кухнята за един ден. Чисто и аккуратно.",
      date: "2024-01-05"
    },
    {
      id: 4,
      customer_name: "Георги Николов",
      rating: 3,
      comment: "Добра работа, но малко закъсня с часа. Иначе качеството е добро.",
      date: "2023-12-28"
    },
    {
      id: 5,
      customer_name: "Елена Василева",
      rating: 5,
      comment: "Най-добрият водопроводчик в София! Винаги се обръщам към него за всички проблеми.",
      date: "2023-12-20"
    }
  ];

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

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement contact form submission
    alert('Съобщението ще бъде изпратено скоро!')
    setShowContactForm(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Зареждане...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !provider) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800">❌ {error || 'Услугата не е намерена'}</p>
            <a 
              href="/search" 
              className="mt-4 inline-block bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Върни се към търсенето
            </a>
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
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-600">
            <li><a href="/" className="hover:text-blue-600">Начало</a></li>
            <li>›</li>
            <li><a href="/search" className="hover:text-blue-600">Търсене</a></li>
            <li>›</li>
            <li className="text-gray-900">{provider.business_name}</li>
          </ol>
        </nav>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 flex flex-col">
            {/* Provider Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 mb-6">
              <div className="flex items-start gap-6 mb-8">
                {/* Profile Picture */}
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                    {(provider as any).profileImageUrl ? (
                      <img 
                        src={(provider as any).profileImageUrl} 
                        alt={`${provider.first_name} ${provider.last_name}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-2xl font-semibold">
                        {provider.first_name?.charAt(0)}{provider.last_name?.charAt(0)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Provider Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h1 className="text-2xl font-bold text-gray-900 mb-1">
                        {(provider as any).businessName || provider.business_name || `${provider.first_name} ${provider.last_name}`}
                        {provider.is_verified && (
                          <span className="ml-2 text-green-600 text-lg">✓</span>
                        )}
                      </h1>
                      <p className="text-blue-600 font-medium mb-2">
                        {getCategoryDisplayName((provider as any).serviceCategory || provider.service_category)}
                      </p>
                      <p className="text-gray-600 text-sm">
                        {(provider as any).experienceYears || provider.experience_years || 0} години опит | {provider.city}, {provider.neighborhood}
                      </p>
                    </div>

                    {/* Rating Stars - Right Side */}
                    <div className="flex flex-col items-end ml-4">
                      <div className="flex items-center mb-1">
                        <span className="text-xl">{getStars(provider.rating || 0)}</span>
                      </div>
                      <span className="text-gray-600 text-sm">
                        {(provider.rating || 0).toFixed(1)} ({provider.total_reviews || 0} отзива)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* About Section */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">За мен</h2>
                <p className="text-gray-700 leading-relaxed">
                  {provider.description || `Професионални ${getCategoryDisplayName((provider as any).serviceCategory || provider.service_category).toLowerCase()} услуги от ${provider.first_name} ${provider.last_name}. Качество и надеждност с ${(provider as any).experienceYears || provider.experience_years || 0} години опит в сферата.`}
                </p>
              </div>
            </div>

            {/* Services Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Предлагани услуги</h2>
              <div className="grid gap-3">
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <span className="mr-3">🔧</span>
                  <span>Основни {getCategoryDisplayName((provider as any).serviceCategory || provider.service_category).toLowerCase()} услуги</span>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <span className="mr-3">🚨</span>
                  <span>Спешни повиквания</span>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <span className="mr-3">📋</span>
                  <span>Консултации и оценки</span>
                </div>
              </div>
            </div>

            {/* Gallery Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Галерия от завършени проекти</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Placeholder for future gallery images */}
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-4xl">📷</span>
                </div>
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-4xl">📷</span>
                </div>
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-4xl">📷</span>
                </div>
              </div>
              <p className="text-gray-500 text-center mt-4">
                Галерията ще бъде попълнена с примери от завършени проекти
              </p>
            </div>

            {/* Certificates Section - Only show if certificates exist */}
            {(provider as any).certificates && (provider as any).certificates.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Сертификати и квалификации</h2>
                <div className="grid gap-4">
                  {(provider as any).certificates.map((cert: any, index: number) => (
                    <div key={cert.id || index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{cert.title}</h3>
                          {cert.issuedBy && (
                            <p className="text-sm text-gray-600 mb-1">Издаден от: {cert.issuedBy}</p>
                          )}
                          {cert.issuedAt && (
                            <p className="text-sm text-gray-500">
                              Дата: {new Date(cert.issuedAt).toLocaleDateString('bg-BG')}
                            </p>
                          )}
                        </div>
                        <div className="ml-4">
                          <span className="text-2xl">🏆</span>
                        </div>
                      </div>
                      {cert.fileUrl && (
                        <div className="mt-3">
                          <a 
                            href={cert.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                          >
                            📄 Виж сертификата
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Spacer to align with advertisement section */}
            <div className="flex-1"></div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 flex flex-col">
          {/* Contact Card */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 sticky top-4">
            <h3 className="text-lg font-semibold mb-4">Свържете се</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center">
                <span className="mr-3">📞</span>
                <a 
                  href={`tel:${(provider as any).profilePhone || provider.phone_number}`}
                  className="text-blue-600 hover:underline"
                >
                  {(provider as any).profilePhone || provider.phone_number}
                </a>
              </div>
              <div className="flex items-center">
                <span className="mr-3">📧</span>
                <a 
                  href={`mailto:${provider.email}`}
                  className="text-blue-600 hover:underline break-all"
                >
                  {provider.email}
                </a>
              </div>
              {provider.website_url && (
                <div className="flex items-center">
                  <span className="mr-3">🌐</span>
                  <a 
                    href={provider.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    Уебсайт
                  </a>
                </div>
              )}
              {provider.address && (
                <div className="flex items-start">
                  <span className="mr-3 mt-1">📍</span>
                  <span className="text-gray-700">{provider.address}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setShowContactForm(true)}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700"
              >
                ✉️ Изпрати съобщение
              </button>
            </div>
          </div>

          {/* Quick Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Бърза информация</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Категория:</span>
                <span>{getCategoryDisplayName((provider as any).serviceCategory || provider.service_category)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Локация:</span>
                <span>{provider.city}, {provider.neighborhood}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Опит:</span>
                <span>{(provider as any).experienceYears || provider.experience_years || 0} години</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Телефон:</span>
                <span>{(provider as any).profilePhone || provider.phone_number || 'Няма телефон'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Рейтинг:</span>
                <span>{(provider.rating || 0).toFixed(1)}/5</span>
              </div>
            </div>
          </div>

          {/* Advertisement Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mt-6 flex-1">
            <h3 className="text-lg font-semibold mb-4 text-center">🎯 Специална оферта</h3>
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border-l-4 border-green-500">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">💰</span>
                <h4 className="font-bold text-green-700">20% отстъпка за нови клиенти!</h4>
              </div>
              <p className="text-gray-700 text-sm mb-4">
                Възползвайте се от специалната ни оферта за първо посещение. Валидна до края на месеца!
              </p>
              <div className="space-y-3 text-sm mb-4">
                <div className="flex items-center">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Безплатна консултация и оглед</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Гаранция 2 години на всички услуги</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>24/7 спешни услуги</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Професионални инструменти и материали</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Почистване след работа включено</span>
                </div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 mb-4 border border-yellow-200">
                <div className="flex items-center mb-2">
                  <span className="text-lg mr-2">🏆</span>
                  <span className="font-semibold text-yellow-800">Защо да изберете нас?</span>
                </div>
                <ul className="text-xs text-yellow-700 space-y-1">
                  <li>• Над 8 години опит в сферата</li>
                  <li>• Сертифицирани специалисти</li>
                  <li>• Фиксирани цени без скрити такси</li>
                  <li>• Работим и в почивни дни</li>
                </ul>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
                <div className="flex items-center mb-2">
                  <span className="text-lg mr-2">📞</span>
                  <span className="font-semibold text-blue-800">Как да се свържете с нас?</span>
                </div>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Позвънете на 0888665489</li>
                  <li>• Изпратете съобщение чрез формата</li>
                  <li>• Пишете ни на WhatsApp или Viber</li>
                  <li>• Работно време: 08:00 - 20:00 ч.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* Contact Form Modal */}
        {showContactForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Свържете се с {provider.business_name}</h3>
                <button
                  onClick={() => setShowContactForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Вашето име
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Въведете вашето име"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+359..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Съобщение
                  </label>
                  <textarea
                    required
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Опишете услугата, от която се нуждаете..."
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowContactForm(false)}
                    className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50"
                  >
                    Отказ
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                  >
                    Изпрати
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center">
              <div className="flex items-center justify-between max-w-5xl mx-auto mb-4">
                {/* Left side - Rating with stars */}
                <div className="flex items-center space-x-3 bg-white/15 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20 shadow-lg">
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold text-white leading-none">{(provider.rating || 0).toFixed(1)}</span>
                    <div className="flex text-yellow-400 text-lg mt-1">
                      {getStars(provider.rating || 0)}
                    </div>
                  </div>
                </div>

                {/* Center - Title */}
                <div className="bg-white/15 backdrop-blur-md rounded-2xl px-8 py-4 border border-white/20 shadow-lg">
                  <h2 className="text-3xl font-bold text-white tracking-wide">💬 Отзиви ⭐</h2>
                </div>

                {/* Right side - Review count */}
                <div className="flex items-center space-x-3 bg-white/15 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/20 shadow-lg">
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-bold text-white leading-none">{provider.total_reviews || 0}</span>
                    <span className="text-white/80 text-sm font-medium mt-1">отзива</span>
                  </div>
                </div>
              </div>
              <p className="text-white/90 text-lg font-medium">Какво казват нашите клиенти</p>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-4 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-6 right-16 w-16 h-16 bg-white/10 rounded-full blur-lg"></div>
          <div className="absolute top-8 right-24 w-12 h-12 bg-white/10 rounded-full blur-md"></div>
        </div>

        {/* Scrolling Reviews Section */}
        <div className="bg-gradient-to-r from-purple-200 to-blue-200 border-t border-purple-300 py-4 overflow-hidden">
          <div className="flex animate-scroll space-x-8">
            {/* Duplicate reviews for continuous scroll */}
            {[...mockReviews, ...mockReviews].map((review, index) => (
              <div key={`${review.id}-${index}`} className="flex-shrink-0 bg-white rounded-lg p-4 shadow-sm min-w-[300px] max-w-[300px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{review.customer_name}</span>
                  <span className="text-lg">{getStars(review.rating)}</span>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>
                <p className="text-gray-500 text-xs mt-2">{new Date(review.date).toLocaleDateString('bg-BG')}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}


