import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  conversationId: string;
  senderType: 'customer' | 'provider' | 'system';
  senderName: string;
  message: string;
  messageType?: 'text' | 'system' | 'survey_request' | 'case_created' | 'case_template' | 'service_request';
  timestamp: string;
  data?: any;
  caseId?: string;
}

interface Conversation {
  id: string;
  customerId: string;
  providerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  status: 'active' | 'closed';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

class SocketIOService {
  private static instance: SocketIOService;
  private socket: Socket | null = null;
  private backendUrl = 'http://192.168.0.129:3000';
  private messageCallbacks: ((message: Message) => void)[] = [];
  private conversationCallbacks: ((conversation: Conversation) => void)[] = [];
  private typingCallbacks: ((data: { userId: string; isTyping: boolean }) => void)[] = [];
  private readCallbacks: ((data: { messageId: string }) => void)[] = [];

  private constructor() {}

  static getInstance(): SocketIOService {
    if (!SocketIOService.instance) {
      SocketIOService.instance = new SocketIOService();
    }
    return SocketIOService.instance;
  }

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔌 Connecting to Socket.IO server...');
      
      this.socket = io(this.backendUrl, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket.IO connected:', this.socket?.id);
        this.setupEventListeners();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket.IO connection error:', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Socket.IO disconnected:', reason);
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
      });

      this.socket.on('reconnect_error', (error) => {
        console.error('❌ Socket.IO reconnection error:', error);
      });

      this.socket.on('reconnect_failed', () => {
        console.error('❌ Socket.IO reconnection failed');
      });
    });
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // New message received
    this.socket.on('new_message', (message: Message) => {
      console.log('📨 New message received:', message);
      this.messageCallbacks.forEach(callback => callback(message));
    });

    // Conversation updated
    this.socket.on('conversation_updated', (conversation: Conversation) => {
      console.log('🔄 Conversation updated:', conversation);
      this.conversationCallbacks.forEach(callback => callback(conversation));
    });

    // User typing
    this.socket.on('user_typing', (data: { userId: string; isTyping: boolean }) => {
      console.log('⌨️ User typing:', data);
      this.typingCallbacks.forEach(callback => callback(data));
    });

    // Message read
    this.socket.on('message_read', (data: { messageId: string }) => {
      console.log('✅ Message read:', data);
      this.readCallbacks.forEach(callback => callback(data));
    });
  }

  joinConversation(conversationId: string) {
    if (!this.socket) {
      console.error('❌ Socket not connected - cannot join conversation');
      return;
    }
    if (!this.socket.connected) {
      console.error('❌ Socket exists but not connected - cannot join conversation');
      return;
    }
    console.log('🚪 Joining conversation:', conversationId);
    console.log('🔌 Socket ID:', this.socket.id);
    console.log('🔌 Socket connected:', this.socket.connected);
    // Backend expects 'join-conversation' with hyphen, not underscore
    this.socket.emit('join-conversation', conversationId);
  }

  leaveConversation(conversationId: string) {
    if (!this.socket) return;
    console.log('🚪 Leaving conversation:', conversationId);
    this.socket.emit('leave_conversation', { conversationId });
  }

  sendMessage(
    conversationId: string,
    message: string,
    senderType: 'customer' | 'provider' | 'system',
    senderName: string,
    messageType: string = 'text'
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      console.log('📤 Sending message:', { conversationId, message, senderType });

      this.socket.emit(
        'send_message',
        {
          conversationId,
          message,
          senderType,
          senderName,
          messageType,
          timestamp: new Date().toISOString(),
        },
        (response: any) => {
          if (response?.success) {
            console.log('✅ Message sent successfully');
            resolve();
          } else {
            console.error('❌ Message send failed:', response?.error);
            reject(new Error(response?.error || 'Failed to send message'));
          }
        }
      );
    });
  }

  markAsRead(conversationId: string, messageId: string) {
    if (!this.socket) return;
    console.log('✅ Marking message as read:', messageId);
    this.socket.emit('mark_read', { conversationId, messageId });
  }

  sendTypingIndicator(conversationId: string, isTyping: boolean) {
    if (!this.socket) return;
    this.socket.emit('typing', { conversationId, isTyping });
  }

  // Event listeners
  onNewMessage(callback: (message: Message) => void) {
    this.messageCallbacks.push(callback);
    return () => {
      this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
    };
  }

  onConversationUpdate(callback: (conversation: Conversation) => void) {
    this.conversationCallbacks.push(callback);
    return () => {
      this.conversationCallbacks = this.conversationCallbacks.filter(cb => cb !== callback);
    };
  }

  onUserTyping(callback: (data: { userId: string; isTyping: boolean }) => void) {
    this.typingCallbacks.push(callback);
    return () => {
      this.typingCallbacks = this.typingCallbacks.filter(cb => cb !== callback);
    };
  }

  onMessageRead(callback: (data: { messageId: string }) => void) {
    this.readCallbacks.push(callback);
    return () => {
      this.readCallbacks = this.readCallbacks.filter(cb => cb !== callback);
    };
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting Socket.IO...');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export default SocketIOService;
