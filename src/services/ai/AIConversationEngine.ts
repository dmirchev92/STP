import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AIConversation,
  AIMessage,
  AIResponseContext,
  BusinessContext,
  BulgarianNLPConfig
} from '../../utils/aiTypes';
import { CallEvent } from '../../utils/types';
import { BulgarianNLPProcessor } from './BulgarianNLPProcessor';
import { ConversationFlowManager } from './ConversationFlowManager';
import { IssueAnalyzer } from './IssueAnalyzer';
import { ResponseGenerator } from './ResponseGenerator';
import { MessageQueueManager } from '../MessageQueueManager';
import { MessageRequest } from '../../utils/messagingTypes';

/**
 * AI Conversation Engine - Main orchestrator
 * Handles the complete AI conversation flow with Bulgarian NLP
 */
export class AIConversationEngine {
  private static instance: AIConversationEngine;
  private nlpProcessor: BulgarianNLPProcessor;
  private conversationManager: ConversationFlowManager;
  private issueAnalyzer: IssueAnalyzer;
  private responseGenerator: ResponseGenerator;
  private messageQueue: MessageQueueManager;
  private isInitialized: boolean = false;

  private constructor() {
    this.nlpProcessor = BulgarianNLPProcessor.getInstance();
    this.conversationManager = ConversationFlowManager.getInstance();
    this.issueAnalyzer = IssueAnalyzer.getInstance();
    this.responseGenerator = ResponseGenerator.getInstance();
    this.messageQueue = MessageQueueManager.getInstance();
  }

  public static getInstance(): AIConversationEngine {
    if (!AIConversationEngine.instance) {
      AIConversationEngine.instance = new AIConversationEngine();
    }
    return AIConversationEngine.instance;
  }

  /**
   * Initialize the AI Conversation Engine
   */
  async initialize(config?: {
    nlpConfig?: BulgarianNLPConfig;
    businessContext?: BusinessContext;
  }): Promise<boolean> {
    try {
      console.log('[AIConversationEngine] Initializing...');

      // Initialize NLP processor
      await this.nlpProcessor.initialize(config?.nlpConfig);

      // Load existing conversations
      await this.conversationManager.loadConversations();

      // Store business context if provided
      if (config?.businessContext) {
        await this.storeBusinessContext(config.businessContext);
      }

      this.isInitialized = true;
      console.log('[AIConversationEngine] Initialization complete');
      return true;

    } catch (error) {
      console.error('[AIConversationEngine] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Start AI conversation from a missed call event
   */
  async startConversationFromCall(callEvent: CallEvent): Promise<{
    conversation: AIConversation;
    initialMessage: string;
    success: boolean;
  }> {
    try {
      if (!this.isInitialized) {
        throw new Error('AI Conversation Engine not initialized');
      }

      console.log(`[AIConversationEngine] Starting conversation for call ${callEvent.id}`);

      // Determine platform preference
      const platform = callEvent.contact?.preferences?.preferredPlatform || 'whatsapp';

      // Start conversation
      const conversation = await this.conversationManager.startConversation(
        callEvent.callRecord.phoneNumber,
        platform,
        callEvent.contact?.id
      );

      // Generate initial message
      const businessContext = await this.getBusinessContext();
      const initialContext: AIResponseContext = {
        conversation,
        lastCustomerMessage: {
          id: 'initial',
          conversationId: conversation.id,
          sender: 'customer',
          content: 'Initial call',
          timestamp: Date.now(),
          messageType: 'text',
          language: 'bg'
        },
        analysisResults: conversation.analysis,
        businessContext
      };

      const response = await this.responseGenerator.generateResponse(initialContext);

      // Create initial AI message
      const aiMessage: AIMessage = {
        id: `ai_${Date.now()}`,
        conversationId: conversation.id,
        sender: 'ai',
        content: response.content,
        timestamp: Date.now(),
        messageType: 'text',
        language: 'bg'
      };

      conversation.messages.push(aiMessage);
      conversation.currentState = response.nextState;

      // Queue message for sending
      const messageRequest: MessageRequest = {
        id: `ai_response_${conversation.id}_${Date.now()}`,
        platform: conversation.platform,
        recipient: conversation.phoneNumber,
        content: response.content,
        priority: 'normal',
        retryCount: 0,
        maxRetries: 3,
        createdAt: Date.now()
      };

      await this.messageQueue.enqueueMessage(messageRequest);

      console.log(`[AIConversationEngine] Started conversation ${conversation.id}`);

      return {
        conversation,
        initialMessage: response.content,
        success: true
      };

    } catch (error) {
      console.error('[AIConversationEngine] Error starting conversation:', error);
      return {
        conversation: null as any,
        initialMessage: '',
        success: false
      };
    }
  }

  /**
   * Process incoming customer message in AI conversation
   */
  async processIncomingMessage(
    conversationId: string,
    messageContent: string,
    messageType: 'text' | 'image' | 'location' = 'text'
  ): Promise<{
    aiResponse?: string;
    conversationComplete: boolean;
    shouldEscalate: boolean;
    analysis?: any;
    success: boolean;
  }> {
    try {
      if (!this.isInitialized) {
        throw new Error('AI Conversation Engine not initialized');
      }

      console.log(`[AIConversationEngine] Processing message in conversation ${conversationId}`);

      // Process message through conversation manager
      const result = await this.conversationManager.processCustomerMessage(
        conversationId,
        messageContent,
        messageType
      );

      if (result.shouldEscalate) {
        console.log(`[AIConversationEngine] Escalating conversation ${conversationId}`);
        return {
          conversationComplete: false,
          shouldEscalate: true,
          success: true
        };
      }

      // Analyze conversation
      const analysis = await this.issueAnalyzer.analyzeConversation(result.conversation);
      result.conversation.analysis = analysis;

      let aiResponse: string | undefined;

      // Generate AI response if conversation is not complete
      if (!result.isComplete && result.nextQuestion) {
        const businessContext = await this.getBusinessContext();
        
        const responseContext: AIResponseContext = {
          conversation: result.conversation,
          lastCustomerMessage: result.conversation.messages[result.conversation.messages.length - 1],
          analysisResults: analysis,
          businessContext
        };

        const generatedResponse = await this.responseGenerator.generateResponse(responseContext);
        aiResponse = generatedResponse.content;

        // Create AI message
        const aiMessage: AIMessage = {
          id: `ai_${Date.now()}`,
          conversationId: result.conversation.id,
          sender: 'ai',
          content: aiResponse,
          timestamp: Date.now(),
          messageType: 'text',
          language: 'bg'
        };

        result.conversation.messages.push(aiMessage);
        result.conversation.currentState = generatedResponse.nextState;

        // Queue AI response for sending
        const messageRequest: MessageRequest = {
          id: `ai_response_${conversationId}_${Date.now()}`,
          platform: result.conversation.platform,
          recipient: result.conversation.phoneNumber,
          content: aiResponse,
          priority: analysis.urgencyLevel === 'emergency' ? 'urgent' : 'normal',
          retryCount: 0,
          maxRetries: 3,
          createdAt: Date.now()
        };

        await this.messageQueue.enqueueMessage(messageRequest);

        // Execute follow-up actions
        if (generatedResponse.followUpActions) {
          await this.executeFollowUpActions(generatedResponse.followUpActions);
        }
      }

      // Mark conversation as complete if ready
      if (result.isComplete) {
        await this.conversationManager.closeConversation(conversationId, 'completed');
      }

      console.log(`[AIConversationEngine] Processed message in conversation ${conversationId}, complete: ${result.isComplete}`);

      return {
        aiResponse,
        conversationComplete: result.isComplete,
        shouldEscalate: false,
        analysis,
        success: true
      };

    } catch (error) {
      console.error(`[AIConversationEngine] Error processing message in conversation ${conversationId}:`, error);
      return {
        conversationComplete: false,
        shouldEscalate: true,
        success: false
      };
    }
  }

  /**
   * Get conversation analysis and recommendations
   */
  async getConversationAnalysis(conversationId: string): Promise<{
    analysis: any;
    recommendations: string[];
    nextSteps: string[];
    riskLevel: string;
    estimatedCost?: any;
  } | null> {
    try {
      const conversation = this.conversationManager.getConversation(conversationId);
      if (!conversation) {
        return null;
      }

      const analysis = await this.issueAnalyzer.analyzeConversation(conversation);

      return {
        analysis: analysis,
        recommendations: analysis.recommendations.map(r => r.description),
        nextSteps: analysis.nextSteps,
        riskLevel: analysis.riskAssessment.level,
        estimatedCost: analysis.estimatedCost
      };

    } catch (error) {
      console.error('[AIConversationEngine] Error getting analysis:', error);
      return null;
    }
  }

  /**
   * Get all active AI conversations
   */
  getActiveConversations(): AIConversation[] {
    return this.conversationManager.getActiveConversations();
  }

  /**
   * Get conversation by ID
   */
  getConversation(conversationId: string): AIConversation | undefined {
    return this.conversationManager.getConversation(conversationId);
  }

  /**
   * Close conversation manually
   */
  async closeConversation(conversationId: string, reason: string = 'manual'): Promise<void> {
    await this.conversationManager.closeConversation(conversationId, reason);
  }

  /**
   * Get conversation statistics
   */
  getConversationStats(): {
    total: number;
    active: number;
    completed: number;
    escalated: number;
    averageMessages: number;
    averageCompletionTime?: number;
  } {
    return this.conversationManager.getConversationStats();
  }

  /**
   * Execute follow-up actions
   */
  private async executeFollowUpActions(actions: any[]): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'set_reminder':
            await this.setReminder(action);
            break;
          
          case 'create_task':
            await this.createTask(action);
            break;
          
          case 'send_summary':
            await this.sendSummary(action);
            break;
          
          case 'escalate':
            await this.escalateConversation(action);
            break;
        }
      } catch (error) {
        console.error('[AIConversationEngine] Error executing follow-up action:', error);
      }
    }
  }

  /**
   * Set reminder for callback
   */
  private async setReminder(action: any): Promise<void> {
    // In a real implementation, this would integrate with a task/reminder system
    console.log(`[AIConversationEngine] Setting reminder for ${action.delay}ms:`, action.data);
    
    setTimeout(() => {
      console.log('[AIConversationEngine] Reminder triggered:', action.data.message);
      // Here you would trigger actual callback logic
    }, action.delay);
  }

  /**
   * Create task for technician
   */
  private async createTask(action: any): Promise<void> {
    // In a real implementation, this would create a task in a task management system
    console.log('[AIConversationEngine] Creating task:', action.data);
    
    const task = {
      id: `task_${Date.now()}`,
      title: action.data.title,
      description: action.data.description,
      priority: action.data.priority,
      createdAt: Date.now()
    };

    // Store task (in real implementation, this would go to a proper task system)
    await AsyncStorage.setItem(`@ServiceTextPro:Task:${task.id}`, JSON.stringify(task));
  }

  /**
   * Send summary to technician
   */
  private async sendSummary(action: any): Promise<void> {
    console.log('[AIConversationEngine] Sending summary:', action.data);
    
    // In a real implementation, this would send summary via email/SMS/push notification
    const summary = {
      conversationId: action.data.conversation.id,
      phoneNumber: action.data.conversation.phoneNumber,
      problemType: action.data.analysis.problemType,
      urgencyLevel: action.data.analysis.urgencyLevel,
      summary: action.data.analysis.issueDescription,
      timestamp: Date.now()
    };

    await AsyncStorage.setItem(
      `@ServiceTextPro:Summary:${summary.conversationId}`, 
      JSON.stringify(summary)
    );
  }

  /**
   * Escalate conversation to human
   */
  private async escalateConversation(action: any): Promise<void> {
    console.log('[AIConversationEngine] Escalating conversation:', action.data);
    
    // In a real implementation, this would notify human operators
    const escalation = {
      phoneNumber: action.data.phoneNumber,
      reason: action.data.reason,
      timestamp: Date.now(),
      priority: 'urgent'
    };

    await AsyncStorage.setItem(
      `@ServiceTextPro:Escalation:${Date.now()}`, 
      JSON.stringify(escalation)
    );
  }

  /**
   * Store business context
   */
  private async storeBusinessContext(context: BusinessContext): Promise<void> {
    try {
      await AsyncStorage.setItem('@ServiceTextPro:BusinessContext', JSON.stringify(context));
    } catch (error) {
      console.error('[AIConversationEngine] Error storing business context:', error);
    }
  }

  /**
   * Get business context
   */
  private async getBusinessContext(): Promise<BusinessContext> {
    try {
      const stored = await AsyncStorage.getItem('@ServiceTextPro:BusinessContext');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('[AIConversationEngine] Error getting business context:', error);
    }

    // Return default context
    return {
      technicianName: 'Майстор',
      profession: 'електротехник',
      experience: '5',
      workingHours: '08:00 - 18:00',
      emergencyPhone: '+359888123456',
      currentTime: new Date(),
      isBusinessHours: true
    };
  }

  /**
   * Test AI conversation with mock data
   */
  async testConversation(phoneNumber: string = '+359888123456'): Promise<{
    conversationId: string;
    messages: string[];
    analysis: any;
  }> {
    try {
      console.log('[AIConversationEngine] Starting test conversation');

      // Start conversation
      const conversation = await this.conversationManager.startConversation(
        phoneNumber,
        'whatsapp'
      );

      const messages: string[] = [];

      // Simulate customer messages
      const testMessages = [
        'Здравейте, имам проблем с контакта в кухнята',
        'Не работи изобщо, и мисля че виждам малки искри',
        'В кухнята, до хладилника. Току що се случи',
        'Да, малко се притеснявам заради искрите'
      ];

      for (const message of testMessages) {
        const result = await this.processIncomingMessage(
          conversation.id,
          message,
          'text'
        );

        messages.push(`Customer: ${message}`);
        if (result.aiResponse) {
          messages.push(`AI: ${result.aiResponse}`);
        }

        if (result.conversationComplete || result.shouldEscalate) {
          break;
        }
      }

      // Get final analysis
      const analysisResult = await this.getConversationAnalysis(conversation.id);

      return {
        conversationId: conversation.id,
        messages,
        analysis: analysisResult?.analysis
      };

    } catch (error) {
      console.error('[AIConversationEngine] Test conversation failed:', error);
      throw error;
    }
  }
}
