import axios, { AxiosInstance } from 'axios';
import { BaseMessagingService } from './BaseMessagingService';
import { 
  MessageRequest, 
  MessageResponse, 
  MessageStatus,
  ViberConfig,
  ConversationMessage,
  DeliveryReport
} from '../../utils/messagingTypes';

/**
 * Viber Business Messaging Service
 * Handles sending messages via Viber Business Messages API
 * Very popular in Bulgaria and Eastern Europe
 */
export class ViberService extends BaseMessagingService {
  private apiClient: AxiosInstance;
  private config: ViberConfig | null = null;
  private readonly baseURL = 'https://chatapi.viber.com/pa';

  constructor() {
    super('viber');
    this.apiClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Initialize Viber service with configuration
   */
  async initialize(config: ViberConfig): Promise<boolean> {
    try {
      this.config = config;
      
      // Set up API client with auth token
      this.apiClient.defaults.headers.common['X-Viber-Auth-Token'] = config.authToken;
      
      // Test the configuration by getting account info
      const isValid = await this.testConfiguration();
      
      this.isEnabled = isValid && config.enabled;
      
      if (this.isEnabled) {
        console.log('[Viber] Service initialized successfully');
      } else {
        console.warn('[Viber] Service initialization failed or disabled');
      }
      
      return this.isEnabled;
    } catch (error) {
      console.error('[Viber] Initialization error:', error);
      this.isEnabled = false;
      return false;
    }
  }

  /**
   * Test Viber API configuration
   */
  private async testConfiguration(): Promise<boolean> {
    if (!this.config) return false;

    try {
      const response = await this.apiClient.post(`${this.baseURL}/get_account_info`);
      
      if (response.data.status === 0) {
        console.log('[Viber] Account verified:', response.data);
        return true;
      } else {
        console.error('[Viber] Account verification failed:', response.data.status_message);
        return false;
      }
    } catch (error) {
      console.error('[Viber] Configuration test failed:', error);
      return false;
    }
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config && this.config.authToken && this.config.botName);
  }

  /**
   * Send message via Viber Business Messages API
   */
  async sendMessage(request: MessageRequest): Promise<MessageResponse> {
    if (!this.isServiceEnabled()) {
      return this.createErrorResponse(request.id, 'Viber service not configured or disabled');
    }

    try {
      const formattedNumber = this.formatPhoneNumber(request.recipient);
      
      // Check if number is valid
      if (!this.isValidBulgarianMobile(formattedNumber)) {
        return this.createErrorResponse(request.id, 'Invalid phone number format');
      }

      const messagePayload = {
        receiver: formattedNumber,
        type: 'text',
        text: request.content,
        sender: {
          name: this.config!.botName,
          avatar: this.config!.avatar || undefined
        },
        tracking_data: request.id // For tracking purposes
      };

      this.logMessage('outbound', request);

      const response = await this.apiClient.post(`${this.baseURL}/send_message`, messagePayload);

      if (response.data.status === 0) {
        const messageToken = response.data.message_token;
        const successResponse = this.createSuccessResponse(request.id, messageToken.toString());
        
        this.logMessage('outbound', request, successResponse);
        return successResponse;
      } else {
        throw new Error(`Viber API error: ${response.data.status_message}`);
      }

    } catch (error: any) {
      const errorMessage = this.extractErrorMessage(error);
      const errorResponse = this.createErrorResponse(request.id, errorMessage);
      
      // Handle rate limiting
      if (error.response?.status === 429) {
        errorResponse.retryAfter = 60000; // 1 minute default
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

    try {
      const formatted = this.formatPhoneNumber(phoneNumber);
      
      // Check if it's a valid Bulgarian mobile number
      if (!this.isValidBulgarianMobile(formatted)) {
        return false;
      }

      // Check if user has Viber installed (optional check)
      const response = await this.apiClient.post(`${this.baseURL}/get_user_details`, {
        id: formatted
      });

      return response.data.status === 0;
    } catch (error) {
      // If we can't check, assume we can send (Viber will handle delivery)
      return this.isValidBulgarianMobile(this.formatPhoneNumber(phoneNumber));
    }
  }

  /**
   * Get delivery status of a sent message
   */
  async getDeliveryStatus(messageId: string): Promise<MessageStatus> {
    if (!this.isServiceEnabled()) return 'failed';

    try {
      // Viber doesn't provide a direct API to check message status
      // Status updates come via webhooks
      return 'sent';
    } catch (error) {
      console.error('[Viber] Error getting delivery status:', error);
      return 'failed';
    }
  }

  /**
   * Handle incoming Viber webhook messages
   */
  async handleIncomingMessage(payload: any): Promise<ConversationMessage | null> {
    try {
      if (payload.event !== 'message') {
        return null;
      }

      const message = payload.message;
      const sender = payload.sender;

      return {
        id: payload.message_token?.toString() || `viber_${Date.now()}`,
        conversationId: `viber_${sender.id}`,
        platform: 'viber',
        sender: 'user',
        content: message.text || '[Media message]',
        timestamp: payload.timestamp,
        messageType: message.type === 'text' ? 'text' : 'image',
        metadata: {
          from: sender.id,
          user_name: sender.name,
          user_avatar: sender.avatar,
          message_type: message.type,
          tracking_data: message.tracking_data
        }
      };
    } catch (error) {
      console.error('[Viber] Error handling incoming message:', error);
      return null;
    }
  }

  /**
   * Validate Viber webhook signature
   */
  validateWebhook(payload: any, signature: string): boolean {
    if (!this.config?.authToken) return false;

    try {
      // Viber webhook validation
      // In production, you would verify the signature using HMAC-SHA256
      // with the auth token as the secret
      
      // For now, basic validation
      return payload.event && ['message', 'delivered', 'seen', 'failed'].includes(payload.event);
    } catch (error) {
      console.error('[Viber] Webhook validation error:', error);
      return false;
    }
  }

  /**
   * Get Viber message format limits
   */
  getMessageLimits() {
    return {
      maxLength: 7000, // Viber text message limit
      supportsFormatting: false, // Limited formatting support
      supportsMedia: true
    };
  }

  /**
   * Parse delivery report from webhook
   */
  parseDeliveryReport(payload: any): DeliveryReport | null {
    try {
      if (!['delivered', 'seen', 'failed'].includes(payload.event)) {
        return null;
      }

      return {
        messageId: payload.message_token?.toString() || '',
        platform: 'viber',
        recipient: payload.user_id,
        status: this.mapViberStatus(payload.event),
        timestamp: payload.timestamp
      };
    } catch (error) {
      console.error('[Viber] Error parsing delivery report:', error);
      return null;
    }
  }

  /**
   * Map Viber event to our internal status
   */
  private mapViberStatus(viberEvent: string): MessageStatus {
    switch (viberEvent) {
      case 'delivered': return 'delivered';
      case 'seen': return 'read';
      case 'failed': return 'failed';
      default: return 'sent';
    }
  }

  /**
   * Extract error message from API response
   */
  private extractErrorMessage(error: any): string {
    if (error.response?.data?.status_message) {
      return error.response.data.status_message;
    }
    
    if (error.response?.data?.status && error.response.data.status !== 0) {
      return `Viber API error code: ${error.response.data.status}`;
    }

    return error.message || 'Unknown Viber API error';
  }

  /**
   * Set webhook URL for receiving messages
   */
  async setWebhook(webhookUrl: string): Promise<boolean> {
    if (!this.isServiceEnabled()) return false;

    try {
      const response = await this.apiClient.post(`${this.baseURL}/set_webhook`, {
        url: webhookUrl,
        event_types: ['delivered', 'seen', 'failed', 'subscribed', 'unsubscribed', 'conversation_started']
      });

      return response.data.status === 0;
    } catch (error) {
      console.error('[Viber] Error setting webhook:', error);
      return false;
    }
  }

  /**
   * Send rich media message (for future use)
   */
  async sendRichMessage(
    recipient: string,
    messageType: 'picture' | 'video' | 'file',
    mediaUrl: string,
    caption?: string
  ): Promise<MessageResponse> {
    if (!this.isServiceEnabled()) {
      return this.createErrorResponse('rich', 'Viber service not configured');
    }

    try {
      const formattedNumber = this.formatPhoneNumber(recipient);
      
      const messagePayload = {
        receiver: formattedNumber,
        type: messageType,
        media: mediaUrl,
        text: caption,
        sender: {
          name: this.config!.botName,
          avatar: this.config!.avatar || undefined
        }
      };

      const response = await this.apiClient.post(`${this.baseURL}/send_message`, messagePayload);

      if (response.data.status === 0) {
        return this.createSuccessResponse('rich', response.data.message_token.toString());
      } else {
        throw new Error(`Viber API error: ${response.data.status_message}`);
      }

    } catch (error: any) {
      return this.createErrorResponse('rich', this.extractErrorMessage(error));
    }
  }

  /**
   * Get user details (for contact enrichment)
   */
  async getUserDetails(userId: string): Promise<any> {
    if (!this.isServiceEnabled()) return null;

    try {
      const response = await this.apiClient.post(`${this.baseURL}/get_user_details`, {
        id: userId
      });

      if (response.data.status === 0) {
        return response.data.user;
      }
      
      return null;
    } catch (error) {
      console.error('[Viber] Error getting user details:', error);
      return null;
    }
  }
}
