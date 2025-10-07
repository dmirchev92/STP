import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { KPITracker, KPIDashboard, KPITarget, PerformanceAlert } from '../services/analytics/KPITracker';
import { AnalyticsService } from '../services/analytics/AnalyticsService';

const screenWidth = Dimensions.get('window').width;

interface BusinessInsight {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category: 'opportunity' | 'risk' | 'trend' | 'achievement';
  actionable: boolean;
  recommendation?: string;
  confidence: number;
}

const BusinessIntelligenceScreen: React.FC = () => {
  const [kpiDashboard, setKpiDashboard] = useState<KPIDashboard | null>(null);
  const [performanceAlerts, setPerformanceAlerts] = useState<PerformanceAlert[]>([]);
  const [businessInsights, setBusinessInsights] = useState<BusinessInsight[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'business' | 'operational' | 'customer' | 'technical'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [kpiTracker] = useState(() => KPITracker.getInstance());
  const [analyticsService] = useState(() => AnalyticsService.getInstance());

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      await kpiTracker.initializeKPITargets();
      await loadDashboardData();
    } catch (error) {
      console.error('[BusinessIntelligence] Error initializing data:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      console.log('[BusinessIntelligence] Loading dashboard data...');

      // Load KPI dashboard
      const dashboard = await kpiTracker.getKPIDashboard();
      setKpiDashboard(dashboard);

      // Load performance alerts
      const alerts = await kpiTracker.getPerformanceAlerts();
      setPerformanceAlerts(alerts.filter(a => !a.acknowledged));

      // Generate business insights
      const insights = await generateBusinessInsights(dashboard, alerts);
      setBusinessInsights(insights);

      // Update KPIs with simulated data (in real app, this would come from actual analytics)
      await updateKPIsWithAnalyticsData();

    } catch (error) {
      console.error('[BusinessIntelligence] Error loading dashboard data:', error);
      Alert.alert('Грешка', 'Неуспешно зареждане на данните');
    }
  };

  const updateKPIsWithAnalyticsData = async () => {
    try {
      // Get analytics data
      const businessMetrics = await analyticsService.getBusinessMetrics(30);
      const aiPerformance = await analyticsService.getAIPerformanceMetrics(30);
      const platformPerformance = await analyticsService.getPlatformPerformance(30);

      // Update KPIs
      if (businessMetrics.missedCalls > 0) {
        const responseRate = (businessMetrics.responsesSent / businessMetrics.missedCalls) * 100;
        await kpiTracker.updateKPI('response_rate', responseRate);
      }

      if (businessMetrics.conversationsStarted > 0) {
        const conversionRate = (businessMetrics.conversationsCompleted / businessMetrics.conversationsStarted) * 100;
        await kpiTracker.updateKPI('conversion_rate', conversionRate);
      }

      await kpiTracker.updateKPI('monthly_revenue', businessMetrics.revenueGenerated);
      await kpiTracker.updateKPI('response_time', businessMetrics.averageResponseTime / 1000);
      await kpiTracker.updateKPI('ai_accuracy', aiPerformance.problemClassificationAccuracy);
      await kpiTracker.updateKPI('ai_completion_rate', aiPerformance.completionRate);

      if (platformPerformance.length > 0) {
        const avgDeliveryRate = platformPerformance.reduce((sum, p) => sum + p.deliveryRate, 0) / platformPerformance.length;
        await kpiTracker.updateKPI('message_delivery_rate', avgDeliveryRate);
      }

      // Simulated values for other KPIs
      await kpiTracker.updateKPI('customer_satisfaction', 4.2 + Math.random() * 0.6);
      await kpiTracker.updateKPI('system_uptime', 98.5 + Math.random() * 1.5);
      await kpiTracker.updateKPI('first_call_resolution', 80 + Math.random() * 15);

    } catch (error) {
      console.error('[BusinessIntelligence] Error updating KPIs:', error);
    }
  };

  const generateBusinessInsights = async (
    dashboard: KPIDashboard,
    alerts: PerformanceAlert[]
  ): Promise<BusinessInsight[]> => {
    const insights: BusinessInsight[] = [];

    // Overall performance insight
    if (dashboard.overallScore >= 80) {
      insights.push({
        id: 'high_performance',
        title: 'Отлична производителност',
        description: `Постигате ${dashboard.overallScore.toFixed(1)}% от целите си. Продължавайте в същия дух!`,
        impact: 'high',
        category: 'achievement',
        actionable: false,
        confidence: 0.95
      });
    } else if (dashboard.overallScore < 60) {
      insights.push({
        id: 'low_performance',
        title: 'Възможност за подобрение',
        description: `Производителността е ${dashboard.overallScore.toFixed(1)}%. Има място за значително подобрение.`,
        impact: 'high',
        category: 'risk',
        actionable: true,
        recommendation: 'Фокусирайте се върху високо приоритетните KPI-та и анализирайте причините за ниската производителност.',
        confidence: 0.9
      });
    }

    // Business KPIs insights
    const businessKPIs = dashboard.businessKPIs;
    const responseRateKPI = businessKPIs.find(k => k.id === 'response_rate');
    if (responseRateKPI && responseRateKPI.currentValue >= 90) {
      insights.push({
        id: 'excellent_response_rate',
        title: 'Отличен процент отговори',
        description: `Отговаряте на ${responseRateKPI.currentValue.toFixed(1)}% от обажданията. Това е над средното за индустрията.`,
        impact: 'medium',
        category: 'achievement',
        actionable: false,
        confidence: 0.9
      });
    }

    const conversionKPI = businessKPIs.find(k => k.id === 'conversion_rate');
    if (conversionKPI && conversionKPI.currentValue < 30) {
      insights.push({
        id: 'low_conversion',
        title: 'Ниска конверсия към работи',
        description: `Само ${conversionKPI.currentValue.toFixed(1)}% от разговорите се превръщат в работи.`,
        impact: 'high',
        category: 'opportunity',
        actionable: true,
        recommendation: 'Подобрете качеството на разговорите и проследяването на клиентите.',
        confidence: 0.85
      });
    }

    // Technical KPIs insights
    const technicalKPIs = dashboard.technicalKPIs;
    const aiAccuracyKPI = technicalKPIs.find(k => k.id === 'ai_accuracy');
    if (aiAccuracyKPI && aiAccuracyKPI.currentValue >= 85) {
      insights.push({
        id: 'ai_performing_well',
        title: 'AI системата работи отлично',
        description: `AI точността е ${aiAccuracyKPI.currentValue.toFixed(1)}%. Клиентите получават качествени отговори.`,
        impact: 'medium',
        category: 'achievement',
        actionable: false,
        confidence: 0.9
      });
    }

    // Alert-based insights
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      insights.push({
        id: 'critical_issues',
        title: 'Критични проблеми изискват внимание',
        description: `Имате ${criticalAlerts.length} критични предупреждения, които изискват незабавни действия.`,
        impact: 'high',
        category: 'risk',
        actionable: true,
        recommendation: 'Прегледайте и решете критичните проблеми възможно най-скоро.',
        confidence: 1.0
      });
    }

    // Trend insights
    const improvingKPIs = [...dashboard.businessKPIs, ...dashboard.operationalKPIs, ...dashboard.customerKPIs, ...dashboard.technicalKPIs]
      .filter(kpi => kpi.trend === 'up' && kpi.trendPercentage > 5);
    
    if (improvingKPIs.length >= 3) {
      insights.push({
        id: 'positive_trends',
        title: 'Позитивни тенденции',
        description: `${improvingKPIs.length} показатели се подобряват значително. Стратегията работи!`,
        impact: 'medium',
        category: 'trend',
        actionable: false,
        confidence: 0.8
      });
    }

    return insights;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleAlertAcknowledge = async (alertId: string) => {
    try {
      await kpiTracker.acknowledgeAlert(alertId);
      setPerformanceAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const getKPIsByCategory = () => {
    if (!kpiDashboard) return [];
    
    switch (selectedCategory) {
      case 'business':
        return kpiDashboard.businessKPIs;
      case 'operational':
        return kpiDashboard.operationalKPIs;
      case 'customer':
        return kpiDashboard.customerKPIs;
      case 'technical':
        return kpiDashboard.technicalKPIs;
      default:
        return [
          ...kpiDashboard.businessKPIs,
          ...kpiDashboard.operationalKPIs,
          ...kpiDashboard.customerKPIs,
          ...kpiDashboard.technicalKPIs
        ];
    }
  };

  const getKPIColor = (kpi: KPITarget): string => {
    if (kpi.isAchieved) return '#4CAF50';
    if (kpi.currentValue >= kpi.targetValue * 0.8) return '#FF9800';
    return '#F44336';
  };

  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  const getInsightIcon = (category: string): string => {
    switch (category) {
      case 'opportunity': return '💡';
      case 'risk': return '⚠️';
      case 'trend': return '📊';
      case 'achievement': return '🏆';
      default: return 'ℹ️';
    }
  };

  const getAlertIcon = (severity: string): string => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      default: return 'ℹ️';
    }
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(103, 58, 183, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
  };

  if (!kpiDashboard) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🧠 Бизнес интелигентност</Text>
          <Text style={styles.subtitle}>Зареждане...</Text>
        </View>
      </View>
    );
  }

  // Prepare KPI performance chart data
  const kpiData = getKPIsByCategory().slice(0, 6);
  const kpiChartData = {
    labels: kpiData.map(kpi => kpi.name.split(' ')[0]),
    datasets: [{
      data: kpiData.map(kpi => (kpi.currentValue / kpi.targetValue) * 100)
    }]
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🧠 Бизнес интелигентност</Text>
        <Text style={styles.subtitle}>Интелигентни анализи и прогнози</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Overall Performance Score */}
        <View style={styles.scoreCard}>
          <Text style={styles.cardTitle}>Общ резултат</Text>
          <View style={styles.scoreContainer}>
            <Text style={[
              styles.scoreValue,
              { color: kpiDashboard.overallScore >= 80 ? '#4CAF50' : 
                       kpiDashboard.overallScore >= 60 ? '#FF9800' : '#F44336' }
            ]}>
              {kpiDashboard.overallScore.toFixed(1)}%
            </Text>
            <Text style={styles.scoreLabel}>
              {kpiDashboard.achievedTargets}/{kpiDashboard.totalTargets} цели постигнати
            </Text>
          </View>
          <View style={styles.scoreBar}>
            <View style={[
              styles.scoreBarFill,
              { 
                width: `${kpiDashboard.overallScore}%`,
                backgroundColor: kpiDashboard.overallScore >= 80 ? '#4CAF50' : 
                                kpiDashboard.overallScore >= 60 ? '#FF9800' : '#F44336'
              }
            ]} />
          </View>
        </View>

        {/* Performance Alerts */}
        {performanceAlerts.length > 0 && (
          <View style={styles.alertsCard}>
            <Text style={styles.cardTitle}>🚨 Предупреждения ({performanceAlerts.length})</Text>
            {performanceAlerts.slice(0, 3).map(alert => (
              <TouchableOpacity
                key={alert.id}
                style={[
                  styles.alertItem,
                  { borderLeftColor: alert.severity === 'critical' ? '#F44336' : 
                                    alert.severity === 'high' ? '#FF9800' : '#FFC107' }
                ]}
                onPress={() => handleAlertAcknowledge(alert.id)}
              >
                <View style={styles.alertHeader}>
                  <Text style={styles.alertIcon}>{getAlertIcon(alert.severity)}</Text>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                </View>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                {alert.actionRequired && (
                  <Text style={styles.alertAction}>💡 {alert.actionRequired}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Business Insights */}
        <View style={styles.insightsCard}>
          <Text style={styles.cardTitle}>💡 Бизнес анализи</Text>
          {businessInsights.slice(0, 4).map(insight => (
            <View key={insight.id} style={styles.insightItem}>
              <View style={styles.insightHeader}>
                <Text style={styles.insightIcon}>{getInsightIcon(insight.category)}</Text>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <View style={[
                  styles.impactBadge,
                  { backgroundColor: insight.impact === 'high' ? '#F44336' : 
                                    insight.impact === 'medium' ? '#FF9800' : '#4CAF50' }
                ]}>
                  <Text style={styles.impactText}>{insight.impact}</Text>
                </View>
              </View>
              <Text style={styles.insightDescription}>{insight.description}</Text>
              {insight.recommendation && (
                <Text style={styles.insightRecommendation}>
                  💡 {insight.recommendation}
                </Text>
              )}
              <Text style={styles.insightConfidence}>
                Увереност: {(insight.confidence * 100).toFixed(0)}%
              </Text>
            </View>
          ))}
        </View>

        {/* KPI Category Filter */}
        <View style={styles.categoryFilter}>
          <Text style={styles.cardTitle}>KPI категории</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'all', label: 'Всички' },
              { key: 'business', label: 'Бизнес' },
              { key: 'operational', label: 'Операционни' },
              { key: 'customer', label: 'Клиенти' },
              { key: 'technical', label: 'Технически' }
            ].map(category => (
              <TouchableOpacity
                key={category.key}
                style={[
                  styles.categoryTab,
                  selectedCategory === category.key && styles.categoryTabActive
                ]}
                onPress={() => setSelectedCategory(category.key as any)}
              >
                <Text style={[
                  styles.categoryTabText,
                  selectedCategory === category.key && styles.categoryTabTextActive
                ]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* KPI Performance Chart */}
        {kpiData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.cardTitle}>KPI производителност (%)</Text>
            <BarChart
              data={kpiChartData}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              showValuesOnTopOfBars
              yAxisSuffix="%"
            />
          </View>
        )}

        {/* KPI Details */}
        <View style={styles.kpiCard}>
          <Text style={styles.cardTitle}>
            KPI детайли ({selectedCategory === 'all' ? 'Всички' : selectedCategory})
          </Text>
          {getKPIsByCategory().map(kpi => (
            <View key={kpi.id} style={styles.kpiItem}>
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiName}>{kpi.name}</Text>
                <View style={styles.kpiTrend}>
                  <Text style={styles.trendIcon}>{getTrendIcon(kpi.trend)}</Text>
                  <Text style={styles.trendPercentage}>
                    {kpi.trendPercentage.toFixed(1)}%
                  </Text>
                </View>
              </View>
              
              <View style={styles.kpiValues}>
                <Text style={[styles.kpiCurrentValue, { color: getKPIColor(kpi) }]}>
                  {kpi.currentValue.toFixed(1)} {kpi.unit}
                </Text>
                <Text style={styles.kpiTargetValue}>
                  Цел: {kpi.targetValue} {kpi.unit}
                </Text>
              </View>

              <View style={styles.kpiProgressBar}>
                <View style={[
                  styles.kpiProgressFill,
                  { 
                    width: `${Math.min((kpi.currentValue / kpi.targetValue) * 100, 100)}%`,
                    backgroundColor: getKPIColor(kpi)
                  }
                ]} />
              </View>

              <Text style={styles.kpiDescription}>{kpi.description}</Text>
            </View>
          ))}
        </View>

        {/* Recommendations */}
        <View style={styles.recommendationsCard}>
          <Text style={styles.cardTitle}>🎯 Препоръки за подобрение</Text>
          {businessInsights
            .filter(insight => insight.actionable && insight.recommendation)
            .slice(0, 3)
            .map((insight, index) => (
              <View key={insight.id} style={styles.recommendationItem}>
                <Text style={styles.recommendationNumber}>{index + 1}</Text>
                <View style={styles.recommendationContent}>
                  <Text style={styles.recommendationTitle}>{insight.title}</Text>
                  <Text style={styles.recommendationText}>{insight.recommendation}</Text>
                </View>
              </View>
            ))
          }
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
    padding: 15,
  },
  scoreCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
  },
  scoreBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  alertsCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
  },
  alertItem: {
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  alertMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  alertAction: {
    fontSize: 12,
    color: '#673AB7',
    fontStyle: 'italic',
  },
  insightsCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
  },
  insightItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  impactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  impactText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  insightDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  insightRecommendation: {
    fontSize: 12,
    color: '#673AB7',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  insightConfidence: {
    fontSize: 11,
    color: '#999',
  },
  categoryFilter: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  categoryTabActive: {
    backgroundColor: '#673AB7',
  },
  categoryTabText: {
    color: '#666',
    fontSize: 14,
  },
  categoryTabTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  kpiCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
  },
  kpiItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  kpiTrend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  trendPercentage: {
    fontSize: 12,
    color: '#666',
  },
  kpiValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  kpiCurrentValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  kpiTargetValue: {
    fontSize: 14,
    color: '#666',
  },
  kpiProgressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  kpiProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  kpiDescription: {
    fontSize: 12,
    color: '#999',
  },
  recommendationsCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  recommendationNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#673AB7',
    marginRight: 15,
    marginTop: 2,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  recommendationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default BusinessIntelligenceScreen;
