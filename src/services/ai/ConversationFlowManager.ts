import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AIConversation,
  AIMessage,
  ConversationState,
  ConversationStatus,
  ConversationFlow,
  FlowQuestion,
  ExtractedEntity,
  ProblemType,
  UrgencyLevel
} from '../../utils/aiTypes';
import { BulgarianNLPProcessor } from './BulgarianNLPProcessor';

/**
 * Conversation Flow Manager
 * Manages AI conversation state, flow, and transitions
 */
export class ConversationFlowManager {
  private static instance: ConversationFlowManager;
  private readonly CONVERSATIONS_KEY = '@ServiceTextPro:AIConversations';
  private nlpProcessor: BulgarianNLPProcessor;
  private conversations: Map<string, AIConversation> = new Map();
  private conversationFlows: ConversationFlow;

  private constructor() {
    this.nlpProcessor = BulgarianNLPProcessor.getInstance();
    this.initializeConversationFlows();
  }

  public static getInstance(): ConversationFlowManager {
    if (!ConversationFlowManager.instance) {
      ConversationFlowManager.instance = new ConversationFlowManager();
    }
    return ConversationFlowManager.instance;
  }

  /**
   * Initialize conversation flows with Bulgarian questions
   */
  private initializeConversationFlows(): void {
    this.conversationFlows = {
      initialQuestions: [
        {
          id: 'problem_description',
          text: 'Здравейте! Получих вашето обаждане. Моля, опишете ми какъв е проблемът?',
          type: 'open',
          required: true,
          followUp: ['location_question']
        },
        {
          id: 'location_question',
          text: 'В коя стая или част от имота е проблемът?',
          type: 'open',
          required: true,
          followUp: ['urgency_question']
        },
        {
          id: 'urgency_question',
          text: 'От кога е този проблем? Спешно ли е?',
          type: 'open',
          required: true,
          followUp: ['symptoms_question']
        }
      ],
      followUpQuestions: {
        electrical_outlet: [
          {
            id: 'electrical_outlet_symptoms',
            text: 'Има ли искри, дим или странна миризма? Работят ли други контакти в стаята?',
            type: 'open',
            required: true
          },
          {
            id: 'electrical_outlet_recent_changes',
            text: 'Има ли скорошни промени в електрическата инсталация или нови уреди?',
            type: 'open',
            required: false
          }
        ],
        electrical_panel: [
          {
            id: 'electrical_panel_symptoms',
            text: 'Изскочили ли са автоматите? Има ли искри или необичайни звуци от таблото?',
            type: 'open',
            required: true
          },
          {
            id: 'electrical_panel_affected_areas',
            text: 'Кои части от дома са без ток?',
            type: 'open',
            required: true
          }
        ],
        plumbing_leak: [
          {
            id: 'plumbing_leak_location',
            text: 'Точно къде тече? Под мивката, от тръбите, или от друго място?',
            type: 'open',
            required: true
          },
          {
            id: 'plumbing_leak_amount',
            text: 'Много ли тече? Капе бавно или има силна струя?',
            type: 'open',
            required: true
          }
        ],
        plumbing_blockage: [
          {
            id: 'plumbing_blockage_location',
            text: 'Къде е запушването? В мивката, тоалетната, или в канализацията?',
            type: 'open',
            required: true
          },
          {
            id: 'plumbing_blockage_attempts',
            text: 'Опитвали ли сте да го отпушите? Какво сте използвали?',
            type: 'open',
            required: false
          }
        ],
        hvac_heating: [
          {
            id: 'hvac_heating_symptoms',
            text: 'Работи ли котелът? Топли ли са радиаторите? Има ли топла вода?',
            type: 'open',
            required: true
          },
          {
            id: 'hvac_heating_recent_service',
            text: 'Кога е била последната профилактика на отоплението?',
            type: 'open',
            required: false
          }
        ],
        electrical_wiring: [
          {
            id: 'electrical_wiring_symptoms',
            text: 'Има ли искри, дим или миризма? Мигат ли лампите?',
            type: 'open',
            required: true
          }
        ],
        electrical_lighting: [
          {
            id: 'electrical_lighting_symptoms',
            text: 'Не светят ли лампите? Мигат ли? Изгоря ли крушката?',
            type: 'open',
            required: true
          }
        ],
        electrical_appliance: [
          {
            id: 'electrical_appliance_symptoms',
            text: 'Кой уред не работи? Какво точно прави или не прави?',
            type: 'open',
            required: true
          }
        ],
        plumbing_pressure: [
          {
            id: 'plumbing_pressure_symptoms',
            text: 'Слабо ли е налягането? Във всички кранове ли, или само в някои?',
            type: 'open',
            required: true
          }
        ],
        plumbing_heating: [
          {
            id: 'plumbing_heating_symptoms',
            text: 'Няма ли топла вода? Само в банята ли, или навсякъде?',
            type: 'open',
            required: true
          }
        ],
        hvac_cooling: [
          {
            id: 'hvac_cooling_symptoms',
            text: 'Не охлажда ли климатикът? Работи ли вентилаторът?',
            type: 'open',
            required: true
          }
        ],
        hvac_ventilation: [
          {
            id: 'hvac_ventilation_symptoms',
            text: 'Не духа ли вентилацията? Има ли странни звуци?',
            type: 'open',
            required: true
          }
        ],
        general_maintenance: [
          {
            id: 'general_maintenance_description',
            text: 'Какво точно трябва да се направи? Профилактика или ремонт?',
            type: 'open',
            required: true
          }
        ],
        unknown: [
          {
            id: 'unknown_clarification',
            text: 'Можете ли да опишете по-подробно какво се случва?',
            type: 'open',
            required: true
          }
        ]
      },
      emergencyFlow: [
        {
          id: 'emergency_safety',
          text: '🚨 СПЕШНО: За безопасността ви, моля спрете главния прекъсвач/спирателен кран! Идвам веднага!',
          type: 'closed',
          required: false
        },
        {
          id: 'emergency_eta',
          text: 'Ще бъда при вас в рамките на 15-30 минути. Имате ли нужда от спешни инструкции?',
          type: 'closed',
          required: false
        }
      ],
      completionCriteria: {
        requiredFields: ['location', 'symptoms'],
        minimumSymptoms: 2,
        riskAssessmentRequired: true,
        customerConfirmationRequired: false
      }
    };
  }

  /**
   * Start a new AI conversation
   */
  async startConversation(
    phoneNumber: string,
    platform: 'whatsapp' | 'viber' | 'telegram',
    contactId?: string
  ): Promise<AIConversation> {
    const conversationId = `ai_${platform}_${phoneNumber}_${Date.now()}`;
    
    const conversation: AIConversation = {
      id: conversationId,
      contactId,
      phoneNumber,
      platform,
      status: 'active',
      currentState: 'INITIAL_RESPONSE',
      messages: [],
      analysis: {
        problemType: 'unknown',
        urgencyLevel: 'medium',
        issueDescription: '',
        extractedInfo: {
          symptoms: [],
          safetyIssues: [],
          additionalNotes: []
        },
        riskAssessment: {
          level: 'low',
          factors: [],
          immediateActions: [],
          safetyPrecautions: []
        },
        recommendations: [],
        nextSteps: [],
        readyForCallback: false,
        confidence: 0.0
      },
      startedAt: Date.now(),
      lastMessageAt: Date.now(),
      metadata: {
        customerLanguage: 'bg',
        aiModel: 'rule-based-v1',
        processingTime: 0,
        apiCalls: 0,
        errorCount: 0
      }
    };

    this.conversations.set(conversationId, conversation);
    await this.saveConversations();

    console.log(`[ConversationFlow] Started conversation ${conversationId} for ${phoneNumber}`);
    return conversation;
  }

  /**
   * Process incoming customer message
   */
  async processCustomerMessage(
    conversationId: string,
    messageContent: string,
    messageType: 'text' | 'image' | 'location' = 'text'
  ): Promise<{
    conversation: AIConversation;
    nextQuestion?: string;
    shouldEscalate: boolean;
    isComplete: boolean;
  }> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    try {
      // Create customer message
      const customerMessage: AIMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId,
        sender: 'customer',
        content: messageContent,
        timestamp: Date.now(),
        messageType,
        language: 'bg'
      };

      // Process with NLP
      const nlpResults = await this.nlpProcessor.processMessage(customerMessage);
      
      customerMessage.intent = nlpResults.intent;
      customerMessage.entities = nlpResults.entities;
      customerMessage.sentiment = nlpResults.sentiment;
      customerMessage.confidence = nlpResults.confidence;

      // Add message to conversation
      conversation.messages.push(customerMessage);
      conversation.lastMessageAt = Date.now();

      // Update conversation analysis
      await this.updateConversationAnalysis(conversation, customerMessage);

      // Determine next state and action
      const nextAction = await this.determineNextAction(conversation);

      // Update conversation state
      conversation.currentState = nextAction.nextState;
      conversation.status = nextAction.status;

      // Save updated conversation
      this.conversations.set(conversationId, conversation);
      await this.saveConversations();

      console.log(`[ConversationFlow] Processed message in conversation ${conversationId}, state: ${conversation.currentState}`);

      return {
        conversation,
        nextQuestion: nextAction.nextQuestion,
        shouldEscalate: nextAction.shouldEscalate,
        isComplete: nextAction.isComplete
      };

    } catch (error) {
      console.error(`[ConversationFlow] Error processing message in conversation ${conversationId}:`, error);
      conversation.metadata.errorCount++;
      
      return {
        conversation,
        shouldEscalate: true,
        isComplete: false
      };
    }
  }

  /**
   * Update conversation analysis based on new message
   */
  private async updateConversationAnalysis(
    conversation: AIConversation,
    message: AIMessage
  ): Promise<void> {
    const entities = message.entities || [];
    
    // Update problem type
    const problemTypeEntity = entities.find(e => e.type === 'problem_type');
    if (problemTypeEntity && problemTypeEntity.confidence > 0.7) {
      conversation.analysis.problemType = problemTypeEntity.value as ProblemType;
    }

    // Update urgency level
    const urgencyEntity = entities.find(e => e.type === 'urgency_level');
    if (urgencyEntity && urgencyEntity.confidence > 0.7) {
      conversation.analysis.urgencyLevel = urgencyEntity.value as UrgencyLevel;
    }

    // Update extracted information
    const locationEntity = entities.find(e => e.type === 'location');
    if (locationEntity) {
      conversation.analysis.extractedInfo.location = locationEntity.value;
    }

    // Add symptoms
    const symptomEntities = entities.filter(e => e.type === 'symptom');
    for (const symptom of symptomEntities) {
      if (!conversation.analysis.extractedInfo.symptoms.includes(symptom.value)) {
        conversation.analysis.extractedInfo.symptoms.push(symptom.value);
      }
    }

    // Add safety issues
    const safetyEntities = entities.filter(e => e.type === 'safety_concern');
    for (const safety of safetyEntities) {
      if (!conversation.analysis.extractedInfo.safetyIssues.includes(safety.value)) {
        conversation.analysis.extractedInfo.safetyIssues.push(safety.value);
      }
    }

    // Update issue description
    if (message.intent?.category === 'problem_description') {
      if (conversation.analysis.issueDescription) {
        conversation.analysis.issueDescription += ' ' + message.content;
      } else {
        conversation.analysis.issueDescription = message.content;
      }
    }

    // Update risk assessment
    await this.updateRiskAssessment(conversation);

    // Update completion readiness
    conversation.analysis.readyForCallback = await this.checkCompletionReadiness(conversation);
  }

  /**
   * Update risk assessment based on current analysis
   */
  private async updateRiskAssessment(conversation: AIConversation): Promise<void> {
    const analysis = conversation.analysis;
    const safetyIssues = analysis.extractedInfo.safetyIssues;
    const urgencyLevel = analysis.urgencyLevel;

    // Determine risk level
    if (safetyIssues.some(issue => ['искри', 'парене', 'токов удар', 'наводнение'].includes(issue))) {
      analysis.riskAssessment.level = 'critical';
      analysis.riskAssessment.immediateActions = [
        'Спрете главния прекъсвач/спирателен кран',
        'Не докосвайте нищо мокро или повредено',
        'Излезте от опасната зона'
      ];
    } else if (urgencyLevel === 'emergency' || urgencyLevel === 'critical') {
      analysis.riskAssessment.level = 'high';
      analysis.riskAssessment.immediateActions = [
        'Спрете използването на повредения уред/система',
        'Проветрете помещението ако има миризма'
      ];
    } else if (safetyIssues.length > 0) {
      analysis.riskAssessment.level = 'medium';
    } else {
      analysis.riskAssessment.level = 'low';
    }

    // Add general safety precautions
    analysis.riskAssessment.safetyPrecautions = [
      'Не правете опити за самостоятелен ремонт',
      'Спрете използването на повредената система',
      'Уведомете всички в дома за проблема'
    ];
  }

  /**
   * Determine next action based on conversation state
   */
  private async determineNextAction(conversation: AIConversation): Promise<{
    nextState: ConversationState;
    status: ConversationStatus;
    nextQuestion?: string;
    shouldEscalate: boolean;
    isComplete: boolean;
  }> {
    const currentState = conversation.currentState;
    const analysis = conversation.analysis;
    const lastMessage = conversation.messages[conversation.messages.length - 1];

    // Handle emergency situations
    if (analysis.urgencyLevel === 'emergency' || analysis.riskAssessment.level === 'critical') {
      return {
        nextState: 'COMPLETED',
        status: 'escalated',
        nextQuestion: this.conversationFlows.emergencyFlow[0].text,
        shouldEscalate: true,
        isComplete: true
      };
    }

    // State transitions
    switch (currentState) {
      case 'INITIAL_RESPONSE':
        return {
          nextState: 'AWAITING_DESCRIPTION',
          status: 'waiting_response',
          nextQuestion: this.conversationFlows.initialQuestions[0].text,
          shouldEscalate: false,
          isComplete: false
        };

      case 'AWAITING_DESCRIPTION':
        if (lastMessage.intent?.category === 'problem_description') {
          return {
            nextState: 'FOLLOW_UP_QUESTIONS',
            status: 'active',
            nextQuestion: this.getNextFollowUpQuestion(conversation),
            shouldEscalate: false,
            isComplete: false
          };
        }
        break;

      case 'FOLLOW_UP_QUESTIONS':
        if (analysis.readyForCallback) {
          return {
            nextState: 'COMPLETED',
            status: 'completed',
            nextQuestion: this.generateCompletionMessage(conversation),
            shouldEscalate: false,
            isComplete: true
          };
        } else {
          return {
            nextState: 'GATHERING_DETAILS',
            status: 'active',
            nextQuestion: this.getNextFollowUpQuestion(conversation),
            shouldEscalate: false,
            isComplete: false
          };
        }

      case 'GATHERING_DETAILS':
        if (analysis.readyForCallback) {
          return {
            nextState: 'COMPLETED',
            status: 'completed',
            nextQuestion: this.generateCompletionMessage(conversation),
            shouldEscalate: false,
            isComplete: true
          };
        }
        break;

      default:
        break;
    }

    // Default action
    return {
      nextState: 'GATHERING_DETAILS',
      status: 'active',
      nextQuestion: 'Можете ли да ми дадете още подробности за проблема?',
      shouldEscalate: false,
      isComplete: false
    };
  }

  /**
   * Get next follow-up question based on problem type
   */
  private getNextFollowUpQuestion(conversation: AIConversation): string {
    const problemType = conversation.analysis.problemType;
    const followUpQuestions = this.conversationFlows.followUpQuestions[problemType];
    
    if (followUpQuestions && followUpQuestions.length > 0) {
      // Find first unanswered question
      const answeredTopics = conversation.messages
        .filter(m => m.sender === 'customer')
        .map(m => m.content.toLowerCase());

      for (const question of followUpQuestions) {
        // Simple check if topic has been addressed
        const questionKeywords = question.text.toLowerCase().split(' ');
        const hasBeenAnswered = questionKeywords.some(keyword => 
          answeredTopics.some(answer => answer.includes(keyword))
        );

        if (!hasBeenAnswered) {
          return question.text;
        }
      }
    }

    // Fallback questions
    const fallbackQuestions = [
      'Има ли още симптоми или подробности, които да споделите?',
      'Кога ви е най-удобно да дойда за оглед?',
      'Имате ли други въпроси относно проблема?'
    ];

    const randomIndex = Math.floor(Math.random() * fallbackQuestions.length);
    return fallbackQuestions[randomIndex];
  }

  /**
   * Generate completion message
   */
  private generateCompletionMessage(conversation: AIConversation): string {
    const analysis = conversation.analysis;
    const problemType = this.getProblemTypeInBulgarian(analysis.problemType);
    const location = analysis.extractedInfo.location || 'дома ви';
    
    let message = `Благодаря за информацията! Разбрах, че имате проблем с ${problemType} в ${location}. `;
    
    if (analysis.extractedInfo.symptoms.length > 0) {
      message += `Симптомите са: ${analysis.extractedInfo.symptoms.join(', ')}. `;
    }

    if (analysis.urgencyLevel === 'high') {
      message += 'Ще се свържа с вас в рамките на 30 минути за да уговорим час. ';
    } else if (analysis.urgencyLevel === 'medium') {
      message += 'Ще се свържа с вас до края на деня за да уговорим час. ';
    } else {
      message += 'Ще се свържа с вас в рамките на 24 часа за да уговорим час. ';
    }

    if (analysis.riskAssessment.level === 'high' || analysis.riskAssessment.level === 'critical') {
      message += '⚠️ За безопасност, моля не използвайте повредената система до моето идване.';
    }

    return message;
  }

  /**
   * Get problem type in Bulgarian
   */
  private getProblemTypeInBulgarian(problemType: ProblemType): string {
    const translations: Record<ProblemType, string> = {
      electrical_outlet: 'електрически контакт',
      electrical_panel: 'електрическо табло',
      electrical_wiring: 'електрическо окабеляване',
      electrical_lighting: 'осветление',
      electrical_appliance: 'електрически уред',
      plumbing_leak: 'течение във водопровода',
      plumbing_blockage: 'запушване в канализацията',
      plumbing_pressure: 'налягане във водопровода',
      plumbing_heating: 'топла вода',
      hvac_heating: 'отопление',
      hvac_cooling: 'климатизация',
      hvac_ventilation: 'вентилация',
      general_maintenance: 'поддръжка',
      unknown: 'техническия проблем'
    };

    return translations[problemType] || 'техническия проблем';
  }

  /**
   * Check if conversation is ready for completion
   */
  private async checkCompletionReadiness(conversation: AIConversation): Promise<boolean> {
    const analysis = conversation.analysis;
    const criteria = this.conversationFlows.completionCriteria;

    // Check required fields
    const hasLocation = !!analysis.extractedInfo.location;
    const hasEnoughSymptoms = analysis.extractedInfo.symptoms.length >= criteria.minimumSymptoms;
    const hasProblemType = analysis.problemType !== 'unknown';

    // Check conversation depth
    const customerMessages = conversation.messages.filter(m => m.sender === 'customer').length;
    const hasEnoughExchange = customerMessages >= 3;

    return hasLocation && hasEnoughSymptoms && hasProblemType && hasEnoughExchange;
  }

  /**
   * Get conversation by ID
   */
  getConversation(conversationId: string): AIConversation | undefined {
    return this.conversations.get(conversationId);
  }

  /**
   * Get active conversations
   */
  getActiveConversations(): AIConversation[] {
    return Array.from(this.conversations.values()).filter(
      conv => conv.status === 'active' || conv.status === 'waiting_response'
    );
  }

  /**
   * Close conversation
   */
  async closeConversation(conversationId: string, reason: string = 'completed'): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.status = 'closed';
      conversation.completedAt = Date.now();
      
      await this.saveConversations();
      console.log(`[ConversationFlow] Closed conversation ${conversationId}: ${reason}`);
    }
  }

  /**
   * Save conversations to storage
   */
  private async saveConversations(): Promise<void> {
    try {
      const conversationsArray = Array.from(this.conversations.values());
      await AsyncStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(conversationsArray));
    } catch (error) {
      console.error('[ConversationFlow] Error saving conversations:', error);
    }
  }

  /**
   * Load conversations from storage
   */
  async loadConversations(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.CONVERSATIONS_KEY);
      if (stored) {
        const conversationsArray: AIConversation[] = JSON.parse(stored);
        this.conversations.clear();
        conversationsArray.forEach(conv => {
          this.conversations.set(conv.id, conv);
        });
        console.log(`[ConversationFlow] Loaded ${conversationsArray.length} conversations`);
      }
    } catch (error) {
      console.error('[ConversationFlow] Error loading conversations:', error);
    }
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
  } {
    const conversations = Array.from(this.conversations.values());
    
    return {
      total: conversations.length,
      active: conversations.filter(c => c.status === 'active').length,
      completed: conversations.filter(c => c.status === 'completed').length,
      escalated: conversations.filter(c => c.status === 'escalated').length,
      averageMessages: conversations.length > 0 
        ? conversations.reduce((sum, c) => sum + c.messages.length, 0) / conversations.length 
        : 0
    };
  }
}
