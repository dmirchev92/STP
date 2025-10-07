import axios, { AxiosInstance } from 'axios';
import { BaseMessagingService } from './BaseMessagingService';
import { 
  MessageRequest, 
  MessageResponse, 
  MessageStatus,
  TelegramConfig,
  ConversationMessage,
  DeliveryReport
} from '../../utils/messagingTypes';

/**
 * Telegram Bot API Service
 * Handles sending messages via Telegram Bot API
 * Alternative platform for customers who prefer Telegram
 */
export class TelegramService extends BaseMessagingService {
  private apiClient: AxiosInstance;
  private config: TelegramConfig | null = null;
  private readonly baseURL = 'https://api.telegram.org/bot';

  constructor() {
    super('telegram');
    this.apiClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Initialize Telegram service with configuration
   */
  async initialize(config: TelegramConfig): Promise<boolean> {
    try {
      this.config = config;
      
      // Test the configuration by getting bot info
      const isValid = await this.testConfiguration();
      
      this.isEnabled = isValid && config.enabled;
      
      if (this.isEnabled) {
        console.log('[Telegram] Service initialized successfully');
      } else {
        console.warn('[Telegram] Service initialization failed or disabled');
      }
      
      return this.isEnabled;
    } catch (error) {
      console.error('[Telegram] Initialization error:', error);
      this.isEnabled = false;
      return false;
    }
  }

  /**
   * Test Telegram Bot API configuration
   */
  private async testConfiguration(): Promise<boolean> {
    if (!this.config) return false;

    try {
      const response = await this.apiClient.get(
        `${this.baseURL}${this.config.botToken}/getMe`
      );
      
      if (response.data.ok) {
        console.log('[Telegram] Bot verified:', response.data.result);
        return true;
      } else {
        console.error('[Telegram] Bot verification failed:', response.data.description);
        return false;
      }
    } catch (error) {
      console.error('[Telegram] Configuration test failed:', error);
      return false;
    }
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config && this.config.botToken && this.config.botUsername);
  }

  /**
   * Send message via Telegram Bot API
   */
  async sendMessage(request: MessageRequest): Promise<MessageResponse> {
    if (!this.isServiceEnabled()) {
      return this.createErrorResponse(request.id, 'Telegram service not configured or disabled');
    }

    try {
      // For Telegram, recipient should be a chat_id or username
      // In our case, we'll need to map phone numbers to Telegram chat_ids
      const chatId = await this.getChatIdFromPhone(request.recipient);
      
      if (!chatId) {
        return this.createErrorResponse(request.id, 'Unable to find Telegram chat for this phone number');
      }

      const messagePayload = {
        chat_id: chatId,
        text: request.content,
        parse_mode: 'HTML', // Support basic HTML formatting
        disable_web_page_preview: true
      };

      this.logMessage('outbound', request);

      const response = await this.apiClient.post(
        `${this.baseURL}${this.config!.botToken}/sendMessage`,
        messagePayload
      );

      if (response.data.ok) {
        const messageId = response.data.result.message_id.toString();
        const successResponse = this.createSuccessResponse(request.id, messageId);
        
        this.logMessage('outbound', request, successResponse);
        return successResponse;
      } else {
        throw new Error(`Telegram API error: ${response.data.description}`);
      }

    } catch (error: any) {
      const errorMessage = this.extractErrorMessage(error);
      const errorResponse = this.createErrorResponse(request.id, errorMessage);
      
      // Handle rate limiting
      if (error.response?.status === 429) {
        const retryAfter = this.extractRetryAfter(error.response.data);
        errorResponse.retryAfter = retryAfter;
      }

      this.logMessage('outbound', request, error);
      return errorResponse;
    }
  }

  /**
   * Map phone number to Telegram chat_id
   * This would typically be stored in a database mapping
   */
  private async getChatIdFromPhone(phoneNumber: string): Promise<string | null> {
    // In a real implementation, this would:
    // 1. Look up the phone number in a database mapping
    // 2. The mapping would be created when users start a conversation with the bot
    // 3. Or use Telegram's contact sharing features
    
    // For demo purposes, we'll return a placeholder
    // In production, you'd need to implement proper phone-to-chat_id mapping
    console.warn('[Telegram] Phone to chat_id mapping not implemented. Using demo chat_id.');
    
    // This would be a real chat_id from your database
    return null; // Return null to indicate we can't send to this number
  }

  /**
   * Check if we can send messages to a specific phone number
   */
  async canSendToNumber(phoneNumber: string): Promise<boolean> {
    if (!this.isServiceEnabled()) return false;

    // Check if we have a chat_id mapping for this phone number
    const chatId = await this.getChatIdFromPhone(phoneNumber);
    return chatId !== null;
  }

  /**
   * Get delivery status of a sent message
   */
  async getDeliveryStatus(messageId: string): Promise<MessageStatus> {
    if (!this.isServiceEnabled()) return 'failed';

    try {
      // Telegram doesn't provide delivery/read receipts like WhatsApp
      // Messages are considered delivered if they were sent successfully
      return 'delivered';
    } catch (error) {
      console.error('[Telegram] Error getting delivery status:', error);
      return 'failed';
    }
  }

  /**
   * Handle incoming Telegram webhook messages
   */
  async handleIncomingMessage(payload: any): Promise<ConversationMessage | null> {
    try {
      if (!payload.message) {
        return null;
      }

      const message = payload.message;
      const from = message.from;

      return {
        id: message.message_id.toString(),
        conversationId: `telegram_${message.chat.id}`,
        platform: 'telegram',
        sender: 'user',
        content: message.text || '[Media message]',
        timestamp: message.date * 1000, // Convert to milliseconds
        messageType: message.text ? 'text' : 'image',
        metadata: {
          chat_id: message.chat.id,
          user_id: from.id,
          username: from.username,
          first_name: from.first_name,
          last_name: from.last_name,
          message_type: message.text ? 'text' : (message.photo ? 'photo' : 'other')
        }
      };
    } catch (error) {
      console.error('[Telegram] Error handling incoming message:', error);
      return null;
    }
  }

  /**
   * Validate Telegram webhook
   */
  validateWebhook(payload: any, signature: string): boolean {
    if (!this.config?.botToken) return false;

    try {
      // Basic validation - check if it looks like a Telegram update
      return payload.update_id !== undefined;
    } catch (error) {
      console.error('[Telegram] Webhook validation error:', error);
      return false;
    }
  }

  /**
   * Get Telegram message format limits
   */
  getMessageLimits() {
    return {
      maxLength: 4096, // Telegram text message limit
      supportsFormatting: true, // HTML and Markdown formatting
      supportsMedia: true
    };
  }

  /**
   * Parse delivery report from webhook (Telegram doesn't provide these)
   */
  parseDeliveryReport(payload: any): DeliveryReport | null {
    // Telegram doesn't send delivery reports via webhooks
    return null;
  }

  /**
   * Extract error message from API response
   */
  private extractErrorMessage(error: any): string {
    if (error.response?.data?.description) {
      return error.response.data.description;
    }
    
    if (error.response?.data?.error_code) {
      return `Telegram API error code: ${error.response.data.error_code}`;
    }

    return error.message || 'Unknown Telegram API error';
  }

  /**
   * Extract retry-after value from rate limit response
   */
  private extractRetryAfter(data: any): number {
    if (data.parameters && data.parameters.retry_after) {
      return data.parameters.retry_after * 1000; // Convert to milliseconds
    }
    return 60000; // Default 1 minute
  }

  /**
   * Set webhook URL for receiving messages
   */
  async setWebhook(webhookUrl: string): Promise<boolean> {
    if (!this.isServiceEnabled()) return false;

    try {
      const response = await this.apiClient.post(
        `${this.baseURL}${this.config!.botToken}/setWebhook`,
        {
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query']
        }
      );

      return response.data.ok;
    } catch (error) {
      console.error('[Telegram] Error setting webhook:', error);
      return false;
    }
  }

  /**
   * Send message with inline keyboard (for interactive responses)
   */
  async sendMessageWithKeyboard(
    chatId: string,
    text: string,
    keyboard: any[][]
  ): Promise<MessageResponse> {
    if (!this.isServiceEnabled()) {
      return this.createErrorResponse('keyboard', 'Telegram service not configured');
    }

    try {
      const messagePayload = {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        }
      };

      const response = await this.apiClient.post(
        `${this.baseURL}${this.config!.botToken}/sendMessage`,
        messagePayload
      );

      if (response.data.ok) {
        return this.createSuccessResponse('keyboard', response.data.result.message_id.toString());
      } else {
        throw new Error(`Telegram API error: ${response.data.description}`);
      }

    } catch (error: any) {
      return this.createErrorResponse('keyboard', this.extractErrorMessage(error));
    }
  }

  /**
   * Send location message
   */
  async sendLocation(
    chatId: string,
    latitude: number,
    longitude: number,
    title?: string
  ): Promise<MessageResponse> {
    if (!this.isServiceEnabled()) {
      return this.createErrorResponse('location', 'Telegram service not configured');
    }

    try {
      const messagePayload = {
        chat_id: chatId,
        latitude: latitude,
        longitude: longitude,
        title: title
      };

      const response = await this.apiClient.post(
        `${this.baseURL}${this.config!.botToken}/sendLocation`,
        messagePayload
      );

      if (response.data.ok) {
        return this.createSuccessResponse('location', response.data.result.message_id.toString());
      } else {
        throw new Error(`Telegram API error: ${response.data.description}`);
      }

    } catch (error: any) {
      return this.createErrorResponse('location', this.extractErrorMessage(error));
    }
  }

  /**
   * Get chat information
   */
  async getChatInfo(chatId: string): Promise<any> {
    if (!this.isServiceEnabled()) return null;

    try {
      const response = await this.apiClient.get(
        `${this.baseURL}${this.config!.botToken}/getChat?chat_id=${chatId}`
      );

      if (response.data.ok) {
        return response.data.result;
      }
      
      return null;
    } catch (error) {
      console.error('[Telegram] Error getting chat info:', error);
      return null;
    }
  }
}
