'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { apiClient } from '@/lib/api'
import { io, Socket } from 'socket.io-client'

interface Message {
  id: string
  conversationId: string
  senderType: 'customer' | 'provider'
  senderName: string
  message: string
  messageType?: string
  timestamp: string
}

interface Conversation {
  id: string
  customerName: string
  customerEmail: string
  customerPhone: string
  status: string
  lastMessage?: string
  messageCount: number
  unreadCount: number
}

export default function ProviderChatPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const conversationId = params.conversationId as string

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    console.log('🏠 Provider Chat - Auth state:', { 
      isAuthenticated, 
      isLoading, 
      user: user?.role, 
      conversationId 
    })
    
    // Wait for authentication loading to complete
    if (isLoading) {
      console.log('⏳ Auth still loading, waiting...')
      return
    }
    
    // Redirect if not authenticated
    if (!isAuthenticated || !user) {
      console.log('❌ Not authenticated, redirecting to login')
      router.push('/auth/login')
      return
    }
    
    // Check if user is a service provider
    if (user.role !== 'service_provider' && user.role !== 'tradesperson') {
      console.log('❌ User is not a service provider, redirecting to dashboard')
      router.push('/provider/dashboard')
      return
    }
    
    // Load conversation and messages
    if (conversationId) {
      loadConversationData()
      initializeSocket()
    }
  }, [isAuthenticated, isLoading, user, conversationId, router])

  const loadConversationData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load conversation details and messages
      console.log('💬 Loading conversation:', conversationId)
      
      const [conversationResponse, messagesResponse] = await Promise.all([
        apiClient.getMarketplaceConversation(conversationId),
        apiClient.getMarketplaceMessages(conversationId)
      ])

      if (conversationResponse.data?.success) {
        setConversation(conversationResponse.data.data)
        console.log('✅ Conversation loaded:', conversationResponse.data.data)
      }

      if (messagesResponse.data?.success && Array.isArray(messagesResponse.data.data)) {
        setMessages(messagesResponse.data.data)
        console.log('✅ Messages loaded:', messagesResponse.data.data.length)
      }

    } catch (err: any) {
      console.error('Error loading conversation:', err)
      setError('Неуспешно зареждане на разговора')
    } finally {
      setLoading(false)
    }
  }

  const initializeSocket = () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.129:3000/api/v1'
      const socketUrl = apiUrl.replace('/api/v1', '')
      
      console.log('💬 Provider connecting to socket:', socketUrl)
      
      const socketInstance = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      })

      socketInstance.on('connect', () => {
        console.log('✅ Provider connected to WebSocket server')
        setSocket(socketInstance)
        
        // Join conversation room for real-time updates
        socketInstance.emit('join-conversation', conversationId)
        console.log('🏠 Provider joined conversation room:', conversationId)
      })

      socketInstance.on('disconnect', (reason) => {
        console.log('❌ Provider disconnected from WebSocket server:', reason)
      })

      socketInstance.on('new_message', (data: any) => {
        console.log('💬 Provider received new message:', data)
        
        // Only add messages from customers (not our own messages)
        if (data.conversationId === conversationId && data.messageId && data.senderType === 'customer') {
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
            
            console.log('📝 Adding customer message to provider chat:', newMessage)
            return [...prev, newMessage]
          })
        }
      })

      return () => {
        if (socketInstance) {
          socketInstance.disconnect()
          console.log('🔌 Provider socket disconnected')
        }
      }
    } catch (error) {
      console.error('Failed to create provider socket:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !conversation) return

    setSending(true)
    try {
      const response = await apiClient.sendMessage({
        conversationId,
        senderType: 'provider',
        senderName: `${user?.firstName} ${user?.lastName}`.trim() || 'Специалист',
        message: newMessage
      })

      if (response.data?.success) {
        // Add provider message to UI immediately
        const newMsg: Message = {
          id: response.data.data?.messageId || Date.now().toString(),
          conversationId: conversationId,
          senderType: 'provider',
          senderName: `${user?.firstName} ${user?.lastName}`.trim() || 'Специалист',
          message: newMessage,
          timestamp: new Date().toISOString()
        }
        
        setMessages(prev => [...prev, newMsg])
        setNewMessage('')
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      alert('Възникна грешка при изпращането на съобщението')
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Зареждане на разговор...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !conversation) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800">❌ {error || 'Разговорът не е намерен'}</p>
            <button 
              onClick={() => router.push('/provider/dashboard')}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Върни се към таблото
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
        {/* Chat Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                💬 Разговор с {conversation.customerName}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>📧 {conversation.customerEmail}</span>
                <span>📞 {conversation.customerPhone}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  conversation.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {conversation.status === 'active' ? 'Активен' : conversation.status}
                </span>
              </div>
            </div>
            <button
              onClick={() => router.push('/provider/dashboard')}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              ← Назад към таблото
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col h-96">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">💬</div>
                <p>Няма съобщения в този разговор</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderType === 'provider' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.senderType === 'provider'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <div className="text-sm font-medium mb-1">
                      {msg.senderName}
                    </div>
                    <div>{msg.message}</div>
                    <div className={`text-xs mt-1 ${
                      msg.senderType === 'provider' ? 'text-blue-200' : 'text-gray-500'
                    }`}>
                      {new Date(msg.timestamp).toLocaleString('bg-BG')}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Напишете съобщение..."
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                disabled={sending}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
              >
                {sending ? '...' : 'Изпрати'}
              </button>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
