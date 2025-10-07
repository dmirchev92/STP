import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { AIConversation, ProblemType, UrgencyLevel } from '../utils/aiTypes';
import { AIConversationEngine } from '../services/ai/AIConversationEngine';
import { AnalyticsService, ProblemTypeAnalytics } from '../services/analytics/AnalyticsService';

interface IssueAnalysisData {
  conversation: AIConversation;
  analysis: any;
  recommendations: ActionRecommendation[];
  toolsNeeded: string[];
  estimatedCost: { min: number; max: number; currency: string };
  riskLevel: string;
  preparationSteps: string[];
}

interface ActionRecommendation {
  id: string;
  type: 'immediate' | 'preparation' | 'safety' | 'follow_up';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimatedTime: number; // minutes
  completed: boolean;
}

const IssueAnalysisScreen: React.FC = () => {
  const [activeIssues, setActiveIssues] = useState<IssueAnalysisData[]>([]);
  const [problemTypeStats, setProblemTypeStats] = useState<ProblemTypeAnalytics[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<IssueAnalysisData | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'emergency' | 'high' | 'medium' | 'low'>('all');
  const [aiEngine] = useState(() => AIConversationEngine.getInstance());
  const [analyticsService] = useState(() => AnalyticsService.getInstance());

  useEffect(() => {
    loadIssueData();
  }, []);

  const loadIssueData = async () => {
    try {
      console.log('[IssueAnalysis] Loading issue analysis data...');

      // Get active conversations with AI analysis
      const activeConversations = aiEngine.getActiveConversations();
      const issueAnalysisData: IssueAnalysisData[] = [];

      for (const conversation of activeConversations) {
        const analysisResult = await aiEngine.getConversationAnalysis(conversation.id);
        
        if (analysisResult) {
          const recommendations = generateActionRecommendations(
            conversation.analysis.problemType,
            conversation.analysis.urgencyLevel,
            conversation.analysis.riskAssessment
          );

          const toolsNeeded = conversation.analysis.requiredTools || [];
          const estimatedCost = conversation.analysis.estimatedCost || { min: 50, max: 150, currency: 'BGN' };
          const preparationSteps = generatePreparationSteps(conversation.analysis.problemType);

          issueAnalysisData.push({
            conversation,
            analysis: analysisResult.analysis,
            recommendations,
            toolsNeeded,
            estimatedCost,
            riskLevel: analysisResult.riskLevel,
            preparationSteps
          });
        }
      }

      setActiveIssues(issueAnalysisData);

      // Load problem type statistics
      const stats = await analyticsService.getProblemTypeAnalytics(30);
      setProblemTypeStats(stats);

    } catch (error) {
      console.error('[IssueAnalysis] Error loading issue data:', error);
    }
  };

  const generateActionRecommendations = (
    problemType: ProblemType,
    urgencyLevel: UrgencyLevel,
    riskAssessment: any
  ): ActionRecommendation[] => {
    const recommendations: ActionRecommendation[] = [];

    // Safety recommendations based on risk level
    if (riskAssessment.level === 'critical' || riskAssessment.level === 'high') {
      recommendations.push({
        id: 'safety_first',
        type: 'safety',
        priority: 'high',
        title: 'Мерки за безопасност',
        description: 'Уверете се, че клиентът е спрял използването на повредената система',
        estimatedTime: 5,
        completed: false
      });
    }

    // Immediate actions based on urgency
    if (urgencyLevel === 'emergency') {
      recommendations.push({
        id: 'emergency_response',
        type: 'immediate',
        priority: 'high',
        title: 'Спешен отговор',
        description: 'Обадете се на клиента в рамките на 15 минути',
        estimatedTime: 15,
        completed: false
      });
    }

    // Problem-specific recommendations
    const problemRecommendations = getProblemSpecificRecommendations(problemType);
    recommendations.push(...problemRecommendations);

    // Preparation recommendations
    recommendations.push({
      id: 'prepare_tools',
      type: 'preparation',
      priority: 'medium',
      title: 'Подготовка на инструменти',
      description: 'Проверете и подгответе необходимите инструменти и материали',
      estimatedTime: 20,
      completed: false
    });

    // Follow-up recommendations
    recommendations.push({
      id: 'schedule_visit',
      type: 'follow_up',
      priority: 'medium',
      title: 'Планиране на посещение',
      description: 'Уговорете час с клиента и изпратете потвърждение',
      estimatedTime: 10,
      completed: false
    });

    return recommendations;
  };

  const getProblemSpecificRecommendations = (problemType: ProblemType): ActionRecommendation[] => {
    const specificRecs: Record<ProblemType, ActionRecommendation[]> = {
      electrical_outlet: [{
        id: 'check_circuit',
        type: 'preparation',
        priority: 'high',
        title: 'Проверка на веригата',
        description: 'Проверете електрическото табло за изскочили автомати',
        estimatedTime: 10,
        completed: false
      }],
      electrical_panel: [{
        id: 'power_safety',
        type: 'safety',
        priority: 'high',
        title: 'Безопасност при ток',
        description: 'Уверете се, че имате подходящи предпазни средства',
        estimatedTime: 15,
        completed: false
      }],
      plumbing_leak: [{
        id: 'water_shutoff',
        type: 'immediate',
        priority: 'high',
        title: 'Спиране на водата',
        description: 'Инструктирайте клиента как да спре водата при нужда',
        estimatedTime: 5,
        completed: false
      }],
      plumbing_blockage: [{
        id: 'assess_blockage',
        type: 'preparation',
        priority: 'medium',
        title: 'Оценка на запушването',
        description: 'Подгответе различни инструменти за отпушване',
        estimatedTime: 15,
        completed: false
      }],
      hvac_heating: [{
        id: 'check_fuel',
        type: 'preparation',
        priority: 'medium',
        title: 'Проверка на горивото',
        description: 'Проверете дали има достатъчно гориво/газ',
        estimatedTime: 10,
        completed: false
      }],
      // Add more problem-specific recommendations...
      electrical_wiring: [],
      electrical_lighting: [],
      electrical_appliance: [],
      plumbing_pressure: [],
      plumbing_heating: [],
      hvac_cooling: [],
      hvac_ventilation: [],
      general_maintenance: [],
      unknown: []
    };

    return specificRecs[problemType] || [];
  };

  const generatePreparationSteps = (problemType: ProblemType): string[] => {
    const steps: Record<ProblemType, string[]> = {
      electrical_outlet: [
        'Проверете електрическото табло',
        'Подгответе тестер за напрежение',
        'Вземете резервни контакти и кабели',
        'Проверете дали имате изолационна лента'
      ],
      electrical_panel: [
        'Подгответе мултиметър',
        'Вземете резервни автомати',
        'Проверете предпазните средства',
        'Подгответе инструменти за електро работа'
      ],
      plumbing_leak: [
        'Подгответе уплътнители и тръби',
        'Вземете ключове за тръби',
        'Проверете дали имате силикон',
        'Подгответе кърпи за почистване'
      ],
      plumbing_blockage: [
        'Подгответе спирали за отпушване',
        'Вземете химикали за канализация',
        'Проверете помпата за отпушване',
        'Подгответе защитни ръкавици'
      ],
      hvac_heating: [
        'Проверете инструментите за котли',
        'Подгответе резервни части',
        'Проверете манометъра',
        'Вземете филтри за смяна'
      ],
      // Default steps for other types
      electrical_wiring: ['Подгответе електро инструменти', 'Проверете кабели', 'Вземете изолация'],
      electrical_lighting: ['Подгответе крушки', 'Проверете ключовете', 'Вземете тестер'],
      electrical_appliance: ['Подгответе резервни части', 'Проверете инструментите', 'Вземете мултиметър'],
      plumbing_pressure: ['Подгответе манометър', 'Проверете помпата', 'Вземете вентили'],
      plumbing_heating: ['Подгответе нагревател', 'Проверете термостата', 'Вземете изолация'],
      hvac_cooling: ['Подгответе хладилен агент', 'Проверете компресора', 'Вземете филтри'],
      hvac_ventilation: ['Подгответе вентилатори', 'Проверете каналите', 'Вземете филтри'],
      general_maintenance: ['Подгответе основни инструменти', 'Проверете материалите', 'Вземете резервни части'],
      unknown: ['Подгответе диагностични инструменти', 'Проверете основните материали']
    };

    return steps[problemType] || steps.unknown;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadIssueData();
    setRefreshing(false);
  };

  const handleIssuePress = (issue: IssueAnalysisData) => {
    setSelectedIssue(issue);
    setShowDetails(true);
  };

  const handleRecommendationToggle = (recommendationId: string) => {
    if (selectedIssue) {
      const updatedRecommendations = selectedIssue.recommendations.map(rec =>
        rec.id === recommendationId ? { ...rec, completed: !rec.completed } : rec
      );
      setSelectedIssue({ ...selectedIssue, recommendations: updatedRecommendations });
    }
  };

  const getUrgencyColor = (urgency: UrgencyLevel): string => {
    const colors: Record<UrgencyLevel, string> = {
      emergency: '#F44336',
      critical: '#FF5722',
      high: '#FF9800',
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

  const getRiskColor = (riskLevel: string): string => {
    switch (riskLevel) {
      case 'critical': return '#F44336';
      case 'high': return '#FF9800';
      case 'medium': return '#FFC107';
      case 'low': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const filteredIssues = activeIssues.filter(issue => {
    if (filterType === 'all') return true;
    return issue.conversation.analysis.urgencyLevel === filterType;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🔍 Анализ на проблеми</Text>
        <Text style={styles.subtitle}>Детайлна диагностика и препоръки</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'emergency', 'high', 'medium', 'low'].map(filter => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterTab,
                filterType === filter && styles.filterTabActive
              ]}
              onPress={() => setFilterType(filter as any)}
            >
              <Text style={[
                styles.filterTabText,
                filterType === filter && styles.filterTabTextActive
              ]}>
                {filter === 'all' ? 'Всички' :
                 filter === 'emergency' ? 'Спешни' :
                 filter === 'high' ? 'Високи' :
                 filter === 'medium' ? 'Средни' : 'Ниски'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Summary Stats */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Обобщение</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{activeIssues.length}</Text>
              <Text style={styles.summaryLabel}>Активни проблеми</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#F44336' }]}>
                {activeIssues.filter(i => i.conversation.analysis.urgencyLevel === 'emergency').length}
              </Text>
              <Text style={styles.summaryLabel}>Спешни</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#FF9800' }]}>
                {activeIssues.filter(i => i.riskLevel === 'high').length}
              </Text>
              <Text style={styles.summaryLabel}>Високо риск</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                {activeIssues.filter(i => i.conversation.analysis.readyForCallback).length}
              </Text>
              <Text style={styles.summaryLabel}>Готови</Text>
            </View>
          </View>
        </View>

        {/* Active Issues List */}
        <View style={styles.issuesCard}>
          <Text style={styles.cardTitle}>Активни проблеми ({filteredIssues.length})</Text>
          {filteredIssues.length > 0 ? (
            filteredIssues.map((issue, index) => (
              <TouchableOpacity
                key={issue.conversation.id}
                style={styles.issueItem}
                onPress={() => handleIssuePress(issue)}
              >
                <View style={styles.issueHeader}>
                  <Text style={styles.issuePhone}>{issue.conversation.phoneNumber}</Text>
                  <View style={[
                    styles.urgencyBadge,
                    { backgroundColor: getUrgencyColor(issue.conversation.analysis.urgencyLevel) }
                  ]}>
                    <Text style={styles.urgencyText}>
                      {getUrgencyText(issue.conversation.analysis.urgencyLevel)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.issueProblemType}>
                  {getProblemTypeText(issue.conversation.analysis.problemType)}
                </Text>

                <Text style={styles.issueDescription} numberOfLines={2}>
                  {issue.conversation.analysis.issueDescription}
                </Text>

                <View style={styles.issueFooter}>
                  <View style={styles.riskIndicator}>
                    <View style={[
                      styles.riskDot,
                      { backgroundColor: getRiskColor(issue.riskLevel) }
                    ]} />
                    <Text style={styles.riskText}>Риск: {issue.riskLevel}</Text>
                  </View>
                  <Text style={styles.estimatedCost}>
                    {issue.estimatedCost.min}-{issue.estimatedCost.max} лв
                  </Text>
                </View>

                <View style={styles.recommendationPreview}>
                  <Text style={styles.recommendationCount}>
                    📋 {issue.recommendations.length} препоръки
                  </Text>
                  <Text style={styles.toolsCount}>
                    🔧 {issue.toolsNeeded.length} инструмента
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Няма проблеми от този тип</Text>
            </View>
          )}
        </View>

        {/* Problem Type Statistics */}
        {problemTypeStats.length > 0 && (
          <View style={styles.statsCard}>
            <Text style={styles.cardTitle}>Статистика по тип проблеми</Text>
            {problemTypeStats
              .filter(stat => stat.frequency > 0)
              .sort((a, b) => b.frequency - a.frequency)
              .slice(0, 5)
              .map(stat => (
                <View key={stat.problemType} style={styles.statItem}>
                  <Text style={styles.statProblemType}>
                    {getProblemTypeText(stat.problemType)}
                  </Text>
                  <View style={styles.statDetails}>
                    <Text style={styles.statFrequency}>{stat.frequency} случая</Text>
                    <Text style={styles.statValue}>
                      Ср. стойност: {stat.averageJobValue.toFixed(0)} лв
                    </Text>
                  </View>
                </View>
              ))
            }
          </View>
        )}
      </ScrollView>

      {/* Issue Details Modal */}
      <Modal
        visible={showDetails}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedIssue && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Детайли за проблема</Text>
              <TouchableOpacity
                onPress={() => setShowDetails(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Basic Info */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Основна информация</Text>
                <Text style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Телефон: </Text>
                  {selectedIssue.conversation.phoneNumber}
                </Text>
                <Text style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Проблем: </Text>
                  {getProblemTypeText(selectedIssue.conversation.analysis.problemType)}
                </Text>
                <Text style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Спешност: </Text>
                  <Text style={{ color: getUrgencyColor(selectedIssue.conversation.analysis.urgencyLevel) }}>
                    {getUrgencyText(selectedIssue.conversation.analysis.urgencyLevel)}
                  </Text>
                </Text>
                <Text style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Риск: </Text>
                  <Text style={{ color: getRiskColor(selectedIssue.riskLevel) }}>
                    {selectedIssue.riskLevel}
                  </Text>
                </Text>
              </View>

              {/* Cost Estimate */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Ценова оценка</Text>
                <Text style={styles.costEstimate}>
                  {selectedIssue.estimatedCost.min} - {selectedIssue.estimatedCost.max} {selectedIssue.estimatedCost.currency}
                </Text>
              </View>

              {/* Tools Needed */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Необходими инструменти</Text>
                {selectedIssue.toolsNeeded.map((tool, index) => (
                  <Text key={index} style={styles.toolItem}>• {tool}</Text>
                ))}
              </View>

              {/* Preparation Steps */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Стъпки за подготовка</Text>
                {selectedIssue.preparationSteps.map((step, index) => (
                  <Text key={index} style={styles.preparationStep}>
                    {index + 1}. {step}
                  </Text>
                ))}
              </View>

              {/* Action Recommendations */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Препоръки за действие</Text>
                {selectedIssue.recommendations.map(rec => (
                  <TouchableOpacity
                    key={rec.id}
                    style={[
                      styles.recommendationItem,
                      rec.completed && styles.recommendationCompleted
                    ]}
                    onPress={() => handleRecommendationToggle(rec.id)}
                  >
                    <View style={styles.recommendationHeader}>
                      <Text style={[
                        styles.recommendationTitle,
                        rec.completed && styles.recommendationTitleCompleted
                      ]}>
                        {rec.completed ? '✅' : '⏳'} {rec.title}
                      </Text>
                      <View style={[
                        styles.priorityBadge,
                        { backgroundColor: rec.priority === 'high' ? '#F44336' : 
                                          rec.priority === 'medium' ? '#FF9800' : '#4CAF50' }
                      ]}>
                        <Text style={styles.priorityText}>{rec.priority}</Text>
                      </View>
                    </View>
                    <Text style={styles.recommendationDescription}>
                      {rec.description}
                    </Text>
                    <Text style={styles.recommendationTime}>
                      ⏱️ Време: {rec.estimatedTime} мин
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
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
  filterContainer: {
    backgroundColor: 'white',
    paddingVertical: 10,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterTabActive: {
    backgroundColor: '#673AB7',
  },
  filterTabText: {
    color: '#666',
    fontSize: 14,
  },
  filterTabTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#673AB7',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  issuesCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
  },
  issueItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  issuePhone: {
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
  issueProblemType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#673AB7',
    marginBottom: 5,
  },
  issueDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  issueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  riskIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  riskText: {
    fontSize: 12,
    color: '#666',
  },
  estimatedCost: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  recommendationPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recommendationCount: {
    fontSize: 12,
    color: '#999',
  },
  toolsCount: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
  },
  statItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statProblemType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statFrequency: {
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
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
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  detailItem: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  detailLabel: {
    fontWeight: 'bold',
    color: '#333',
  },
  costEstimate: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  toolItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  preparationStep: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    paddingLeft: 10,
  },
  recommendationItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  recommendationCompleted: {
    backgroundColor: '#e8f5e8',
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  recommendationTitleCompleted: {
    color: '#4CAF50',
    textDecorationLine: 'line-through',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  recommendationTime: {
    fontSize: 12,
    color: '#999',
  },
});

export default IssueAnalysisScreen;
