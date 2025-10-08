'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
})

export const useSocket = () => useContext(SocketContext)

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    // Only connect if user is authenticated
    if (!isAuthenticated) {
      if (socket) {
        console.log('🔌 Disconnecting socket - user not authenticated')
        socket.disconnect()
        setSocket(null)
        setIsConnected(false)
      }
      return
    }

    // Create Socket.IO connection
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.129:3000/api/v1'
    const socketUrl = apiUrl.replace('/api/v1', '')
    
    console.log('🔌 Connecting to Socket.IO server:', socketUrl)
    
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketInstance.on('connect', () => {
      console.log('✅ Socket.IO connected:', socketInstance.id)
      setIsConnected(true)
    })

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason)
      setIsConnected(false)
    })

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error)
      setIsConnected(false)
    })

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts')
      setIsConnected(true)
    })

    setSocket(socketInstance)

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up Socket.IO connection')
      socketInstance.disconnect()
    }
  }, [isAuthenticated])

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}
