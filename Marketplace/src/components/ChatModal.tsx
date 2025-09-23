'use client'

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import UnifiedCaseModal from './UnifiedCaseModal';
import ServiceRequestButton from './ServiceRequestButton';
import { apiClient } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface ServiceProvider {
  id: string
  // Support both naming conventions - make all optional and handle both
  businessName?: string
  business_name?: string
  serviceCategory?: string
  service_category?: string
  description?: string
  experienceYears?: number
  experience_years?: number
  hourlyRate?: number
  hourly_rate?: number
  city: string
  neighborhood?: string
  phoneNumber?: string
  phone_number?: string
  email?: string
  rating: number
  totalReviews?: number
  total_reviews?: number
  firstName?: string
  first_name?: string
  lastName?: string
  last_name?: string
}

interface Message {
  id: string
  conversationId: string
  senderType: 'customer' | 'provider'
  senderName: string
  message: string
  messageType?: string
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
  const [socket, setSocket] = useState<Socket | null>(null)
  const [showUnifiedModal, setShowUnifiedModal] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState<any>(null)
  const [isSubmittingTemplate, setIsSubmittingTemplate] = useState(false)
  const [modalMode, setModalMode] = useState<'template' | 'direct'>('direct')
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

  // Initialize user data only once when modal opens
  useEffect(() => {
    if (isOpen && isAuthenticated && user && !isStarted) {
      console.log('🗨️ ChatModal opened for provider:', provider.id)
      
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
      const finalName = fullName || 'User'
      
      setCustomerName(finalName)
      setCustomerEmail(user.email || '')
      setCustomerPhone(user.phoneNumber || '')
      
      // Check for existing conversation
      const savedConversationId = localStorage.getItem(conversationKey)
      if (savedConversationId) {
        setConversationId(savedConversationId)
        setIsStarted(true)
        loadMessages(savedConversationId)
      } else {
        // Auto-start conversation for authenticated users
        startConversation({ 
          name: finalName, 
          email: user.email || '', 
          phone: user.phoneNumber || '' 
        })
      }
    }
  }, [isOpen, isAuthenticated, user, provider.id])

  // Initialize socket for real-time messaging
  useEffect(() => {
    if (!isOpen || !conversationId || typeof window === 'undefined') return

    const initSocket = () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.129:3000/api/v1'
        const socketUrl = apiUrl.replace('/api/v1', '')
        
        console.log('💬 Customer connecting to socket:', socketUrl)
        
        const socketInstance = io(socketUrl, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        })

        socketInstance.on('connect', () => {
          console.log('✅ Customer connected to WebSocket server')
          setSocket(socketInstance)
          
          // Join conversation room for real-time updates
          socketInstance.emit('join-conversation', conversationId)
          console.log('🏠 Customer joined conversation room:', conversationId)
        })

        socketInstance.on('disconnect', (reason) => {
          console.log('❌ Customer disconnected from WebSocket server:', reason)
        })

        socketInstance.on('connect_error', (error) => {
          console.error('❌ Customer WebSocket connection error:', error)
        })

      } catch (error) {
        console.error('Failed to create customer socket:', error)
      }
    }

    initSocket()

    return () => {
      if (socket) {
        socket.disconnect()
        console.log('🔌 Customer socket disconnected')
      }
    }
  }, [isOpen, conversationId])

  // Setup real-time message listeners
  useEffect(() => {
    if (!socket || !conversationId) return

    const handleNewMessage = (data: any) => {
      console.log('💬 Customer received new message:', data)
      
      // Only add messages from providers (not our own messages)
      if (data.conversationId === conversationId && data.messageId && data.senderType === 'provider') {
        const newMessage: Message = {
          id: data.messageId,
          conversationId: data.conversationId,
          senderType: data.senderType,
          senderName: data.senderName,
          message: data.message,
          messageType: data.messageType,
          timestamp: data.timestamp
        }
        
        setMessages(prev => {
          const messageExists = prev.some(msg => msg.id === data.messageId)
          if (messageExists) return prev
          
          console.log('📝 Adding provider message to customer chat:', newMessage)
          return [...prev, newMessage]
        })
        scrollToBottom()
      }
    }

    socket.on('new_message', handleNewMessage)

    return () => {
      socket.off('new_message', handleNewMessage)
    }
  }, [socket, conversationId])

  const startConversation = async (overrideData?: { name?: string, email?: string, phone?: string }) => {
    if (loading || isStarted) return

    setLoading(true)
    try {
      const data = {
        providerId: provider.id,
        customerName: overrideData?.name || customerName,
        customerEmail: overrideData?.email || customerEmail,
        customerPhone: overrideData?.phone || customerPhone
      }

      console.log('🚀 Starting conversation with data:', data)

      const response = await apiClient.createOrGetConversation(data)
      
      if (response.data?.success && response.data?.data?.conversationId) {
        const newConversationId = response.data.data.conversationId
        setConversationId(newConversationId)
        setIsStarted(true)
        
        // Save to localStorage
        localStorage.setItem(storageKey, JSON.stringify(data))
        localStorage.setItem(conversationKey, newConversationId)
        
        // Load existing messages
        await loadMessages(newConversationId)
      }
    } catch (error) {
      console.error('Error starting conversation:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (convId: string) => {
    try {
      setLoading(true)
      const response = await apiClient.getMarketplaceMessages(convId)
      if (response.data?.success && Array.isArray(response.data.data)) {
        setMessages(response.data.data)
        scrollToBottom()
      }
    } catch (error: any) {
      console.error('Error loading messages:', error)
      // If conversation doesn't exist, auto-recreate it
      if (error?.response?.status === 404) {
        console.log('🔧 Conversation not found, attempting to recreate...')
        await recreateConversation()
      }
    } finally {
      setLoading(false)
    }
  }

  const recreateConversation = async () => {
    try {
      const data = {
        providerId: provider.id,
        customerName: customerName,
        customerEmail: customerEmail,
        customerPhone: customerPhone
      }
      
      const response = await apiClient.createOrGetConversation(data)
      if (response.data?.success && response.data?.data?.conversationId) {
        const newConversationId = response.data.data.conversationId
        setConversationId(newConversationId)
        localStorage.setItem(conversationKey, newConversationId)
        console.log('✅ Conversation recreated:', newConversationId)
      }
    } catch (error) {
      console.error('Failed to recreate conversation:', error)
    }
  }

  const handleCaseTemplateClick = async (message: Message) => {
    if (message.messageType !== 'case_template') return;
    
    try {
      // Get the service category from provider
      const serviceCategory = provider.serviceCategory || provider.service_category || 'general';
      
      // Fetch the case template
      const response = await apiClient.getCaseTemplate(serviceCategory);
      
      if (response.data?.success && response.data?.data) {
        const templateData = JSON.parse(response.data.data.template_data);
        setCurrentTemplate({
          ...response.data.data,
          templateData
        });
        setModalMode('template');
        setShowUnifiedModal(true);
      }
    } catch (error) {
      console.error('Error loading case template:', error);
    }
  };

  const handleTemplateSubmit = async (formData: Record<string, any>) => {
    if (!conversationId || !currentTemplate) return;

    setIsSubmittingTemplate(true);
    try {
      // Create or update service case with filled data
      const response = await apiClient.createServiceCase({
        conversationId,
        templateId: currentTemplate.id,
        caseData: formData
      });

      if (response.data?.success) {
        // Send a message to the provider with the filled template
        const summaryMessage = `📋 Попълних формата с информация за проблема:

${Object.entries(formData).map(([key, value]) => {
  const field = currentTemplate.templateData.fields.find((f: any) => f.id === key);
  const label = field?.label || key;
  return `${label}: ${value}`;
}).join('\n')}`;

        // Send the summary message
        const messageResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.129:3000/api/v1'}/chat/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            senderType: 'customer',
            senderName: customerName,
            message: summaryMessage,
            messageType: 'case_filled'
          })
        });

        if (messageResponse.ok) {
          // Add message to local state
          const newMessage: Message = {
            id: Date.now().toString(),
            conversationId: conversationId!,
            senderType: 'customer',
            senderName: customerName,
            message: summaryMessage,
            messageType: 'case_filled',
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, newMessage]);
        }

        setShowUnifiedModal(false);
        setCurrentTemplate(null);
      }
    } catch (error) {
      console.error('Error submitting template:', error)
      alert('Възникна грешка при изпращането на формата')
    } finally {
      setIsSubmittingTemplate(false)
    }
  }

  const handleCaseCreation = async (caseData: any) => {
    if (!conversationId) return
    
    try {
      // Create case message with uploaded screenshots
      let caseMessage = `📋 Нова заявка за услуга:
🔧 Услуга: ${caseData.serviceType}
📝 Описание: ${caseData.description}
📅 Дата: ${caseData.preferredDate}
⏰ Време: ${caseData.preferredTime || 'Сутрин (8:00-12:00)'}
⚡ Приоритет: ${caseData.priority === 'urgent' ? 'Спешно' : caseData.priority === 'low' ? 'Нисък' : 'Нормален'}
📍 Адрес: ${caseData.address}
📞 Телефон: ${caseData.phone}`

      if (caseData.additionalDetails) {
        caseMessage += `\n💬 Допълнителни детайли: ${caseData.additionalDetails}`
      }

      if (caseData.screenshots && caseData.screenshots.length > 0) {
        caseMessage += `\n📸 Прикачени ${caseData.screenshots.length} снимки`
      }

      // Send the case message
      const messageResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.129:3000/api/v1'}/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          senderType: 'customer',
          senderName: customerName,
          message: caseMessage,
          messageType: 'case_created'
        })
      });

      if (messageResponse.ok) {
        // Add message to local state
        const newMessage: Message = {
          id: Date.now().toString(),
          conversationId: conversationId!,
          senderType: 'customer',
          senderName: customerName,
          message: caseMessage,
          messageType: 'case_created',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, newMessage]);
      }
      setShowUnifiedModal(false)
    } catch (error) {
      console.error('Error creating case:', error)
      alert('Възникна грешка при създаването на заявката')
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || loading) return

    // If no conversation exists, create one first
    if (!conversationId) {
      console.log('🔧 No conversation found, creating new one...')
      await startConversation()
      if (!conversationId) {
        console.error('❌ Failed to create conversation')
        return
      }
    }

    setLoading(true)
    try {
      const response = await apiClient.sendMessage({
        conversationId,
        senderType: 'customer',
        senderName: customerName,
        message: newMessage
      })

      if (response.data?.success) {
        // Add customer message to UI immediately (won't come back via WebSocket)
        const newMsg: Message = {
          id: response.data.data?.messageId || Date.now().toString(),
          conversationId: conversationId,
          senderType: 'customer',
          senderName: customerName,
          message: newMessage,
          timestamp: new Date().toISOString()
        }
        
        setMessages(prev => [...prev, newMsg])
        setNewMessage('')
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      
      // If conversation was deleted, try to recreate and resend
      if (error?.response?.status === 404) {
        console.log('🔧 Conversation deleted, recreating and retrying...')
        await recreateConversation()
        // Retry sending the message
        setTimeout(() => sendMessage(), 1000)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    // Reset state when closing
    setMessages([])
    setNewMessage('')
    setConversationId(null)
    setIsStarted(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 h-96 flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
          <div>
            <h3 className="font-semibold">
              {provider.businessName || provider.business_name || `${provider.firstName || provider.first_name} ${provider.lastName || provider.last_name}`}
            </h3>
            <p className="text-sm text-blue-200">
              {provider.serviceCategory || provider.service_category}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-blue-200 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && messages.length === 0 ? (
            <div className="text-center text-gray-500">Зареждане...</div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderType === 'customer' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                    msg.senderType === 'customer'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <div>{msg.message}</div>
                  
                  {/* Show template button for case_template messages */}
                  {msg.messageType === 'case_template' && msg.senderType === 'provider' && (
                    <button
                      onClick={() => handleCaseTemplateClick(msg)}
                      className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                    >
                      📋 Попълни формата
                    </button>
                  )}
                  
                  {/* Show service request button for service_request messages */}
                  {msg.messageType === 'service_request' && msg.senderType === 'provider' && (
                    <div className="mt-2">
                      <ServiceRequestButton 
                        onClick={() => {
                          setModalMode('direct');
                          setShowUnifiedModal(true);
                        }}
                        providerName={provider.businessName || provider.business_name || 'специалиста'}
                      />
                    </div>
                  )}
                  
                  <div className={`text-xs mt-1 ${
                    msg.senderType === 'customer' ? 'text-blue-200' : 'text-gray-500'
                  }`}>
                    {new Date(msg.timestamp).toLocaleTimeString('bg-BG', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Section */}
        {isStarted && (
          <div className="border-t p-4">
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Напишете съобщение..."
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '...' : 'Изпрати'}
              </button>
            </div>
            
            {/* Quick Action Button */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setModalMode('direct');
                  setShowUnifiedModal(true);
                }}
                className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-green-600 hover:to-blue-600 transition-all duration-200 flex items-center space-x-2"
              >
                <span>🔧</span>
                <span>Създай заявка за услуга</span>
              </button>
            </div>
          </div>
        )}

        {/* Start Chat Form */}
        {!isStarted && !loading && (
          <div className="p-4 border-t">
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Вашето име"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                placeholder="Email адрес"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                placeholder="Телефон"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => startConversation()}
                disabled={!customerName || !customerEmail}
                className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Започни разговор
              </button>
            </div>
          </div>
        )}
    </div>

    {/* Unified Case Modal */}
    {showUnifiedModal && (
      <UnifiedCaseModal
        isOpen={showUnifiedModal}
        mode={modalMode}
        templateData={currentTemplate?.templateData}
        onClose={() => {
          setShowUnifiedModal(false);
          setCurrentTemplate(null);
        }}
        onSubmit={modalMode === 'template' ? handleTemplateSubmit : handleCaseCreation}
        isSubmitting={isSubmittingTemplate}
        providerName={provider.businessName || provider.business_name || 'специалиста'}
      />
    )}
  </div>
)
}
