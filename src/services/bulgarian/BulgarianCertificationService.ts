import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Bulgarian Certification and Licensing Service
 * Manages professional certifications, licenses, and compliance for Bulgarian trades
 */

export interface BulgarianProfessionalLicense {
  id: string;
  type: 'electrical' | 'plumbing' | 'hvac' | 'gas' | 'construction' | 'other';
  category: string;
  name: string;
  number: string;
  issuedBy: string;
  issueDate: string;
  expiryDate: string;
  isValid: boolean;
  scope: string[];
  restrictions?: string[];
  renewalRequired: boolean;
  renewalDate?: string;
  documentUrl?: string;
  verificationCode?: string;
}

export interface ElectricalLicense {
  category: '1' | '2' | '3' | '4' | '5';
  voltageLevel: 'low' | 'medium' | 'high';
  description: string;
  scopeOfWork: string[];
  requirements: string[];
}

export interface PlumbingLicense {
  category: 'water_supply' | 'sewerage' | 'heating' | 'gas_installation' | 'full';
  description: string;
  scopeOfWork: string[];
  requirements: string[];
}

export interface HVACLicense {
  category: 'installation' | 'maintenance' | 'repair' | 'design' | 'full';
  systemTypes: string[];
  refrigerantHandling: boolean;
  description: string;
  scopeOfWork: string[];
  requirements: string[];
}

export interface ComplianceRequirement {
  id: string;
  licenseType: string;
  requirement: string;
  description: string;
  mandatory: boolean;
  frequency: 'once' | 'annually' | 'biannually' | 'monthly';
  nextDueDate?: string;
  status: 'compliant' | 'due_soon' | 'overdue' | 'not_applicable';
}

export interface BulgarianRegulation {
  id: string;
  title: string;
  description: string;
  applicableTo: string[];
  lastUpdated: string;
  source: string;
  keyPoints: string[];
  penaltiesForNonCompliance: string[];
}

export interface CertificationAlert {
  id: string;
  licenseId: string;
  type: 'expiry_warning' | 'renewal_due' | 'compliance_issue' | 'update_required';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  actionRequired: string;
  dueDate?: string;
  dismissed: boolean;
}

export class BulgarianCertificationService {
  private static instance: BulgarianCertificationService;
  private readonly LICENSES_KEY = '@ServiceTextPro:BulgarianLicenses';
  private readonly COMPLIANCE_KEY = '@ServiceTextPro:ComplianceRequirements';
  private readonly REGULATIONS_KEY = '@ServiceTextPro:BulgarianRegulations';
  private readonly ALERTS_KEY = '@ServiceTextPro:CertificationAlerts';

  private constructor() {}

  public static getInstance(): BulgarianCertificationService {
    if (!BulgarianCertificationService.instance) {
      BulgarianCertificationService.instance = new BulgarianCertificationService();
    }
    return BulgarianCertificationService.instance;
  }

  /**
   * Initialize certification service with Bulgarian regulations
   */
  async initialize(): Promise<void> {
    try {
      console.log('[BulgarianCertification] Initializing certification service...');

      await this.initializeBulgarianRegulations();
      await this.initializeComplianceRequirements();

      console.log('[BulgarianCertification] Certification service initialized');
    } catch (error) {
      console.error('[BulgarianCertification] Error initializing:', error);
    }
  }

  /**
   * Add or update professional license
   */
  async addLicense(license: BulgarianProfessionalLicense): Promise<void> {
    try {
      const licenses = await this.getLicenses();
      const existingIndex = licenses.findIndex(l => l.id === license.id);

      if (existingIndex >= 0) {
        licenses[existingIndex] = license;
      } else {
        licenses.push(license);
      }

      await AsyncStorage.setItem(this.LICENSES_KEY, JSON.stringify(licenses));
      
      // Check for compliance and create alerts
      await this.checkLicenseCompliance(license);
      
      console.log('[BulgarianCertification] License added/updated:', license.name);
    } catch (error) {
      console.error('[BulgarianCertification] Error adding license:', error);
    }
  }

  /**
   * Get all professional licenses
   */
  async getLicenses(): Promise<BulgarianProfessionalLicense[]> {
    try {
      const stored = await AsyncStorage.getItem(this.LICENSES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[BulgarianCertification] Error getting licenses:', error);
      return [];
    }
  }

  /**
   * Get licenses by type
   */
  async getLicensesByType(type: BulgarianProfessionalLicense['type']): Promise<BulgarianProfessionalLicense[]> {
    const licenses = await this.getLicenses();
    return licenses.filter(license => license.type === type);
  }

  /**
   * Check if user is qualified for specific work
   */
  async checkQualification(workType: string, voltageLevel?: string): Promise<{
    qualified: boolean;
    licenses: BulgarianProfessionalLicense[];
    missingRequirements: string[];
    restrictions: string[];
  }> {
    const licenses = await this.getLicenses();
    const validLicenses = licenses.filter(l => l.isValid && new Date(l.expiryDate) > new Date());
    
    const qualifiedLicenses: BulgarianProfessionalLicense[] = [];
    const missingRequirements: string[] = [];
    const restrictions: string[] = [];

    // Check electrical work qualifications
    if (workType.includes('electrical')) {
      const electricalLicenses = validLicenses.filter(l => l.type === 'electrical');
      
      if (electricalLicenses.length === 0) {
        missingRequirements.push('Електротехнически лиценз');
      } else {
        const suitableLicense = electricalLicenses.find(l => 
          this.checkElectricalScope(l, workType, voltageLevel)
        );
        
        if (suitableLicense) {
          qualifiedLicenses.push(suitableLicense);
        } else {
          missingRequirements.push(`Лиценз за ${workType} ${voltageLevel || ''}`);
        }
      }
    }

    // Check plumbing work qualifications
    if (workType.includes('plumbing') || workType.includes('water') || workType.includes('heating')) {
      const plumbingLicenses = validLicenses.filter(l => l.type === 'plumbing');
      
      if (plumbingLicenses.length === 0) {
        missingRequirements.push('ВиК лиценз');
      } else {
        const suitableLicense = plumbingLicenses.find(l => 
          this.checkPlumbingScope(l, workType)
        );
        
        if (suitableLicense) {
          qualifiedLicenses.push(suitableLicense);
        } else {
          missingRequirements.push(`Лиценз за ${workType}`);
        }
      }
    }

    // Check HVAC work qualifications
    if (workType.includes('hvac') || workType.includes('climate') || workType.includes('cooling')) {
      const hvacLicenses = validLicenses.filter(l => l.type === 'hvac');
      
      if (hvacLicenses.length === 0) {
        missingRequirements.push('Климатичен лиценз');
      } else {
        const suitableLicense = hvacLicenses.find(l => 
          this.checkHVACScope(l, workType)
        );
        
        if (suitableLicense) {
          qualifiedLicenses.push(suitableLicense);
        } else {
          missingRequirements.push(`Лиценз за ${workType}`);
        }
      }
    }

    // Collect restrictions from all licenses
    qualifiedLicenses.forEach(license => {
      if (license.restrictions) {
        restrictions.push(...license.restrictions);
      }
    });

    return {
      qualified: qualifiedLicenses.length > 0 && missingRequirements.length === 0,
      licenses: qualifiedLicenses,
      missingRequirements,
      restrictions
    };
  }

  /**
   * Get electrical license categories
   */
  getElectricalLicenseCategories(): ElectricalLicense[] {
    return [
      {
        category: '1',
        voltageLevel: 'low',
        description: 'Електроинсталации до 1000V в жилищни и обществени сгради',
        scopeOfWork: [
          'Монтаж на електрически инсталации в жилища',
          'Ремонт на домакински електроуреди',
          'Осветителни инсталации',
          'Контакти и ключове'
        ],
        requirements: [
          'Завършено средно образование',
          'Курс по електробезопасност',
          'Практически стаж 2 години'
        ]
      },
      {
        category: '2',
        voltageLevel: 'low',
        description: 'Електроинсталации до 1000V в промишлени обекти',
        scopeOfWork: [
          'Промишлени електроинсталации',
          'Електрически табла до 1000V',
          'Моторни захранвания',
          'Автоматизация на ниско напрежение'
        ],
        requirements: [
          'Техническо образование',
          'Курс по промишлена електробезопасност',
          'Практически стаж 3 години'
        ]
      },
      {
        category: '3',
        voltageLevel: 'medium',
        description: 'Електроинсталации от 1000V до 35000V',
        scopeOfWork: [
          'Средно напрежение инсталации',
          'Трансформаторни постове',
          'Електрически подстанции',
          'Кабелни линии средно напрежение'
        ],
        requirements: [
          'Висше техническо образование',
          'Специализиран курс средно напрежение',
          'Практически стаж 5 години'
        ]
      },
      {
        category: '4',
        voltageLevel: 'high',
        description: 'Електроинсталации над 35000V',
        scopeOfWork: [
          'Високо напрежение инсталации',
          'Електропреносни мрежи',
          'Високоволтови подстанции',
          'Специализирани енергийни обекти'
        ],
        requirements: [
          'Висше електротехническо образование',
          'Специализиран курс високо напрежение',
          'Практически стаж 7 години',
          'Допълнителни сертификати'
        ]
      },
      {
        category: '5',
        voltageLevel: 'low',
        description: 'Специализирани електроинсталации и системи',
        scopeOfWork: [
          'Пожароизвестителни системи',
          'Охранителни системи',
          'Слаботокови инсталации',
          'Телекомуникационни системи'
        ],
        requirements: [
          'Специализирано образование',
          'Курсове по специализирани системи',
          'Практически стаж 3 години'
        ]
      }
    ];
  }

  /**
   * Get plumbing license categories
   */
  getPlumbingLicenseCategories(): PlumbingLicense[] {
    return [
      {
        category: 'water_supply',
        description: 'Водоснабдителни инсталации',
        scopeOfWork: [
          'Монтаж на водопроводи',
          'Ремонт на водоснабдителни системи',
          'Санитарни уреди',
          'Помпени системи'
        ],
        requirements: [
          'Завършено средно образование',
          'Курс по ВиК инсталации',
          'Практически стаж 2 години'
        ]
      },
      {
        category: 'sewerage',
        description: 'Канализационни инсталации',
        scopeOfWork: [
          'Канализационни системи',
          'Дренажни системи',
          'Отводнителни инсталации',
          'Пречистователни съоръжения'
        ],
        requirements: [
          'Техническо образование',
          'Курс по канализации',
          'Практически стаж 2 години'
        ]
      },
      {
        category: 'heating',
        description: 'Отоплителни инсталации',
        scopeOfWork: [
          'Радиаторни инсталации',
          'Подово отопление',
          'Котелни инсталации',
          'Топлопреносни системи'
        ],
        requirements: [
          'Техническо образование',
          'Курс по отоплителни системи',
          'Практически стаж 3 години'
        ]
      },
      {
        category: 'gas_installation',
        description: 'Газови инсталации',
        scopeOfWork: [
          'Битови газови инсталации',
          'Промишлени газови системи',
          'Газови уреди',
          'Газови котли'
        ],
        requirements: [
          'Специализирано образование',
          'Курс по газови инсталации',
          'Практически стаж 3 години',
          'Сертификат за работа с газ'
        ]
      },
      {
        category: 'full',
        description: 'Пълен ВиК лиценз',
        scopeOfWork: [
          'Всички видове ВиК инсталации',
          'Проектиране на ВиК системи',
          'Консултантски услуги',
          'Технически надзор'
        ],
        requirements: [
          'Висше техническо образование',
          'Всички специализирани курсове',
          'Практически стаж 5 години',
          'Допълнителни сертификати'
        ]
      }
    ];
  }

  /**
   * Get HVAC license categories
   */
  getHVACLicenseCategories(): HVACLicense[] {
    return [
      {
        category: 'installation',
        systemTypes: ['split_systems', 'central_air', 'heat_pumps'],
        refrigerantHandling: true,
        description: 'Монтаж на климатични системи',
        scopeOfWork: [
          'Монтаж на климатици',
          'Инсталиране на вентилация',
          'Топлинни помпи',
          'Хладилни системи'
        ],
        requirements: [
          'Техническо образование',
          'Курс по климатични системи',
          'Сертификат за работа с хладилни агенти',
          'Практически стаж 2 години'
        ]
      },
      {
        category: 'maintenance',
        systemTypes: ['all_systems'],
        refrigerantHandling: true,
        description: 'Поддръжка на климатични системи',
        scopeOfWork: [
          'Профилактика на климатици',
          'Почистване на системи',
          'Подмяна на филтри',
          'Проверка на хладилни агенти'
        ],
        requirements: [
          'Завършено средно образование',
          'Курс по поддръжка',
          'Сертификат за хладилни агенти',
          'Практически стаж 1 година'
        ]
      },
      {
        category: 'repair',
        systemTypes: ['all_systems'],
        refrigerantHandling: true,
        description: 'Ремонт на климатични системи',
        scopeOfWork: [
          'Диагностика на повреди',
          'Ремонт на компресори',
          'Електрически ремонти',
          'Подмяна на компоненти'
        ],
        requirements: [
          'Техническо образование',
          'Курс по ремонт',
          'Електротехнически знания',
          'Практически стаж 3 години'
        ]
      },
      {
        category: 'design',
        systemTypes: ['all_systems'],
        refrigerantHandling: false,
        description: 'Проектиране на климатични системи',
        scopeOfWork: [
          'Проектиране на вентилация',
          'Топлотехнически изчисления',
          'Енергийна ефективност',
          'Технически консултации'
        ],
        requirements: [
          'Висше техническо образование',
          'Курс по проектиране',
          'Софтуер за проектиране',
          'Практически стаж 4 години'
        ]
      },
      {
        category: 'full',
        systemTypes: ['all_systems'],
        refrigerantHandling: true,
        description: 'Пълен HVAC лиценз',
        scopeOfWork: [
          'Всички HVAC дейности',
          'Проектиране и монтаж',
          'Поддръжка и ремонт',
          'Технически надзор'
        ],
        requirements: [
          'Висше техническо образование',
          'Всички специализирани курсове',
          'Практически стаж 5 години',
          'Допълнителни сертификати'
        ]
      }
    ];
  }

  /**
   * Get compliance alerts
   */
  async getComplianceAlerts(): Promise<CertificationAlert[]> {
    try {
      const stored = await AsyncStorage.getItem(this.ALERTS_KEY);
      const alerts: CertificationAlert[] = stored ? JSON.parse(stored) : [];
      
      // Filter out dismissed alerts older than 30 days
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      return alerts.filter(alert => 
        !alert.dismissed || 
        (alert.dismissed && Date.now() - parseInt(alert.id.split('_').pop() || '0') < thirtyDaysAgo)
      );
    } catch (error) {
      console.error('[BulgarianCertification] Error getting alerts:', error);
      return [];
    }
  }

  /**
   * Check all licenses for compliance and create alerts
   */
  async checkAllLicensesCompliance(): Promise<void> {
    try {
      const licenses = await this.getLicenses();
      
      for (const license of licenses) {
        await this.checkLicenseCompliance(license);
      }
    } catch (error) {
      console.error('[BulgarianCertification] Error checking compliance:', error);
    }
  }

  /**
   * Get Bulgarian regulations
   */
  async getBulgarianRegulations(): Promise<BulgarianRegulation[]> {
    try {
      const stored = await AsyncStorage.getItem(this.REGULATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[BulgarianCertification] Error getting regulations:', error);
      return [];
    }
  }

  /**
   * Private helper methods
   */
  private async checkLicenseCompliance(license: BulgarianProfessionalLicense): Promise<void> {
    const alerts: CertificationAlert[] = [];
    const now = new Date();
    const expiryDate = new Date(license.expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Check for expiry warnings
    if (daysUntilExpiry <= 0) {
      alerts.push({
        id: `expired_${license.id}_${Date.now()}`,
        licenseId: license.id,
        type: 'expiry_warning',
        severity: 'critical',
        title: 'Изтекъл лиценз',
        message: `Лицензът "${license.name}" е изтекъл на ${license.expiryDate}`,
        actionRequired: 'Подновете лиценза незабавно',
        dismissed: false
      });
    } else if (daysUntilExpiry <= 30) {
      alerts.push({
        id: `expiry_30_${license.id}_${Date.now()}`,
        licenseId: license.id,
        type: 'expiry_warning',
        severity: 'high',
        title: 'Лицензът изтича скоро',
        message: `Лицензът "${license.name}" изтича след ${daysUntilExpiry} дни`,
        actionRequired: 'Започнете процедурата за подновяване',
        dueDate: license.expiryDate,
        dismissed: false
      });
    } else if (daysUntilExpiry <= 90) {
      alerts.push({
        id: `expiry_90_${license.id}_${Date.now()}`,
        licenseId: license.id,
        type: 'expiry_warning',
        severity: 'medium',
        title: 'Планирайте подновяване',
        message: `Лицензът "${license.name}" изтича след ${daysUntilExpiry} дни`,
        actionRequired: 'Планирайте подновяването на лиценза',
        dueDate: license.expiryDate,
        dismissed: false
      });
    }

    // Check for renewal requirements
    if (license.renewalRequired && license.renewalDate) {
      const renewalDate = new Date(license.renewalDate);
      const daysUntilRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilRenewal <= 0) {
        alerts.push({
          id: `renewal_overdue_${license.id}_${Date.now()}`,
          licenseId: license.id,
          type: 'renewal_due',
          severity: 'high',
          title: 'Подновяване просрочено',
          message: `Подновяването на "${license.name}" е просрочено`,
          actionRequired: 'Подновете незабавно',
          dismissed: false
        });
      } else if (daysUntilRenewal <= 14) {
        alerts.push({
          id: `renewal_due_${license.id}_${Date.now()}`,
          licenseId: license.id,
          type: 'renewal_due',
          severity: 'medium',
          title: 'Подновяване необходимо',
          message: `Подновяването на "${license.name}" е необходимо до ${daysUntilRenewal} дни`,
          actionRequired: 'Подновете в най-скоро време',
          dueDate: license.renewalDate,
          dismissed: false
        });
      }
    }

    // Save alerts
    if (alerts.length > 0) {
      await this.saveAlerts(alerts);
    }
  }

  private checkElectricalScope(license: BulgarianProfessionalLicense, workType: string, voltageLevel?: string): boolean {
    // Simplified scope checking - in real implementation, this would be more detailed
    const scope = license.scope.join(' ').toLowerCase();
    
    if (voltageLevel === 'high' && !scope.includes('високо напрежение')) {
      return false;
    }
    
    if (voltageLevel === 'medium' && !scope.includes('средно напрежение') && !scope.includes('високо напрежение')) {
      return false;
    }
    
    return scope.includes('електр') || scope.includes('electrical');
  }

  private checkPlumbingScope(license: BulgarianProfessionalLicense, workType: string): boolean {
    const scope = license.scope.join(' ').toLowerCase();
    
    if (workType.includes('gas') && !scope.includes('газ')) {
      return false;
    }
    
    return scope.includes('вик') || scope.includes('plumbing') || scope.includes('водопровод');
  }

  private checkHVACScope(license: BulgarianProfessionalLicense, workType: string): boolean {
    const scope = license.scope.join(' ').toLowerCase();
    return scope.includes('климат') || scope.includes('hvac') || scope.includes('вентилация');
  }

  private async saveAlerts(alerts: CertificationAlert[]): Promise<void> {
    try {
      const existingAlerts = await this.getComplianceAlerts();
      const allAlerts = [...existingAlerts, ...alerts];
      
      // Remove duplicates and keep only recent alerts
      const uniqueAlerts = allAlerts.filter((alert, index, self) => 
        index === self.findIndex(a => a.licenseId === alert.licenseId && a.type === alert.type)
      );
      
      await AsyncStorage.setItem(this.ALERTS_KEY, JSON.stringify(uniqueAlerts));
    } catch (error) {
      console.error('[BulgarianCertification] Error saving alerts:', error);
    }
  }

  private async initializeBulgarianRegulations(): Promise<void> {
    const regulations: BulgarianRegulation[] = [
      {
        id: 'electrical_safety_2024',
        title: 'Наредба за електробезопасност',
        description: 'Изисквания за безопасна работа с електрически инсталации',
        applicableTo: ['electrical'],
        lastUpdated: '2024-01-01',
        source: 'Министерство на енергетиката',
        keyPoints: [
          'Задължителни лицензи за електротехници',
          'Периодични проверки на инсталациите',
          'Изисквания за предпазни средства',
          'Процедури при аварии'
        ],
        penaltiesForNonCompliance: [
          'Глоба от 500 до 2000 лв за физически лица',
          'Глоба от 2000 до 10000 лв за юридически лица',
          'Отнемане на лиценз при повторно нарушение'
        ]
      },
      {
        id: 'plumbing_standards_2024',
        title: 'Наредба за ВиК инсталации',
        description: 'Стандарти за водоснабдителни и канализационни системи',
        applicableTo: ['plumbing'],
        lastUpdated: '2024-01-01',
        source: 'Министерство на регионалното развитие',
        keyPoints: [
          'Качество на водопроводната вода',
          'Изисквания за канализационни системи',
          'Енергийна ефективност',
          'Екологични изисквания'
        ],
        penaltiesForNonCompliance: [
          'Глоба от 300 до 1500 лв за физически лица',
          'Глоба от 1500 до 7500 лв за юридически лица',
          'Задължително отстраняване на нарушенията'
        ]
      },
      {
        id: 'hvac_efficiency_2024',
        title: 'Наредба за енергийна ефективност на климатични системи',
        description: 'Изисквания за енергийно ефективни HVAC системи',
        applicableTo: ['hvac'],
        lastUpdated: '2024-01-01',
        source: 'Агенция за устойчиво енергийно развитие',
        keyPoints: [
          'Енергийни класове на уредите',
          'Изисквания за хладилни агенти',
          'Периодична поддръжка',
          'Рециклиране на стари уреди'
        ],
        penaltiesForNonCompliance: [
          'Глоба от 400 до 2000 лв за физически лица',
          'Глоба от 2000 до 8000 лв за юридически лица',
          'Забрана за работа с хладилни агенти'
        ]
      }
    ];

    await AsyncStorage.setItem(this.REGULATIONS_KEY, JSON.stringify(regulations));
  }

  private async initializeComplianceRequirements(): Promise<void> {
    const requirements: ComplianceRequirement[] = [
      {
        id: 'electrical_annual_check',
        licenseType: 'electrical',
        requirement: 'Годишна проверка на знанията',
        description: 'Задължителна годишна проверка на знанията по електробезопасност',
        mandatory: true,
        frequency: 'annually',
        status: 'due_soon'
      },
      {
        id: 'plumbing_certification_renewal',
        licenseType: 'plumbing',
        requirement: 'Подновяване на сертификат',
        description: 'Подновяване на сертификат за ВиК инсталации на всеки 3 години',
        mandatory: true,
        frequency: 'biannually',
        status: 'compliant'
      },
      {
        id: 'hvac_refrigerant_training',
        licenseType: 'hvac',
        requirement: 'Обучение за хладилни агенти',
        description: 'Задължително обучение за работа с хладилни агенти',
        mandatory: true,
        frequency: 'biannually',
        status: 'compliant'
      }
    ];

    await AsyncStorage.setItem(this.COMPLIANCE_KEY, JSON.stringify(requirements));
  }
}
