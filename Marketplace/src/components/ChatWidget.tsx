'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'

interface Conversation {
  id: string
  customerName: string
  serviceProviderName: string
  lastMessage?: string
  lastActivity: string
  unreadCount: number
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [socket, setSocket] = useState<any>(null)
  const { user, isAuthenticated, isLoading } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Debug authentication state
  console.log('💬 ChatWidget - Auth Debug:', {
    isAuthenticated,
    isLoading,
    user: user ? { id: user.id, email: user.email, role: user.role } : null,
    hasAuthToken: typeof window !== 'undefined' ? !!localStorage.getItem('auth_token') : 'SSR',
    hasUserData: typeof window !== 'undefined' ? !!localStorage.getItem('user_data') : 'SSR'
  })

  // Load conversations when widget opens and set up global WebSocket
  useEffect(() => {
    if (isOpen && isAuthenticated && user) {
      loadConversations()
      
      // Set up periodic refresh every 10 seconds when widget is open (more frequent to catch customer name updates)
      const refreshInterval = setInterval(() => {
        loadConversations()
      }, 10000)
      
      return () => clearInterval(refreshInterval)
    }
  }, [isOpen, isAuthenticated, user])

  // Calculate total unread messages
  useEffect(() => {
    const total = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)
    setUnreadTotal(total)
  }, [conversations])

  const loadConversations = async () => {
    if (!user) return
    
    console.log('💬 ChatWidget - Loading conversations for user:', user.role, user.id)
    setLoading(true)
    try {
      // For service providers, get their conversations
      if (user.role === 'service_provider' || user.role === 'tradesperson') {
        console.log('💬 ChatWidget - Loading provider conversations for:', user.id)
        console.log('💬 ChatWidget - API URL will be:', `/chat/provider/${user.id}/conversations`)
        
        const response = await apiClient.getProviderMarketplaceConversations(user.id)
        console.log('💬 ChatWidget - Provider conversations full response:', response)
        console.log('💬 ChatWidget - Provider conversations response.data:', response.data)
        console.log('💬 ChatWidget - Provider conversations response.status:', response.status)
        
        if (response.data?.success) {
          let conversationsData = response.data.data
          console.log('💬 ChatWidget - Raw conversations data:', JSON.stringify(conversationsData, null, 2))
          
          
          // Handle different response formats and map fields correctly
          if (Array.isArray(conversationsData)) {
            // Data is already an array - map the fields
            const mappedConversations = conversationsData.map((conv: any) => ({
              ...conv,
              lastActivity: conv.last_message_at || conv.created_at, // Map last_message_at to lastActivity
              unreadCount: conv.unread_count || 0
            }))
            setConversations(mappedConversations)
            console.log('💬 ChatWidget - Set provider conversations (array):', mappedConversations.length, mappedConversations)
          } else if (conversationsData && typeof conversationsData === 'object') {
            // Data is an object, check if it has a conversations property or convert to array
            if (conversationsData.conversations && Array.isArray(conversationsData.conversations)) {
              const mappedConversations = conversationsData.conversations.map((conv: any) => ({
                ...conv,
                lastActivity: conv.last_message_at || conv.created_at, // Map last_message_at to lastActivity
                unreadCount: conv.unread_count || 0
              }))
              setConversations(mappedConversations)
              console.log('💬 ChatWidget - Set provider conversations (object.conversations):', mappedConversations.length, mappedConversations)
            } else if (conversationsData.data && Array.isArray(conversationsData.data)) {
              setConversations(conversationsData.data)
              console.log('💬 ChatWidget - Set provider conversations (object.data):', conversationsData.data.length, conversationsData.data)
            } else {
              // Try to convert object to array or handle single conversation
              console.log('💬 ChatWidget - Received object data:', conversationsData)
              const conversationsArray = Object.values(conversationsData).filter(item => 
                item && typeof item === 'object' && 'id' in item
              ) as Conversation[]
              setConversations(conversationsArray)
              console.log('💬 ChatWidget - Converted object to array:', conversationsArray.length, conversationsArray)
            }
          } else {
            console.log('💬 ChatWidget - No conversations data found')
            setConversations([])
          }
        } else {
          console.log('💬 ChatWidget - API response not successful')
          console.log('💬 ChatWidget - Response structure:', {
            hasSuccess: 'success' in (response.data || {}),
            successValue: response.data?.success,
            hasData: 'data' in (response.data || {}),
            dataType: typeof response.data?.data,
            isArray: Array.isArray(response.data?.data)
          })
          setConversations([])
        }
      } else {
        // For customers, get their conversations
        console.log('💬 ChatWidget - Loading customer conversations')
        const response = await apiClient.getConversations()
        console.log('💬 ChatWidget - Customer conversations response:', response.data)
        const conversations = response.data?.data?.conversations
        if (response.data?.success && Array.isArray(conversations)) {
          console.log('💬 ChatWidget - Conversation details:', conversations.map(c => ({
            id: c.id,
            serviceProviderName: c.serviceProviderName,
            customerName: c.customerName
          })))
          setConversations(conversations)
          console.log('💬 ChatWidget - Set customer conversations:', conversations.length)
        } else {
          console.log('💬 ChatWidget - No customer conversations found or invalid response')
          setConversations([])
        }
      }
    } catch (error: any) {
      console.error('💬 ChatWidget - Error loading conversations:', error)
      console.error('💬 ChatWidget - Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      })
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  const handleConversationClick = async (conversation: Conversation) => {
    console.log('💬 ChatWidget - Opening conversation inline:', conversation.id, conversation)
    
    // Set active conversation and load messages
    setActiveConversation(conversation)
    setMessages([])
    
    try {
      // Load messages for this conversation
      console.log('💬 ChatWidget - Loading messages for conversation:', conversation.id)
      const response = await apiClient.getMarketplaceMessages(conversation.id)
      console.log('💬 ChatWidget - Messages API response:', response)
      console.log('💬 ChatWidget - Messages response data:', response.data)
      
      if (response.data?.success) {
        let messagesData = response.data.data
        console.log('💬 ChatWidget - Raw messages data:', JSON.stringify(messagesData, null, 2))
        
        // Handle different response formats
        if (Array.isArray(messagesData)) {
          // Data is already an array
          setMessages(messagesData)
          console.log('💬 ChatWidget - Loaded messages (array):', messagesData.length, messagesData)
        } else if (messagesData && typeof messagesData === 'object') {
          // Data is an object, check if it has a messages property or convert to array
          if (messagesData.messages && Array.isArray(messagesData.messages)) {
            setMessages(messagesData.messages)
            console.log('💬 ChatWidget - Loaded messages (object.messages):', messagesData.messages.length, messagesData.messages)
          } else if (messagesData.data && Array.isArray(messagesData.data)) {
            setMessages(messagesData.data)
            console.log('💬 ChatWidget - Loaded messages (object.data):', messagesData.data.length, messagesData.data)
          } else {
            // Try to convert object to array or handle single message
            console.log('💬 ChatWidget - Received object messages data:', messagesData)
            const messagesArray = Object.values(messagesData).filter(item => 
              item && typeof item === 'object' && 'id' in item
            )
            setMessages(messagesArray)
            console.log('💬 ChatWidget - Converted messages object to array:', messagesArray.length, messagesArray)
          }
        } else {
          console.log('💬 ChatWidget - No messages data found')
          setMessages([])
        }
      } else {
        console.log('💬 ChatWidget - Messages API response not successful')
        console.log('💬 ChatWidget - Response structure:', {
          hasSuccess: 'success' in (response.data || {}),
          successValue: response.data?.success,
          hasData: 'data' in (response.data || {}),
          dataType: typeof response.data?.data,
          isArray: Array.isArray(response.data?.data),
          dataContent: response.data?.data
        })
        setMessages([])
      }
      
      // Auto-scroll to bottom after loading messages
      setTimeout(() => scrollToBottom(), 200)
      
      // Mark conversation as read after loading messages
      markConversationAsRead(conversation.id)
      
      // Initialize socket for real-time updates if not already connected
      if (!socket) {
        initializeSocket(conversation.id)
      }
    } catch (error: any) {
      console.error('💬 ChatWidget - Error loading messages:', error)
      console.error('💬 ChatWidget - Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      })
    }
  }

  const initializeSocket = (conversationId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.129:3000/api/v1'
      const socketUrl = apiUrl.replace('/api/v1', '')
      
      console.log('💬 ChatWidget - Connecting to socket for conversation:', conversationId)
      
      const { io } = require('socket.io-client')
      const socketInstance = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true
      })

      socketInstance.on('connect', () => {
        console.log('✅ ChatWidget connected to WebSocket')
        setSocket(socketInstance)
        socketInstance.emit('join-conversation', conversationId)
      })

      socketInstance.on('new_message', (data: any) => {
        console.log('💬 ChatWidget received new message:', data)
        if (data.conversationId === conversationId && data.messageId) {
          const newMessage = {
            id: data.messageId,
            conversationId: data.conversationId,
            senderType: data.senderType,
            senderName: data.senderName,
            message: data.message,
            timestamp: data.timestamp,
            sent_at: data.timestamp // Add sent_at for consistency
          }
          
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === data.messageId)
            if (!exists) {
              console.log('💬 Adding new message to chat:', newMessage)
              return [...prev, newMessage]
            }
            return prev
          })
        }
        
        // Also refresh conversations list to update last message
        loadConversations()
      })

    } catch (error) {
      console.error('💬 ChatWidget - Socket initialization error:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !activeConversation) return

    setSending(true)
    try {
      const response = await apiClient.sendMessage({
        conversationId: activeConversation.id,
        senderType: user?.role === 'service_provider' || user?.role === 'tradesperson' ? 'provider' : 'customer',
        senderName: `${user?.firstName} ${user?.lastName}`.trim() || 'User',
        message: newMessage
      })

      if (response.data?.success) {
        const newMsg = {
          id: response.data.data?.messageId || Date.now().toString(),
          conversationId: activeConversation.id,
          senderType: user?.role === 'service_provider' || user?.role === 'tradesperson' ? 'provider' : 'customer',
          senderName: `${user?.firstName} ${user?.lastName}`.trim() || 'User',
          message: newMessage,
          timestamp: new Date().toISOString()
        }
        
        setMessages(prev => [...prev, newMsg])
        setNewMessage('')
        
        // Auto-scroll after sending message
        setTimeout(() => scrollToBottom(), 100)
      }
    } catch (error) {
      console.error('💬 ChatWidget - Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const markConversationAsRead = async (conversationId: string) => {
    try {
      console.log('📖 Marking conversation as read:', conversationId)
      const senderType = user?.role === 'service_provider' || user?.role === 'tradesperson' ? 'provider' : 'customer'
      
      await apiClient.markMarketplaceAsRead(conversationId, senderType)
      
      // Update the conversation in the local state to remove unread count
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, unreadCount: 0 }
          : conv
      ))
      
      console.log('✅ Conversation marked as read')
    } catch (error) {
      console.error('❌ Failed to mark conversation as read:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollToBottom(), 100)
    }
  }, [messages])

  const goBackToConversations = () => {
    setActiveConversation(null)
    setMessages([])
    setNewMessage('')
    if (socket) {
      socket.disconnect()
      setSocket(null)
    }
  }

  const formatMessageTime = (timestamp: string | number) => {
    if (!timestamp) return 'неизвестно'
    
    let date: Date
    
    // Handle different timestamp formats
    if (typeof timestamp === 'number') {
      date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000)
    } else if (typeof timestamp === 'string') {
      // SQLite datetime format: "2024-01-15 10:30:45" or ISO format
      if (timestamp.includes(' ') && !timestamp.includes('T')) {
        // SQLite format: convert to ISO format
        const isoTimestamp = timestamp.replace(' ', 'T') + 'Z'
        date = new Date(isoTimestamp)
      } else {
        date = new Date(timestamp)
      }
    } else {
      return 'неизвестно'
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid message timestamp:', timestamp)
      return 'неизвестно'
    }
    
    // Return time in HH:MM format
    try {
      return date.toLocaleTimeString('bg-BG', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      })
    } catch (e) {
      return date.toLocaleTimeString()
    }
  }

  const formatLastActivity = (timestamp: string | number) => {
    if (!timestamp) return 'неизвестно'
    
    let date: Date
    
    // Handle different timestamp formats (same logic as formatMessageTime)
    if (typeof timestamp === 'number') {
      date = new Date(timestamp > 1000000000000 ? timestamp : timestamp * 1000)
    } else if (typeof timestamp === 'string') {
      // SQLite datetime format: "2024-01-15 10:30:45" or ISO format
      if (timestamp.includes(' ') && !timestamp.includes('T')) {
        // SQLite format: convert to ISO format
        const isoTimestamp = timestamp.replace(' ', 'T') + 'Z'
        date = new Date(isoTimestamp)
      } else {
        date = new Date(timestamp)
      }
    } else {
      return 'неизвестно'
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid last activity timestamp:', timestamp)
      return 'неизвестно'
    }
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / 86400000)

    // Show actual time for today's messages, date for older ones
    if (diffDays === 0) {
      // Today - show time like "14:30"
      try {
        return date.toLocaleTimeString('bg-BG', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false
        })
      } catch (e) {
        return date.toLocaleTimeString()
      }
    } else if (diffDays === 1) {
      // Yesterday - show "вчера"
      return 'вчера'
    } else if (diffDays < 7) {
      // This week - show day name
      try {
        return date.toLocaleDateString('bg-BG', { weekday: 'short' })
      } catch (e) {
        return `${diffDays}д`
      }
    } else {
      // Older - show date
      try {
        return date.toLocaleDateString('bg-BG', { 
          day: '2-digit', 
          month: '2-digit' 
        })
      } catch (e) {
        return date.toLocaleDateString()
      }
    }
  }

  // Wait for authentication to load
  if (isLoading) {
    console.log('💬 ChatWidget - Auth still loading, waiting...')
    return null
  }

  // Don't show widget on authentication pages
  if (pathname?.startsWith('/auth/')) {
    console.log('💬 ChatWidget - Not showing on auth page:', pathname)
    return null
  }

  // Don't show widget if user is not authenticated
  if (!isAuthenticated || !user) {
    console.log('💬 ChatWidget - Not showing widget: user not authenticated', { isAuthenticated, user: !!user })
    // Temporary: Show a login prompt widget for non-authenticated users
    return (
      <button
        onClick={() => window.location.href = '/auth/login'}
        className="fixed bottom-6 right-6 bg-gray-600 hover:bg-gray-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 z-[9999] relative"
        aria-label="Влезте за чат"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
          !
        </div>
      </button>
    )
  }

  console.log('💬 ChatWidget - Rendering widget for user:', user?.role, 'isOpen:', isOpen)

  return (
    <>
      {/* Chat Widget Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 z-[9999] relative border-4 border-white"
          aria-label="Отвори чат"
          style={{ 
            position: 'fixed', 
            bottom: '24px', 
            right: '24px', 
            zIndex: 9999,
            width: '64px',
            height: '64px'
          }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          
          {/* Unread badge */}
          {unreadTotal > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
              {unreadTotal > 99 ? '99+' : unreadTotal}
            </div>
          )}
        </button>
      )}

      {/* Chat Widget Window */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 bg-white rounded-lg shadow-xl border z-[9999] transition-all duration-200 ${
          isMinimized ? 'w-80 h-12' : 'w-80 h-96'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-purple-600 text-white rounded-t-lg">
            <div className="flex items-center space-x-2">
              {activeConversation && (
                <button
                  onClick={goBackToConversations}
                  className="text-white hover:text-gray-200 mr-2"
                >
                  ←
                </button>
              )}
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="font-medium">
                {activeConversation ? activeConversation.customerName : 'Съобщения'}
              </span>
              {!activeConversation && unreadTotal > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {unreadTotal}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:text-gray-200 transition-colors"
                aria-label={isMinimized ? "Разшири" : "Минимизирай"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMinimized ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  )}
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200 transition-colors"
                aria-label="Затвори чат"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          {!isMinimized && (
            <div className="flex flex-col h-80">
              {activeConversation ? (
                /* Active Chat View */
                <>
                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <div className="text-2xl mb-2">💬</div>
                        <p className="text-sm">Няма съобщения</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${
                              (user?.role === 'service_provider' || user?.role === 'tradesperson') 
                                ? (msg.senderType === 'provider' ? 'justify-end' : 'justify-start')
                                : (msg.senderType === 'customer' ? 'justify-end' : 'justify-start')
                            }`}
                          >
                            <div
                              className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                                (user?.role === 'service_provider' || user?.role === 'tradesperson') 
                                  ? (msg.senderType === 'provider' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-800')
                                  : (msg.senderType === 'customer' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-800')
                              }`}
                            >
                              <div>{msg.message}</div>
                              <div className={`text-xs mt-1 ${
                                (user?.role === 'service_provider' || user?.role === 'tradesperson') 
                                  ? (msg.senderType === 'provider' ? 'text-purple-200' : 'text-gray-500')
                                  : (msg.senderType === 'customer' ? 'text-purple-200' : 'text-gray-500')
                              }`}>
                                {formatMessageTime(msg.sent_at || msg.timestamp)}
                              </div>
                            </div>
                          </div>
                      ))
                    )}
                    {/* Invisible element to scroll to */}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  {/* Message Input */}
                  <div className="border-t p-3">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Напишете съобщение..."
                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        disabled={sending}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || sending}
                        className="bg-purple-600 text-white px-3 py-2 rounded-lg disabled:opacity-50 text-sm hover:bg-purple-700"
                      >
                        {sending ? '...' : '📤'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* Conversations List View */
                <>
                  {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-500">Зареждане...</p>
                      </div>
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <div className="text-4xl mb-2">💬</div>
                        <p className="text-sm">Здравейте, {user?.firstName}!</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {user?.role === 'service_provider' || user?.role === 'tradesperson' 
                            ? 'Няма активни разговори с клиенти'
                            : 'Няма активни разговори'
                          }
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Conversations List */
                    <div className="flex-1 overflow-y-auto">
                      {conversations.map((conversation) => (
                          <div
                            key={conversation.id}
                            onClick={() => handleConversationClick(conversation)}
                            className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-200 flex items-start space-x-3"
                          >
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-purple-600 font-medium text-sm">
                                {(user?.role === 'customer' ? conversation.serviceProviderName : conversation.customerName)?.charAt(0) || 'C'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {user?.role === 'customer' 
                                    ? (conversation.serviceProviderName || 'Неизвестен специалист')
                                    : (conversation.customerName || 'Неизвестен клиент')}
                                </p>
                                <div className="flex items-center space-x-2">
                                  {conversation.unreadCount > 0 && (
                                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                                      {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-500">
                                    {formatLastActivity(conversation.lastActivity)}
                                  </span>
                                </div>
                              </div>
                              {conversation.lastMessage && (
                                <p className="text-sm text-gray-500 truncate mt-1">
                                  {conversation.lastMessage}
                                </p>
                              )}
                            </div>
                          </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Quick Actions */}
                  <div className="border-t p-3 space-y-2">
                    <button 
                      onClick={() => window.open('/search', '_blank')}
                      className="w-full text-left text-sm text-purple-600 hover:text-purple-800 transition-colors"
                    >
                      🔍 Търси специалисти
                    </button>
                    {(user?.role === 'service_provider' || user?.role === 'tradesperson') && (
                      <>
                        <button 
                          onClick={() => window.open('/dashboard', '_blank')}
                          className="w-full text-left text-sm text-purple-600 hover:text-purple-800 transition-colors"
                        >
                          📊 Табло за управление
                        </button>
                        <button 
                          onClick={() => window.open('/dashboard?view=assigned', '_blank')}
                          className="w-full text-left text-sm text-purple-600 hover:text-purple-800 transition-colors"
                        >
                          📋 Моите заявки
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
