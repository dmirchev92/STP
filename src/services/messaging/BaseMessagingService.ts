import { 
  MessageRequest, 
  MessageResponse, 
  MessagingPlatform, 
  MessageStatus,
  ConversationMessage,
  DeliveryReport 
} from '../../utils/messagingTypes';

/**
 * Base abstract class for all messaging platform services
 * Defines the common interface that WhatsApp, Viber, and Telegram services must implement
 */
export abstract class BaseMessagingService {
  protected platform: MessagingPlatform;
  protected isEnabled: boolean = false;
  protected config: any;

  constructor(platform: MessagingPlatform) {
    this.platform = platform;
  }

  /**
   * Initialize the messaging service with configuration
   */
  abstract initialize(config: any): Promise<boolean>;

  /**
   * Send a message to a recipient
   */
  abstract sendMessage(request: MessageRequest): Promise<MessageResponse>;

  /**
   * Check if the service is properly configured and ready
   */
  abstract isConfigured(): boolean;

  /**
   * Verify that a phone number can receive messages on this platform
   */
  abstract canSendToNumber(phoneNumber: string): Promise<boolean>;

  /**
   * Get delivery status of a sent message
   */
  abstract getDeliveryStatus(messageId: string): Promise<MessageStatus>;

  /**
   * Handle incoming webhook messages (for two-way communication)
   */
  abstract handleIncomingMessage(payload: any): Promise<ConversationMessage | null>;

  /**
   * Validate webhook signature/authenticity
   */
  abstract validateWebhook(payload: any, signature: string): boolean;

  /**
   * Get platform-specific message format limits
   */
  abstract getMessageLimits(): {
    maxLength: number;
    supportsFormatting: boolean;
    supportsMedia: boolean;
  };

  /**
   * Get platform name
   */
  getPlatform(): MessagingPlatform {
    return this.platform;
  }

  /**
   * Check if service is enabled
   */
  isServiceEnabled(): boolean {
    return this.isEnabled && this.isConfigured();
  }

  /**
   * Enable/disable the service
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Format phone number for this platform
   */
  protected formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except +
    let formatted = phoneNumber.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +
    if (!formatted.startsWith('+')) {
      // Assume Bulgarian number if no country code
      if (formatted.startsWith('0')) {
        formatted = '+359' + formatted.substring(1);
      } else if (formatted.startsWith('359')) {
        formatted = '+' + formatted;
      } else {
        formatted = '+359' + formatted;
      }
    }
    
    return formatted;
  }

  /**
   * Check if phone number is valid Bulgarian mobile
   */
  protected isValidBulgarianMobile(phoneNumber: string): boolean {
    const formatted = this.formatPhoneNumber(phoneNumber);
    // Bulgarian mobile numbers: +359 8X XXX XXXX or +359 9X XXX XXXX
    const bulgarianMobileRegex = /^\+359[89]\d{8}$/;
    return bulgarianMobileRegex.test(formatted);
  }

  /**
   * Log message activity
   */
  protected logMessage(
    direction: 'outbound' | 'inbound',
    request: MessageRequest | ConversationMessage,
    response?: MessageResponse | Error
  ): void {
    const timestamp = new Date().toISOString();
    console.log(`[${this.platform.toUpperCase()}] ${direction} ${timestamp}:`, {
      request,
      response: response instanceof Error ? response.message : response
    });
  }

  /**
   * Handle rate limiting
   */
  protected async handleRateLimit(retryAfter: number): Promise<void> {
    console.warn(`[${this.platform.toUpperCase()}] Rate limited. Retrying after ${retryAfter}ms`);
    await new Promise(resolve => setTimeout(resolve, retryAfter));
  }

  /**
   * Generate unique message ID
   */
  protected generateMessageId(): string {
    return `${this.platform}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create error response
   */
  protected createErrorResponse(
    requestId: string, 
    error: string, 
    retryAfter?: number
  ): MessageResponse {
    return {
      id: requestId,
      platform: this.platform,
      status: 'failed',
      error,
      retryAfter
    };
  }

  /**
   * Create success response
   */
  protected createSuccessResponse(
    requestId: string, 
    messageId: string, 
    status: MessageStatus = 'sent'
  ): MessageResponse {
    return {
      id: requestId,
      platform: this.platform,
      status,
      messageId,
      deliveredAt: status === 'delivered' ? Date.now() : undefined
    };
  }

  /**
   * Parse delivery report webhook
   */
  abstract parseDeliveryReport(payload: any): DeliveryReport | null;

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    platform: MessagingPlatform;
    isHealthy: boolean;
    lastChecked: number;
    error?: string;
  }> {
    try {
      const isHealthy = this.isServiceEnabled();
      return {
        platform: this.platform,
        isHealthy,
        lastChecked: Date.now()
      };
    } catch (error) {
      return {
        platform: this.platform,
        isHealthy: false,
        lastChecked: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
