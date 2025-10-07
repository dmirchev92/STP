import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Bulgarian Market Customization Service
 * Handles all Bulgarian market-specific features and integrations
 */

export interface BulgarianBusinessInfo {
  companyName: string;
  eikNumber: string; // ЕИК номер
  vatNumber?: string; // ДДС номер
  address: string;
  city: string;
  district?: string;
  postalCode: string;
  phoneNumber: string;
  email: string;
  website?: string;
  tradeLicense: string;
  certifications: BulgarianCertification[];
  bankAccount?: BulgarianBankAccount;
  workingHours: BulgarianBusinessHours;
}

export interface BulgarianCertification {
  id: string;
  type: 'electrical' | 'plumbing' | 'hvac' | 'gas' | 'other';
  name: string;
  number: string;
  issuedBy: string;
  issueDate: string;
  expiryDate: string;
  isValid: boolean;
  documentUrl?: string;
}

export interface BulgarianBankAccount {
  bankName: string;
  iban: string;
  bic: string;
  accountHolder: string;
}

export interface BulgarianBusinessHours {
  monday: { start: string; end: string; isWorking: boolean };
  tuesday: { start: string; end: string; isWorking: boolean };
  wednesday: { start: string; end: string; isWorking: boolean };
  thursday: { start: string; end: string; isWorking: boolean };
  friday: { start: string; end: string; isWorking: boolean };
  saturday: { start: string; end: string; isWorking: boolean };
  sunday: { start: string; end: string; isWorking: boolean };
  holidays: BulgarianHoliday[];
  vacationPeriods: VacationPeriod[];
}

export interface BulgarianHoliday {
  name: string;
  date: string; // YYYY-MM-DD format
  isNational: boolean;
  alternativeContact?: string;
  alternativePhone?: string;
}

export interface VacationPeriod {
  startDate: string;
  endDate: string;
  reason: string;
  alternativeContact?: string;
  alternativePhone?: string;
}

export interface SofiaDistrict {
  name: string;
  nameEn: string;
  zones: string[];
  averageResponseTime: number; // minutes
  trafficMultiplier: number;
  serviceArea: boolean;
}

export interface BulgarianPricing {
  currency: 'BGN';
  vatRate: number; // 20% in Bulgaria
  serviceRates: {
    electrical: ServiceRateStructure;
    plumbing: ServiceRateStructure;
    hvac: ServiceRateStructure;
  };
  emergencyMultiplier: number;
  holidayMultiplier: number;
  nightMultiplier: number;
}

export interface ServiceRateStructure {
  baseRate: number; // per hour
  calloutFee: number;
  materialMarkup: number; // percentage
  complexityMultipliers: {
    simple: number;
    standard: number;
    complex: number;
    expert: number;
  };
}

export interface BulgarianCulturalContext {
  greetings: {
    formal: string[];
    informal: string[];
    professional: string[];
  };
  courtesy: {
    please: string[];
    thankYou: string[];
    apology: string[];
    goodbye: string[];
  };
  businessEtiquette: {
    timeReferences: string[];
    professionalTitles: string[];
    respectfulAddressing: string[];
  };
  emergencyExpressions: {
    urgency: string[];
    safety: string[];
    instructions: string[];
  };
}

export class BulgarianMarketService {
  private static instance: BulgarianMarketService;
  private readonly BUSINESS_INFO_KEY = '@ServiceTextPro:BulgarianBusinessInfo';
  private readonly PRICING_KEY = '@ServiceTextPro:BulgarianPricing';
  private readonly CULTURAL_CONTEXT_KEY = '@ServiceTextPro:CulturalContext';

  private constructor() {}

  public static getInstance(): BulgarianMarketService {
    if (!BulgarianMarketService.instance) {
      BulgarianMarketService.instance = new BulgarianMarketService();
    }
    return BulgarianMarketService.instance;
  }

  /**
   * Initialize Bulgarian market customization
   */
  async initialize(): Promise<void> {
    try {
      console.log('[BulgarianMarket] Initializing Bulgarian market customization...');

      // Initialize default cultural context
      await this.initializeCulturalContext();

      // Initialize default pricing structure
      await this.initializePricingStructure();

      // Initialize Sofia districts
      await this.initializeSofiaDistricts();

      // Initialize Bulgarian holidays
      await this.initializeBulgarianHolidays();

      console.log('[BulgarianMarket] Bulgarian market customization initialized');
    } catch (error) {
      console.error('[BulgarianMarket] Error initializing:', error);
    }
  }

  /**
   * Validate ЕИК number (Bulgarian company registration number)
   */
  validateEIK(eik: string): boolean {
    // Remove spaces and non-digits
    const cleanEIK = eik.replace(/\D/g, '');
    
    // EIK should be 9 or 13 digits
    if (cleanEIK.length !== 9 && cleanEIK.length !== 13) {
      return false;
    }

    // Validate 9-digit EIK
    if (cleanEIK.length === 9) {
      return this.validateEIK9(cleanEIK);
    }

    // Validate 13-digit EIK
    if (cleanEIK.length === 13) {
      return this.validateEIK13(cleanEIK);
    }

    return false;
  }

  private validateEIK9(eik: string): boolean {
    const weights = [1, 2, 3, 4, 5, 6, 7, 8];
    let sum = 0;

    for (let i = 0; i < 8; i++) {
      sum += parseInt(eik[i]) * weights[i];
    }

    let remainder = sum % 11;
    if (remainder === 10) {
      const altWeights = [3, 4, 5, 6, 7, 8, 9, 10];
      sum = 0;
      for (let i = 0; i < 8; i++) {
        sum += parseInt(eik[i]) * altWeights[i];
      }
      remainder = sum % 11;
      if (remainder === 10) remainder = 0;
    }

    return remainder === parseInt(eik[8]);
  }

  private validateEIK13(eik: string): boolean {
    // First validate the first 9 digits as EIK9
    if (!this.validateEIK9(eik.substring(0, 9))) {
      return false;
    }

    // Validate the full 13-digit number
    const weights = [2, 7, 3, 5, 4, 9, 6, 8];
    let sum = 0;

    for (let i = 0; i < 8; i++) {
      sum += parseInt(eik[i]) * weights[i];
    }

    let remainder = sum % 11;
    if (remainder === 10) {
      const altWeights = [4, 9, 5, 7, 6, 11, 8, 10];
      sum = 0;
      for (let i = 0; i < 8; i++) {
        sum += parseInt(eik[i]) * altWeights[i];
      }
      remainder = sum % 11;
      if (remainder === 10) remainder = 0;
    }

    if (remainder !== parseInt(eik[8])) return false;

    // Validate positions 10-13
    const weights2 = [21, 19, 17, 13, 11, 9, 7, 3, 1];
    sum = 0;

    for (let i = 0; i < 9; i++) {
      sum += parseInt(eik[i]) * weights2[i];
    }

    remainder = sum % 10;
    return remainder === parseInt(eik[9]);
  }

  /**
   * Validate ДДС number (Bulgarian VAT number)
   */
  validateVATNumber(vat: string): boolean {
    // Remove BG prefix and spaces
    const cleanVAT = vat.replace(/^BG/i, '').replace(/\D/g, '');
    
    // VAT number should be 9 or 10 digits
    if (cleanVAT.length === 9) {
      return this.validateEIK9(cleanVAT);
    }

    if (cleanVAT.length === 10) {
      // For 10-digit VAT, validate as EIK9 + check digit
      return this.validateEIK9(cleanVAT.substring(0, 9));
    }

    return false;
  }

  /**
   * Format phone number to Bulgarian standard
   */
  formatBulgarianPhoneNumber(phone: string): string {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (digits.startsWith('359')) {
      // International format: +359XXXXXXXXX
      return `+${digits}`;
    } else if (digits.startsWith('0')) {
      // National format: 0XXXXXXXXX
      return `+359${digits.substring(1)}`;
    } else if (digits.length === 9) {
      // Mobile without leading 0: XXXXXXXXX
      return `+359${digits}`;
    }
    
    return phone; // Return original if can't format
  }

  /**
   * Get Sofia district information
   */
  async getSofiaDistricts(): Promise<SofiaDistrict[]> {
    try {
      const stored = await AsyncStorage.getItem('@ServiceTextPro:SofiaDistricts');
      if (stored) {
        return JSON.parse(stored);
      }
      return this.getDefaultSofiaDistricts();
    } catch (error) {
      console.error('[BulgarianMarket] Error getting Sofia districts:', error);
      return this.getDefaultSofiaDistricts();
    }
  }

  private getDefaultSofiaDistricts(): SofiaDistrict[] {
    return [
      {
        name: 'Център',
        nameEn: 'Center',
        zones: ['Център', 'Лозенец', 'Триадица', 'Средец'],
        averageResponseTime: 20,
        trafficMultiplier: 1.5,
        serviceArea: true
      },
      {
        name: 'Изток',
        nameEn: 'East',
        zones: ['Подуяне', 'Слатина', 'Изток'],
        averageResponseTime: 25,
        trafficMultiplier: 1.2,
        serviceArea: true
      },
      {
        name: 'Запад',
        nameEn: 'West',
        zones: ['Красно село', 'Люлин', 'Запад'],
        averageResponseTime: 30,
        trafficMultiplier: 1.3,
        serviceArea: true
      },
      {
        name: 'Север',
        nameEn: 'North',
        zones: ['Искър', 'Илинден', 'Север'],
        averageResponseTime: 35,
        trafficMultiplier: 1.4,
        serviceArea: true
      },
      {
        name: 'Юг',
        nameEn: 'South',
        zones: ['Витоша', 'Овча купел', 'Юг'],
        averageResponseTime: 40,
        trafficMultiplier: 1.6,
        serviceArea: true
      },
      {
        name: 'Студентски град',
        nameEn: 'Studentski grad',
        zones: ['Студентски град', 'Дружба'],
        averageResponseTime: 30,
        trafficMultiplier: 1.3,
        serviceArea: true
      },
      {
        name: 'Младост',
        nameEn: 'Mladost',
        zones: ['Младост 1', 'Младост 2', 'Младост 3', 'Младост 4'],
        averageResponseTime: 25,
        trafficMultiplier: 1.2,
        serviceArea: true
      },
      {
        name: 'Банкя',
        nameEn: 'Bankya',
        zones: ['Банкя'],
        averageResponseTime: 50,
        trafficMultiplier: 2.0,
        serviceArea: false
      }
    ];
  }

  /**
   * Calculate response time based on Sofia district and traffic
   */
  calculateSofiaResponseTime(district: string, currentTime: Date): number {
    const districts = this.getDefaultSofiaDistricts();
    const districtInfo = districts.find(d => 
      d.name === district || d.zones.includes(district)
    );

    if (!districtInfo) {
      return 45; // Default response time for unknown areas
    }

    let responseTime = districtInfo.averageResponseTime;

    // Apply traffic multiplier based on time of day
    const hour = currentTime.getHours();
    let trafficFactor = 1.0;

    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      // Rush hours
      trafficFactor = districtInfo.trafficMultiplier;
    } else if (hour >= 10 && hour <= 16) {
      // Business hours
      trafficFactor = districtInfo.trafficMultiplier * 0.8;
    } else {
      // Off-peak hours
      trafficFactor = districtInfo.trafficMultiplier * 0.6;
    }

    return Math.round(responseTime * trafficFactor);
  }

  /**
   * Get Bulgarian holidays for current year
   */
  async getBulgarianHolidays(year?: number): Promise<BulgarianHoliday[]> {
    const currentYear = year || new Date().getFullYear();
    
    return [
      {
        name: 'Нова година',
        date: `${currentYear}-01-01`,
        isNational: true,
        alternativeContact: 'Партньор за спешни случаи',
        alternativePhone: '+359888999888'
      },
      {
        name: 'Освобождението на България',
        date: `${currentYear}-03-03`,
        isNational: true
      },
      {
        name: 'Великден', // Easter - calculated dynamically
        date: this.calculateEasterDate(currentYear),
        isNational: true
      },
      {
        name: 'Велики петък', // Good Friday
        date: this.calculateGoodFridayDate(currentYear),
        isNational: true
      },
      {
        name: 'Ден на труда',
        date: `${currentYear}-05-01`,
        isNational: true
      },
      {
        name: 'Ден на храбростта',
        date: `${currentYear}-05-06`,
        isNational: true
      },
      {
        name: 'Ден на славянската писменост',
        date: `${currentYear}-05-24`,
        isNational: true
      },
      {
        name: 'Съединението',
        date: `${currentYear}-09-06`,
        isNational: true
      },
      {
        name: 'Ден на независимостта',
        date: `${currentYear}-09-22`,
        isNational: true
      },
      {
        name: 'Ден на будителите',
        date: `${currentYear}-11-01`,
        isNational: true
      },
      {
        name: 'Коледа',
        date: `${currentYear}-12-25`,
        isNational: true,
        alternativeContact: 'Партньор за спешни случаи',
        alternativePhone: '+359888999888'
      },
      {
        name: 'Втори ден Коледа',
        date: `${currentYear}-12-26`,
        isNational: true,
        alternativeContact: 'Партньор за спешни случаи',
        alternativePhone: '+359888999888'
      }
    ];
  }

  private calculateEasterDate(year: number): string {
    // Orthodox Easter calculation (Julian calendar)
    const a = year % 4;
    const b = year % 7;
    const c = year % 19;
    const d = (19 * c + 15) % 30;
    const e = (2 * a + 4 * b - d + 34) % 7;
    const month = Math.floor((d + e + 114) / 31);
    const day = ((d + e + 114) % 31) + 1;
    
    // Add 13 days for Orthodox calendar
    const orthodoxDate = new Date(year, month - 1, day + 13);
    
    return orthodoxDate.toISOString().split('T')[0];
  }

  private calculateGoodFridayDate(year: number): string {
    const easterDate = new Date(this.calculateEasterDate(year));
    const goodFriday = new Date(easterDate);
    goodFriday.setDate(easterDate.getDate() - 2);
    
    return goodFriday.toISOString().split('T')[0];
  }

  /**
   * Check if current date is a Bulgarian holiday
   */
  async isBulgarianHoliday(date?: Date): Promise<{ isHoliday: boolean; holiday?: BulgarianHoliday }> {
    const checkDate = date || new Date();
    const dateString = checkDate.toISOString().split('T')[0];
    
    const holidays = await this.getBulgarianHolidays(checkDate.getFullYear());
    const holiday = holidays.find(h => h.date === dateString);
    
    return {
      isHoliday: !!holiday,
      holiday
    };
  }

  /**
   * Get Bulgarian pricing structure
   */
  async getBulgarianPricing(): Promise<BulgarianPricing> {
    try {
      const stored = await AsyncStorage.getItem(this.PRICING_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return this.getDefaultPricingStructure();
    } catch (error) {
      console.error('[BulgarianMarket] Error getting pricing:', error);
      return this.getDefaultPricingStructure();
    }
  }

  private getDefaultPricingStructure(): BulgarianPricing {
    return {
      currency: 'BGN',
      vatRate: 20, // 20% VAT in Bulgaria
      serviceRates: {
        electrical: {
          baseRate: 40, // BGN per hour
          calloutFee: 30,
          materialMarkup: 25, // 25% markup on materials
          complexityMultipliers: {
            simple: 1.0,
            standard: 1.3,
            complex: 1.7,
            expert: 2.2
          }
        },
        plumbing: {
          baseRate: 35, // BGN per hour
          calloutFee: 25,
          materialMarkup: 30,
          complexityMultipliers: {
            simple: 1.0,
            standard: 1.2,
            complex: 1.6,
            expert: 2.0
          }
        },
        hvac: {
          baseRate: 45, // BGN per hour
          calloutFee: 35,
          materialMarkup: 20,
          complexityMultipliers: {
            simple: 1.0,
            standard: 1.4,
            complex: 1.8,
            expert: 2.5
          }
        }
      },
      emergencyMultiplier: 1.5,
      holidayMultiplier: 2.0,
      nightMultiplier: 1.3 // 20:00 - 06:00
    };
  }

  /**
   * Calculate job price in Bulgarian context
   */
  calculateJobPrice(params: {
    serviceType: 'electrical' | 'plumbing' | 'hvac';
    complexity: 'simple' | 'standard' | 'complex' | 'expert';
    estimatedHours: number;
    materialCost?: number;
    isEmergency?: boolean;
    isHoliday?: boolean;
    isNightTime?: boolean;
  }): { subtotal: number; vat: number; total: number; breakdown: any } {
    const pricing = this.getDefaultPricingStructure();
    const serviceRate = pricing.serviceRates[params.serviceType];
    
    // Base calculation
    let laborCost = serviceRate.baseRate * params.estimatedHours;
    laborCost *= serviceRate.complexityMultipliers[params.complexity];
    
    let totalCost = laborCost + serviceRate.calloutFee;
    
    // Add material costs with markup
    if (params.materialCost && params.materialCost > 0) {
      const materialWithMarkup = params.materialCost * (1 + serviceRate.materialMarkup / 100);
      totalCost += materialWithMarkup;
    }
    
    // Apply multipliers
    if (params.isEmergency) {
      totalCost *= pricing.emergencyMultiplier;
    }
    
    if (params.isHoliday) {
      totalCost *= pricing.holidayMultiplier;
    }
    
    if (params.isNightTime) {
      totalCost *= pricing.nightMultiplier;
    }
    
    const subtotal = Math.round(totalCost * 100) / 100;
    const vat = Math.round(subtotal * (pricing.vatRate / 100) * 100) / 100;
    const total = Math.round((subtotal + vat) * 100) / 100;
    
    return {
      subtotal,
      vat,
      total,
      breakdown: {
        laborCost: Math.round(laborCost * 100) / 100,
        calloutFee: serviceRate.calloutFee,
        materialCost: params.materialCost ? Math.round(params.materialCost * (1 + serviceRate.materialMarkup / 100) * 100) / 100 : 0,
        multipliers: {
          emergency: params.isEmergency ? pricing.emergencyMultiplier : 1,
          holiday: params.isHoliday ? pricing.holidayMultiplier : 1,
          night: params.isNightTime ? pricing.nightMultiplier : 1
        }
      }
    };
  }

  /**
   * Get Bulgarian cultural context
   */
  async getCulturalContext(): Promise<BulgarianCulturalContext> {
    try {
      const stored = await AsyncStorage.getItem(this.CULTURAL_CONTEXT_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return this.getDefaultCulturalContext();
    } catch (error) {
      console.error('[BulgarianMarket] Error getting cultural context:', error);
      return this.getDefaultCulturalContext();
    }
  }

  private getDefaultCulturalContext(): BulgarianCulturalContext {
    return {
      greetings: {
        formal: ['Здравейте', 'Добър ден', 'Добро утро', 'Добър вечер'],
        informal: ['Здрасти', 'Здравей', 'Хей'],
        professional: ['Здравейте, уважаеми клиент', 'Добър ден, г-н/г-жо', 'Здравейте от екипа на']
      },
      courtesy: {
        please: ['моля', 'моля Ви', 'ако обичате', 'бихте ли'],
        thankYou: ['благодаря', 'благодаря Ви', 'много благодаря', 'сърдечно благодаря'],
        apology: ['извинявайте', 'съжалявам', 'моля да ме извините', 'приносим извинения'],
        goodbye: ['довиждане', 'приятен ден', 'до скоро', 'чао', 'всичко добро']
      },
      businessEtiquette: {
        timeReferences: ['в удобно за Вас време', 'когато Ви е най-подходящо', 'в рамките на работното време'],
        professionalTitles: ['г-н', 'г-жа', 'инж.', 'майстор', 'специалист'],
        respectfulAddressing: ['уважаеми клиент', 'уважаема клиентка', 'скъпи клиент']
      },
      emergencyExpressions: {
        urgency: ['спешно', 'незабавно', 'веднага', 'приоритетно', 'критично'],
        safety: ['безопасност', 'внимание', 'опасност', 'предпазни мерки', 'сигурност'],
        instructions: ['спрете веднага', 'не докосвайте', 'излезте от помещението', 'обадете се на 112']
      }
    };
  }

  /**
   * Initialize services
   */
  private async initializeCulturalContext(): Promise<void> {
    const context = this.getDefaultCulturalContext();
    await AsyncStorage.setItem(this.CULTURAL_CONTEXT_KEY, JSON.stringify(context));
  }

  private async initializePricingStructure(): Promise<void> {
    const pricing = this.getDefaultPricingStructure();
    await AsyncStorage.setItem(this.PRICING_KEY, JSON.stringify(pricing));
  }

  private async initializeSofiaDistricts(): Promise<void> {
    const districts = this.getDefaultSofiaDistricts();
    await AsyncStorage.setItem('@ServiceTextPro:SofiaDistricts', JSON.stringify(districts));
  }

  private async initializeBulgarianHolidays(): Promise<void> {
    const holidays = await this.getBulgarianHolidays();
    await AsyncStorage.setItem('@ServiceTextPro:BulgarianHolidays', JSON.stringify(holidays));
  }

  /**
   * Save business information
   */
  async saveBusinessInfo(businessInfo: BulgarianBusinessInfo): Promise<void> {
    try {
      await AsyncStorage.setItem(this.BUSINESS_INFO_KEY, JSON.stringify(businessInfo));
      console.log('[BulgarianMarket] Business info saved');
    } catch (error) {
      console.error('[BulgarianMarket] Error saving business info:', error);
    }
  }

  /**
   * Get business information
   */
  async getBusinessInfo(): Promise<BulgarianBusinessInfo | null> {
    try {
      const stored = await AsyncStorage.getItem(this.BUSINESS_INFO_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('[BulgarianMarket] Error getting business info:', error);
      return null;
    }
  }
}
