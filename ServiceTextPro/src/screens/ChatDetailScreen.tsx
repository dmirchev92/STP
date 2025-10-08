import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SocketIOService from '../services/SocketIOService';
import ApiService from '../services/ApiService';
import { Message } from '../types/chat';
import theme from '../styles/theme';
import UnifiedCaseModal from '../components/UnifiedCaseModal';
import SurveyModal from '../components/SurveyModal';

interface RouteParams {
  conversationId: string;
  providerId: string;
  providerName: string;
}

function ChatDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { conversationId, providerId, providerName } = route.params as RouteParams;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [surveyCaseId, setSurveyCaseId] = useState('');
  
  const flatListRef = useRef<FlatList>(null);
  const socketService = SocketIOService.getInstance();

  useEffect(() => {
    initializeChat();
    return () => {
      // Leave conversation room on unmount
      socketService.leaveConversation(conversationId);
    };
  }, []);

  const initializeChat = async () => {
    try {
      // Get current user
      const response = await ApiService.getInstance().getCurrentUser();
      const userData: any = response.data?.user || response.data;
      setUserId(userData.id);
      setUserName(`${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'User');
      setCustomerPhone(userData.phoneNumber || userData.phone_number || '');

      // Initialize Socket.IO if not already connected
      const token = await AsyncStorage.getItem('auth_token');
      if (token && !socketService.isConnected()) {
        console.log('🔌 Socket.IO not connected, connecting now...');
        await socketService.connect(token);
      }

      // Join conversation room
      console.log('🚪 Joining conversation room:', conversationId);
      socketService.joinConversation(conversationId);

      // Listen for new messages
      console.log('👂 Setting up message listener for conversation:', conversationId);
      const unsubscribe = socketService.onNewMessage((message) => {
        console.log('📨 Received message via Socket.IO:', message);
        if (message.conversationId === conversationId) {
          console.log('✅ Message matches current conversation, adding to list');
          addMessage(message);
        } else {
          console.log('⚠️ Message for different conversation:', message.conversationId);
        }
      });

      // Load messages
      await loadMessages();

      return unsubscribe;
    } catch (error) {
      console.error('❌ Error initializing chat:', error);
      Alert.alert('Грешка', 'Неуспешно зареждане на чата');
    }
  };

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('auth_token');

      const response = await fetch(
        `http://192.168.0.129:3000/api/v1/chat/conversations/${conversationId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('📱 ChatDetail - Messages response:', data);
        
        const messagesList = data.data?.messages || data.data || [];
        console.log(`✅ Loaded ${messagesList.length} messages`);
        setMessages(messagesList);

        // Save to cache
        await AsyncStorage.setItem(
          `conversation_${conversationId}`,
          JSON.stringify(messagesList)
        );

        // Scroll to bottom
        setTimeout(() => scrollToBottom(), 100);
      } else {
        console.error('❌ Failed to load messages:', response.status);
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      
      // Try to load from cache
      const cached = await AsyncStorage.getItem(`conversation_${conversationId}`);
      if (cached) {
        setMessages(JSON.parse(cached));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const addMessage = (message: Message) => {
    setMessages(prev => {
      // Avoid duplicates
      if (prev.some(m => m.id === message.id)) {
        return prev;
      }
      return [...prev, message];
    });
    setTimeout(() => scrollToBottom(), 100);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      const token = await AsyncStorage.getItem('auth_token');

      // Use REST API like web app (not Socket.IO emit)
      const response = await fetch('http://192.168.0.129:3000/api/v1/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId,
          senderType: 'customer',
          senderName: userName,
          message: messageText,
          messageType: 'text',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const result = await response.json();
      console.log('✅ Message sent:', result.data?.messageId);

      // Message will be received via Socket.IO listener
    } catch (error) {
      console.error('❌ Error sending message:', error);
      Alert.alert('Грешка', 'Неуспешно изпращане на съобщението');
      setNewMessage(messageText); // Restore message
    } finally {
      setIsSending(false);
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.senderType === 'customer' && item.senderName === userName;
    const isSystemMessage = item.senderType === 'system';

    if (isSystemMessage) {
      return (
        <View style={styles.systemMessageContainer}>
          <View style={styles.systemMessage}>
            <Text style={styles.systemMessageText}>{item.message}</Text>
          </View>
        </View>
      );
    }

    // Survey request message
    if (item.messageType === 'survey_request') {
      return (
        <View style={styles.systemMessageContainer}>
          <View style={styles.surveyMessage}>
            <Text style={styles.surveyText}>{item.message}</Text>
            <TouchableOpacity
              style={styles.surveyButton}
              onPress={() => {
                setSurveyCaseId(item.caseId || '');
                setShowSurveyModal(true);
              }}
            >
              <Text style={styles.surveyButtonText}>⭐ Оценете услугата</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
      ]}>
        {!isOwnMessage && (
          <Text style={styles.senderName}>{item.senderName}</Text>
        )}
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.message}
          </Text>
        </View>
        <Text style={styles.messageTime}>
          {new Date(item.timestamp).toLocaleTimeString('bg-BG', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Зареждане...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{providerName}</Text>
            <Text style={styles.headerSubtitle}>
              {socketService.isConnected() ? '🟢 Онлайн' : '⚪ Офлайн'}
            </Text>
          </View>
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => scrollToBottom()}
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Напишете съобщение..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || isSending) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sendIcon}>📤</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Floating Action Button - Create Case */}
        <TouchableOpacity
          style={styles.createCaseButton}
          onPress={() => setShowCaseModal(true)}
        >
          <Text style={styles.createCaseIcon}>📋</Text>
          <Text style={styles.createCaseText}>Създай заявка</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {/* Modals */}
      <UnifiedCaseModal
        visible={showCaseModal}
        onClose={() => setShowCaseModal(false)}
        providerId={providerId}
        providerName={providerName}
        conversationId={conversationId}
        customerPhone={customerPhone}
      />

      <SurveyModal
        visible={showSurveyModal}
        onClose={() => setShowSurveyModal(false)}
        caseId={surveyCaseId}
        providerId={providerId}
        providerName={providerName}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#CBD5E1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  backButtonText: {
    fontSize: 28,
    color: '#6366F1',
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '75%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
    marginLeft: 12,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  ownMessageBubble: {
    backgroundColor: '#6366F1',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    marginHorizontal: 12,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMessage: {
    backgroundColor: 'rgba(59,130,246,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    maxWidth: '80%',
  },
  systemMessageText: {
    fontSize: 13,
    color: '#93C5FD',
    textAlign: 'center',
  },
  surveyMessage: {
    backgroundColor: 'rgba(168,85,247,0.2)',
    padding: 16,
    borderRadius: 16,
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.3)',
  },
  surveyText: {
    fontSize: 14,
    color: '#E9D5FF',
    marginBottom: 12,
    textAlign: 'center',
  },
  surveyButton: {
    backgroundColor: '#A855F7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  surveyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    alignItems: 'flex-end',
  },
  messageInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    fontSize: 15,
    color: '#FFFFFF',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendIcon: {
    fontSize: 20,
  },
  createCaseButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: '#6366F1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createCaseIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  createCaseText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ChatDetailScreen;
