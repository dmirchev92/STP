import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  MessageRequest, 
  MessageResponse, 
  MessageStatus,
  MessageQueue,
  MessagingPlatform
} from '../utils/messagingTypes';
import { WhatsAppService } from './messaging/WhatsAppService';
import { ViberService } from './messaging/ViberService';
import { TelegramService } from './messaging/TelegramService';

/**
 * Message Queue Manager
 * Handles queuing, retry logic, and delivery of messages across all platforms
 */
export class MessageQueueManager {
  private static instance: MessageQueueManager;
  private readonly QUEUE_KEY = '@ServiceTextPro:MessageQueue';
  private readonly STATS_KEY = '@ServiceTextPro:MessageStats';
  private queue: MessageQueue = {
    pending: [],
    processing: [],
    failed: [],
    completed: []
  };
  private isProcessing: boolean = false;
  private whatsappService: WhatsAppService;
  private viberService: ViberService;
  private telegramService: TelegramService;

  private constructor() {
    this.whatsappService = new WhatsAppService();
    this.viberService = new ViberService();
    this.telegramService = new TelegramService();
  }

  public static getInstance(): MessageQueueManager {
    if (!MessageQueueManager.instance) {
      MessageQueueManager.instance = new MessageQueueManager();
    }
    return MessageQueueManager.instance;
  }

  /**
   * Initialize the message queue manager
   */
  async initialize(): Promise<void> {
    try {
      await this.loadQueue();
      
      // Start background processing
      this.startBackgroundProcessing();
      
      console.log('[MessageQueue] Initialized with', this.getTotalQueueSize(), 'messages');
    } catch (error) {
      console.error('[MessageQueue] Initialization error:', error);
    }
  }

  /**
   * Add message to queue
   */
  async enqueueMessage(message: MessageRequest): Promise<void> {
    try {
      // Add to pending queue
      this.queue.pending.push(message);
      
      // Sort by priority (urgent first)
      this.queue.pending.sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      await this.saveQueue();
      
      console.log(`[MessageQueue] Enqueued message ${message.id} for ${message.recipient} via ${message.platform}`);
    } catch (error) {
      console.error('[MessageQueue] Error enqueuing message:', error);
    }
  }

  /**
   * Process the message queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      console.log('[MessageQueue] Already processing, skipping');
      return;
    }

    this.isProcessing = true;

    try {
      console.log('[MessageQueue] Processing queue with', this.queue.pending.length, 'pending messages');

      // Process messages in batches to avoid overwhelming APIs
      const batchSize = 5;
      const batch = this.queue.pending.splice(0, batchSize);

      for (const message of batch) {
        await this.processMessage(message);
        
        // Small delay between messages to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Save queue state
      await this.saveQueue();

      // Retry failed messages
      await this.retryFailedMessages();

    } catch (error) {
      console.error('[MessageQueue] Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single message
   */
  private async processMessage(message: MessageRequest): Promise<void> {
    try {
      console.log(`[MessageQueue] Processing message ${message.id}`);

      // Move to processing queue
      this.queue.processing.push(message);

      // Get appropriate service
      const service = this.getServiceForPlatform(message.platform);
      if (!service || !service.isServiceEnabled()) {
        throw new Error(`${message.platform} service not available`);
      }

      // Send message
      const response = await service.sendMessage(message);

      // Handle response
      if (response.status === 'sent' || response.status === 'delivered') {
        // Success - move to completed
        this.moveMessageToCompleted(message, response);
        await this.updateStats(message.platform, 'success');
      } else {
        // Failed - handle retry or move to failed
        await this.handleFailedMessage(message, response);
      }

    } catch (error) {
      console.error(`[MessageQueue] Error processing message ${message.id}:`, error);
      
      const errorResponse: MessageResponse = {
        id: message.id,
        platform: message.platform,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      await this.handleFailedMessage(message, errorResponse);
    } finally {
      // Remove from processing queue
      this.queue.processing = this.queue.processing.filter(m => m.id !== message.id);
    }
  }

  /**
   * Handle failed message (retry or move to failed queue)
   */
  private async handleFailedMessage(message: MessageRequest, response: MessageResponse): Promise<void> {
    message.retryCount++;

    if (message.retryCount < message.maxRetries) {
      // Schedule retry
      const retryDelay = this.calculateRetryDelay(message.retryCount);
      message.scheduledAt = Date.now() + retryDelay;
      
      // Add back to pending queue for retry
      this.queue.pending.push(message);
      
      console.log(`[MessageQueue] Scheduling retry ${message.retryCount}/${message.maxRetries} for message ${message.id} in ${retryDelay}ms`);
    } else {
      // Max retries reached - move to failed
      this.queue.failed.push(message);
      await this.updateStats(message.platform, 'failed');
      
      console.error(`[MessageQueue] Message ${message.id} failed permanently after ${message.retryCount} retries`);
    }
  }

  /**
   * Move message to completed queue
   */
  private moveMessageToCompleted(message: MessageRequest, response: MessageResponse): void {
    this.queue.completed.push(message);
    
    // Keep only last 100 completed messages
    if (this.queue.completed.length > 100) {
      this.queue.completed = this.queue.completed.slice(-100);
    }
    
    console.log(`[MessageQueue] Message ${message.id} completed successfully`);
  }

  /**
   * Retry failed messages that are scheduled for retry
   */
  private async retryFailedMessages(): Promise<void> {
    const now = Date.now();
    const readyForRetry = this.queue.pending.filter(m => 
      m.scheduledAt && m.scheduledAt <= now && m.retryCount > 0
    );

    if (readyForRetry.length > 0) {
      console.log(`[MessageQueue] ${readyForRetry.length} messages ready for retry`);
      
      for (const message of readyForRetry) {
        message.scheduledAt = undefined; // Clear scheduled time
        await this.processMessage(message);
      }
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = 60000; // 1 minute
    const maxDelay = 15 * 60 * 1000; // 15 minutes
    
    const delay = Math.min(baseDelay * Math.pow(2, retryCount - 1), maxDelay);
    
    // Add some jitter to avoid thundering herd
    const jitter = Math.random() * 0.3 * delay;
    
    return delay + jitter;
  }

  /**
   * Get service instance for platform
   */
  private getServiceForPlatform(platform: MessagingPlatform) {
    switch (platform) {
      case 'whatsapp':
        return this.whatsappService;
      case 'viber':
        return this.viberService;
      case 'telegram':
        return this.telegramService;
      default:
        return null;
    }
  }

  /**
   * Start background processing
   */
  private startBackgroundProcessing(): void {
    // Process queue every 30 seconds
    setInterval(async () => {
      if (this.queue.pending.length > 0) {
        await this.processQueue();
      }
    }, 30000);

    // Clean up old completed/failed messages every hour
    setInterval(async () => {
      await this.cleanupOldMessages();
    }, 60 * 60 * 1000);
  }

  /**
   * Clean up old messages
   */
  private async cleanupOldMessages(): Promise<void> {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    // Remove old completed messages
    this.queue.completed = this.queue.completed.filter(m => m.createdAt > oneWeekAgo);
    
    // Remove old failed messages
    this.queue.failed = this.queue.failed.filter(m => m.createdAt > oneWeekAgo);
    
    await this.saveQueue();
    
    console.log('[MessageQueue] Cleaned up old messages');
  }

  /**
   * Load queue from storage
   */
  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[MessageQueue] Error loading queue:', error);
    }
  }

  /**
   * Save queue to storage
   */
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[MessageQueue] Error saving queue:', error);
    }
  }

  /**
   * Update message statistics
   */
  private async updateStats(platform: MessagingPlatform, outcome: 'success' | 'failed'): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STATS_KEY);
      const stats = stored ? JSON.parse(stored) : {};
      
      if (!stats[platform]) {
        stats[platform] = { sent: 0, failed: 0 };
      }
      
      if (outcome === 'success') {
        stats[platform].sent++;
      } else {
        stats[platform].failed++;
      }
      
      await AsyncStorage.setItem(this.STATS_KEY, JSON.stringify(stats));
    } catch (error) {
      console.error('[MessageQueue] Error updating stats:', error);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    totalProcessed: number;
  }> {
    return {
      pending: this.queue.pending.length,
      processing: this.queue.processing.length,
      completed: this.queue.completed.length,
      failed: this.queue.failed.length,
      totalProcessed: this.queue.completed.length + this.queue.failed.length
    };
  }

  /**
   * Get total queue size
   */
  private getTotalQueueSize(): number {
    return this.queue.pending.length + 
           this.queue.processing.length + 
           this.queue.completed.length + 
           this.queue.failed.length;
  }

  /**
   * Get message statistics by platform
   */
  async getMessageStats(): Promise<Record<MessagingPlatform, { sent: number; failed: number }>> {
    try {
      const stored = await AsyncStorage.getItem(this.STATS_KEY);
      return stored ? JSON.parse(stored) : {
        whatsapp: { sent: 0, failed: 0 },
        viber: { sent: 0, failed: 0 },
        telegram: { sent: 0, failed: 0 }
      };
    } catch (error) {
      console.error('[MessageQueue] Error getting message stats:', error);
      return {
        whatsapp: { sent: 0, failed: 0 },
        viber: { sent: 0, failed: 0 },
        telegram: { sent: 0, failed: 0 }
      };
    }
  }

  /**
   * Clear all queues (for testing/admin purposes)
   */
  async clearAllQueues(): Promise<void> {
    this.queue = {
      pending: [],
      processing: [],
      failed: [],
      completed: []
    };
    
    await this.saveQueue();
    console.log('[MessageQueue] All queues cleared');
  }

  /**
   * Get messages by status
   */
  getMessagesByStatus(status: keyof MessageQueue): MessageRequest[] {
    return [...this.queue[status]];
  }

  /**
   * Cancel a pending message
   */
  async cancelMessage(messageId: string): Promise<boolean> {
    const pendingIndex = this.queue.pending.findIndex(m => m.id === messageId);
    if (pendingIndex >= 0) {
      this.queue.pending.splice(pendingIndex, 1);
      await this.saveQueue();
      return true;
    }
    return false;
  }

  /**
   * Retry a failed message
   */
  async retryMessage(messageId: string): Promise<boolean> {
    const failedIndex = this.queue.failed.findIndex(m => m.id === messageId);
    if (failedIndex >= 0) {
      const message = this.queue.failed.splice(failedIndex, 1)[0];
      message.retryCount = 0; // Reset retry count
      this.queue.pending.push(message);
      await this.saveQueue();
      return true;
    }
    return false;
  }
}
