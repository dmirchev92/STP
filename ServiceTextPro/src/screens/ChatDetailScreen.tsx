import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootState } from '../store';
// Removed import - using simple local state instead
import ApiService from '../services/ApiService';
import WebSocketService from '../services/WebSocketService';
import ChatMessage from '../components/ChatMessage';
import HandoffButton from '../components/HandoffButton';
import { CallRecord } from '../utils/types';

interface ChatMessageType {
  id: string;
  text: string;
  sender: 'customer' | 'ai' | 'ivan';
  timestamp: string;
  isTyping?: boolean;
  isRead?: boolean;
  metadata?: {
    platform: 'viber' | 'whatsapp' | 'telegram';
    messageId?: string;
    deliveryStatus?: 'sent' | 'delivered' | 'read' | 'failed';
  };
}

interface Conversation {
  id: string;
  customerPhone: string;
  customerName?: string;
  status: 'ai_active' | 'ivan_taken_over' | 'closed' | 'handoff_requested';
  messages: ChatMessageType[];
  lastActivity: string;
  callRecord?: CallRecord;
  aiConfidence?: number;
  urgency?: 'low' | 'medium' | 'high' | 'emergency';
}

type ChatDetailRouteProp = RouteProp<{
  ChatDetail: {
    conversation: Conversation;
  };
}, 'ChatDetail'>;

const ChatDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<ChatDetailRouteProp>();
  const dispatch = useDispatch();
  const { currentMode } = useSelector((state: RootState) => state.app);
  const { calls } = useSelector((state: RootState) => state.calls);
  
  const [conversation, setConversation] = useState<Conversation>(route.params.conversation);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const webSocketService = useRef(WebSocketService.getInstance());

  useEffect(() => {
    // Set navigation header
    navigation.setOptions({
      title: conversation.customerName || conversation.customerPhone,
      headerStyle: {
        backgroundColor: '#007AFF',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
      headerRight: () => (
        <View style={styles.headerActions}>
          {conversation.status === 'ai_active' && (
            <HandoffButton
              onPress={() => handleTakeOver(conversation.id)}
              urgency={conversation.urgency}
            />
          )}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => handleCloseConversation(conversation.id)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [conversation, navigation]);

  // Setup WebSocket for real-time updates
  useEffect(() => {
    const ws = webSocketService.current;
    
    // Join conversation room for real-time updates
    ws.joinConversation(conversation.id);
    
    // Listen for new messages in this conversation
    const handleNewMessage = (data: any) => {
      if (data.conversationId === conversation.id) {
        console.log('📱 New message in current conversation:', data);
        setConversation(prev => ({
          ...prev,
          messages: [...prev.messages, {
            id: data.messageId,
            text: data.message,
            sender: data.senderType as 'customer' | 'ai' | 'ivan',
            timestamp: data.timestamp
          }],
          lastActivity: data.timestamp,
          lastMessage: data.message
        }));
        scrollToBottom();
      }
    };

    ws.on('new_message', handleNewMessage);

    return () => {
      ws.off('new_message', handleNewMessage);
    };
  }, [conversation.id]);

  // Load messages when opening the screen
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const apiService = ApiService.getInstance();
        const conversationType = (conversation as any).conversationType || 'phone';
        console.log('📱 Initial load messages for conversation:', conversation.id, 'type:', conversationType);
        const response = await apiService.getConversationMessages(conversation.id, conversationType);
        if (response.success && response.data) {
          setConversation(prev => ({
            ...prev,
            messages: response.data.messages || []
          }));
        } else {
          console.log('⚠️ No messages loaded on open:', response.error);
        }
      } catch (err) {
        console.error('❌ Error initial loading messages:', err);
      }
    };
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  useEffect(() => {
    if (conversation.messages.length > 0) {
      scrollToBottom();
    }
  }, [conversation.messages]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    const newMessage: ChatMessageType = {
      id: Date.now().toString(),
      text: messageText.trim(),
      sender: 'ivan',
      timestamp: new Date().toISOString(),
      isRead: false,
      metadata: { platform: 'viber' },
    };

    try {
      // Add message to local state immediately for better UX
      setConversation(prev => ({
        ...prev,
        messages: [...prev.messages, newMessage],
        status: 'ivan_taken_over',
        lastActivity: new Date().toISOString(),
      }));

      setMessageText('');
      scrollToBottom();

      // Send message through backend
      const apiService = ApiService.getInstance();
      const result = await apiService.sendMessage(conversation.id, {
        text: messageText.trim(),
        platform: 'viber',
      });

      // Update message with delivery status
      setConversation(prev => ({
        ...prev,
        messages: prev.messages.map(msg => 
          msg.id === newMessage.id 
            ? { 
                ...msg, 
                metadata: { 
                  ...msg.metadata, 
                  deliveryStatus: result.success ? 'sent' : 'failed',
                  platform: msg.metadata?.platform || 'viber'
                } 
              }
            : msg
        ),
      }));

      console.log('✅ Message sent successfully:', result);

    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      // Remove the message from local state if sending failed
      setConversation(prev => ({
        ...prev,
        messages: prev.messages.filter(msg => msg.id !== newMessage.id),
      }));
      
      Alert.alert('Грешка', 'Възникна проблем при изпращането на съобщението.');
    }
  };

  const handleTakeOver = async (conversationId: string) => {
    try {
      // Request handoff through backend
      const apiService = ApiService.getInstance();
      await apiService.requestHandoff(conversationId);
      
      // Update local state
      setConversation(prev => ({
        ...prev,
        status: 'ivan_taken_over',
        lastActivity: new Date().toISOString(),
      }));

      Alert.alert('Успешно', 'Поехте разговора!');

    } catch (error) {
      console.error('❌ Error taking over conversation:', error);
      Alert.alert('Грешка', 'Възникна проблем при поемането на разговора.');
    }
  };

  const handleCloseConversation = async (conversationId: string) => {
    Alert.alert(
      'Затваряне на разговора',
      'Сигурни ли сте, че искате да затворите този разговор?',
      [
        { text: 'Отказ', style: 'cancel' },
        {
          text: 'Затвори',
          style: 'destructive',
          onPress: async () => {
            try {
              // Close conversation through backend
              const apiService = ApiService.getInstance();
              await apiService.closeConversation(conversationId);
              
              // Update local state
              setConversation(prev => ({
                ...prev,
                status: 'closed',
                lastActivity: new Date().toISOString(),
              }));

              // Navigate back to chat list
              navigation.goBack();

            } catch (error) {
              console.error('❌ Error closing conversation:', error);
              Alert.alert('Грешка', 'Възникна проблем при затварянето на разговора.');
            }
          },
        },
      ]
    );
  };

  const scrollToBottom = () => {
    if (flatListRef.current && conversation.messages.length) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    // TODO: Refresh conversation data
    // const updatedConversation = await ApiService.getConversation(conversation.id);
    // setConversation(updatedConversation);
    setIsRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusInfo}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(conversation.status) }]}>
            <Text style={styles.statusText}>
              {getStatusLabel(conversation.status)}
            </Text>
          </View>
          {conversation.urgency && (
            <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(conversation.urgency) }]}>
              <Text style={styles.urgencyText}>
                {getUrgencyLabel(conversation.urgency)}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.lastActivity}>
          Последна активност: {formatLastActivity(conversation.lastActivity)}
        </Text>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={conversation.messages}
        renderItem={({ item }) => (
          <ChatMessage
            message={item}
            isOwnMessage={item.sender === 'ivan'}
          />
        )}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      />

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.messageInput}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Напишете съобщение..."
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!messageText.trim()}
          >
            <Text style={styles.sendButtonText}>📤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

// Helper functions
const getStatusColor = (status: string): string => {
  const colors = {
    ai_active: '#3498db',
    ivan_taken_over: '#27ae60',
    closed: '#95a5a6',
    handoff_requested: '#f39c12',
  };
  return colors[status as keyof typeof colors] || '#95a5a6';
};

const getStatusLabel = (status: string): string => {
  const labels = {
    ai_active: 'AI активен',
    ivan_taken_over: 'Иван пое',
    closed: 'Затворен',
    handoff_requested: 'Изисква поемане',
  };
  return labels[status as keyof typeof labels] || status;
};

const getUrgencyColor = (urgency: string): string => {
  const colors = {
    low: '#27ae60',
    medium: '#f39c12',
    high: '#e67e22',
    emergency: '#e74c3c',
  };
  return colors[urgency as keyof typeof colors] || '#95a5a6';
};

const getUrgencyLabel = (urgency: string): string => {
  const labels = {
    low: 'Ниско',
    medium: 'Средно',
    high: 'Високо',
    emergency: 'Спешно',
  };
  return labels[urgency as keyof typeof labels] || urgency;
};

const formatLastActivity = (timestamp: string): string => {
  const now = new Date();
  const last = new Date(timestamp);
  const diffMs = now.getTime() - last.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Сега';
  if (diffMins < 60) return `${diffMins}м`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}ч`;
  return `${Math.floor(diffMins / 1440)}д`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  statusBar: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  lastActivity: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputWrapper: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
    backgroundColor: '#f8f9fa',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  sendButtonText: {
    fontSize: 18,
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: 8,
    marginLeft: 12,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ChatDetailScreen;
