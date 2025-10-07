import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  MessageTemplate, 
  TemplateCategory, 
  TemplateVariable,
  TemplateTrigger,
  MessagingPlatform,
  BULGARIAN_TEMPLATES
} from '../utils/messagingTypes';
import { Contact, ContactCategory, ContactPriority, BusinessHours } from '../utils/types';
import { t } from '../localization';

/**
 * Template Manager Service
 * Handles message templates, variables replacement, and template selection logic
 */
export class TemplateManager {
  private static instance: TemplateManager;
  private readonly TEMPLATES_KEY = '@ServiceTextPro:MessageTemplates';
  private templates: MessageTemplate[] = [];
  private lastCacheUpdate: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): TemplateManager {
    if (!TemplateManager.instance) {
      TemplateManager.instance = new TemplateManager();
    }
    return TemplateManager.instance;
  }

  /**
   * Initialize template manager with default Bulgarian templates
   */
  async initialize(): Promise<void> {
    try {
      // Load existing templates from storage
      await this.loadTemplates();

      // If no templates exist, create default ones
      if (this.templates.length === 0) {
        await this.createDefaultTemplates();
      }

      console.log('[TemplateManager] Initialized with', this.templates.length, 'templates');
    } catch (error) {
      console.error('[TemplateManager] Initialization error:', error);
    }
  }

  /**
   * Create default Bulgarian message templates
   */
  private async createDefaultTemplates(): Promise<void> {
    const defaultTemplates: MessageTemplate[] = [
      {
        id: 'business_hours_missed',
        name: 'Пропуснато обаждане - работно време',
        category: 'business_hours',
        language: 'bg',
        content: 'Здравейте! В момента не мога да отговоря на телефона. Ще се свържа с Вас възможно най-скоро. За спешни случаи: {emergencyPhone}',
        variables: [
          { key: 'emergencyPhone', name: 'Спешен телефон', description: 'Телефон за спешни случаи', required: true }
        ],
        triggers: [
          { condition: 'business_hours', value: true },
          { condition: 'contact_category', value: 'new_prospect' }
        ],
        platform: ['whatsapp', 'viber', 'telegram'],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'after_hours_missed',
        name: 'Пропуснато обаждане - извън работно време',
        category: 'after_hours',
        language: 'bg',
        content: 'Здравейте! Обаждате се извън работното ми време ({workHours}). Ще се свържа с Вас утре. За спешни случаи: {emergencyPhone}',
        variables: [
          { key: 'workHours', name: 'Работни часове', description: 'Работно време', required: true },
          { key: 'emergencyPhone', name: 'Спешен телефон', description: 'Телефон за спешни случаи', required: true }
        ],
        triggers: [
          { condition: 'business_hours', value: false }
        ],
        platform: ['whatsapp', 'viber', 'telegram'],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'emergency_response',
        name: 'Спешен отговор',
        category: 'emergency',
        language: 'bg',
        content: '🚨 СПЕШНО: Получих Вашето обаждане за спешен случай. Свързвам се с Вас в рамките на 15 минути! Ако не мога да се свържа, обърнете се към: {backupContact}',
        variables: [
          { key: 'backupContact', name: 'Резервен контакт', description: 'Алтернативен контакт за спешни случаи', required: true }
        ],
        triggers: [
          { condition: 'emergency_keywords', value: true }
        ],
        platform: ['whatsapp', 'viber', 'telegram'],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'new_customer',
        name: 'Нов клиент',
        category: 'new_customer',
        language: 'bg',
        content: 'Здравейте! Благодаря за обаждането. Аз съм {technicianName}, {profession} с {experience} години опит. Ще се свържа с Вас в рамките на {responseTime} за да обсъдим Вашия проблем.',
        variables: [
          { key: 'technicianName', name: 'Име на майстора', description: 'Вашето име', required: true },
          { key: 'profession', name: 'Професия', description: 'електротехник/водопроводчик/техник', required: true },
          { key: 'experience', name: 'Опит', description: 'Години опит', required: true },
          { key: 'responseTime', name: 'Време за отговор', description: '30 минути/1 час/2 часа', required: true }
        ],
        triggers: [
          { condition: 'contact_category', value: 'new_prospect' }
        ],
        platform: ['whatsapp', 'viber', 'telegram'],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'existing_customer',
        name: 'Съществуващ клиент',
        category: 'existing_customer',
        language: 'bg',
        content: 'Здравейте, {customerName}! Получих Вашето обаждане. Ще се свържа с Вас скоро за да обсъдим проблема. Последният път работихме заедно по {lastService}.',
        variables: [
          { key: 'customerName', name: 'Име на клиента', description: 'Име на клиента', required: true },
          { key: 'lastService', name: 'Последна услуга', description: 'Описание на последната услуга', required: false, defaultValue: 'вашия проект' }
        ],
        triggers: [
          { condition: 'contact_category', value: 'existing_customer' }
        ],
        platform: ['whatsapp', 'viber', 'telegram'],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'job_site_mode',
        name: 'На работа',
        category: 'job_site',
        language: 'bg',
        content: 'В момента съм на работно място и не мога да отговоря. Ще завърша към {finishTime} и ще се свържа с Вас. За спешни случаи: {emergencyPhone}',
        variables: [
          { key: 'finishTime', name: 'Време на завършване', description: 'Кога ще завършите работата', required: true },
          { key: 'emergencyPhone', name: 'Спешен телефон', description: 'Телефон за спешни случаи', required: true }
        ],
        triggers: [
          { condition: 'contact_category', value: 'job_site' }
        ],
        platform: ['whatsapp', 'viber', 'telegram'],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'vacation_mode',
        name: 'В отпуска',
        category: 'vacation',
        language: 'bg',
        content: 'В момента съм в отпуска до {returnDate}. За спешни случаи се обърнете към {alternativeContact} - {alternativePhone}. Ще се свържа с Вас след завръщането си.',
        variables: [
          { key: 'returnDate', name: 'Дата на завръщане', description: 'Кога се връщате от отпуска', required: true },
          { key: 'alternativeContact', name: 'Алтернативен контакт', description: 'Име на алтернативен контакт', required: true },
          { key: 'alternativePhone', name: 'Алтернативен телефон', description: 'Телефон на алтернативен контакт', required: true }
        ],
        triggers: [
          { condition: 'contact_category', value: 'vacation' }
        ],
        platform: ['whatsapp', 'viber', 'telegram'],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'follow_up',
        name: 'Проследяване',
        category: 'follow_up',
        language: 'bg',
        content: 'Здравейте! Как върви работата, която направих при Вас на {serviceDate}? Ако има някакви проблеми или въпроси, моля свържете се с мен. Вашето мнение е важно за мен!',
        variables: [
          { key: 'serviceDate', name: 'Дата на услугата', description: 'Кога е била извършена услугата', required: true }
        ],
        triggers: [],
        platform: ['whatsapp', 'viber', 'telegram'],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    // Save default templates
    for (const template of defaultTemplates) {
      await this.saveTemplate(template);
    }
  }

  /**
   * Load templates from storage
   */
  private async loadTemplates(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.TEMPLATES_KEY);
      if (stored) {
        this.templates = JSON.parse(stored);
        this.lastCacheUpdate = Date.now();
      }
    } catch (error) {
      console.error('[TemplateManager] Error loading templates:', error);
      this.templates = [];
    }
  }

  /**
   * Save templates to storage
   */
  private async saveTemplates(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.TEMPLATES_KEY, JSON.stringify(this.templates));
      this.lastCacheUpdate = Date.now();
    } catch (error) {
      console.error('[TemplateManager] Error saving templates:', error);
    }
  }

  /**
   * Get all templates
   */
  async getTemplates(): Promise<MessageTemplate[]> {
    if (Date.now() - this.lastCacheUpdate > this.CACHE_DURATION) {
      await this.loadTemplates();
    }
    return this.templates.filter(t => t.isActive);
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<MessageTemplate | null> {
    const templates = await this.getTemplates();
    return templates.find(t => t.id === id) || null;
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: TemplateCategory): Promise<MessageTemplate[]> {
    const templates = await this.getTemplates();
    return templates.filter(t => t.category === category);
  }

  /**
   * Save or update a template
   */
  async saveTemplate(template: MessageTemplate): Promise<void> {
    try {
      const existingIndex = this.templates.findIndex(t => t.id === template.id);
      
      if (existingIndex >= 0) {
        this.templates[existingIndex] = { ...template, updatedAt: Date.now() };
      } else {
        this.templates.push({ ...template, createdAt: Date.now(), updatedAt: Date.now() });
      }

      await this.saveTemplates();
    } catch (error) {
      console.error('[TemplateManager] Error saving template:', error);
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<void> {
    try {
      this.templates = this.templates.filter(t => t.id !== id);
      await this.saveTemplates();
    } catch (error) {
      console.error('[TemplateManager] Error deleting template:', error);
    }
  }

  /**
   * Select appropriate template based on context
   */
  async selectTemplate(context: {
    contact?: Contact;
    businessHours: BusinessHours;
    currentTime: Date;
    hasEmergencyKeywords: boolean;
    appMode: string;
  }): Promise<MessageTemplate | null> {
    try {
      const templates = await this.getTemplates();
      const currentHour = context.currentTime.getHours();
      const currentDay = context.currentTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Check if it's within business hours
      const isBusinessHours = this.isWithinBusinessHours(
        context.businessHours,
        currentHour,
        currentDay
      );

      // Priority 1: Emergency templates
      if (context.hasEmergencyKeywords) {
        const emergencyTemplate = templates.find(t => t.category === 'emergency');
        if (emergencyTemplate) return emergencyTemplate;
      }

      // Priority 2: App mode specific templates
      if (context.appMode === 'vacation') {
        const vacationTemplate = templates.find(t => t.category === 'vacation');
        if (vacationTemplate) return vacationTemplate;
      }

      if (context.appMode === 'job_site') {
        const jobSiteTemplate = templates.find(t => t.category === 'job_site');
        if (jobSiteTemplate) return jobSiteTemplate;
      }

      // Priority 3: Business hours vs after hours
      if (!isBusinessHours) {
        const afterHoursTemplate = templates.find(t => t.category === 'after_hours');
        if (afterHoursTemplate) return afterHoursTemplate;
      }

      // Priority 4: Contact specific templates
      if (context.contact) {
        if (context.contact.category === 'existing_customer') {
          const existingCustomerTemplate = templates.find(t => t.category === 'existing_customer');
          if (existingCustomerTemplate) return existingCustomerTemplate;
        }
      }

      // Priority 5: New customer template (default for business hours)
      const newCustomerTemplate = templates.find(t => t.category === 'new_customer');
      if (newCustomerTemplate) return newCustomerTemplate;

      // Fallback: Business hours template
      const businessHoursTemplate = templates.find(t => t.category === 'business_hours');
      return businessHoursTemplate || null;

    } catch (error) {
      console.error('[TemplateManager] Error selecting template:', error);
      return null;
    }
  }

  /**
   * Check if current time is within business hours
   */
  private isWithinBusinessHours(
    businessHours: BusinessHours,
    currentHour: number,
    currentDay: number
  ): boolean {
    if (!businessHours.enabled) return false;

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[currentDay] as keyof typeof businessHours.schedule;
    
    const daySchedule = businessHours.schedule[dayName];
    if (!daySchedule) return false;

    const startHour = parseInt(daySchedule.start.split(':')[0]);
    const endHour = parseInt(daySchedule.end.split(':')[0]);

    return currentHour >= startHour && currentHour < endHour;
  }

  /**
   * Replace template variables with actual values
   */
  replaceVariables(
    template: MessageTemplate,
    variables: Record<string, string>
  ): string {
    let content = template.content;

    // Replace each variable
    template.variables.forEach(variable => {
      const value = variables[variable.key] || variable.defaultValue || `{${variable.key}}`;
      const regex = new RegExp(`\\{${variable.key}\\}`, 'g');
      content = content.replace(regex, value);
    });

    return content;
  }

  /**
   * Validate template variables
   */
  validateTemplate(template: MessageTemplate): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!template.name || template.name.trim().length === 0) {
      errors.push('Template name is required');
    }

    if (!template.content || template.content.trim().length === 0) {
      errors.push('Template content is required');
    }

    // Check for undefined variables in content
    const variablePattern = /\{([^}]+)\}/g;
    const contentVariables = [];
    let match;

    while ((match = variablePattern.exec(template.content)) !== null) {
      contentVariables.push(match[1]);
    }

    // Check if all variables in content are defined
    const definedVariables = template.variables.map(v => v.key);
    const undefinedVariables = contentVariables.filter(v => !definedVariables.includes(v));

    if (undefinedVariables.length > 0) {
      errors.push(`Undefined variables in content: ${undefinedVariables.join(', ')}`);
    }

    // Check for required variables without default values
    const requiredVariables = template.variables.filter(v => v.required && !v.defaultValue);
    if (requiredVariables.length > 0) {
      // This is not an error, just a warning for the user
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get template usage statistics
   */
  async getTemplateStats(): Promise<Record<string, number>> {
    // This would track template usage in a real implementation
    // For now, return empty stats
    return {};
  }

  /**
   * Create a new template ID
   */
  generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Duplicate a template
   */
  async duplicateTemplate(templateId: string, newName: string): Promise<MessageTemplate | null> {
    try {
      const original = await this.getTemplateById(templateId);
      if (!original) return null;

      const duplicate: MessageTemplate = {
        ...original,
        id: this.generateTemplateId(),
        name: newName,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await this.saveTemplate(duplicate);
      return duplicate;
    } catch (error) {
      console.error('[TemplateManager] Error duplicating template:', error);
      return null;
    }
  }
}
