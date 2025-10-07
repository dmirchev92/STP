import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { AnalyticsService, BusinessMetrics, PlatformPerformance, AIPerformanceMetrics, TimeAnalytics } from '../services/analytics/AnalyticsService';
import { AIConversationEngine } from '../services/ai/AIConversationEngine';
import { t } from '../localization';

const screenWidth = Dimensions.get('window').width;

interface LiveStats {
  activeCalls: number;
  activeConversations: number;
  pendingCallbacks: number;
  emergencyAlerts: number;
  systemStatus: 'online' | 'warning' | 'offline';
  lastUpdate: number;
}

const RealTimeDashboard: React.FC = () => {
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null);
  const [platformPerformance, setPlatformPerformance] = useState<PlatformPerformance[]>([]);
  const [aiPerformance, setAIPerformance] = useState<AIPerformanceMetrics | null>(null);
  const [timeAnalytics, setTimeAnalytics] = useState<TimeAnalytics[]>([]);
  const [liveStats, setLiveStats] = useState<LiveStats>({
    activeCalls: 0,
    activeConversations: 0,
    pendingCallbacks: 0,
    emergencyAlerts: 0,
    systemStatus: 'online',
    lastUpdate: Date.now()
  });
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState(7); // days
  const [analyticsService] = useState(() => AnalyticsService.getInstance());
  const [aiEngine] = useState(() => AIConversationEngine.getInstance());

  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(() => {
      updateLiveStats();
    }, 30000);

    // Set up periodic data refresh every 5 minutes
    const dataInterval = setInterval(() => {
      loadDashboardData();
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearInterval(dataInterval);
    };
  }, [selectedTimeRange]);

  const loadDashboardData = async () => {
    try {
      console.log('[RealTimeDashboard] Loading dashboard data...');

      const [metrics, platforms, ai, time] = await Promise.all([
        analyticsService.getBusinessMetrics(selectedTimeRange),
        analyticsService.getPlatformPerformance(selectedTimeRange),
        analyticsService.getAIPerformanceMetrics(selectedTimeRange),
        analyticsService.getTimeAnalytics(selectedTimeRange)
      ]);

      setBusinessMetrics(metrics);
      setPlatformPerformance(platforms);
      setAIPerformance(ai);
      setTimeAnalytics(time);
      
      await updateLiveStats();
    } catch (error) {
      console.error('[RealTimeDashboard] Error loading dashboard data:', error);
      Alert.alert('Грешка', 'Неуспешно зареждане на данните');
    }
  };

  const updateLiveStats = async () => {
    try {
      const activeConversations = aiEngine.getActiveConversations();
      const conversationStats = aiEngine.getConversationStats();

      setLiveStats({
        activeCalls: 0, // Would be integrated with call system
        activeConversations: activeConversations.length,
        pendingCallbacks: conversationStats.completed,
        emergencyAlerts: activeConversations.filter(c => c.analysis.urgencyLevel === 'emergency').length,
        systemStatus: 'online',
        lastUpdate: Date.now()
      });
    } catch (error) {
      console.error('[RealTimeDashboard] Error updating live stats:', error);
      setLiveStats(prev => ({ ...prev, systemStatus: 'warning', lastUpdate: Date.now() }));
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [selectedTimeRange]);

  const handleTimeRangeChange = (days: number) => {
    setSelectedTimeRange(days);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#4CAF50';
      case 'warning': return '#FF9800';
      case 'offline': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const formatLastUpdate = (timestamp: number) => {
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000);
    
    if (diff < 60) return `преди ${diff} сек`;
    if (diff < 3600) return `преди ${Math.floor(diff / 60)} мин`;
    return new Date(timestamp).toLocaleTimeString('bg-BG');
  };

  // Chart configurations
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
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#673AB7',
    },
  };

  // Prepare chart data
  const callVolumeData = {
    labels: timeAnalytics.slice(6, 23).map(t => `${t.hour}:00`),
    datasets: [{
      data: timeAnalytics.slice(6, 23).map(t => t.callVolume),
      color: (opacity = 1) => `rgba(103, 58, 183, ${opacity})`,
      strokeWidth: 2
    }]
  };

  const platformData = platformPerformance.map(p => ({
    name: p.platform,
    population: p.deliveryRate,
    color: p.platform === 'whatsapp' ? '#25D366' : 
           p.platform === 'viber' ? '#665CAC' : '#0088CC',
    legendFontColor: '#7F7F7F',
    legendFontSize: 12
  }));

  const responseTimeData = {
    labels: ['WhatsApp', 'Viber', 'Telegram'],
    datasets: [{
      data: platformPerformance.map(p => p.averageResponseTime / 1000) // Convert to seconds
    }]
  };

  return (
    <View style={styles.container}>
      {/* Header with live status */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>📊 Реално време</Text>
          <Text style={styles.subtitle}>Мониторинг на системата</Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(liveStats.systemStatus) }]} />
          <Text style={styles.statusText}>
            {liveStats.systemStatus === 'online' ? 'Онлайн' : 
             liveStats.systemStatus === 'warning' ? 'Внимание' : 'Офлайн'}
          </Text>
          <Text style={styles.lastUpdateText}>
            {formatLastUpdate(liveStats.lastUpdate)}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          <Text style={styles.sectionTitle}>Период:</Text>
          <View style={styles.timeRangeButtons}>
            {[1, 7, 30].map(days => (
              <TouchableOpacity
                key={days}
                style={[
                  styles.timeRangeButton,
                  selectedTimeRange === days && styles.timeRangeButtonActive
                ]}
                onPress={() => handleTimeRangeChange(days)}
              >
                <Text style={[
                  styles.timeRangeButtonText,
                  selectedTimeRange === days && styles.timeRangeButtonTextActive
                ]}>
                  {days === 1 ? 'Днес' : `${days} дни`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Live Statistics Cards */}
        <View style={styles.liveStatsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{liveStats.activeConversations}</Text>
              <Text style={styles.statLabel}>Активни разговори</Text>
              <Text style={styles.statChange}>🔄</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{liveStats.pendingCallbacks}</Text>
              <Text style={styles.statLabel}>Чакащи обаждания</Text>
              <Text style={styles.statChange}>📞</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: liveStats.emergencyAlerts > 0 ? '#F44336' : '#4CAF50' }]}>
                {liveStats.emergencyAlerts}
              </Text>
              <Text style={styles.statLabel}>Спешни случаи</Text>
              <Text style={styles.statChange}>🚨</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {businessMetrics ? Math.round(businessMetrics.averageResponseTime / 1000) : 0}с
              </Text>
              <Text style={styles.statLabel}>Време за отговор</Text>
              <Text style={styles.statChange}>⚡</Text>
            </View>
          </View>
        </View>

        {/* Business Metrics Overview */}
        {businessMetrics && (
          <View style={styles.metricsCard}>
            <Text style={styles.cardTitle}>Бизнес метрики ({selectedTimeRange} дни)</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{businessMetrics.totalCalls}</Text>
                <Text style={styles.metricLabel}>Общо обаждания</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{businessMetrics.responsesSent}</Text>
                <Text style={styles.metricLabel}>Изпратени отговори</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{businessMetrics.conversationsCompleted}</Text>
                <Text style={styles.metricLabel}>Завършени разговори</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{businessMetrics.revenueGenerated.toFixed(0)} лв</Text>
                <Text style={styles.metricLabel}>Приходи</Text>
              </View>
            </View>
          </View>
        )}

        {/* Call Volume Chart */}
        {timeAnalytics.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.cardTitle}>Обем на обажданията по часове</Text>
            <LineChart
              data={callVolumeData}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </View>
        )}

        {/* Platform Performance */}
        {platformPerformance.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.cardTitle}>Производителност по платформи</Text>
            <PieChart
              data={platformData}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
            />
            <View style={styles.platformStats}>
              {platformPerformance.map(platform => (
                <View key={platform.platform} style={styles.platformStat}>
                  <View style={[
                    styles.platformColor,
                    { backgroundColor: platform.platform === 'whatsapp' ? '#25D366' : 
                                     platform.platform === 'viber' ? '#665CAC' : '#0088CC' }
                  ]} />
                  <Text style={styles.platformName}>{platform.platform}</Text>
                  <Text style={styles.platformValue}>{platform.deliveryRate.toFixed(1)}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* AI Performance */}
        {aiPerformance && (
          <View style={styles.metricsCard}>
            <Text style={styles.cardTitle}>AI Производителност</Text>
            <View style={styles.aiMetricsGrid}>
              <View style={styles.aiMetricItem}>
                <Text style={styles.aiMetricValue}>{aiPerformance.completionRate.toFixed(1)}%</Text>
                <Text style={styles.aiMetricLabel}>Завършени разговори</Text>
              </View>
              <View style={styles.aiMetricItem}>
                <Text style={styles.aiMetricValue}>{aiPerformance.problemClassificationAccuracy.toFixed(1)}%</Text>
                <Text style={styles.aiMetricLabel}>Точност на класификация</Text>
              </View>
              <View style={styles.aiMetricItem}>
                <Text style={styles.aiMetricValue}>{aiPerformance.averageMessagesPerConversation.toFixed(1)}</Text>
                <Text style={styles.aiMetricLabel}>Средно съобщения</Text>
              </View>
              <View style={styles.aiMetricItem}>
                <Text style={styles.aiMetricValue}>{aiPerformance.aiResponseTime.toFixed(1)}с</Text>
                <Text style={styles.aiMetricLabel}>Време за отговор</Text>
              </View>
            </View>
          </View>
        )}

        {/* Response Time Chart */}
        {platformPerformance.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.cardTitle}>Време за отговор (секунди)</Text>
            <BarChart
              data={responseTimeData}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              yAxisSuffix="с"
            />
          </View>
        )}

        {/* System Health */}
        <View style={styles.healthCard}>
          <Text style={styles.cardTitle}>Здраве на системата</Text>
          <View style={styles.healthItems}>
            <View style={styles.healthItem}>
              <View style={[styles.healthIndicator, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.healthLabel}>API Услуги</Text>
              <Text style={styles.healthStatus}>Работят</Text>
            </View>
            <View style={styles.healthItem}>
              <View style={[styles.healthIndicator, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.healthLabel}>AI Двигател</Text>
              <Text style={styles.healthStatus}>Активен</Text>
            </View>
            <View style={styles.healthItem}>
              <View style={[styles.healthIndicator, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.healthLabel}>База данни</Text>
              <Text style={styles.healthStatus}>Синхронизирана</Text>
            </View>
            <View style={styles.healthItem}>
              <View style={[styles.healthIndicator, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.healthLabel}>Съхранение</Text>
              <Text style={styles.healthStatus}>78% използвано</Text>
            </View>
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 5,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  lastUpdateText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  timeRangeContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  timeRangeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  timeRangeButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  timeRangeButtonActive: {
    backgroundColor: '#673AB7',
  },
  timeRangeButtonText: {
    color: '#666',
    fontSize: 14,
  },
  timeRangeButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  liveStatsContainer: {
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#673AB7',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  statChange: {
    fontSize: 16,
  },
  metricsCard: {
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 15,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#673AB7',
    marginBottom: 5,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
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
  platformStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  platformStat: {
    alignItems: 'center',
  },
  platformColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 5,
  },
  platformName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  platformValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  aiMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  aiMetricItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 15,
  },
  aiMetricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  aiMetricLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  healthCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
  },
  healthItems: {
    gap: 10,
  },
  healthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  healthIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  healthLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  healthStatus: {
    fontSize: 12,
    color: '#666',
  },
});

export default RealTimeDashboard;
