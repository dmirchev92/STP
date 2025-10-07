import AsyncStorage from '@react-native-async-storage/async-storage';
import { CallEvent, Contact, MessagingPlatform, BusinessHours, AppMode } from '../utils/types';
import { 
  MessageRequest, 
  MessageResponse, 
  MessagePriority,
  PlatformConfig,
  EMERGENCY_PATTERNS
} from '../utils/messagingTypes';
import { TemplateManager } from './TemplateManager';
import { MessageQueueManager } from './MessageQueueManager';
import { WhatsAppService } from './messaging/WhatsAppService';
import { ViberService } from './messaging/ViberService';
import { TelegramService } from './messaging/TelegramService';

/**
 * ResponseEngine - Complete automated response system for missed calls
 * Handles template selection, platform routing, and message sending
 */
export class ResponseEngine {
  private static instance: ResponseEngine;
  private templateManager: TemplateManager;
  private queueManager: MessageQueueManager;
  private whatsappService: WhatsAppService;
  private viberService: ViberService;
  private telegramService: TelegramService;
  private isInitialized: boolean = false;

  private constructor() {
    this.templateManager = TemplateManager.getInstance();
    this.queueManager = MessageQueueManager.getInstance();
    this.whatsappService = new WhatsAppService();
    this.viberService = new ViberService();
    this.telegramService = new TelegramService();
  }

  public static getInstance(): ResponseEngine {
    if (!ResponseEngine.instance) {
      ResponseEngine.instance = new ResponseEngine();
    }
    return ResponseEngine.instance;
  }

  /**
   * Initialize the response engine with platform configurations
   */
  public async initialize(config: PlatformConfig): Promise<boolean> {
    try {
      console.log('[ResponseEngine] Initializing...');

      // Initialize template manager
      await this.templateManager.initialize();

      // Initialize messaging services
      if (config.whatsapp) {
        await this.whatsappService.initialize(config.whatsapp);
      }

      if (config.viber) {
        await this.viberService.initialize(config.viber);
      }

      if (config.telegram) {
        await this.telegramService.initialize(config.telegram);
      }

      // Initialize message queue
      await this.queueManager.initialize();

      this.isInitialized = true;
      console.log('[ResponseEngine] Initialization complete');
      return true;
    } catch (error) {
      console.error('[ResponseEngine] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Process a call event and trigger appropriate response
   */
  public async processCallEvent(callEvent: CallEvent): Promise<void> {
    try {
      console.log(`[ResponseEngine] Processing call event: ${callEvent.id}`);
      console.log(`[ResponseEngine] Missed call from: ${callEvent.callRecord.phoneNumber}`);
      
      if (!this.isInitialized) {
        console.warn('[ResponseEngine] Not initialized, skipping response');
        return;
      }

      // Check if we should send a response
      if (!await this.shouldSendResponse(callEvent)) {
        console.log('[ResponseEngine] Response blocked by business rules');
        return;
      }

      // Get current app state
      const appState = await this.getAppState();
      
      // Detect emergency keywords in recent voicemails/messages
      const hasEmergencyKeywords = await this.detectEmergencyKeywords(callEvent);

      // Select appropriate template
      const template = await this.templateManager.selectTemplate({
        contact: callEvent.contact,
        businessHours: appState.businessHours,
        currentTime: new Date(),
        hasEmergencyKeywords,
        appMode: appState.currentMode
      });

      if (!template) {
        console.warn('[ResponseEngine] No suitable template found');
        return;
      }

      // Prepare template variables
      const variables = await this.prepareTemplateVariables(callEvent, appState);

      // Replace variables in template
      const messageContent = this.templateManager.replaceVariables(template, variables);

      // Determine messaging platform
      const platform = this.getPreferredPlatform(callEvent.contact);

      // Create message request
      const messageRequest: MessageRequest = {
        id: `response_${callEvent.id}_${Date.now()}`,
        platform,
        recipient: callEvent.callRecord.phoneNumber,
        content: messageContent,
        templateId: template.id,
        variables,
        priority: hasEmergencyKeywords ? 'urgent' : 'normal',
        retryCount: 0,
        maxRetries: 3,
        createdAt: Date.now()
      };

      // Queue message for sending
      await this.queueManager.enqueueMessage(messageRequest);

      // Process the queue
      await this.queueManager.processQueue();

      // Mark call event as processed
      callEvent.responseTriggered = true;
      
      console.log(`[ResponseEngine] Response queued for ${callEvent.callRecord.phoneNumber} via ${platform}`);
      
    } catch (error) {
      console.error('[ResponseEngine] Error processing call event:', error);
    }
  }

  /**
   * Check if response should be sent based on business rules
   */
  private async shouldSendResponse(callEvent: CallEvent): Promise<boolean> {
    try {
      // Check if contact is blacklisted
      if (callEvent.contact?.category === 'blacklisted') {
        console.log('[ResponseEngine] Contact is blacklisted');
        return false;
      }

      // Check rate limiting (max 1 response per hour per number)
      const lastResponseTime = await this.getLastResponseTime(callEvent.callRecord.phoneNumber);
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      if (lastResponseTime && lastResponseTime > oneHourAgo) {
        console.log('[ResponseEngine] Rate limit exceeded');
        return false;
      }

      // Check if app is in emergency-only mode
      const appState = await this.getAppState();
      if (appState.currentMode === 'emergency_only') {
        const hasEmergency = await this.detectEmergencyKeywords(callEvent);
        if (!hasEmergency) {
          console.log('[ResponseEngine] Emergency-only mode, no emergency detected');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('[ResponseEngine] Error checking response rules:', error);
      return false;
    }
  }

  /**
   * Determine preferred messaging platform for contact
   */
  private getPreferredPlatform(contact?: Contact): MessagingPlatform {
    if (contact?.preferences?.preferredPlatform) {
      return contact.preferences.preferredPlatform;
    }
    
    // Check which services are available and enabled
    if (this.whatsappService.isServiceEnabled()) {
      return 'whatsapp';
    }
    
    if (this.viberService.isServiceEnabled()) {
      return 'viber';
    }
    
    if (this.telegramService.isServiceEnabled()) {
      return 'telegram';
    }
    
    // Default fallback
    return 'whatsapp';
  }

  /**
   * Detect emergency keywords in call context
   */
  private async detectEmergencyKeywords(callEvent: CallEvent): Promise<boolean> {
    try {
      // In a real implementation, this would:
      // 1. Check recent voicemails for emergency keywords
      // 2. Check SMS/message history
      // 3. Use speech-to-text on voicemails
      
      // For now, simulate emergency detection based on contact priority
      if (callEvent.contact?.priority === 'vip' && callEvent.contact.category === 'emergency') {
        return true;
      }

      // Check if multiple calls in short time (might indicate emergency)
      const recentCalls = await this.getRecentCallsFromNumber(
        callEvent.callRecord.phoneNumber, 
        15 * 60 * 1000 // 15 minutes
      );
      
      return recentCalls.length >= 3; // 3+ calls in 15 minutes = emergency
    } catch (error) {
      console.error('[ResponseEngine] Error detecting emergency keywords:', error);
      return false;
    }
  }

  /**
   * Prepare template variables with actual values
   */
  private async prepareTemplateVariables(
    callEvent: CallEvent, 
    appState: any
  ): Promise<Record<string, string>> {
    const variables: Record<string, string> = {};

    // Basic variables
    variables.customerName = callEvent.contact?.name || 'Уважаеми клиент';
    variables.technicianName = await this.getTechnicianName();
    variables.profession = await this.getProfession();
    variables.experience = await this.getExperience();
    variables.emergencyPhone = await this.getEmergencyPhone();
    variables.responseTime = this.getResponseTime(callEvent.contact);
    
    // Business hours
    const businessHours = appState.businessHours;
    if (businessHours.enabled && businessHours.schedule.monday) {
      variables.workHours = `${businessHours.schedule.monday.start} - ${businessHours.schedule.monday.end}`;
    } else {
      variables.workHours = '08:00 - 18:00';
    }

    // Job site specific
    variables.finishTime = await this.getEstimatedFinishTime();
    
    // Vacation specific
    variables.returnDate = await this.getReturnDate();
    variables.alternativeContact = await this.getAlternativeContact();
    variables.alternativePhone = await this.getAlternativePhone();
    
    // Service history
    if (callEvent.contact?.serviceHistory && callEvent.contact.serviceHistory.length > 0) {
      const lastService = callEvent.contact.serviceHistory[callEvent.contact.serviceHistory.length - 1];
      variables.lastService = lastService.description;
      variables.serviceDate = new Date(lastService.date).toLocaleDateString('bg-BG');
    }

    // Backup contact
    variables.backupContact = await this.getBackupContact();

    return variables;
  }

  /**
   * Get app state from storage
   */
  private async getAppState(): Promise<{
    businessHours: BusinessHours;
    currentMode: AppMode;
    emergencyMode: boolean;
  }> {
    try {
      const stored = await AsyncStorage.getItem('@ServiceTextPro:AppState');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('[ResponseEngine] Error getting app state:', error);
    }

    // Default state
    return {
      businessHours: {
        enabled: true,
        schedule: {
          monday: { start: '08:00', end: '18:00' },
          tuesday: { start: '08:00', end: '18:00' },
          wednesday: { start: '08:00', end: '18:00' },
          thursday: { start: '08:00', end: '18:00' },
          friday: { start: '08:00', end: '18:00' },
          saturday: { start: '09:00', end: '15:00' }
        },
        timezone: 'Europe/Sofia'
      },
      currentMode: 'normal',
      emergencyMode: false
    };
  }

  /**
   * Get last response time for a phone number
   */
  private async getLastResponseTime(phoneNumber: string): Promise<number | null> {
    try {
      const key = `@ServiceTextPro:LastResponse:${phoneNumber}`;
      const stored = await AsyncStorage.getItem(key);
      return stored ? parseInt(stored) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set last response time for a phone number
   */
  private async setLastResponseTime(phoneNumber: string): Promise<void> {
    try {
      const key = `@ServiceTextPro:LastResponse:${phoneNumber}`;
      await AsyncStorage.setItem(key, Date.now().toString());
    } catch (error) {
      console.error('[ResponseEngine] Error setting last response time:', error);
    }
  }

  /**
   * Get recent calls from a specific number
   */
  private async getRecentCallsFromNumber(phoneNumber: string, timeWindow: number): Promise<any[]> {
    // This would integrate with CallLogManager
    // For now, return empty array
    return [];
  }

  // Helper methods for template variables
  private async getTechnicianName(): Promise<string> {
    const stored = await AsyncStorage.getItem('@ServiceTextPro:TechnicianName');
    return stored || 'Майстор';
  }

  private async getProfession(): Promise<string> {
    const stored = await AsyncStorage.getItem('@ServiceTextPro:Profession');
    return stored || 'електротехник';
  }

  private async getExperience(): Promise<string> {
    const stored = await AsyncStorage.getItem('@ServiceTextPro:Experience');
    return stored || '5';
  }

  private async getEmergencyPhone(): Promise<string> {
    const stored = await AsyncStorage.getItem('@ServiceTextPro:EmergencyPhone');
    return stored || '+359888123456';
  }

  private getResponseTime(contact?: Contact): string {
    if (contact?.priority === 'vip') return '15 минути';
    if (contact?.priority === 'high') return '30 минути';
    return '1 час';
  }

  private async getEstimatedFinishTime(): Promise<string> {
    const now = new Date();
    const finishTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
    return finishTime.toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' });
  }

  private async getReturnDate(): Promise<string> {
    const stored = await AsyncStorage.getItem('@ServiceTextPro:VacationReturnDate');
    if (stored) {
      return new Date(stored).toLocaleDateString('bg-BG');
    }
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toLocaleDateString('bg-BG');
  }

  private async getAlternativeContact(): Promise<string> {
    const stored = await AsyncStorage.getItem('@ServiceTextPro:AlternativeContact');
    return stored || 'Колега Петров';
  }

  private async getAlternativePhone(): Promise<string> {
    const stored = await AsyncStorage.getItem('@ServiceTextPro:AlternativePhone');
    return stored || '+359887654321';
  }

  private async getBackupContact(): Promise<string> {
    const stored = await AsyncStorage.getItem('@ServiceTextPro:BackupContact');
    return stored || 'Партньор Георгиев - +359888999888';
  }

  /**
   * Get response statistics
   */
  public async getResponseStats(): Promise<{
    totalResponses: number;
    responsesByPlatform: Record<MessagingPlatform, number>;
    averageResponseTime: number;
    successRate: number;
  }> {
    // This would be implemented with proper analytics
    return {
      totalResponses: 0,
      responsesByPlatform: {
        whatsapp: 0,
        viber: 0,
        telegram: 0
      },
      averageResponseTime: 0,
      successRate: 0
    };
  }
}

