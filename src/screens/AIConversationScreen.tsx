import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { AIConversation, ProblemType, UrgencyLevel } from '../utils/aiTypes';
import { AIConversationEngine } from '../services/ai/AIConversationEngine';
import { t } from '../localization';

interface ConversationSummary {
  id: string;
  phoneNumber: string;
  problemType: ProblemType;
  urgencyLevel: UrgencyLevel;
  status: string;
  messageCount: number;
  startedAt: number;
  lastActivity: number;
}

const AIConversationScreen: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    escalated: 0,
    averageMessages: 0
  });
  const [selectedConversation, setSelectedConversation] = useState<AIConversation | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [aiEngine] = useState(() => AIConversationEngine.getInstance());

  useEffect(() => {
    initializeAI();
    loadConversations();
  }, []);

  const initializeAI = async () => {
    try {
      const success = await aiEngine.initialize({
        businessContext: {
          technicianName: 'Иван Петров',
          profession: 'електротехник',
          experience: '8',
          workingHours: '08:00 - 18:00',
          emergencyPhone: '+359888123456',
          currentTime: new Date(),
          isBusinessHours: true
        }
      });

      if (!success) {
        Alert.alert('Грешка', 'Неуспешно стартиране на AI системата');
      }
    } catch (error) {
      console.error('Error initializing AI:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const activeConversations = aiEngine.getActiveConversations();
      const conversationStats = aiEngine.getConversationStats();

      const summaries: ConversationSummary[] = activeConversations.map(conv => ({
        id: conv.id,
        phoneNumber: conv.phoneNumber,
        problemType: conv.analysis.problemType,
        urgencyLevel: conv.analysis.urgencyLevel,
        status: conv.status,
        messageCount: conv.messages.length,
        startedAt: conv.startedAt,
        lastActivity: conv.lastMessageAt
      }));

      setConversations(summaries);
      setStats(conversationStats);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const handleConversationPress = async (conversationId: string) => {
    try {
      const conversation = aiEngine.getConversation(conversationId);
      if (conversation) {
        setSelectedConversation(conversation);
        setShowDetails(true);
      }
    } catch (error) {
      console.error('Error loading conversation details:', error);
    }
  };

  const handleTestConversation = async () => {
    try {
      Alert.alert(
        'Тест на AI разговор',
        'Ще стартирам демо разговор с AI системата',
        [
          { text: 'Отказ', style: 'cancel' },
          {
            text: 'Старт',
            onPress: async () => {
              try {
                const result = await aiEngine.testConversation();
                
                Alert.alert(
                  'Тест завършен',
                  `Разговор ID: ${result.conversationId}\nСъобщения: ${result.messages.length}\nПроблем: ${result.analysis?.problemType || 'unknown'}`,
                  [{ text: 'OK', onPress: loadConversations }]
                );
              } catch (error) {
                Alert.alert('Грешка', 'Неуспешен тест на AI системата');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error testing conversation:', error);
    }
  };

  const getProblemTypeText = (problemType: ProblemType): string => {
    const types: Record<ProblemType, string> = {
      electrical_outlet: 'Електрически контакт',
      electrical_panel: 'Електрическо табло',
      electrical_wiring: 'Окабеляване',
      electrical_lighting: 'Осветление',
      electrical_appliance: 'Електрически уред',
      plumbing_leak: 'Течение',
      plumbing_blockage: 'Запушване',
      plumbing_pressure: 'Налягане',
      plumbing_heating: 'Топла вода',
      hvac_heating: 'Отопление',
      hvac_cooling: 'Климатизация',
      hvac_ventilation: 'Вентилация',
      general_maintenance: 'Поддръжка',
      unknown: 'Неизвестен'
    };
    return types[problemType] || 'Неизвестен';
  };

  const getUrgencyColor = (urgency: UrgencyLevel): string => {
    const colors: Record<UrgencyLevel, string> = {
      emergency: '#FF4444',
      critical: '#FF6B00',
      high: '#FF9500',
      medium: '#FFC107',
      low: '#4CAF50'
    };
    return colors[urgency] || '#9E9E9E';
  };

  const getUrgencyText = (urgency: UrgencyLevel): string => {
    const texts: Record<UrgencyLevel, string> = {
      emergency: 'СПЕШНО',
      critical: 'КРИТИЧНО',
      high: 'ВИСОКО',
      medium: 'СРЕДНО',
      low: 'НИСКО'
    };
    return texts[urgency] || 'НЕИЗВЕСТНО';
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - timestamp) / (1000 * 60));

    if (diffMinutes < 1) return 'току що';
    if (diffMinutes < 60) return `преди ${diffMinutes} мин`;
    if (diffMinutes < 1440) return `преди ${Math.floor(diffMinutes / 60)} ч`;
    return date.toLocaleDateString('bg-BG');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🤖 AI Разговори</Text>
        <Text style={styles.subtitle}>Интелигентна система за разговори</Text>
      </View>

      {/* Statistics */}
      <View style={styles.statsCard}>
        <Text style={styles.cardTitle}>Статистики</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Общо</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.active}</Text>
            <Text style={styles.statLabel}>Активни</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#2196F3' }]}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Завършени</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#FF9800' }]}>{stats.escalated}</Text>
            <Text style={styles.statLabel}>Ескалирани</Text>
          </View>
        </View>
      </View>

      {/* Active Conversations */}
      <View style={styles.conversationsCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Активни разговори</Text>
          <TouchableOpacity onPress={handleTestConversation} style={styles.testButton}>
            <Text style={styles.testButtonText}>🧪 Тест</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.conversationsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {conversations.length > 0 ? (
            conversations.map(conv => (
              <TouchableOpacity
                key={conv.id}
                style={styles.conversationItem}
                onPress={() => handleConversationPress(conv.id)}
              >
                <View style={styles.conversationHeader}>
                  <Text style={styles.phoneNumber}>{conv.phoneNumber}</Text>
                  <View style={[
                    styles.urgencyBadge,
                    { backgroundColor: getUrgencyColor(conv.urgencyLevel) }
                  ]}>
                    <Text style={styles.urgencyText}>
                      {getUrgencyText(conv.urgencyLevel)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.problemType}>
                  {getProblemTypeText(conv.problemType)}
                </Text>

                <View style={styles.conversationFooter}>
                  <Text style={styles.messageCount}>
                    💬 {conv.messageCount} съобщения
                  </Text>
                  <Text style={styles.timeText}>
                    {formatTime(conv.lastActivity)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Няма активни AI разговори</Text>
              <Text style={styles.emptySubtext}>
                Разговорите ще се появят автоматично при пропуснати обаждания
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Conversation Details Modal */}
      <Modal
        visible={showDetails}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Детайли за разговора</Text>
            <TouchableOpacity
              onPress={() => setShowDetails(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {selectedConversation && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Телефон:</Text>
                <Text style={styles.detailValue}>{selectedConversation.phoneNumber}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Проблем:</Text>
                <Text style={styles.detailValue}>
                  {getProblemTypeText(selectedConversation.analysis.problemType)}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Спешност:</Text>
                <View style={[
                  styles.urgencyBadge,
                  { backgroundColor: getUrgencyColor(selectedConversation.analysis.urgencyLevel) }
                ]}>
                  <Text style={styles.urgencyText}>
                    {getUrgencyText(selectedConversation.analysis.urgencyLevel)}
                  </Text>
                </View>
              </View>

              {selectedConversation.analysis.extractedInfo.location && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Локация:</Text>
                  <Text style={styles.detailValue}>
                    {selectedConversation.analysis.extractedInfo.location}
                  </Text>
                </View>
              )}

              {selectedConversation.analysis.extractedInfo.symptoms.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Симптоми:</Text>
                  <Text style={styles.detailValue}>
                    {selectedConversation.analysis.extractedInfo.symptoms.join(', ')}
                  </Text>
                </View>
              )}

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Описание:</Text>
                <Text style={styles.detailValue}>
                  {selectedConversation.analysis.issueDescription || 'Няма описание'}
                </Text>
              </View>

              {selectedConversation.analysis.estimatedCost && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Приблизителна цена:</Text>
                  <Text style={styles.detailValue}>
                    {selectedConversation.analysis.estimatedCost.min} - {selectedConversation.analysis.estimatedCost.max} лв.
                  </Text>
                </View>
              )}

              <View style={styles.messagesSection}>
                <Text style={styles.detailLabel}>Съобщения ({selectedConversation.messages.length}):</Text>
                {selectedConversation.messages.map(msg => (
                  <View key={msg.id} style={[
                    styles.messageItem,
                    msg.sender === 'ai' ? styles.aiMessage : styles.customerMessage
                  ]}>
                    <Text style={styles.messageSender}>
                      {msg.sender === 'ai' ? '🤖 AI' : '👤 Клиент'}
                    </Text>
                    <Text style={styles.messageContent}>{msg.content}</Text>
                    <Text style={styles.messageTime}>
                      {new Date(msg.timestamp).toLocaleTimeString('bg-BG')}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#673AB7',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  statsCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#673AB7',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  conversationsCard: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 0,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  testButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  testButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  conversationsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  conversationItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  phoneNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  problemType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageCount: {
    fontSize: 12,
    color: '#999',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    textAlign: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#673AB7',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 20,
    color: 'white',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    marginBottom: 15,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 16,
    color: '#666',
  },
  messagesSection: {
    marginTop: 20,
  },
  messageItem: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  aiMessage: {
    backgroundColor: '#E3F2FD',
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  customerMessage: {
    backgroundColor: '#F3E5F5',
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  messageSender: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  messageContent: {
    fontSize: 14,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    alignSelf: 'flex-end',
  },
});

export default AIConversationScreen;
