'use client'

import { useState, useEffect, useRef } from 'react'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface ServiceProvider {
  id: string
  businessName: string
  serviceCategory: string
  description: string
  experienceYears: number
  hourlyRate: number
  city: string
  neighborhood: string
  phoneNumber: string
  email: string
  rating: number
  totalReviews: number
  firstName: string
  lastName: string
  // Support both naming conventions
  business_name?: string
  service_category?: string
  experience_years?: number
  hourly_rate?: number
  phone_number?: string
  total_reviews?: number
  first_name?: string
  last_name?: string
}

interface Message {
  id: string
  sender_type: 'customer' | 'provider'
  sender_name: string
  message: string
  timestamp: string
}

interface ChatModalProps {
  provider: ServiceProvider
  isOpen: boolean
  onClose: () => void
}

export default function ChatModal({ provider, isOpen, onClose }: ChatModalProps) {
  const { user, isAuthenticated } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [isStarted, setIsStarted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Storage keys for persistence
  const storageKey = `chat_${provider.id}`
  const conversationKey = `conversation_${provider.id}`

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-populate user info and start chat for authenticated users - only run once
  useEffect(() => {
    if (isAuthenticated && user) {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
      const finalName = fullName || 'User'
      setCustomerName(finalName)
      setCustomerEmail(user.email || '')
      setCustomerPhone(user.phoneNumber || '')
      
      // Auto-start conversation for authenticated users
      if (!isStarted && !conversationId && finalName && user.email && provider.id && !loading) {
        const savedConversationId = localStorage.getItem(conversationKey)
        if (!savedConversationId) {
          startConversation({ 
            name: finalName, 
            email: user.email || '', 
            phone: user.phoneNumber || '' 
          })
          // Pass user data directly to avoid state timing issues
          startConversation({
            name: finalName,
            email: user.email || '',
            phone: user.phoneNumber || ''
          })
        } else {
          console.log('🔄 Found existing conversation, skipping auto-start')
        }
      }
    }
  }, [isAuthenticated, user, provider.id])

  // Load saved chat state on mount
  useEffect(() => {
    const savedChatData = localStorage.getItem(storageKey)
    const savedConversationId = localStorage.getItem(conversationKey)
    
    if (savedChatData && savedConversationId) {
      try {
        const chatData = JSON.parse(savedChatData)
        // Only restore saved data if user is not authenticated (to avoid overriding auto-populated data)
        if (!isAuthenticated) {
          setCustomerName(chatData.customerName || '')
          setCustomerEmail(chatData.customerEmail || '')
          setCustomerPhone(chatData.customerPhone || '')
        }
        
        setConversationId(savedConversationId)
        setIsStarted(true)
        
        // Load existing messages
        loadMessages(savedConversationId)
        
      } catch (error) {
        console.error('Error loading saved chat data:', error)
      }
    }
  }, [])

  // Save chat state whenever it changes
  useEffect(() => {
    if (isStarted && conversationId && customerName && customerEmail) {
      const chatData = {
        customerName,
        customerEmail,
        customerPhone,
        providerId: provider.id,
        timestamp: Date.now()
      }
      
      localStorage.setItem(storageKey, JSON.stringify(chatData))
      localStorage.setItem(conversationKey, conversationId)
      
      console.log('🗨️ ChatModal opened for provider:', provider.id)
    }
  }, [isStarted, conversationId, customerName, customerEmail, customerPhone, provider.id])

  const startConversation = async (overrideData?: { name?: string, email?: string, phone?: string }) => {
    // Use override data if provided (for auto-start), otherwise use state
    const finalName = overrideData?.name || customerName
    const finalEmail = overrideData?.email || customerEmail
    const finalPhone = overrideData?.phone || customerPhone
    
    // For non-authenticated users, validate required fields
    if (!isAuthenticated && (!finalName || !finalEmail)) {
      alert('Моля въведете име и имейл')
      return
    }

    setLoading(true)
    try {
      const conversationData = {
        providerId: provider.id,
        customerName: finalName,
        customerEmail: finalEmail,
        customerPhone: finalPhone
      }
      console.log('🗨️ Starting conversation with data:', conversationData)
      console.log('🗨️ Customer name value:', `"${finalName}"`, 'Length:', finalName?.length)
      console.log('🗨️ Customer email value:', `"${finalEmail}"`, 'Length:', finalEmail?.length)
      console.log('🗨️ Provider ID value:', `"${provider.id}"`, 'Length:', provider.id?.length)
      
      const response = await apiClient.startMarketplaceConversation(conversationData)

      console.log('✅ Conversation started:', response.data)
      
      setConversationId(response.data.data.conversationId)
      setIsStarted(true)
      
      // Load existing messages if any
      await loadMessages(response.data.data.conversationId)
      
    } catch (error: any) {
      console.error('❌ Error starting conversation:', error)
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      })
      alert(`Грешка при започване на разговора: ${error.response?.data?.message || error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (convId: string) => {
    try {
      console.log('📖 Loading messages for conversation:', convId)
      
      const response = await apiClient.getMarketplaceMessages(convId)
      console.log('✅ Messages loaded:', response.data.data.messages.length)
      
      setMessages(response.data.data.messages)
      
    } catch (error) {
      console.error('❌ Error loading messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return

    console.log('🚀 sendMessage called - start')
    const messageText = newMessage.trim()
    setNewMessage('')
    setLoading(true)

    try {
      console.log('💬 Sending message:', messageText.substring(0, 50) + '...')
      console.log('💬 API Client type:', typeof apiClient)
      console.log('💬 API Client methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(apiClient)))
      
      const response = await apiClient.sendMarketplaceMessage({
        conversationId,
        senderType: 'customer',
        senderName: customerName,
        message: messageText
      })

      console.log('✅ Message sent:', response.data.data.messageId)
      
      // Add message to local state immediately for better UX
      const newMsg: Message = {
        id: response.data.data.messageId,
        sender_type: 'customer',
        sender_name: customerName,
        message: messageText,
        sent_at: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, newMsg])
      
    } catch (error) {
      console.error('❌ Error sending message:', error)
      alert('Грешка при изпращане на съобщението. Моля опитайте отново.')
      setNewMessage(messageText) // Restore message text
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('bg-BG', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const clearChatData = () => {
    localStorage.removeItem(storageKey)
    localStorage.removeItem(conversationKey)
    console.log('🗑️ Cleared chat data for provider:', provider.id)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-blue-600 text-white rounded-t-lg">
          <div 
            className="cursor-pointer hover:bg-blue-700 p-2 rounded transition-colors flex-1"
            onClick={() => window.open(`/provider/${provider.id}`, '_blank')}
            title="Виж профила на доставчика"
          >
            <h3 className="font-semibold text-white">
              {provider.businessName || provider.business_name}
            </h3>
            <p className="text-sm text-white opacity-90">
              {provider.firstName || provider.first_name} {provider.lastName || provider.last_name}
            </p>
            <p className="text-xs text-white opacity-75">
              {provider.serviceCategory || provider.service_category}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isStarted && (
              <button
                onClick={clearChatData}
                className="text-white hover:text-gray-200 text-sm px-2 py-1 rounded bg-blue-700 hover:bg-blue-800"
                title="Изчисти чата"
              >
                🗑️
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {!isStarted ? (
          isAuthenticated ? (
            /* Authenticated User - Loading state while auto-starting */
            <div className="flex-1 p-4 flex flex-col justify-center items-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h4 className="text-lg font-semibold mb-2">
                  Започване на чат с {provider.first_name}
                </h4>
                <p className="text-gray-600">Моля изчакайте...</p>
              </div>
            </div>
          ) : (
            /* Non-authenticated User - Show form */
            <div className="flex-1 p-4 flex flex-col justify-center">
              <h4 className="text-lg font-semibold mb-4 text-center">
                Започнете разговор с {provider.first_name}
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Вашето име *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Въведете вашето име"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Имейл адрес *
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Телефон (незадължително)
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+359..."
                  />
                </div>
                
                <button
                  onClick={() => startConversation()}
                  disabled={loading || !customerName || !customerEmail}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'Започване...' : 'Започни чат'}
                </button>
              </div>
            </div>
          )
        ) : (
          /* Chat Interface */
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <p>Няма съобщения още.</p>
                  <p className="text-sm">Напишете първото си съобщение!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender_type === 'customer'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      <p className="text-sm">{message.message}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender_type === 'customer' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatTime(message.sent_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Напишете съобщение..."
                  className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !newMessage.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? '...' : '📤'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
