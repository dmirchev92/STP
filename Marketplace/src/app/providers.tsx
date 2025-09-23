'use client'

import { Provider } from 'react-redux'
import { store } from '@/store'
// import { SocketProvider } from '@/lib/socket'
import { AuthProvider } from '@/contexts/AuthContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </Provider>
  )
}

