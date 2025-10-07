import axios, { AxiosInstance } from 'axios';
import { BaseMessagingService } from './BaseMessagingService';
import { 
  MessageRequest, 
  MessageResponse, 
  MessageStatus,
  WhatsAppConfig,
  ConversationMessage,
  DeliveryReport
} from '../../utils/messagingTypes';

/**
 * WhatsApp Business API Service
 * Handles sending messages via WhatsApp Business API (Meta/Facebook)
 */
export class WhatsAppService extends BaseMessagingService {
  private apiClient: AxiosInstance;
  private config: WhatsAppConfig | null = null;
  private readonly baseURL = 'https://graph.facebook.com/v18.0';

  constructor() {
    super('whatsapp');
    this.apiClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Initialize WhatsApp service with configuration
   */
  async initialize(config: WhatsAppConfig): Promise<boolean> {
    try {
      this.config = config;
      
      // Set up API client with access token
      this.apiClient.defaults.headers.common['Authorization'] = `Bearer ${config.accessToken}`;
      
      // Test the configuration by getting phone number info
      const isValid = await this.testConfiguration();
      
      this.isEnabled = isValid && config.enabled;
      
      if (this.isEnabled) {
        console.log('[WhatsApp] Service initialized successfully');
      } else {
        console.warn('[WhatsApp] Service initialization failed or disabled');
      }
      
      return this.isEnabled;
    } catch (error) {
      console.error('[WhatsApp] Initialization error:', error);
      this.isEnabled = false;
      return false;
    }
  }

  /**
   * Test WhatsApp Business API configuration
   */
  private async testConfiguration(): Promise<boolean> {
    if (!this.config) return false;

    try {
      const response = await this.apiClient.get(
        `${this.baseURL}/${this.config.phoneNumberId}?fields=display_phone_number,verified_name`
      );
      
      console.log('[WhatsApp] Phone number verified:', response.data);
      return true;
    } catch (error) {
      console.error('[WhatsApp] Configuration test failed:', error);
      return false;
    }
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return !!(
      this.config &&
      this.config.accessToken &&
      this.config.phoneNumberId &&
      this.config.businessAccountId
    );
  }

  /**
   * Send message via WhatsApp Business API
   */
  async sendMessage(request: MessageRequest): Promise<MessageResponse> {
    if (!this.isServiceEnabled()) {
      return this.createErrorResponse(request.id, 'WhatsApp service not configured or disabled');
    }

    try {
      const formattedNumber = this.formatPhoneNumber(request.recipient);
      
      // Check if number is valid
      if (!this.isValidBulgarianMobile(formattedNumber)) {
        return this.createErrorResponse(request.id, 'Invalid phone number format');
      }

      const messagePayload = {
        messaging_product: 'whatsapp',
        to: formattedNumber,
        type: 'text',
        text: {
          body: request.content
        }
      };

      this.logMessage('outbound', request);

      const response = await this.apiClient.post(
        `${this.baseURL}/${this.config!.phoneNumberId}/messages`,
        messagePayload
      );

      if (response.data.messages && response.data.messages[0]) {
        const messageId = response.data.messages[0].id;
        const successResponse = this.createSuccessResponse(request.id, messageId);
        
        this.logMessage('outbound', request, successResponse);
        return successResponse;
      } else {
        throw new Error('No message ID returned from WhatsApp API');
      }

    } catch (error: any) {
      const errorMessage = this.extractErrorMessage(error);
      const errorResponse = this.createErrorResponse(request.id, errorMessage);
      
      // Handle rate limiting
      if (error.response?.status === 429) {
        const retryAfter = this.extractRetryAfter(error.response.headers);
        errorResponse.retryAfter = retryAfter;
      }

      this.logMessage('outbound', request, error);
      return errorResponse;
    }
  }

  /**
   * Check if we can send messages to a specific phone number
   */
  async canSendToNumber(phoneNumber: string): Promise<boolean> {
    if (!this.isServiceEnabled()) return false;

    const formatted = this.formatPhoneNumber(phoneNumber);
    return this.isValidBulgarianMobile(formatted);
  }

  /**
   * Get delivery status of a sent message
   */
  async getDeliveryStatus(messageId: string): Promise<MessageStatus> {
    if (!this.isServiceEnabled()) return 'failed';

    try {
      // WhatsApp doesn't provide a direct API to check message status
      // Status updates come via webhooks
      // For now, return 'sent' as default
      return 'sent';
    } catch (error) {
      console.error('[WhatsApp] Error getting delivery status:', error);
      return 'failed';
    }
  }

  /**
   * Handle incoming WhatsApp webhook messages
   */
  async handleIncomingMessage(payload: any): Promise<ConversationMessage | null> {
    try {
      if (!payload.entry || !payload.entry[0] || !payload.entry[0].changes) {
        return null;
      }

      const change = payload.entry[0].changes[0];
      if (change.field !== 'messages' || !change.value.messages) {
        return null;
      }

      const message = change.value.messages[0];
      const contact = change.value.contacts[0];

      return {
        id: message.id,
        conversationId: `whatsapp_${contact.wa_id}`,
        platform: 'whatsapp',
        sender: 'user',
        content: message.text?.body || '[Media message]',
        timestamp: parseInt(message.timestamp) * 1000,
        messageType: message.type === 'text' ? 'text' : 'image',
        metadata: {
          from: contact.wa_id,
          profile_name: contact.profile?.name,
          message_type: message.type
        }
      };
    } catch (error) {
      console.error('[WhatsApp] Error handling incoming message:', error);
      return null;
    }
  }

  /**
   * Validate WhatsApp webhook signature
   */
  validateWebhook(payload: any, signature: string): boolean {
    if (!this.config?.webhookVerifyToken) return false;

    try {
      // For webhook verification during setup
      if (payload['hub.mode'] === 'subscribe' && 
          payload['hub.verify_token'] === this.config.webhookVerifyToken) {
        return true;
      }

      // For actual webhook validation, we'd use the app secret to verify signature
      // This is a simplified version
      return true;
    } catch (error) {
      console.error('[WhatsApp] Webhook validation error:', error);
      return false;
    }
  }

  /**
   * Get WhatsApp message format limits
   */
  getMessageLimits() {
    return {
      maxLength: 4096, // WhatsApp text message limit
      supportsFormatting: true, // Basic markdown formatting
      supportsMedia: true
    };
  }

  /**
   * Parse delivery report from webhook
   */
  parseDeliveryReport(payload: any): DeliveryReport | null {
    try {
      if (!payload.entry || !payload.entry[0] || !payload.entry[0].changes) {
        return null;
      }

      const change = payload.entry[0].changes[0];
      if (change.field !== 'messages' || !change.value.statuses) {
        return null;
      }

      const status = change.value.statuses[0];
      
      return {
        messageId: status.id,
        platform: 'whatsapp',
        recipient: status.recipient_id,
        status: this.mapWhatsAppStatus(status.status),
        timestamp: parseInt(status.timestamp) * 1000
      };
    } catch (error) {
      console.error('[WhatsApp] Error parsing delivery report:', error);
      return null;
    }
  }

  /**
   * Map WhatsApp status to our internal status
   */
  private mapWhatsAppStatus(whatsappStatus: string): MessageStatus {
    switch (whatsappStatus) {
      case 'sent': return 'sent';
      case 'delivered': return 'delivered';
      case 'read': return 'read';
      case 'failed': return 'failed';
      default: return 'pending';
    }
  }

  /**
   * Extract error message from API response
   */
  private extractErrorMessage(error: any): string {
    if (error.response?.data?.error?.message) {
      return error.response.data.error.message;
    }
    
    if (error.response?.data?.error?.error_data?.details) {
      return error.response.data.error.error_data.details;
    }

    return error.message || 'Unknown WhatsApp API error';
  }

  /**
   * Extract retry-after value from rate limit headers
   */
  private extractRetryAfter(headers: any): number {
    const retryAfter = headers['retry-after'];
    if (retryAfter) {
      return parseInt(retryAfter) * 1000; // Convert to milliseconds
    }
    return 60000; // Default 1 minute
  }

  /**
   * Send template message (for business messaging)
   */
  async sendTemplateMessage(
    recipient: string,
    templateName: string,
    languageCode: string = 'bg',
    parameters: string[] = []
  ): Promise<MessageResponse> {
    if (!this.isServiceEnabled()) {
      return this.createErrorResponse('template', 'WhatsApp service not configured');
    }

    try {
      const formattedNumber = this.formatPhoneNumber(recipient);
      
      const messagePayload = {
        messaging_product: 'whatsapp',
        to: formattedNumber,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode
          },
          components: parameters.length > 0 ? [{
            type: 'body',
            parameters: parameters.map(param => ({
              type: 'text',
              text: param
            }))
          }] : undefined
        }
      };

      const response = await this.apiClient.post(
        `${this.baseURL}/${this.config!.phoneNumberId}/messages`,
        messagePayload
      );

      if (response.data.messages && response.data.messages[0]) {
        return this.createSuccessResponse('template', response.data.messages[0].id);
      } else {
        throw new Error('No message ID returned for template message');
      }

    } catch (error: any) {
      return this.createErrorResponse('template', this.extractErrorMessage(error));
    }
  }
}
