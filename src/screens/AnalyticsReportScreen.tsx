import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import {
  AnalyticsService,
  BusinessMetrics,
  PlatformPerformance,
  ProblemTypeAnalytics,
  AIPerformanceMetrics,
  TimeAnalytics
} from '../services/analytics/AnalyticsService';

const screenWidth = Dimensions.get('window').width;

interface ReportData {
  businessMetrics: BusinessMetrics;
  platformPerformance: PlatformPerformance[];
  problemTypeAnalytics: ProblemTypeAnalytics[];
  timeAnalytics: TimeAnalytics[];
  aiPerformance: AIPerformanceMetrics;
  insights: string[];
  recommendations: string[];
}

const AnalyticsReportScreen: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [timeRange, setTimeRange] = useState(7); // days
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsService] = useState(() => AnalyticsService.getInstance());

  useEffect(() => {
    loadAnalyticsReport();
  }, [selectedPeriod, timeRange]);

  const loadAnalyticsReport = async () => {
    try {
      setLoading(true);
      console.log('[AnalyticsReport] Loading analytics report...');

      const report = await analyticsService.generateAnalyticsReport(timeRange);
      setReportData(report);

    } catch (error) {
      console.error('[AnalyticsReport] Error loading report:', error);
      Alert.alert('Грешка', 'Неуспешно генериране на отчета');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsReport();
    setRefreshing(false);
  };

  const handlePeriodChange = (period: 'daily' | 'weekly' | 'monthly') => {
    setSelectedPeriod(period);
    switch (period) {
      case 'daily':
        setTimeRange(1);
        break;
      case 'weekly':
        setTimeRange(7);
        break;
      case 'monthly':
        setTimeRange(30);
        break;
    }
  };

  const generateReportText = (): string => {
    if (!reportData) return '';

    const { businessMetrics, platformPerformance, aiPerformance, insights, recommendations } = reportData;
    
    let report = `📊 ServiceText Pro - Аналитичен отчет\n`;
    report += `Период: ${timeRange} дни\n`;
    report += `Генериран на: ${new Date().toLocaleDateString('bg-BG')}\n\n`;

    report += `📈 БИЗНЕС МЕТРИКИ:\n`;
    report += `• Общо обаждания: ${businessMetrics.totalCalls}\n`;
    report += `• Пропуснати обаждания: ${businessMetrics.missedCalls}\n`;
    report += `• Изпратени отговори: ${businessMetrics.responsesSent}\n`;
    report += `• Завършени разговори: ${businessMetrics.conversationsCompleted}\n`;
    report += `• Спешни случаи: ${businessMetrics.emergencyCalls}\n`;
    report += `• Средно време за отговор: ${Math.round(businessMetrics.averageResponseTime / 1000)}с\n`;
    report += `• Приходи: ${businessMetrics.revenueGenerated.toFixed(2)} лв\n\n`;

    report += `🤖 AI ПРОИЗВОДИТЕЛНОСТ:\n`;
    report += `• Общо AI разговори: ${aiPerformance.totalConversations}\n`;
    report += `• Процент завършване: ${aiPerformance.completionRate.toFixed(1)}%\n`;
    report += `• Процент ескалация: ${aiPerformance.escalationRate.toFixed(1)}%\n`;
    report += `• Точност на класификация: ${aiPerformance.problemClassificationAccuracy.toFixed(1)}%\n`;
    report += `• Време за AI отговор: ${aiPerformance.aiResponseTime.toFixed(1)}с\n\n`;

    report += `📱 ПЛАТФОРМИ:\n`;
    platformPerformance.forEach(platform => {
      report += `• ${platform.platform}: ${platform.deliveryRate.toFixed(1)}% доставимост\n`;
    });
    report += '\n';

    report += `💡 INSIGHTS:\n`;
    insights.forEach((insight, index) => {
      report += `${index + 1}. ${insight}\n`;
    });
    report += '\n';

    report += `🎯 ПРЕПОРЪКИ:\n`;
    recommendations.forEach((rec, index) => {
      report += `${index + 1}. ${rec}\n`;
    });

    return report;
  };

  const handleShareReport = async () => {
    try {
      const reportText = generateReportText();
      await Share.share({
        message: reportText,
        title: 'ServiceText Pro - Аналитичен отчет'
      });
    } catch (error) {
      console.error('Error sharing report:', error);
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
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#673AB7',
    },
  };

  if (!reportData) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>📊 Аналитичен отчет</Text>
          <Text style={styles.subtitle}>Зареждане на данните...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Генериране на отчета...</Text>
        </View>
      </View>
    );
  }

  const { businessMetrics, platformPerformance, problemTypeAnalytics, timeAnalytics, aiPerformance, insights, recommendations } = reportData;

  // Prepare chart data
  const revenueData = {
    labels: ['Седмица 1', 'Седмица 2', 'Седмица 3', 'Седмица 4'],
    datasets: [{
      data: [
        businessMetrics.revenueGenerated * 0.2,
        businessMetrics.revenueGenerated * 0.3,
        businessMetrics.revenueGenerated * 0.25,
        businessMetrics.revenueGenerated * 0.25
      ],
      color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
      strokeWidth: 2
    }]
  };

  const problemTypeData = problemTypeAnalytics
    .filter(p => p.frequency > 0)
    .slice(0, 5)
    .map((problem, index) => ({
      name: problem.problemType.replace('_', ' '),
      population: problem.frequency,
      color: `hsl(${index * 60}, 70%, 50%)`,
      legendFontColor: '#7F7F7F',
      legendFontSize: 10
    }));

  const conversionData = {
    labels: ['Обаждания', 'Отговори', 'Разговори', 'Завършени'],
    datasets: [{
      data: [
        businessMetrics.totalCalls,
        businessMetrics.responsesSent,
        businessMetrics.conversationsStarted,
        businessMetrics.conversationsCompleted
      ]
    }]
  };

  const hourlyCallData = {
    labels: timeAnalytics.slice(8, 20).map(t => `${t.hour}h`),
    datasets: [{
      data: timeAnalytics.slice(8, 20).map(t => t.callVolume),
      color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
      strokeWidth: 2
    }]
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>📊 Аналитичен отчет</Text>
          <Text style={styles.subtitle}>Подробен анализ на производителността</Text>
        </View>
        <TouchableOpacity onPress={handleShareReport} style={styles.shareButton}>
          <Text style={styles.shareButtonText}>📤</Text>
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {[
          { key: 'daily', label: 'Дневен', days: 1 },
          { key: 'weekly', label: 'Седмичен', days: 7 },
          { key: 'monthly', label: 'Месечен', days: 30 }
        ].map(period => (
          <TouchableOpacity
            key={period.key}
            style={[
              styles.periodButton,
              selectedPeriod === period.key && styles.periodButtonActive
            ]}
            onPress={() => handlePeriodChange(period.key as any)}
          >
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === period.key && styles.periodButtonTextActive
            ]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Executive Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Резюме ({timeRange} дни)</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{businessMetrics.totalCalls}</Text>
              <Text style={styles.summaryLabel}>Обаждания</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                {((businessMetrics.responsesSent / businessMetrics.missedCalls) * 100).toFixed(1)}%
              </Text>
              <Text style={styles.summaryLabel}>Отговори</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#FF9800' }]}>
                {aiPerformance.completionRate.toFixed(1)}%
              </Text>
              <Text style={styles.summaryLabel}>AI Успех</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#2196F3' }]}>
                {businessMetrics.revenueGenerated.toFixed(0)} лв
              </Text>
              <Text style={styles.summaryLabel}>Приходи</Text>
            </View>
          </View>
        </View>

        {/* Revenue Trend */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Тенденция на приходите</Text>
          <LineChart
            data={revenueData}
            width={screenWidth - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            yAxisSuffix=" лв"
          />
        </View>

        {/* Problem Types Distribution */}
        {problemTypeData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.cardTitle}>Разпределение по тип проблеми</Text>
            <PieChart
              data={problemTypeData}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
            />
          </View>
        )}

        {/* Conversion Funnel */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Конверсионна фуния</Text>
          <BarChart
            data={conversionData}
            width={screenWidth - 40}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            showValuesOnTopOfBars
          />
        </View>

        {/* Hourly Call Pattern */}
        <View style={styles.chartCard}>
          <Text style={styles.cardTitle}>Модел на обажданията по часове</Text>
          <LineChart
            data={hourlyCallData}
            width={screenWidth - 40}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
          />
        </View>

        {/* Platform Performance Comparison */}
        <View style={styles.performanceCard}>
          <Text style={styles.cardTitle}>Сравнение на платформите</Text>
          {platformPerformance.map(platform => (
            <View key={platform.platform} style={styles.platformRow}>
              <View style={styles.platformInfo}>
                <Text style={styles.platformName}>
                  {platform.platform === 'whatsapp' ? '📱 WhatsApp' :
                   platform.platform === 'viber' ? '💜 Viber' : '✈️ Telegram'}
                </Text>
                <Text style={styles.platformStats}>
                  {platform.messagesSent} изпратени • {platform.deliveryRate.toFixed(1)}% доставени
                </Text>
              </View>
              <View style={styles.platformMetrics}>
                <Text style={styles.platformRating}>⭐ {platform.customerRating.toFixed(1)}</Text>
                <Text style={styles.platformTime}>{(platform.averageResponseTime / 1000).toFixed(1)}с</Text>
              </View>
            </View>
          ))}
        </View>

        {/* AI Performance Details */}
        <View style={styles.aiPerformanceCard}>
          <Text style={styles.cardTitle}>AI Производителност</Text>
          <View style={styles.aiMetricsGrid}>
            <View style={styles.aiMetricItem}>
              <Text style={styles.aiMetricLabel}>Общо разговори</Text>
              <Text style={styles.aiMetricValue}>{aiPerformance.totalConversations}</Text>
            </View>
            <View style={styles.aiMetricItem}>
              <Text style={styles.aiMetricLabel}>Процент завършване</Text>
              <Text style={[styles.aiMetricValue, { color: '#4CAF50' }]}>
                {aiPerformance.completionRate.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.aiMetricItem}>
              <Text style={styles.aiMetricLabel}>Процент ескалация</Text>
              <Text style={[styles.aiMetricValue, { color: '#FF9800' }]}>
                {aiPerformance.escalationRate.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.aiMetricItem}>
              <Text style={styles.aiMetricLabel}>Точност на класификация</Text>
              <Text style={[styles.aiMetricValue, { color: '#2196F3' }]}>
                {aiPerformance.problemClassificationAccuracy.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.aiMetricItem}>
              <Text style={styles.aiMetricLabel}>Средно съобщения</Text>
              <Text style={styles.aiMetricValue}>
                {aiPerformance.averageMessagesPerConversation.toFixed(1)}
              </Text>
            </View>
            <View style={styles.aiMetricItem}>
              <Text style={styles.aiMetricLabel}>AI време за отговор</Text>
              <Text style={[styles.aiMetricValue, { color: '#9C27B0' }]}>
                {aiPerformance.aiResponseTime.toFixed(1)}с
              </Text>
            </View>
          </View>
        </View>

        {/* Key Insights */}
        <View style={styles.insightsCard}>
          <Text style={styles.cardTitle}>🔍 Ключови наблюдения</Text>
          {insights.map((insight, index) => (
            <View key={index} style={styles.insightItem}>
              <Text style={styles.insightBullet}>•</Text>
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </View>

        {/* Recommendations */}
        <View style={styles.recommendationsCard}>
          <Text style={styles.cardTitle}>🎯 Препоръки за подобрение</Text>
          {recommendations.map((recommendation, index) => (
            <View key={index} style={styles.recommendationItem}>
              <Text style={styles.recommendationNumber}>{index + 1}</Text>
              <Text style={styles.recommendationText}>{recommendation}</Text>
            </View>
          ))}
        </View>

        {/* Problem Type Details */}
        <View style={styles.problemDetailsCard}>
          <Text style={styles.cardTitle}>📋 Детайли по тип проблеми</Text>
          {problemTypeAnalytics
            .filter(p => p.frequency > 0)
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 8)
            .map(problem => (
              <View key={problem.problemType} style={styles.problemDetailItem}>
                <View style={styles.problemDetailHeader}>
                  <Text style={styles.problemDetailType}>
                    {problem.problemType.replace('_', ' ')}
                  </Text>
                  <Text style={styles.problemDetailFrequency}>
                    {problem.frequency} случая
                  </Text>
                </View>
                <View style={styles.problemDetailStats}>
                  <Text style={styles.problemDetailStat}>
                    Ср. стойност: {problem.averageJobValue.toFixed(0)} лв
                  </Text>
                  <Text style={styles.problemDetailStat}>
                    Време за решаване: {(problem.averageResolutionTime / (1000 * 60)).toFixed(0)} мин
                  </Text>
                  <Text style={styles.problemDetailStat}>
                    Удовлетвореност: {(problem.customerSatisfaction * 20).toFixed(1)}%
                  </Text>
                </View>
              </View>
            ))
          }
        </View>

        {/* Report Footer */}
        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>📄 Информация за отчета</Text>
          <Text style={styles.footerText}>
            Генериран на: {new Date().toLocaleString('bg-BG')}
          </Text>
          <Text style={styles.footerText}>
            Период: {timeRange} дни ({selectedPeriod} отчет)
          </Text>
          <Text style={styles.footerText}>
            Версия: ServiceText Pro v2.0 (Phase 4)
          </Text>
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
  shareButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 15,
    justifyContent: 'space-around',
  },
  periodButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  periodButtonActive: {
    backgroundColor: '#673AB7',
  },
  periodButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#673AB7',
    marginBottom: 5,
  },
  summaryLabel: {
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
  performanceCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
  },
  platformRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  platformInfo: {
    flex: 1,
  },
  platformName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  platformStats: {
    fontSize: 12,
    color: '#666',
  },
  platformMetrics: {
    alignItems: 'flex-end',
  },
  platformRating: {
    fontSize: 14,
    color: '#FF9800',
    marginBottom: 2,
  },
  platformTime: {
    fontSize: 12,
    color: '#666',
  },
  aiPerformanceCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
  },
  aiMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  aiMetricItem: {
    width: '48%',
    marginBottom: 15,
  },
  aiMetricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  aiMetricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#673AB7',
  },
  insightsCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
  },
  insightItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  insightBullet: {
    fontSize: 16,
    color: '#673AB7',
    marginRight: 10,
    marginTop: 2,
  },
  insightText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  recommendationsCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  recommendationNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#673AB7',
    marginRight: 10,
    marginTop: 2,
  },
  recommendationText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  problemDetailsCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
  },
  problemDetailItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  problemDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  problemDetailType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'capitalize',
  },
  problemDetailFrequency: {
    fontSize: 14,
    color: '#673AB7',
    fontWeight: '600',
  },
  problemDetailStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  problemDetailStat: {
    fontSize: 12,
    color: '#666',
  },
  footerCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
});

export default AnalyticsReportScreen;
