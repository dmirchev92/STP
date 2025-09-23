import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  AppState,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainTabParamList } from '../navigation/types';
import { RootState } from '../store';
// Removed import - using simple local state instead
import ApiService from '../services/ApiService';
import WebSocketService from '../services/WebSocketService';
import { CallRecord } from '../utils/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../styles/theme';

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
  lastMessage?: string;
  callRecord?: CallRecord;
  aiConfidence?: number;
  urgency?: 'low' | 'medium' | 'high' | 'emergency';
}

type ChatScreenNavigationProp = StackNavigationProp<MainTabParamList, 'Chat'>;

function ChatScreen() {
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const dispatch = useDispatch();
  const { currentMode } = useSelector((state: RootState) => state.app);
  const { calls } = useSelector((state: RootState) => state.calls);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pollIntervalRef = useRef<any>(null);
  const appState = useRef(AppState.currentState);
  const webSocketService = useRef(WebSocketService.getInstance());

  // Start polling
  const startPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    console.log('🔄 Starting conversation polling every 5 minutes');
    pollIntervalRef.current = setInterval(() => {
      console.log('🔄 Auto-refreshing conversations...');
      loadConversations(true); // Silent refresh - no loading spinner
    }, 300000); // Refresh every 5 minutes (300000ms)
  };

  // Stop polling
  const stopPolling = () => {
    if (pollIntervalRef.current) {
      console.log('⏸️ Stopping conversation polling');
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('📱 App has come to the foreground - refreshing conversations');
        loadConversations(true); // Silent refresh
        startPolling();
      } else if (nextAppState.match(/inactive|background/)) {
        console.log('📱 App has gone to background - stopping polling');
        stopPolling();
      }

      appState.current = nextAppState;
    });

    return () => subscription?.remove();
  }, []);

  // Setup WebSocket listeners
  useEffect(() => {
    const ws = webSocketService.current;
    
    // Connect to WebSocket
    ws.connect();
    
    // Setup authentication when connected
    ws.on('connected', async () => {
      try {
        const apiService = ApiService.getInstance();
        const userResponse = await apiService.getCurrentUser();
        
        if (userResponse.success && userResponse.data) {
          const currentUser = (userResponse.data as any)?.user || userResponse.data;
          const token = await AsyncStorage.getItem('auth_token');
          
          if (token && currentUser?.id) {
            ws.authenticate(token, currentUser.id);
            ws.joinUserRoom(currentUser.id);
          }
        }
      } catch (error) {
        console.error('Error setting up WebSocket authentication:', error);
      }
    });

    // Listen for new message notifications
    ws.on('new_message_notification', (data: any) => {
      console.log('📱 New message notification received:', data);
      // Refresh conversations to show new message
      loadConversations(true);
    });

    // Listen for new messages in conversations
    ws.on('new_message', (data: any) => {
      console.log('📱 New message in conversation:', data);
      // Update specific conversation with new message
      setConversations(prev => prev.map(conv => {
        if (conv.id === data.conversationId) {
          return {
            ...conv,
            lastMessage: data.message,
            lastActivity: data.timestamp,
            messages: [...(conv.messages || []), {
              id: data.messageId,
              text: data.message,
              sender: data.senderType as 'customer' | 'ai' | 'ivan',
              timestamp: data.timestamp
            }]
          };
        }
        return conv;
      }));
    });

    return () => {
      ws.off('connected', () => {});
      ws.off('new_message_notification', () => {});
      ws.off('new_message', () => {});
    };
  }, []);

  // Screen focus effect
  useFocusEffect(
    React.useCallback(() => {
      console.log('📱 Chat screen focused - refreshing conversations');
      loadConversations(true); // Silent refresh
      startPolling();

      return () => {
        console.log('📱 Chat screen unfocused - stopping polling');
        stopPolling();
      };
    }, [])
  );

  // Initial load
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async (silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      
      // Get current user to load their conversations
      const apiService = ApiService.getInstance();
      const userResponse = await apiService.getCurrentUser();

      let targetUserId: string | null = null;
      if (userResponse.success && userResponse.data) {
        const currentUser = (userResponse.data as any)?.user || userResponse.data; // Handle both formats
        targetUserId = currentUser?.id || null;
      }

      if (!targetUserId) {
        // Fallback: use device-based user id so backend can map it to the real user
        const deviceUserId = await AsyncStorage.getItem('device_user_id');
        if (deviceUserId) {
          console.log('📱 No auth user, using device ID to load conversations:', deviceUserId);
          targetUserId = deviceUserId;
        } else {
          console.log('📱 No current user or device ID, skipping conversation load');
          setConversations([]);
          return;
        }
      }

      console.log('📱 Loading conversations for user:', targetUserId);
      const response = await apiService.getConversations(targetUserId);

      if (response.success && response.data) {
        console.log('✅ Loaded conversations:', response.data.conversations.length);
        console.log('📋 Conversation details:');
        response.data.conversations.forEach((conv: any, index: number) => {
          console.log(`  ${index + 1}. ID: ${conv.id}, Customer: ${conv.customerName || conv.customerPhone}, Type: ${conv.conversationType}, Status: ${conv.status}, Last Message: "${conv.lastMessage || 'None'}"`);
        });
        setConversations(response.data.conversations);
      } else {
        console.error('❌ Failed to load conversations:', response.error);
        setConversations([]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadConversations();
    setIsRefreshing(false);
  };

  const handleConversationSelect = (conversation: Conversation) => {
    navigation.navigate('ChatDetail', { conversation });
  };



  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[
        styles.conversationItem,
        item.status === 'closed' && styles.closedConversation,
      ]}
      onPress={() => handleConversationSelect(item)}
    >
      <View style={styles.conversationHeader}>
        <Text style={styles.customerName}>
          {item.customerName || item.customerPhone}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>
      
      <Text style={styles.lastMessage} numberOfLines={2}>
        {item.lastMessage || 'Няма съобщения'}
      </Text>
      
      <View style={styles.conversationMeta}>
        <Text style={styles.lastActivity}>
          {formatLastActivity(item.lastActivity)}
        </Text>
        {item.urgency && (
          <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(item.urgency) }]}>
            <Text style={styles.urgencyText}>
              {getUrgencyLabel(item.urgency)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status: string): string => {
    const colors = {
      ai_active: theme.colors.primary.solid,
      ivan_taken_over: theme.colors.success.solid,
      closed: theme.colors.text.tertiary,
      handoff_requested: theme.colors.warning.solid,
    };
    return colors[status as keyof typeof colors] || theme.colors.text.tertiary;
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
      low: theme.colors.success.solid,
      medium: theme.colors.warning.solid,
      high: '#e67e22',
      emergency: theme.colors.danger.solid,
    };
    return colors[urgency as keyof typeof colors] || theme.colors.text.tertiary;
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

  if (isLoading && conversations.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Зареждане на разговори...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💬 Разговори</Text>
        <Text style={styles.subtitle}>
          {conversations.filter(c => c.status !== 'closed').length} активни разговора
        </Text>
      </View>

      <View style={styles.content}>
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.conversationsContent}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
    ...theme.shadows.sm,
  },
  title: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.secondary,
  },
  content: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  conversationsContent: {
    paddingBottom: theme.spacing.md,
  },
  conversationItem: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
    minHeight: 90,
    backgroundColor: theme.colors.background.secondary,
  },
  closedConversation: {
    opacity: 0.6,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  customerName: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.lg,
  },
  statusText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
  },
  lastMessage: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
    lineHeight: 18,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  conversationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastActivity: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.tertiary,
  },
  urgencyBadge: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.md,
  },
  urgencyText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
  },
});

export default ChatScreen;
