import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * KPI Tracker Service
 * Tracks and manages Key Performance Indicators for ServiceText Pro
 */

export interface KPITarget {
  id: string;
  name: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  category: 'business' | 'operational' | 'customer' | 'technical';
  priority: 'high' | 'medium' | 'low';
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  lastUpdated: number;
  isAchieved: boolean;
}

export interface KPIDashboard {
  businessKPIs: KPITarget[];
  operationalKPIs: KPITarget[];
  customerKPIs: KPITarget[];
  technicalKPIs: KPITarget[];
  overallScore: number;
  achievedTargets: number;
  totalTargets: number;
}

export interface PerformanceAlert {
  id: string;
  kpiId: string;
  type: 'target_missed' | 'trend_decline' | 'critical_threshold' | 'achievement';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  actionRequired: string;
  timestamp: number;
  acknowledged: boolean;
}

export class KPITracker {
  private static instance: KPITracker;
  private readonly KPI_TARGETS_KEY = '@ServiceTextPro:KPITargets';
  private readonly KPI_HISTORY_KEY = '@ServiceTextPro:KPIHistory';
  private readonly ALERTS_KEY = '@ServiceTextPro:PerformanceAlerts';

  private constructor() {}

  public static getInstance(): KPITracker {
    if (!KPITracker.instance) {
      KPITracker.instance = new KPITracker();
    }
    return KPITracker.instance;
  }

  /**
   * Initialize KPI targets with default values
   */
  async initializeKPITargets(): Promise<void> {
    try {
      const existingTargets = await this.getKPITargets();
      if (existingTargets.length === 0) {
        const defaultTargets = this.getDefaultKPITargets();
        await this.saveKPITargets(defaultTargets);
        console.log('[KPITracker] Initialized with default KPI targets');
      }
    } catch (error) {
      console.error('[KPITracker] Error initializing KPI targets:', error);
    }
  }

  /**
   * Get default KPI targets for Bulgarian tradespeople
   */
  private getDefaultKPITargets(): KPITarget[] {
    return [
      // Business KPIs
      {
        id: 'response_rate',
        name: 'Процент отговори',
        description: 'Процент от пропуснатите обаждания, на които е изпратен отговор',
        targetValue: 95,
        currentValue: 0,
        unit: '%',
        category: 'business',
        priority: 'high',
        trend: 'stable',
        trendPercentage: 0,
        lastUpdated: Date.now(),
        isAchieved: false
      },
      {
        id: 'conversion_rate',
        name: 'Конверсия към работи',
        description: 'Процент от разговорите, които се превръщат в платени работи',
        targetValue: 40,
        currentValue: 0,
        unit: '%',
        category: 'business',
        priority: 'high',
        trend: 'stable',
        trendPercentage: 0,
        lastUpdated: Date.now(),
        isAchieved: false
      },
      {
        id: 'monthly_revenue',
        name: 'Месечни приходи',
        description: 'Общи приходи от работи за месеца',
        targetValue: 5000,
        currentValue: 0,
        unit: 'лв',
        category: 'business',
        priority: 'high',
        trend: 'stable',
        trendPercentage: 0,
        lastUpdated: Date.now(),
        isAchieved: false
      },
      {
        id: 'average_job_value',
        name: 'Средна стойност на работа',
        description: 'Средната стойност на една завършена работа',
        targetValue: 150,
        currentValue: 0,
        unit: 'лв',
        category: 'business',
        priority: 'medium',
        trend: 'stable',
        trendPercentage: 0,
        lastUpdated: Date.now(),
        isAchieved: false
      },

      // Operational KPIs
      {
        id: 'response_time',
        name: 'Време за отговор',
        description: 'Средно време от пропуснато обаждане до изпратен отговор',
        targetValue: 120, // 2 minutes
        currentValue: 0,
        unit: 'секунди',
        category: 'operational',
        priority: 'high',
        trend: 'stable',
        trendPercentage: 0,
        lastUpdated: Date.now(),
        isAchieved: false
      },
      {
        id: 'emergency_response_time',
        name: 'Време за спешен отговор',
        description: 'Време за отговор при спешни случаи',
        targetValue: 15, // 15 minutes
        currentValue: 0,
        unit: 'минути',
        category: 'operational',
        priority: 'high',
        trend: 'stable',
        trendPercentage: 0,
        lastUpdated: Date.now(),
        isAchieved: false
      },
      {
        id: 'first_call_resolution',
        name: 'Решаване от първо посещение',
        description: 'Процент от проблемите, решени от първото посещение',
        targetValue: 85,
        currentValue: 0,
        unit: '%',
        category: 'operational',
        priority: 'medium',
        trend: 'stable',
        trendPercentage: 0,
        lastUpdated: Date.now(),
        isAchieved: false
      },
      {
        id: 'tool_preparation_accuracy',
        name: 'Точност на подготовка',
        description: 'Процент от случаите с правилно подготвени инструменти',
        targetValue: 90,
        currentValue: 0,
        unit: '%',
        category: 'operational',
        priority: 'medium',
        trend: 'stable',
        trendPercentage: 0,
        lastUpdated: Date.now(),
        isAchieved: false
      },

      // Customer KPIs
      {
        id: 'customer_satisfaction',
        name: 'Удовлетвореност на клиенти',
        description: 'Средна оценка на удовлетвореността на клиентите',
        targetValue: 4.5,
        currentValue: 0,
        unit: '/5',
        category: 'customer',
        priority: 'high',
        trend: 'stable',
        trendPercentage: 0,
        lastUpdated: Date.now(),
        isAchieved: false
      },
      {
        id: 'repeat_customer_rate',
        name: 'Процент повтарящи клиенти',
        description: 'Процент от клиентите, които се обръщат отново',
        targetValue: 60,
        currentValue: 0,
        unit: '%',
        category: 'customer',
        priority: 'medium',
        trend: 'stable',
        trendPercentage: 0,
        lastUpdated: Date.now(),
        isAchieved: false
      },
      {
        id: 'referral_rate',
        name: 'Процент препоръки',
        description: 'Процент от новите клиенти, дошли по препоръка',
        targetValue: 30,
        currentValue: 0,
        unit: '%',
        category: 'customer',
        priority: 'medium',
        trend: 'stable',
        trendPercentage: 0,
        lastUpdated: Date.now(),
        isAchieved: false
      },

      // Technical KPIs
      {
        id: 'ai_accuracy',
        name: 'AI точност на класификация',
        description: 'Точност на AI при класифициране на проблеми',
        targetValue: 90,
        currentValue: 0,
        unit: '%',
        category: 'technical',
        priority: 'high',
        trend: 'stable',
        trendPercentage: 0,
        lastUpdated: Date.now(),
        isAchieved: false
      },
      {
        id: 'ai_completion_rate',
        name: 'AI процент завършване',
        description: 'Процент от AI разговорите, завършени успешно',
        targetValue: 80,
        currentValue: 0,
        unit: '%',
        category: 'technical',
        priority: 'high',
        trend: 'stable',
        trendPercentage: 0,
        lastUpdated: Date.now(),
        isAchieved: false
      },
      {
        id: 'system_uptime',
        name: 'Време на работа на системата',
        description: 'Процент време, в което системата работи без проблеми',
        targetValue: 99.5,
        currentValue: 0,
        unit: '%',
        category: 'technical',
        priority: 'high',
        trend: 'stable',
        trendPercentage: 0,
        lastUpdated: Date.now(),
        isAchieved: false
      },
      {
        id: 'message_delivery_rate',
        name: 'Процент доставка на съобщения',
        description: 'Процент от съобщенията, доставени успешно',
        targetValue: 95,
        currentValue: 0,
        unit: '%',
        category: 'technical',
        priority: 'medium',
        trend: 'stable',
        trendPercentage: 0,
        lastUpdated: Date.now(),
        isAchieved: false
      }
    ];
  }

  /**
   * Update KPI value and calculate trend
   */
  async updateKPI(kpiId: string, newValue: number): Promise<void> {
    try {
      const targets = await this.getKPITargets();
      const targetIndex = targets.findIndex(t => t.id === kpiId);
      
      if (targetIndex === -1) {
        console.error(`[KPITracker] KPI ${kpiId} not found`);
        return;
      }

      const target = targets[targetIndex];
      const oldValue = target.currentValue;
      
      // Calculate trend
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendPercentage = 0;

      if (oldValue > 0) {
        const change = ((newValue - oldValue) / oldValue) * 100;
        trendPercentage = Math.abs(change);
        
        if (change > 2) trend = 'up';
        else if (change < -2) trend = 'down';
        else trend = 'stable';
      }

      // Update target
      target.currentValue = newValue;
      target.trend = trend;
      target.trendPercentage = trendPercentage;
      target.lastUpdated = Date.now();
      target.isAchieved = newValue >= target.targetValue;

      targets[targetIndex] = target;
      await this.saveKPITargets(targets);

      // Store historical data
      await this.recordKPIHistory(kpiId, newValue);

      // Check for alerts
      await this.checkKPIAlerts(target);

      console.log(`[KPITracker] Updated KPI ${kpiId}: ${newValue} ${target.unit}`);
    } catch (error) {
      console.error(`[KPITracker] Error updating KPI ${kpiId}:`, error);
    }
  }

  /**
   * Get KPI dashboard with organized data
   */
  async getKPIDashboard(): Promise<KPIDashboard> {
    try {
      const targets = await this.getKPITargets();
      
      const businessKPIs = targets.filter(t => t.category === 'business');
      const operationalKPIs = targets.filter(t => t.category === 'operational');
      const customerKPIs = targets.filter(t => t.category === 'customer');
      const technicalKPIs = targets.filter(t => t.category === 'technical');

      const achievedTargets = targets.filter(t => t.isAchieved).length;
      const totalTargets = targets.length;
      const overallScore = totalTargets > 0 ? (achievedTargets / totalTargets) * 100 : 0;

      return {
        businessKPIs,
        operationalKPIs,
        customerKPIs,
        technicalKPIs,
        overallScore,
        achievedTargets,
        totalTargets
      };
    } catch (error) {
      console.error('[KPITracker] Error getting KPI dashboard:', error);
      return {
        businessKPIs: [],
        operationalKPIs: [],
        customerKPIs: [],
        technicalKPIs: [],
        overallScore: 0,
        achievedTargets: 0,
        totalTargets: 0
      };
    }
  }

  /**
   * Get KPI historical data
   */
  async getKPIHistory(kpiId: string, days: number = 30): Promise<{ timestamp: number; value: number }[]> {
    try {
      const historyKey = `${this.KPI_HISTORY_KEY}:${kpiId}`;
      const stored = await AsyncStorage.getItem(historyKey);
      
      if (!stored) return [];

      const history: { timestamp: number; value: number }[] = JSON.parse(stored);
      const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
      
      return history.filter(entry => entry.timestamp >= cutoffTime);
    } catch (error) {
      console.error(`[KPITracker] Error getting KPI history for ${kpiId}:`, error);
      return [];
    }
  }

  /**
   * Check for KPI alerts and create notifications
   */
  private async checkKPIAlerts(target: KPITarget): Promise<void> {
    try {
      const alerts: PerformanceAlert[] = [];

      // Target achievement alert
      if (target.isAchieved && target.currentValue >= target.targetValue) {
        alerts.push({
          id: `achievement_${target.id}_${Date.now()}`,
          kpiId: target.id,
          type: 'achievement',
          severity: 'low',
          title: 'Цел постигната!',
          message: `${target.name} достигна целевата стойност от ${target.targetValue} ${target.unit}`,
          actionRequired: 'Поздравления! Може да обмислите по-високи цели.',
          timestamp: Date.now(),
          acknowledged: false
        });
      }

      // Target missed alert
      if (!target.isAchieved && target.currentValue < target.targetValue * 0.8) {
        const severity = target.priority === 'high' ? 'high' : 'medium';
        alerts.push({
          id: `missed_${target.id}_${Date.now()}`,
          kpiId: target.id,
          type: 'target_missed',
          severity,
          title: 'Цел не е постигната',
          message: `${target.name} е под 80% от целевата стойност`,
          actionRequired: 'Прегледайте стратегията и предприемете корективни действия.',
          timestamp: Date.now(),
          acknowledged: false
        });
      }

      // Negative trend alert
      if (target.trend === 'down' && target.trendPercentage > 10) {
        alerts.push({
          id: `decline_${target.id}_${Date.now()}`,
          kpiId: target.id,
          type: 'trend_decline',
          severity: 'medium',
          title: 'Негативна тенденция',
          message: `${target.name} намалява с ${target.trendPercentage.toFixed(1)}%`,
          actionRequired: 'Анализирайте причините за спада и предприемете мерки.',
          timestamp: Date.now(),
          acknowledged: false
        });
      }

      // Critical threshold alert (for specific KPIs)
      if (this.isCriticalKPI(target.id) && target.currentValue < target.targetValue * 0.5) {
        alerts.push({
          id: `critical_${target.id}_${Date.now()}`,
          kpiId: target.id,
          type: 'critical_threshold',
          severity: 'critical',
          title: 'Критично ниво!',
          message: `${target.name} е под критичната граница`,
          actionRequired: 'Незабавни действия необходими!',
          timestamp: Date.now(),
          acknowledged: false
        });
      }

      // Save alerts
      if (alerts.length > 0) {
        await this.saveAlerts(alerts);
      }
    } catch (error) {
      console.error('[KPITracker] Error checking KPI alerts:', error);
    }
  }

  /**
   * Check if KPI is critical for business operations
   */
  private isCriticalKPI(kpiId: string): boolean {
    const criticalKPIs = [
      'response_rate',
      'emergency_response_time',
      'system_uptime',
      'customer_satisfaction'
    ];
    return criticalKPIs.includes(kpiId);
  }

  /**
   * Get performance alerts
   */
  async getPerformanceAlerts(): Promise<PerformanceAlert[]> {
    try {
      const stored = await AsyncStorage.getItem(this.ALERTS_KEY);
      if (!stored) return [];

      const alerts: PerformanceAlert[] = JSON.parse(stored);
      
      // Return only recent alerts (last 30 days)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      return alerts.filter(alert => alert.timestamp >= thirtyDaysAgo);
    } catch (error) {
      console.error('[KPITracker] Error getting performance alerts:', error);
      return [];
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      const alerts = await this.getPerformanceAlerts();
      const alertIndex = alerts.findIndex(a => a.id === alertId);
      
      if (alertIndex >= 0) {
        alerts[alertIndex].acknowledged = true;
        await AsyncStorage.setItem(this.ALERTS_KEY, JSON.stringify(alerts));
      }
    } catch (error) {
      console.error('[KPITracker] Error acknowledging alert:', error);
    }
  }

  /**
   * Generate KPI performance report
   */
  async generateKPIReport(): Promise<{
    summary: string;
    achievedTargets: KPITarget[];
    missedTargets: KPITarget[];
    improvingKPIs: KPITarget[];
    decliningKPIs: KPITarget[];
    recommendations: string[];
  }> {
    try {
      const targets = await this.getKPITargets();
      const dashboard = await this.getKPIDashboard();

      const achievedTargets = targets.filter(t => t.isAchieved);
      const missedTargets = targets.filter(t => !t.isAchieved);
      const improvingKPIs = targets.filter(t => t.trend === 'up');
      const decliningKPIs = targets.filter(t => t.trend === 'down');

      // Generate recommendations
      const recommendations: string[] = [];
      
      if (dashboard.overallScore < 70) {
        recommendations.push('Общата производителност е под очакванията. Фокусирайте се върху приоритетните KPI-та.');
      }

      if (decliningKPIs.length > 0) {
        recommendations.push(`${decliningKPIs.length} показатели намаляват. Анализирайте причините и предприемете корективни мерки.`);
      }

      if (missedTargets.some(t => t.priority === 'high')) {
        recommendations.push('Високо приоритетни цели не са постигнати. Пренасочете ресурсите към тези области.');
      }

      const summary = `Общ резултат: ${dashboard.overallScore.toFixed(1)}%. ` +
                     `Постигнати цели: ${dashboard.achievedTargets}/${dashboard.totalTargets}. ` +
                     `Подобряващи се: ${improvingKPIs.length}, Влошаващи се: ${decliningKPIs.length}.`;

      return {
        summary,
        achievedTargets,
        missedTargets,
        improvingKPIs,
        decliningKPIs,
        recommendations
      };
    } catch (error) {
      console.error('[KPITracker] Error generating KPI report:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private async getKPITargets(): Promise<KPITarget[]> {
    try {
      const stored = await AsyncStorage.getItem(this.KPI_TARGETS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[KPITracker] Error getting KPI targets:', error);
      return [];
    }
  }

  private async saveKPITargets(targets: KPITarget[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.KPI_TARGETS_KEY, JSON.stringify(targets));
    } catch (error) {
      console.error('[KPITracker] Error saving KPI targets:', error);
    }
  }

  private async recordKPIHistory(kpiId: string, value: number): Promise<void> {
    try {
      const historyKey = `${this.KPI_HISTORY_KEY}:${kpiId}`;
      const stored = await AsyncStorage.getItem(historyKey);
      
      const history: { timestamp: number; value: number }[] = stored ? JSON.parse(stored) : [];
      history.push({ timestamp: Date.now(), value });

      // Keep only last 90 days
      const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
      const filteredHistory = history.filter(entry => entry.timestamp >= ninetyDaysAgo);

      await AsyncStorage.setItem(historyKey, JSON.stringify(filteredHistory));
    } catch (error) {
      console.error('[KPITracker] Error recording KPI history:', error);
    }
  }

  private async saveAlerts(alerts: PerformanceAlert[]): Promise<void> {
    try {
      const existingAlerts = await this.getPerformanceAlerts();
      const allAlerts = [...existingAlerts, ...alerts];
      
      // Keep only last 100 alerts
      const recentAlerts = allAlerts.slice(-100);
      
      await AsyncStorage.setItem(this.ALERTS_KEY, JSON.stringify(recentAlerts));
    } catch (error) {
      console.error('[KPITracker] Error saving alerts:', error);
    }
  }
}
