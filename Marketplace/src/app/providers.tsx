'use client'

import { Provider } from 'react-redux'
import { store } from '@/store'
import { SocketProvider } from '@/contexts/SocketContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { ChatWidgetProvider } from '@/contexts/ChatWidgetContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthProvider>
        <SocketProvider>
          <ChatWidgetProvider>
            {children}
          </ChatWidgetProvider>
        </SocketProvider>
      </AuthProvider>
    </Provider>
  )
}

