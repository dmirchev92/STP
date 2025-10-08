# 📱 Mobile Chat Implementation Plan
## Matching Web App Functionality

**Status:** Planning Phase  
**Goal:** Implement the exact same chat logic from the working web app in the mobile app  
**Web Reference:** `d:\newtry1\Marketplace\src\components\ChatModal.tsx`

---

## 🎯 Current State Analysis

### Web App (✅ Working)
- **Technology:** Socket.IO for real-time messaging
- **Backend:** `http://192.168.0.129:3000` with Socket.IO server
- **Features:**
  - Real-time message sending/receiving
  - Conversation persistence
  - Multiple message types (text, system, survey_request, case_created)
  - Case creation from chat
  - Survey modal integration
  - Proper authentication with Socket.IO
  - Message read status
  - Typing indicators

### Mobile App (❌ Not Working)
- **Technology:** Polling-based approach
- **Issues:**
  - No real-time updates
  - Limited message type support
  - No Socket.IO connection
  - Missing survey integration
  - Incomplete conversation handling

---

## 📦 Phase 1: Dependencies & Setup

### 1.1 Install Required Packages
```bash
npm install socket.io-client
npm install @react-native-async-storage/async-storage  # Already installed
```

### 1.2 Update Package.json
Ensure these are in dependencies:
- `socket.io-client`: `^4.x.x`
- `@react-native-async-storage/async-storage`: `^1.x.x`

---

## 🏗️ Phase 2: WebSocket Service Refactor

### 2.1 Current WebSocketService Issues
**File:** `src/services/WebSocketService.ts`

**Problems:**
- Uses raw WebSocket instead of Socket.IO
- Incompatible with backend Socket.IO server
- Missing authentication
- No conversation-specific rooms

### 2.2 New Socket.IO Service Implementation

**Create:** `src/services/SocketIOService.ts`

**Key Features:**
```typescript
import { io, Socket } from 'socket.io-client';

class SocketIOService {
  private socket: Socket | null = null;
  private backendUrl = 'http://192.168.0.129:3000';
  
  // Connect with authentication
  connect(token: string) {
    this.socket = io(this.backendUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
    
    this.setupEventListeners();
  }
  
  // Join conversation room
  joinConversation(conversationId: string) {
    this.socket?.emit('join_conversation', { conversationId });
  }
  
  // Send message
  sendMessage(conversationId: string, message: string, senderType: string) {
    this.socket?.emit('send_message', {
      conversationId,
      message,
      senderType,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Listen for new messages
  onNewMessage(callback: (message: any) => void) {
    this.socket?.on('new_message', callback);
  }
  
  // Disconnect
  disconnect() {
    this.socket?.disconnect();
  }
}
```

---

## 💬 Phase 3: Chat Screen Refactor

### 3.1 Update ChatScreen.tsx

**Current Structure:**
```typescript
// Uses polling with setInterval
pollIntervalRef.current = setInterval(() => {
  loadConversations(true);
}, 300000);
```

**New Structure (Match Web):**
```typescript
// Use Socket.IO for real-time updates
useEffect(() => {
  const socketService = SocketIOService.getInstance();
  socketService.connect(authToken);
  
  // Listen for conversation updates
  socketService.onConversationUpdate((data) => {
    updateConversationsList(data);
  });
  
  return () => {
    socketService.disconnect();
  };
}, []);
```

### 3.2 Conversation Data Structure

**Match Web App Structure:**
```typescript
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
```

---

## 💬 Phase 4: Chat Detail Screen (New)

### 4.1 Create ChatDetailScreen.tsx

**Purpose:** Individual conversation view (like web ChatModal)

**Key Components:**
```typescript
interface ChatDetailScreenProps {
  route: {
    params: {
      conversationId: string;
      providerId: string;
      providerName: string;
    };
  };
}

// Main features:
- Message list with FlatList
- Message input with TextInput
- Send button
- Message type rendering (text, system, survey_request)
- Case creation button
- Survey modal integration
- Real-time message updates via Socket.IO
```

### 4.2 Message Types to Support

**From Web App:**
```typescript
type MessageType = 
  | 'text'              // Regular chat message
  | 'system'            // System notifications
  | 'survey_request'    // Survey request with button
  | 'case_created'      // Case creation confirmation
  | 'case_template'     // Case template
  | 'service_request';  // Service request
```

### 4.3 Message Rendering

**Text Message:**
```tsx
<View style={styles.messageContainer}>
  <Text style={styles.senderName}>{message.senderName}</Text>
  <Text style={styles.messageText}>{message.message}</Text>
  <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
</View>
```

**Survey Request Message:**
```tsx
<View style={styles.surveyMessage}>
  <Text style={styles.surveyText}>{message.message}</Text>
  <TouchableOpacity 
    style={styles.surveyButton}
    onPress={() => openSurveyModal(message.caseId)}
  >
    <Text style={styles.surveyButtonText}>⭐ Оценете услугата</Text>
  </TouchableOpacity>
</View>
```

**Case Created Message:**
```tsx
<View style={styles.systemMessage}>
  <Text style={styles.systemText}>✅ {message.message}</Text>
</View>
```

---

## 🎨 Phase 5: UI Components

### 5.1 Message Bubble Component

**Create:** `src/components/MessageBubble.tsx`

```typescript
interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onSurveyClick?: (caseId: string) => void;
}

// Styling based on message type and sender
- Customer messages: Right-aligned, blue background
- Provider messages: Left-aligned, gray background
- System messages: Center-aligned, light background
```

### 5.2 Case Creation Button

**Create:** `src/components/CreateCaseButton.tsx`

```typescript
// Floating action button (like web)
<TouchableOpacity 
  style={styles.createCaseButton}
  onPress={() => setShowCaseModal(true)}
>
  <Text style={styles.createCaseIcon}>📋</Text>
  <Text style={styles.createCaseText}>Създай заявка</Text>
</TouchableOpacity>
```

### 5.3 Survey Modal Integration

**Use existing or create:** `src/components/SurveyModal.tsx`

**Features:**
- Star ratings (1-5)
- Comment field
- Submit button
- Same validation as web
- API integration: `POST /api/v1/reviews`

---

## 🔄 Phase 6: Real-Time Features

### 6.1 Socket.IO Events to Implement

**Emit (Send to Server):**
```typescript
// Join conversation
socket.emit('join_conversation', { conversationId });

// Send message
socket.emit('send_message', {
  conversationId,
  message,
  senderType: 'customer' | 'provider',
  messageType: 'text',
});

// Mark as read
socket.emit('mark_read', { conversationId, messageId });

// Typing indicator
socket.emit('typing', { conversationId, isTyping: true });
```

**Listen (Receive from Server):**
```typescript
// New message received
socket.on('new_message', (message) => {
  addMessageToConversation(message);
});

// Message read
socket.on('message_read', ({ messageId }) => {
  updateMessageReadStatus(messageId);
});

// Typing indicator
socket.on('user_typing', ({ userId, isTyping }) => {
  showTypingIndicator(userId, isTyping);
});

// Conversation updated
socket.on('conversation_updated', (conversation) => {
  updateConversation(conversation);
});
```

### 6.2 Persistence with AsyncStorage

**Store Conversations:**
```typescript
// Save conversation list
await AsyncStorage.setItem(
  'conversations',
  JSON.stringify(conversations)
);

// Save specific conversation messages
await AsyncStorage.setItem(
  `conversation_${conversationId}`,
  JSON.stringify(messages)
);

// Load on app start
const savedConversations = await AsyncStorage.getItem('conversations');
if (savedConversations) {
  setConversations(JSON.parse(savedConversations));
}
```

---

## 🔐 Phase 7: Authentication Integration

### 7.1 Token Management

**Get Auth Token:**
```typescript
const getAuthToken = async () => {
  const token = await AsyncStorage.getItem('auth_token');
  return token;
};
```

**Socket.IO Authentication:**
```typescript
const token = await getAuthToken();
const socket = io('http://192.168.0.129:3000', {
  auth: { token },
});
```

### 7.2 User Context

**Get Current User:**
```typescript
const response = await ApiService.getInstance().getCurrentUser();
const user = response.data?.user || response.data;

// Use for:
- Setting sender name in messages
- Determining message alignment (own vs other)
- Joining correct conversation rooms
```

---

## 📋 Phase 8: Case Creation Integration

### 8.1 UnifiedCaseModal Integration

**Create or adapt:** `src/components/UnifiedCaseModal.tsx`

**Props:**
```typescript
interface UnifiedCaseModalProps {
  visible: boolean;
  onClose: () => void;
  providerId: string;
  providerName: string;
  providerCategory: string;
  conversationId: string;
  customerPhone: string;
  mode: 'template' | 'direct';
}
```

### 8.2 Case Creation Flow

**From Chat:**
```typescript
1. User clicks "Създай заявка" button
2. UnifiedCaseModal opens with pre-filled provider info
3. User fills form (service type, description, etc.)
4. Submit creates case via API: POST /api/v1/marketplace/cases
5. Success message sent to chat
6. Modal closes
```

**API Payload:**
```typescript
{
  serviceType: string;
  description: string;
  address: string;
  phone: string;
  preferredDate: string;
  preferredTime: string;
  priority: 'low' | 'medium' | 'high';
  providerId: string | null; // null for open queue
  assignmentType: 'specific' | 'open';
  conversationId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}
```

---

## 🎯 Phase 9: Survey Integration

### 9.1 Survey Modal Component

**Create:** `src/components/SurveyModal.tsx`

**Features:**
```typescript
interface SurveyModalProps {
  visible: boolean;
  onClose: () => void;
  caseId: string;
  providerId: string;
  providerName: string;
}

// Rating categories:
- Communication (1-5 stars)
- Quality (1-5 stars)
- Timeliness (1-5 stars)
- Value for Money (1-5 stars)
- Overall (auto-calculated average)
- Comment (optional text)
```

### 9.2 Survey Submission

**API Endpoint:** `POST /api/v1/reviews`

**Payload:**
```typescript
{
  caseId: string;
  providerId: string;
  customerId: string;
  rating: number; // Overall rating
  communication: number;
  quality: number;
  timeliness: number;
  valueForMoney: number;
  comment: string;
}
```

**After Submission:**
```typescript
// Send thank you message to chat
socket.emit('send_message', {
  conversationId,
  message: '🙏 Благодарим за отзива!',
  senderType: 'system',
  messageType: 'system',
});
```

---

## 🎨 Phase 10: UI/UX Matching Web

### 10.1 Dark Theme (Match Settings)

**Colors:**
```typescript
const chatTheme = {
  background: '#0F172A',
  messageBackground: 'rgba(255,255,255,0.1)',
  ownMessageBackground: '#6366F1',
  systemMessageBackground: 'rgba(59,130,246,0.2)',
  text: '#FFFFFF',
  secondaryText: '#CBD5E1',
  border: 'rgba(255,255,255,0.2)',
};
```

### 10.2 Message Styling

**Own Messages (Right):**
```typescript
{
  alignSelf: 'flex-end',
  backgroundColor: '#6366F1',
  color: '#FFFFFF',
  borderRadius: 16,
  borderBottomRightRadius: 4,
  padding: 12,
  maxWidth: '75%',
}
```

**Other Messages (Left):**
```typescript
{
  alignSelf: 'flex-start',
  backgroundColor: 'rgba(255,255,255,0.1)',
  color: '#FFFFFF',
  borderRadius: 16,
  borderBottomLeftRadius: 4,
  padding: 12,
  maxWidth: '75%',
}
```

### 10.3 Input Area

**Match Web Design:**
```tsx
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
    style={styles.sendButton}
    onPress={handleSendMessage}
    disabled={!newMessage.trim()}
  >
    <Text style={styles.sendIcon}>📤</Text>
  </TouchableOpacity>
</View>
```

---

## 🔧 Phase 11: Error Handling

### 11.1 Connection Errors

**Socket.IO Reconnection:**
```typescript
socket.on('connect_error', (error) => {
  console.error('❌ Socket connection error:', error);
  Alert.alert(
    'Грешка при свързване',
    'Не можем да се свържем със сървъра. Моля опитайте отново.'
  );
});

socket.on('reconnect', (attemptNumber) => {
  console.log('✅ Reconnected after', attemptNumber, 'attempts');
  // Reload messages
  loadConversationMessages(conversationId);
});
```

### 11.2 Message Send Failures

**Retry Logic:**
```typescript
const sendMessageWithRetry = async (message, retries = 3) => {
  try {
    socket.emit('send_message', message);
    // Wait for acknowledgment
    await waitForAck(message.id, 5000);
  } catch (error) {
    if (retries > 0) {
      console.log(`🔄 Retrying message send (${retries} attempts left)`);
      await sendMessageWithRetry(message, retries - 1);
    } else {
      // Show failed message in UI
      markMessageAsFailed(message.id);
      Alert.alert('Грешка', 'Съобщението не беше изпратено');
    }
  }
};
```

### 11.3 Offline Mode

**Queue Messages:**
```typescript
const queuedMessages = [];

if (!socket?.connected) {
  // Add to queue
  queuedMessages.push(message);
  await AsyncStorage.setItem('queued_messages', JSON.stringify(queuedMessages));
  
  // Show in UI as "Sending..."
  addPendingMessage(message);
}

// When reconnected
socket.on('connect', async () => {
  const queued = await AsyncStorage.getItem('queued_messages');
  if (queued) {
    const messages = JSON.parse(queued);
    messages.forEach(msg => socket.emit('send_message', msg));
    await AsyncStorage.removeItem('queued_messages');
  }
});
```

---

## 📊 Phase 12: Testing Plan

### 12.1 Unit Tests

**Test Files to Create:**
- `SocketIOService.test.ts`
- `ChatScreen.test.tsx`
- `ChatDetailScreen.test.tsx`
- `MessageBubble.test.tsx`

**Key Test Cases:**
```typescript
describe('SocketIOService', () => {
  test('connects with authentication token', () => {});
  test('joins conversation room', () => {});
  test('sends message successfully', () => {});
  test('receives new messages', () => {});
  test('handles disconnection', () => {});
  test('reconnects automatically', () => {});
});

describe('ChatScreen', () => {
  test('loads conversations on mount', () => {});
  test('displays conversation list', () => {});
  test('navigates to chat detail on tap', () => {});
  test('shows unread count badge', () => {});
  test('updates in real-time', () => {});
});

describe('ChatDetailScreen', () => {
  test('loads conversation messages', () => {});
  test('sends text message', () => {});
  test('renders different message types', () => {});
  test('opens case creation modal', () => {});
  test('opens survey modal', () => {});
  test('scrolls to bottom on new message', () => {});
});
```

### 12.2 Integration Tests

**Scenarios:**
1. **Full Chat Flow:**
   - Open app → Navigate to Chat → Select conversation → Send message → Receive response

2. **Case Creation from Chat:**
   - Open chat → Click create case → Fill form → Submit → Verify case created

3. **Survey Completion:**
   - Receive survey request → Click button → Fill survey → Submit → Verify review saved

4. **Real-time Updates:**
   - Open chat on two devices → Send message from one → Verify received on other

### 12.3 Manual Testing Checklist

- [ ] Chat list loads conversations
- [ ] Unread count displays correctly
- [ ] Can open individual conversation
- [ ] Messages display in correct order
- [ ] Can send text messages
- [ ] Messages appear in real-time
- [ ] Own messages align right
- [ ] Other messages align left
- [ ] System messages display correctly
- [ ] Survey request button works
- [ ] Survey modal opens and submits
- [ ] Case creation button works
- [ ] Case creation modal opens and submits
- [ ] Typing indicator works
- [ ] Read receipts work
- [ ] Offline mode queues messages
- [ ] Reconnection works after network loss
- [ ] Messages persist after app restart

---

## 📁 Phase 13: File Structure

### 13.1 New Files to Create

```
src/
├── services/
│   ├── SocketIOService.ts          ✨ NEW - Socket.IO connection management
│   └── ChatService.ts               ✨ NEW - Chat-specific API calls
├── screens/
│   ├── ChatScreen.tsx               🔄 REFACTOR - Use Socket.IO
│   └── ChatDetailScreen.tsx         ✨ NEW - Individual conversation view
├── components/
│   ├── MessageBubble.tsx            ✨ NEW - Message rendering
│   ├── CreateCaseButton.tsx         ✨ NEW - Floating action button
│   ├── SurveyModal.tsx              ✨ NEW - Survey form
│   ├── UnifiedCaseModal.tsx         ✨ NEW - Case creation form
│   └── TypingIndicator.tsx          ✨ NEW - "User is typing..."
├── types/
│   └── chat.ts                      ✨ NEW - Chat-related TypeScript types
└── utils/
    ├── chatHelpers.ts               ✨ NEW - Chat utility functions
    └── messageFormatters.ts         ✨ NEW - Message formatting utilities
```

### 13.2 Files to Update

```
src/
├── navigation/
│   ├── AppNavigator.tsx             🔄 ADD ChatDetailScreen route
│   └── types.ts                     🔄 ADD ChatDetail navigation params
├── services/
│   ├── ApiService.ts                🔄 ADD chat-related endpoints
│   └── WebSocketService.ts          ❌ DEPRECATED - Replace with SocketIOService
└── screens/
    └── ChatScreen.tsx               🔄 MAJOR REFACTOR - Socket.IO integration
```

---

## 🚀 Phase 14: Implementation Order

### Week 1: Foundation
1. ✅ Install dependencies (socket.io-client)
2. ✅ Create SocketIOService.ts
3. ✅ Create chat TypeScript types
4. ✅ Test Socket.IO connection with backend

### Week 2: Core Chat
5. ✅ Refactor ChatScreen.tsx to use Socket.IO
6. ✅ Create ChatDetailScreen.tsx
7. ✅ Create MessageBubble.tsx component
8. ✅ Implement message sending/receiving
9. ✅ Add navigation to ChatDetailScreen

### Week 3: Advanced Features
10. ✅ Create UnifiedCaseModal.tsx
11. ✅ Integrate case creation from chat
12. ✅ Create SurveyModal.tsx
13. ✅ Integrate survey functionality
14. ✅ Add typing indicators

### Week 4: Polish & Testing
15. ✅ Implement offline mode
16. ✅ Add error handling
17. ✅ Implement message persistence
18. ✅ Write unit tests
19. ✅ Manual testing
20. ✅ Bug fixes and optimization

---

## 🎯 Success Criteria

### Functional Requirements
- [ ] Chat list displays all conversations
- [ ] Real-time message sending/receiving works
- [ ] All message types render correctly
- [ ] Case creation from chat works
- [ ] Survey modal works
- [ ] Offline mode queues messages
- [ ] Reconnection works seamlessly

### Non-Functional Requirements
- [ ] Messages load in < 1 second
- [ ] UI matches web app design
- [ ] No memory leaks
- [ ] Battery efficient (Socket.IO connection management)
- [ ] Works on Android 8.0+
- [ ] Handles poor network conditions

### Code Quality
- [ ] TypeScript types for all components
- [ ] Error handling in all async operations
- [ ] Unit test coverage > 70%
- [ ] No console errors or warnings
- [ ] Code follows existing patterns
- [ ] Documentation for new services

---

## 📝 Notes & Considerations

### Backend Compatibility
- ✅ Backend already has Socket.IO server running
- ✅ Backend endpoint: `http://192.168.0.129:3000`
- ✅ Authentication via JWT token in Socket.IO auth
- ✅ Same message structure as web app

### Performance Optimization
- Use FlatList with `windowSize` for message list
- Implement message pagination (load older messages on scroll)
- Debounce typing indicators
- Optimize image rendering if messages contain images

### Security
- Always send auth token with Socket.IO connection
- Validate message content before sending
- Sanitize user input
- Don't store sensitive data in AsyncStorage unencrypted

### Accessibility
- Add accessibility labels to all interactive elements
- Support screen readers
- Ensure sufficient color contrast
- Support text scaling

---

## 🔗 References

### Web App Files (Working Implementation)
- `d:\newtry1\Marketplace\src\components\ChatModal.tsx` - Main chat component
- `d:\newtry1\Marketplace\src\components\UnifiedCaseModal.tsx` - Case creation
- `d:\newtry1\Marketplace\src\components\SurveyModal.tsx` - Survey form
- `d:\newtry1\Marketplace\src\lib\api.ts` - API client

### Backend Files
- `d:\newtry1\ServiceTextPro\backend\src\server.ts` - Socket.IO server setup
- `d:\newtry1\ServiceTextPro\backend\src\controllers\chatController.ts` - Chat endpoints

### Documentation
- Socket.IO Client Docs: https://socket.io/docs/v4/client-api/
- React Native AsyncStorage: https://react-native-async-storage.github.io/async-storage/

---

## ✅ Next Steps

1. **Review this plan** with the team
2. **Approve implementation approach**
3. **Start with Phase 1** (Dependencies)
4. **Implement incrementally** following the week-by-week schedule
5. **Test each phase** before moving to the next
6. **Document any deviations** from the plan

---

**Created:** 2025-01-08  
**Last Updated:** 2025-01-08  
**Status:** Ready for Implementation  
**Estimated Effort:** 4 weeks (1 developer)
