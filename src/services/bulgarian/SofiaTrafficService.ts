import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Sofia Traffic-Aware Scheduling Service
 * Provides intelligent scheduling based on Sofia traffic patterns and local conditions
 */

export interface TrafficCondition {
  level: 'light' | 'moderate' | 'heavy' | 'severe';
  multiplier: number;
  description: string;
  color: string;
}

export interface SofiaRoute {
  from: string;
  to: string;
  distance: number; // km
  normalDuration: number; // minutes
  currentDuration: number; // minutes with traffic
  trafficLevel: TrafficCondition['level'];
  alternativeRoutes: AlternativeRoute[];
  lastUpdated: number;
}

export interface AlternativeRoute {
  description: string;
  duration: number;
  distance: number;
  avoidance: string[]; // what it avoids: ['traffic', 'construction', 'tolls']
}

export interface SofiaDistrict {
  name: string;
  nameEn: string;
  center: { lat: number; lng: number };
  boundaries: { lat: number; lng: number }[];
  zones: string[];
  averageResponseTime: number;
  trafficMultiplier: number;
  serviceArea: boolean;
  specialNotes?: string[];
}

export interface TrafficPattern {
  hour: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  trafficLevel: TrafficCondition['level'];
  averageDelay: number; // minutes
  description: string;
}

export interface SchedulingRecommendation {
  timeSlot: string;
  recommendationLevel: 'excellent' | 'good' | 'fair' | 'poor';
  estimatedTravelTime: number;
  trafficCondition: TrafficCondition;
  notes: string[];
  alternativeTimeSlots?: string[];
}

export interface SofiaWeatherImpact {
  condition: 'clear' | 'rain' | 'snow' | 'fog' | 'wind';
  severity: 'light' | 'moderate' | 'heavy';
  trafficImpact: number; // multiplier
  drivingAdvice: string[];
}

export class SofiaTrafficService {
  private static instance: SofiaTrafficService;
  private readonly TRAFFIC_PATTERNS_KEY = '@ServiceTextPro:SofiaTrafficPatterns';
  private readonly DISTRICTS_KEY = '@ServiceTextPro:SofiaDistricts';
  private readonly ROUTES_CACHE_KEY = '@ServiceTextPro:SofiaRoutesCache';

  private constructor() {}

  public static getInstance(): SofiaTrafficService {
    if (!SofiaTrafficService.instance) {
      SofiaTrafficService.instance = new SofiaTrafficService();
    }
    return SofiaTrafficService.instance;
  }

  /**
   * Initialize Sofia traffic service with default patterns
   */
  async initialize(): Promise<void> {
    try {
      console.log('[SofiaTraffic] Initializing Sofia traffic service...');

      await this.initializeTrafficPatterns();
      await this.initializeSofiaDistricts();

      console.log('[SofiaTraffic] Sofia traffic service initialized');
    } catch (error) {
      console.error('[SofiaTraffic] Error initializing:', error);
    }
  }

  /**
   * Get traffic condition for specific time and route
   */
  async getTrafficCondition(
    from: string,
    to: string,
    dateTime?: Date
  ): Promise<{ condition: TrafficCondition; estimatedDuration: number }> {
    const checkTime = dateTime || new Date();
    const hour = checkTime.getHours();
    const dayOfWeek = checkTime.getDay();

    // Get traffic pattern for this time
    const pattern = await this.getTrafficPattern(hour, dayOfWeek);
    
    // Calculate base duration between districts
    const baseDuration = await this.getBaseDuration(from, to);
    
    // Apply traffic multiplier
    const condition = this.getTrafficConditionFromLevel(pattern.trafficLevel);
    const estimatedDuration = Math.round(baseDuration * condition.multiplier);

    return {
      condition,
      estimatedDuration
    };
  }

  /**
   * Get optimal scheduling recommendations for Sofia
   */
  async getSchedulingRecommendations(
    customerDistrict: string,
    technicianLocation: string,
    preferredDate: Date
  ): Promise<SchedulingRecommendation[]> {
    const recommendations: SchedulingRecommendation[] = [];
    
    // Generate recommendations for different time slots
    const timeSlots = [
      '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
      '14:00', '15:00', '16:00', '17:00', '18:00'
    ];

    for (const timeSlot of timeSlots) {
      const [hours, minutes] = timeSlot.split(':').map(Number);
      const slotDateTime = new Date(preferredDate);
      slotDateTime.setHours(hours, minutes, 0, 0);

      const { condition, estimatedDuration } = await this.getTrafficCondition(
        technicianLocation,
        customerDistrict,
        slotDateTime
      );

      const recommendation = this.generateRecommendation(
        timeSlot,
        condition,
        estimatedDuration,
        slotDateTime
      );

      recommendations.push(recommendation);
    }

    // Sort by recommendation level
    const levelOrder = { excellent: 4, good: 3, fair: 2, poor: 1 };
    recommendations.sort((a, b) => levelOrder[b.recommendationLevel] - levelOrder[a.recommendationLevel]);

    return recommendations;
  }

  /**
   * Get Sofia districts with traffic information
   */
  async getSofiaDistricts(): Promise<SofiaDistrict[]> {
    try {
      const stored = await AsyncStorage.getItem(this.DISTRICTS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return this.getDefaultSofiaDistricts();
    } catch (error) {
      console.error('[SofiaTraffic] Error getting districts:', error);
      return this.getDefaultSofiaDistricts();
    }
  }

  /**
   * Calculate optimal route between two Sofia locations
   */
  async calculateOptimalRoute(
    from: string,
    to: string,
    departureTime?: Date
  ): Promise<SofiaRoute> {
    const checkTime = departureTime || new Date();
    
    const { condition, estimatedDuration } = await this.getTrafficCondition(from, to, checkTime);
    const baseDuration = await this.getBaseDuration(from, to);
    const distance = await this.getDistance(from, to);

    // Generate alternative routes
    const alternativeRoutes = await this.generateAlternativeRoutes(from, to, condition);

    return {
      from,
      to,
      distance,
      normalDuration: baseDuration,
      currentDuration: estimatedDuration,
      trafficLevel: condition.level,
      alternativeRoutes,
      lastUpdated: Date.now()
    };
  }

  /**
   * Get weather impact on traffic
   */
  async getWeatherImpact(condition: string, severity: string): Promise<SofiaWeatherImpact> {
    const weatherImpacts: Record<string, Record<string, SofiaWeatherImpact>> = {
      rain: {
        light: {
          condition: 'rain',
          severity: 'light',
          trafficImpact: 1.2,
          drivingAdvice: ['Намалете скоростта', 'Увеличете дистанцията']
        },
        moderate: {
          condition: 'rain',
          severity: 'moderate',
          trafficImpact: 1.5,
          drivingAdvice: ['Внимание при завиване', 'Избягвайте резки спирания', 'Включете светлините']
        },
        heavy: {
          condition: 'rain',
          severity: 'heavy',
          trafficImpact: 2.0,
          drivingAdvice: ['Карайте много внимателно', 'Избягвайте подлези', 'Спрете ако видимостта е лоша']
        }
      },
      snow: {
        light: {
          condition: 'snow',
          severity: 'light',
          trafficImpact: 1.4,
          drivingAdvice: ['Зимни гуми задължителни', 'Внимание при спиране']
        },
        moderate: {
          condition: 'snow',
          severity: 'moderate',
          trafficImpact: 1.8,
          drivingAdvice: ['Много внимателно шофиране', 'Избягвайте стръмни улици', 'Вериги за сняг препоръчителни']
        },
        heavy: {
          condition: 'snow',
          severity: 'heavy',
          trafficImpact: 2.5,
          drivingAdvice: ['Избягвайте пътуване ако е възможно', 'Вериги задължителни', 'Проверете пътните условия']
        }
      }
    };

    return weatherImpacts[condition]?.[severity] || {
      condition: 'clear',
      severity: 'light',
      trafficImpact: 1.0,
      drivingAdvice: ['Нормални условия за шофиране']
    } as SofiaWeatherImpact;
  }

  /**
   * Get rush hour information for Sofia
   */
  getRushHourInfo(dateTime: Date): {
    isRushHour: boolean;
    rushHourType: 'morning' | 'evening' | 'none';
    severity: 'light' | 'moderate' | 'heavy';
    expectedDelay: number;
  } {
    const hour = dateTime.getHours();
    const dayOfWeek = dateTime.getDay();
    
    // Weekend has lighter traffic
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        isRushHour: false,
        rushHourType: 'none',
        severity: 'light',
        expectedDelay: 0
      };
    }

    // Morning rush hour (7:00 - 10:00)
    if (hour >= 7 && hour < 10) {
      const severity = hour === 8 ? 'heavy' : hour === 7 || hour === 9 ? 'moderate' : 'light';
      return {
        isRushHour: true,
        rushHourType: 'morning',
        severity,
        expectedDelay: severity === 'heavy' ? 20 : severity === 'moderate' ? 10 : 5
      };
    }

    // Evening rush hour (17:00 - 19:30)
    if (hour >= 17 && hour < 20) {
      const severity = (hour === 17 || hour === 18) ? 'heavy' : 'moderate';
      return {
        isRushHour: true,
        rushHourType: 'evening',
        severity,
        expectedDelay: severity === 'heavy' ? 25 : 15
      };
    }

    return {
      isRushHour: false,
      rushHourType: 'none',
      severity: 'light',
      expectedDelay: 0
    };
  }

  /**
   * Private helper methods
   */
  private async initializeTrafficPatterns(): Promise<void> {
    const patterns: TrafficPattern[] = [];

    // Generate patterns for each hour and day
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        patterns.push(this.generateTrafficPattern(hour, day));
      }
    }

    await AsyncStorage.setItem(this.TRAFFIC_PATTERNS_KEY, JSON.stringify(patterns));
  }

  private generateTrafficPattern(hour: number, dayOfWeek: number): TrafficPattern {
    let trafficLevel: TrafficCondition['level'] = 'light';
    let averageDelay = 0;
    let description = '';

    // Weekend patterns
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      if (hour >= 10 && hour <= 20) {
        trafficLevel = 'moderate';
        averageDelay = 5;
        description = 'Умерен трафик в уикенда';
      } else {
        trafficLevel = 'light';
        averageDelay = 0;
        description = 'Лек трафик в уикенда';
      }
    } else {
      // Weekday patterns
      if (hour >= 7 && hour <= 9) {
        trafficLevel = hour === 8 ? 'severe' : 'heavy';
        averageDelay = hour === 8 ? 25 : 15;
        description = 'Сутрешен час пик';
      } else if (hour >= 17 && hour <= 19) {
        trafficLevel = 'severe';
        averageDelay = 30;
        description = 'Вечерен час пик';
      } else if (hour >= 10 && hour <= 16) {
        trafficLevel = 'moderate';
        averageDelay = 8;
        description = 'Работно време';
      } else if (hour >= 20 && hour <= 22) {
        trafficLevel = 'moderate';
        averageDelay = 5;
        description = 'Вечерен трафик';
      } else {
        trafficLevel = 'light';
        averageDelay = 0;
        description = 'Лек трафик';
      }
    }

    return {
      hour,
      dayOfWeek,
      trafficLevel,
      averageDelay,
      description
    };
  }

  private async initializeSofiaDistricts(): Promise<void> {
    const districts = this.getDefaultSofiaDistricts();
    await AsyncStorage.setItem(this.DISTRICTS_KEY, JSON.stringify(districts));
  }

  private getDefaultSofiaDistricts(): SofiaDistrict[] {
    return [
      {
        name: 'Център',
        nameEn: 'Center',
        center: { lat: 42.6977, lng: 23.3219 },
        boundaries: [
          { lat: 42.7100, lng: 23.3000 },
          { lat: 42.7100, lng: 23.3400 },
          { lat: 42.6850, lng: 23.3400 },
          { lat: 42.6850, lng: 23.3000 }
        ],
        zones: ['Център', 'Лозенец', 'Триадица', 'Средец'],
        averageResponseTime: 20,
        trafficMultiplier: 1.8,
        serviceArea: true,
        specialNotes: ['Пешеходни зони', 'Ограничен паркинг', 'Еднопосочни улици']
      },
      {
        name: 'Младост',
        nameEn: 'Mladost',
        center: { lat: 42.6500, lng: 23.3800 },
        boundaries: [
          { lat: 42.6700, lng: 23.3600 },
          { lat: 42.6700, lng: 23.4000 },
          { lat: 42.6300, lng: 23.4000 },
          { lat: 42.6300, lng: 23.3600 }
        ],
        zones: ['Младост 1', 'Младост 2', 'Младост 3', 'Младост 4'],
        averageResponseTime: 25,
        trafficMultiplier: 1.3,
        serviceArea: true,
        specialNotes: ['Нови блокове', 'Широки булеварди', 'Добър достъп']
      },
      {
        name: 'Люлин',
        nameEn: 'Lyulin',
        center: { lat: 42.7100, lng: 23.2500 },
        boundaries: [
          { lat: 42.7300, lng: 23.2300 },
          { lat: 42.7300, lng: 23.2700 },
          { lat: 42.6900, lng: 23.2700 },
          { lat: 42.6900, lng: 23.2300 }
        ],
        zones: ['Люлин 1', 'Люлин 2', 'Люлин 3', 'Люлин 4', 'Люлин 5', 'Люлин 6', 'Люлин 7', 'Люлин 8', 'Люлин 9', 'Люлин 10'],
        averageResponseTime: 35,
        trafficMultiplier: 1.4,
        serviceArea: true,
        specialNotes: ['Голям район', 'Панелни блокове', 'Метро достъп']
      },
      {
        name: 'Студентски град',
        nameEn: 'Studentski grad',
        center: { lat: 42.6600, lng: 23.3400 },
        boundaries: [
          { lat: 42.6750, lng: 23.3200 },
          { lat: 42.6750, lng: 23.3600 },
          { lat: 42.6450, lng: 23.3600 },
          { lat: 42.6450, lng: 23.3200 }
        ],
        zones: ['Студентски град', 'Дружба 1', 'Дружба 2'],
        averageResponseTime: 30,
        trafficMultiplier: 1.2,
        serviceArea: true,
        specialNotes: ['Университетски район', 'Много студенти', 'Специфични нужди']
      },
      {
        name: 'Витоша',
        nameEn: 'Vitosha',
        center: { lat: 42.6400, lng: 23.3000 },
        boundaries: [
          { lat: 42.6600, lng: 23.2800 },
          { lat: 42.6600, lng: 23.3200 },
          { lat: 42.6200, lng: 23.3200 },
          { lat: 42.6200, lng: 23.2800 }
        ],
        zones: ['Витоша', 'Бояна', 'Драгалевци'],
        averageResponseTime: 40,
        trafficMultiplier: 1.6,
        serviceArea: true,
        specialNotes: ['Планински район', 'Луксозни къщи', 'Специален достъп']
      },
      {
        name: 'Банкя',
        nameEn: 'Bankya',
        center: { lat: 42.7000, lng: 23.1200 },
        boundaries: [
          { lat: 42.7200, lng: 23.1000 },
          { lat: 42.7200, lng: 23.1400 },
          { lat: 42.6800, lng: 23.1400 },
          { lat: 42.6800, lng: 23.1000 }
        ],
        zones: ['Банкя'],
        averageResponseTime: 50,
        trafficMultiplier: 2.0,
        serviceArea: false,
        specialNotes: ['Извън София', 'Курортен град', 'Допълнителна такса']
      }
    ];
  }

  private async getTrafficPattern(hour: number, dayOfWeek: number): Promise<TrafficPattern> {
    try {
      const stored = await AsyncStorage.getItem(this.TRAFFIC_PATTERNS_KEY);
      if (stored) {
        const patterns: TrafficPattern[] = JSON.parse(stored);
        return patterns.find(p => p.hour === hour && p.dayOfWeek === dayOfWeek) || 
               this.generateTrafficPattern(hour, dayOfWeek);
      }
    } catch (error) {
      console.error('[SofiaTraffic] Error getting traffic pattern:', error);
    }
    
    return this.generateTrafficPattern(hour, dayOfWeek);
  }

  private getTrafficConditionFromLevel(level: TrafficCondition['level']): TrafficCondition {
    const conditions: Record<TrafficCondition['level'], TrafficCondition> = {
      light: {
        level: 'light',
        multiplier: 1.0,
        description: 'Лек трафик',
        color: '#4CAF50'
      },
      moderate: {
        level: 'moderate',
        multiplier: 1.3,
        description: 'Умерен трафик',
        color: '#FF9800'
      },
      heavy: {
        level: 'heavy',
        multiplier: 1.7,
        description: 'Интензивен трафик',
        color: '#FF5722'
      },
      severe: {
        level: 'severe',
        multiplier: 2.2,
        description: 'Много тежък трафик',
        color: '#F44336'
      }
    };

    return conditions[level];
  }

  private async getBaseDuration(from: string, to: string): Promise<number> {
    // Simplified distance-based calculation
    // In real implementation, this would use actual route data
    const districts = await this.getSofiaDistricts();
    const fromDistrict = districts.find(d => d.name === from || d.zones.includes(from));
    const toDistrict = districts.find(d => d.name === to || d.zones.includes(to));

    if (!fromDistrict || !toDistrict) {
      return 30; // Default 30 minutes
    }

    // Calculate approximate duration based on distance
    const distance = this.calculateDistance(fromDistrict.center, toDistrict.center);
    const baseDuration = Math.max(10, Math.round(distance * 2.5)); // ~2.5 minutes per km in city

    return baseDuration;
  }

  private calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private async getDistance(from: string, to: string): Promise<number> {
    const districts = await this.getSofiaDistricts();
    const fromDistrict = districts.find(d => d.name === from || d.zones.includes(from));
    const toDistrict = districts.find(d => d.name === to || d.zones.includes(to));

    if (!fromDistrict || !toDistrict) {
      return 15; // Default 15km
    }

    return this.calculateDistance(fromDistrict.center, toDistrict.center);
  }

  private async generateAlternativeRoutes(
    from: string,
    to: string,
    condition: TrafficCondition
  ): Promise<AlternativeRoute[]> {
    const alternatives: AlternativeRoute[] = [];

    if (condition.level === 'heavy' || condition.level === 'severe') {
      const baseDuration = await this.getBaseDuration(from, to);
      
      alternatives.push({
        description: 'Заобиколен път избягващ центъра',
        duration: Math.round(baseDuration * 1.4),
        distance: await this.getDistance(from, to) * 1.3,
        avoidance: ['traffic', 'center']
      });

      alternatives.push({
        description: 'Маршрут през спокойни квартали',
        duration: Math.round(baseDuration * 1.6),
        distance: await this.getDistance(from, to) * 1.5,
        avoidance: ['traffic', 'main_roads']
      });
    }

    return alternatives;
  }

  private generateRecommendation(
    timeSlot: string,
    condition: TrafficCondition,
    estimatedDuration: number,
    dateTime: Date
  ): SchedulingRecommendation {
    let recommendationLevel: SchedulingRecommendation['recommendationLevel'] = 'good';
    const notes: string[] = [];

    // Determine recommendation level based on traffic and time
    if (condition.level === 'light') {
      recommendationLevel = 'excellent';
      notes.push('Отлично време за пътуване');
    } else if (condition.level === 'moderate') {
      recommendationLevel = 'good';
      notes.push('Добро време за пътуване');
    } else if (condition.level === 'heavy') {
      recommendationLevel = 'fair';
      notes.push('Очаквайте забавяне заради трафика');
    } else {
      recommendationLevel = 'poor';
      notes.push('Избягвайте това време ако е възможно');
    }

    // Add specific notes based on time
    const hour = dateTime.getHours();
    if (hour >= 7 && hour <= 9) {
      notes.push('Сутрешен час пик в София');
    } else if (hour >= 17 && hour <= 19) {
      notes.push('Вечерен час пик в София');
    } else if (hour >= 12 && hour <= 14) {
      notes.push('Обедно време - умерен трафик');
    }

    // Add travel time note
    if (estimatedDuration > 45) {
      notes.push(`Дълго пътуване: ${estimatedDuration} мин`);
    } else if (estimatedDuration < 20) {
      notes.push(`Кратко пътуване: ${estimatedDuration} мин`);
    }

    return {
      timeSlot,
      recommendationLevel,
      estimatedTravelTime: estimatedDuration,
      trafficCondition: condition,
      notes
    };
  }
}
