// Chat Page - Handles incoming chat requests via unique tokens
// URL: /u/{spIdentifier}/c/{token}

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';

interface ChatPageProps {
  params: {
    spIdentifier: string;
    token: string;
  };
}

interface ValidationResult {
  valid: boolean;
  userId?: string;
  conversationId?: string;
  error?: string;
}

export default function ChatPage({ params }: ChatPageProps) {
  const { spIdentifier, token } = params;
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);
  const [providerInfo, setProviderInfo] = useState<any>({
    businessName: 'Mama Mia',
    firstName: 'Mama Mia',
    serviceCategory: 'electrician'
  });

  // Check for existing session on page load, then auto-validate token
  useEffect(() => {
    if (!hasValidated) {
      checkExistingSession();
    }
  }, [spIdentifier, token, hasValidated]);

  const checkExistingSession = async () => {
    try {
      setHasValidated(true); // Mark as validated to prevent duplicate calls
      
      const sessionKey = `chat_session_${spIdentifier}`;
      const tokenKey = `chat_token_${spIdentifier}`;
      const existingSessionId = localStorage.getItem(sessionKey);
      const lastUsedToken = localStorage.getItem(tokenKey);
      
      // Check if this is a new token (different from the one that created the session)
      if (existingSessionId && lastUsedToken && lastUsedToken !== token) {
        console.log(`New token detected! Last used: ${lastUsedToken}, Current: ${token}`);
        console.log('Forcing token validation for new token...');
        
        // Clear old session since we have a new token
        localStorage.removeItem(sessionKey);
        localStorage.removeItem(tokenKey);
        
        // Force validate the new token
        await validateToken();
        setHasStartedChat(true);
        return;
      }
      
      if (existingSessionId) {
        console.log('Found existing session:', existingSessionId);
        console.log('Same token as before, using existing session');
        
        // Validate existing session
        const response = await axios.get(
          `http://192.168.0.129:3000/api/v1/chat/sessions/${existingSessionId}/validate`,
          { timeout: 10000 }
        );

        if (response.data.success) {
          console.log('✅ Token validation successful:', response.data);
          setValidationResult({
            valid: true,
            userId: response.data.data.userId,
            conversationId: response.data.data.conversationId
          });

          // Fetch provider information
          if (response.data.data.userId) {
            await fetchProviderInfo(response.data.data.userId);
          }

          setHasStartedChat(true);
          return;
        } else {
          // Session invalid, remove from storage
          localStorage.removeItem(sessionKey);
          localStorage.removeItem(tokenKey);
        }
      }
      
      // No existing session found, show welcome screen
      console.log('No existing session, showing welcome screen');
      // Don't auto-validate token - let user click "Start Chat" button
      
    } catch (error) {
      console.log('Session check failed, showing welcome screen:', error);
      // Don't auto-validate token - let user click "Start Chat" button
    }
  };

  const validateToken = async () => {
    try {
      setIsValidating(true);
      setError(null);

      console.log('Validating token:', { spIdentifier, token: token.substring(0, 4) + '****' });

      const response = await axios.get(
        `http://192.168.0.129:3000/api/v1/chat/public/${spIdentifier}/validate/${token}`,
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        console.log('Token validation successful:', response.data);
        
        // Store session ID and token in localStorage for future access
        const sessionKey = `chat_session_${spIdentifier}`;
        const tokenKey = `chat_token_${spIdentifier}`;
        if (response.data.data.sessionId) {
          localStorage.setItem(sessionKey, response.data.data.sessionId);
          localStorage.setItem(tokenKey, token); // Store the token that created this session
          console.log('Stored session ID:', response.data.data.sessionId);
          console.log('Stored token:', token);
        }
        
        setValidationResult({
          valid: true,
          userId: response.data.data.userId,
          conversationId: response.data.data.conversationId
        });
      } else {
        console.error('Token validation failed:', response.data);
        setValidationResult({
          valid: false,
          error: response.data.error?.message || 'Token validation failed'
        });
      }

    } catch (err: any) {
      console.error('Token validation error:', err);
      
      let errorMessage = 'Failed to validate chat token';
      if (err.response?.data?.error?.message) {
        errorMessage = err.response.data.error.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setValidationResult({
        valid: false,
        error: errorMessage
      });
      setError(errorMessage);
    } finally {
      setIsValidating(false);
    }
  };

  const startChat = async () => {
    setHasStartedChat(true);
    await validateToken();
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || isSending || !validationResult?.conversationId) return;

    setIsSending(true);
    try {
      const newMessage = {
        id: Date.now().toString(),
        text: currentMessage,
        sender: 'customer',
        timestamp: new Date().toISOString()
      };

      // Add message to UI immediately
      setMessages(prev => [...prev, newMessage]);
      setCurrentMessage('');

      // Send to backend
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/marketplace/conversations/${validationResult.conversationId}/messages`, {
        senderType: 'customer',
        senderName: 'Customer',
        message: currentMessage,
        messageType: 'text'
      });

      console.log('Message sent successfully');
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove message from UI on error
      setMessages(prev => prev.filter(m => m.id !== Date.now().toString()));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const fetchProviderInfo = async (userId: string) => {
    try {
      console.log('🔍 Fetching provider info for userId:', userId);
      const response = await axios.get(`http://192.168.0.129:3000/api/v1/marketplace/providers/${userId}`);
      console.log('📡 Provider API response:', response.data);
      
      if (response.data.success) {
        setProviderInfo(response.data.data);
        console.log('✅ Provider info loaded:', response.data.data);
      } else {
        console.error('❌ Provider API returned error:', response.data.error);
        setFallbackProviderInfo();
      }
    } catch (error) {
      console.error('❌ Failed to fetch provider info:', error);
      setFallbackProviderInfo();
    }
  };

  const setFallbackProviderInfo = () => {
    setProviderInfo({
      businessName: 'Mama Mia',
      firstName: 'Mama Mia', 
      lastName: '',
      serviceCategory: 'electrician'
    });
    console.log('🔄 Using fallback provider info: Mama Mia');
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Проверяване на връзката...
            </h2>
            <p className="text-gray-600">
              Моля, изчакайте докато проверим вашата връзка.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (hasStartedChat && !validationResult?.valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Невалидна връзка
            </h2>
            <p className="text-gray-600 mb-4">
              {validationResult?.error || 'Тази връзка вече не е активна или е изтекла.'}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Опитайте отново
              </button>
              <p className="text-sm text-gray-500">
                Ако проблемът продължава, моля обадете се отново.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show welcome screen if chat hasn't started yet
  if (!hasStartedChat && !validationResult?.valid) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  💬 Чат с {providerInfo?.businessName || 'техник'}
                </h1>
                <p className="text-sm text-gray-600">
                  Опишете вашия проблем и ще получите бърз отговор
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Онлайн</span>
              </div>
            </div>
          </div>
        </div>

        {/* Welcome Screen */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow-sm border min-h-[600px] flex flex-col items-center justify-center">
            
            {/* Welcome Content */}
            <div className="text-center max-w-md mx-auto p-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                {providerInfo?.businessName ? (
                  <span className="text-blue-600 font-bold text-lg">
                    {providerInfo.businessName.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                )}
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Добре дошли в чата с {providerInfo?.businessName || 'нас'}!
              </h2>
              
              <p className="text-gray-600 mb-6">
                Готови сме да ви помогнем с вашия проблем. Натиснете бутона по-долу за да започнете разговора.
              </p>
              
              <button
                onClick={startChat}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Започни чат
              </button>
              
              <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-medium">
                      {providerInfo?.businessName?.charAt(0).toUpperCase() || 'Т'}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-gray-900 font-medium mb-1">
                      {providerInfo?.businessName || 'Техник'} - {providerInfo?.serviceCategory === 'electrician' ? 'Електротехник' : 'Техник'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Здравейте! Готов съм да ви помогна с вашия проблем.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                💬 Чат с {providerInfo?.businessName || 'техник'}
              </h1>
              <p className="text-sm text-gray-600">
                Опишете вашия проблем и ще получите бърз отговор
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Онлайн</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border min-h-[600px] flex flex-col">
          
          {/* Welcome Message */}
          <div className="p-6 border-b bg-blue-50">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-medium">
                  {providerInfo?.businessName?.charAt(0).toUpperCase() || 'Т'}
                </span>
              </div>
              <div className="flex-1">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <p className="text-gray-900 mb-2">
                    Здравейте! Аз съм {providerInfo?.firstName || providerInfo?.businessName || 'вашият техник'}. 
                  </p>
                  <p className="text-gray-700 text-sm">
                    Моля, опишете какъв е проблемът и ще ви помогна възможно най-бързо. 
                    Ако е спешно, споменете това в съобщението.
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-2">Сега</p>
              </div>
            </div>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>Започнете разговора като напишете съобщение по-долу</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender === 'customer' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p>{message.text}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender === 'customer' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Message Input */}
          <div className="border-t p-4">
            <div className="flex space-x-3">
              <div className="flex-1">
                <textarea
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Опишете вашия проблем тук..."
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  disabled={isSending}
                />
              </div>
              <button 
                onClick={sendMessage}
                disabled={!currentMessage.trim() || isSending}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Натиснете Enter за да изпратите или Shift+Enter за нов ред
            </p>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-3">ℹ️ Полезна информация</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <p className="font-medium text-gray-900 mb-1">Работно време:</p>
              <p>Понеделник - Петък: 08:00 - 18:00</p>
              <p>Събота: 09:00 - 15:00</p>
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-1">Спешни случаи:</p>
              <p>Отговарям в рамките на 15 минути</p>
              <p>Достъпен 24/7 за аварии</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
