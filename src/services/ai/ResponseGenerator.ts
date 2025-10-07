import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AIConversation,
  AIMessage,
  AIResponseContext,
  GeneratedResponse,
  ConversationState,
  BusinessContext,
  ProblemType,
  UrgencyLevel,
  ResponseMetadata,
  FollowUpAction
} from '../../utils/aiTypes';

/**
 * Smart Response Generation System
 * Generates contextual Bulgarian responses for AI conversations
 */
export class ResponseGenerator {
  private static instance: ResponseGenerator;
  private readonly BUSINESS_CONTEXT_KEY = '@ServiceTextPro:BusinessContext';

  private constructor() {}

  public static getInstance(): ResponseGenerator {
    if (!ResponseGenerator.instance) {
      ResponseGenerator.instance = new ResponseGenerator();
    }
    return ResponseGenerator.instance;
  }

  /**
   * Generate contextual response for AI conversation
   */
  async generateResponse(context: AIResponseContext): Promise<GeneratedResponse> {
    try {
      const startTime = Date.now();
      console.log(`[ResponseGenerator] Generating response for conversation ${context.conversation.id}`);

      // Determine response type and next state
      const responseType = this.determineResponseType(context);
      const nextState = this.determineNextState(context, responseType);

      // Generate response content
      const content = await this.generateResponseContent(context, responseType);

      // Generate follow-up actions if needed
      const followUpActions = await this.generateFollowUpActions(context, responseType);

      // Calculate confidence and reasoning
      const confidence = this.calculateResponseConfidence(context);
      const reasoning = this.generateReasoning(context, responseType);

      // Generate alternative responses
      const alternativeResponses = await this.generateAlternativeResponses(context, responseType);

      const processingTime = Date.now() - startTime;

      const response: GeneratedResponse = {
        content,
        type: responseType,
        nextState,
        followUpActions,
        metadata: {
          confidence,
          reasoning,
          alternativeResponses,
          processingTime
        }
      };

      console.log(`[ResponseGenerator] Generated ${responseType} response in ${processingTime}ms`);
      return response;

    } catch (error) {
      console.error('[ResponseGenerator] Error generating response:', error);
      
      // Return fallback response
      return this.getFallbackResponse(context);
    }
  }

  /**
   * Determine the type of response needed
   */
  private determineResponseType(context: AIResponseContext): 'question' | 'advice' | 'confirmation' | 'scheduling' | 'completion' {
    const { conversation, lastCustomerMessage, analysisResults } = context;

    // Emergency situations - provide immediate advice
    if (analysisResults.urgencyLevel === 'emergency' || analysisResults.riskAssessment.level === 'critical') {
      return 'advice';
    }

    // Check if conversation is ready for completion
    if (analysisResults.readyForCallback) {
      return 'completion';
    }

    // Check current conversation state
    switch (conversation.currentState) {
      case 'INITIAL_RESPONSE':
        return 'question';
      
      case 'AWAITING_DESCRIPTION':
        if (lastCustomerMessage.intent?.category === 'problem_description') {
          return 'question'; // Ask follow-up questions
        }
        return 'question'; // Still need description
      
      case 'FOLLOW_UP_QUESTIONS':
      case 'GATHERING_DETAILS':
        if (this.needsMoreInformation(analysisResults)) {
          return 'question';
        } else if (analysisResults.riskAssessment.level === 'high') {
          return 'advice';
        } else {
          return 'scheduling';
        }
      
      case 'PROVIDING_ADVICE':
        return 'confirmation';
      
      case 'SCHEDULING_VISIT':
        return 'completion';
      
      default:
        return 'question';
    }
  }

  /**
   * Determine next conversation state
   */
  private determineNextState(context: AIResponseContext, responseType: string): ConversationState {
    const { conversation, analysisResults } = context;

    if (responseType === 'completion') {
      return 'COMPLETED';
    }

    if (responseType === 'advice' && analysisResults.urgencyLevel === 'emergency') {
      return 'COMPLETED'; // Emergency situations end conversation quickly
    }

    switch (conversation.currentState) {
      case 'INITIAL_RESPONSE':
        return 'AWAITING_DESCRIPTION';
      
      case 'AWAITING_DESCRIPTION':
        return 'FOLLOW_UP_QUESTIONS';
      
      case 'FOLLOW_UP_QUESTIONS':
        return 'GATHERING_DETAILS';
      
      case 'GATHERING_DETAILS':
        if (analysisResults.readyForCallback) {
          return 'COMPLETED';
        }
        return 'PROVIDING_ADVICE';
      
      case 'PROVIDING_ADVICE':
        return 'SCHEDULING_VISIT';
      
      case 'SCHEDULING_VISIT':
        return 'COMPLETED';
      
      default:
        return 'GATHERING_DETAILS';
    }
  }

  /**
   * Generate response content based on context and type
   */
  private async generateResponseContent(
    context: AIResponseContext, 
    responseType: string
  ): Promise<string> {
    const { conversation, analysisResults, businessContext } = context;

    switch (responseType) {
      case 'question':
        return await this.generateQuestionResponse(context);
      
      case 'advice':
        return await this.generateAdviceResponse(context);
      
      case 'confirmation':
        return await this.generateConfirmationResponse(context);
      
      case 'scheduling':
        return await this.generateSchedulingResponse(context);
      
      case 'completion':
        return await this.generateCompletionResponse(context);
      
      default:
        return 'Благодаря за информацията. Можете ли да ми кажете още нещо за проблема?';
    }
  }

  /**
   * Generate question-type response
   */
  private async generateQuestionResponse(context: AIResponseContext): Promise<string> {
    const { conversation, analysisResults } = context;
    const problemType = analysisResults.problemType;
    const extractedInfo = analysisResults.extractedInfo;

    // Determine what information is missing
    const missingInfo = this.identifyMissingInformation(extractedInfo);

    if (missingInfo.includes('location')) {
      return this.getLocationQuestion(problemType);
    }

    if (missingInfo.includes('symptoms')) {
      return this.getSymptomsQuestion(problemType);
    }

    if (missingInfo.includes('duration')) {
      return this.getDurationQuestion(problemType);
    }

    if (missingInfo.includes('safety')) {
      return this.getSafetyQuestion(problemType);
    }

    // Problem-specific follow-up questions
    return this.getProblemSpecificQuestion(problemType, extractedInfo);
  }

  /**
   * Generate advice-type response
   */
  private async generateAdviceResponse(context: AIResponseContext): Promise<string> {
    const { analysisResults, businessContext } = context;
    const riskLevel = analysisResults.riskAssessment.level;
    const problemType = analysisResults.problemType;

    let response = '';

    if (riskLevel === 'critical') {
      response = '🚨 СПЕШНО! За вашата безопасност:\n\n';
      response += analysisResults.riskAssessment.immediateActions.join('\n• ') + '\n\n';
      response += `Идвам при вас ВЕДНАГА! Ще бъда там в рамките на 15-30 минути. `;
      response += `За допълнителни въпроси: ${businessContext.emergencyPhone}`;
    } else if (riskLevel === 'high') {
      response = '⚠️ ВНИМАНИЕ! Важни мерки за безопасност:\n\n';
      response += '• ' + analysisResults.riskAssessment.safetyPrecautions.join('\n• ') + '\n\n';
      response += 'Ще се свържа с вас в рамките на часа за да уговорим час. ';
      response += this.getProblemSpecificAdvice(problemType);
    } else {
      response = 'Разбирам проблема. Ето някои препоръки:\n\n';
      
      if (analysisResults.recommendations.length > 0) {
        const immediateRecs = analysisResults.recommendations.filter(r => r.priority === 'high');
        if (immediateRecs.length > 0) {
          response += '• ' + immediateRecs.map(r => r.description).join('\n• ') + '\n\n';
        }
      }

      response += this.getProblemSpecificAdvice(problemType);
    }

    return response;
  }

  /**
   * Generate confirmation-type response
   */
  private async generateConfirmationResponse(context: AIResponseContext): Promise<string> {
    const { analysisResults } = context;
    const problemType = this.getProblemTypeInBulgarian(analysisResults.problemType);
    const location = analysisResults.extractedInfo.location || 'дома ви';

    return `Разбрах, че имате проблем с ${problemType} в ${location}. ` +
           `Правилно ли разбирам ситуацията? Има ли още нещо важно, което да знам?`;
  }

  /**
   * Generate scheduling-type response
   */
  private async generateSchedulingResponse(context: AIResponseContext): Promise<string> {
    const { analysisResults, businessContext } = context;
    const urgency = analysisResults.urgencyLevel;

    let response = 'Отлично! Имам достатъчно информация за да ви помогна. ';

    if (urgency === 'high') {
      response += 'Поради спешността, ще се свържа с вас в рамките на 30 минути за да уговорим час днес. ';
    } else if (urgency === 'medium') {
      response += 'Ще се свържа с вас до края на деня за да уговорим удобен час. ';
    } else {
      response += 'Ще се свържа с вас в рамките на 24 часа за да уговорим час. ';
    }

    response += `Работя ${businessContext.workingHours}. `;
    response += 'Кога ви е най-удобно - сутрин, следобед или вечер?';

    return response;
  }

  /**
   * Generate completion-type response
   */
  private async generateCompletionResponse(context: AIResponseContext): Promise<string> {
    const { analysisResults, businessContext } = context;
    const problemType = this.getProblemTypeInBulgarian(analysisResults.problemType);
    const urgency = analysisResults.urgencyLevel;
    const location = analysisResults.extractedInfo.location || 'дома ви';

    let response = `Благодаря за подробната информация! Обобщавам:\n\n`;
    response += `🔧 Проблем: ${problemType} в ${location}\n`;
    
    if (analysisResults.extractedInfo.symptoms.length > 0) {
      response += `📋 Симптоми: ${analysisResults.extractedInfo.symptoms.join(', ')}\n`;
    }

    if (analysisResults.estimatedCost) {
      response += `💰 Приблизителна цена: ${analysisResults.estimatedCost.min}-${analysisResults.estimatedCost.max} лв.\n`;
    }

    response += '\n';

    // Add timeline based on urgency
    if (urgency === 'emergency') {
      response += '⚡ СПЕШНО: Идвам веднага (15-30 мин)\n';
    } else if (urgency === 'high') {
      response += '🕐 ПРИОРИТЕТ: Ще се свържа до 1 час\n';
    } else if (urgency === 'medium') {
      response += '📅 ПЛАНИРАНО: Ще се свържа до края на деня\n';
    } else {
      response += '📋 СТАНДАРТНО: Ще се свържа в рамките на 24ч\n';
    }

    response += `\n👨‍🔧 ${businessContext.technicianName}, ${businessContext.profession} с ${businessContext.experience} години опит\n`;
    response += `📞 За спешни случаи: ${businessContext.emergencyPhone}`;

    // Add safety reminder if needed
    if (analysisResults.riskAssessment.level === 'high' || analysisResults.riskAssessment.level === 'critical') {
      response += '\n\n⚠️ ВАЖНО: Не използвайте повредената система до моето идване!';
    }

    return response;
  }

  /**
   * Generate follow-up actions
   */
  private async generateFollowUpActions(
    context: AIResponseContext, 
    responseType: string
  ): Promise<FollowUpAction[]> {
    const actions: FollowUpAction[] = [];
    const { analysisResults } = context;

    // Set reminder for callback
    if (responseType === 'completion') {
      const delay = this.getCallbackDelay(analysisResults.urgencyLevel);
      actions.push({
        type: 'set_reminder',
        delay,
        data: {
          action: 'callback',
          phoneNumber: context.conversation.phoneNumber,
          message: 'Време за обаждане на клиента'
        }
      });
    }

    // Create task for urgent issues
    if (analysisResults.urgencyLevel === 'emergency') {
      actions.push({
        type: 'create_task',
        delay: 0,
        data: {
          title: 'СПЕШЕН СЛУЧАЙ',
          description: `${analysisResults.problemType} - ${context.conversation.phoneNumber}`,
          priority: 'urgent'
        }
      });
    }

    // Send summary to technician
    if (responseType === 'completion') {
      actions.push({
        type: 'send_summary',
        delay: 60000, // 1 minute delay
        data: {
          conversation: context.conversation,
          analysis: analysisResults
        }
      });
    }

    // Escalate if critical risk
    if (analysisResults.riskAssessment.level === 'critical') {
      actions.push({
        type: 'escalate',
        delay: 0,
        data: {
          reason: 'Critical safety risk detected',
          phoneNumber: context.conversation.phoneNumber
        }
      });
    }

    return actions;
  }

  /**
   * Helper methods for generating specific types of questions
   */
  private getLocationQuestion(problemType: ProblemType): string {
    const locationQuestions: Record<ProblemType, string> = {
      electrical_outlet: 'В коя стая е проблемният контакт? Кухня, баня, хол или друго място?',
      electrical_panel: 'Къде се намира електрическото табло? В мазето, коридора или друго място?',
      plumbing_leak: 'Къде точно тече? В банята, кухнята, или друго място?',
      plumbing_blockage: 'Къде е запушването? В тоалетната, мивката, или канализацията?',
      hvac_heating: 'В кои стаи няма отопление? Навсякъде ли, или само в определени помещения?',
      unknown: 'В коя част от дома/офиса е проблемът?'
    };

    return locationQuestions[problemType] || locationQuestions.unknown;
  }

  private getSymptomsQuestion(problemType: ProblemType): string {
    const symptomQuestions: Record<ProblemType, string> = {
      electrical_outlet: 'Какво точно се случва с контакта? Искри ли, не работи ли, или има друг проблем?',
      electrical_panel: 'Изскочили ли са автоматите? Има ли искри, звуци или миризми от таблото?',
      plumbing_leak: 'Силно ли тече или само капе? Има ли видими щети от водата?',
      plumbing_blockage: 'Изобщо не тече ли водата, или тече много бавно?',
      hvac_heating: 'Студено ли е в цялата къща? Работи ли котелът? Има ли топла вода?',
      unknown: 'Можете ли да опишете по-подробно какво точно се случва?'
    };

    return symptomQuestions[problemType] || symptomQuestions.unknown;
  }

  private getDurationQuestion(problemType: ProblemType): string {
    return 'От кога е този проблем? Току що ли се случи, или е от няколко дни?';
  }

  private getSafetyQuestion(problemType: ProblemType): string {
    const safetyQuestions: Record<ProblemType, string> = {
      electrical_outlet: 'Има ли искри, дим или странна миризма? ВНИМАНИЕ - не докосвайте нищо ако има искри!',
      electrical_panel: 'Има ли искри или необичайни звуци от таблото? Ако да - веднага спрете главния прекъсвач!',
      plumbing_leak: 'Силно ли тече? Има ли опасност от наводнение? Ако да - спрете главния кран!',
      hvac_heating: 'Има ли странни миризми или дим от котела? Ако да - спрете го веднага!',
      unknown: 'Има ли нещо опасно в ситуацията? Искри, дим, силно течение или друго?'
    };

    return safetyQuestions[problemType] || safetyQuestions.unknown;
  }

  private getProblemSpecificQuestion(problemType: ProblemType, extractedInfo: any): string {
    // Generate context-specific questions based on what we already know
    const fallbackQuestions = [
      'Има ли още симптоми или подробности, които да споделите?',
      'Правили ли сте скорошни промени или ремонти в тази област?',
      'Кога ви е най-удобно да дойда за оглед?'
    ];

    return fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
  }

  private getProblemSpecificAdvice(problemType: ProblemType): string {
    const advice: Record<ProblemType, string> = {
      electrical_outlet: 'Не използвайте контакта до моето идване. Проверете дали не е изскочил автомата в таблото.',
      electrical_panel: 'Не докосвайте нищо в таблото. При нужда използвайте удължители от други стаи.',
      plumbing_leak: 'Поставете съд под течението и затегнете леко връзките ако е възможно.',
      hvac_heating: 'Проверете дали има гориво и дали термостатът е настроен правилно.',
      unknown: 'Не правете самостоятелни опити за ремонт до моето идване.'
    };

    return advice[problemType] || advice.unknown;
  }

  /**
   * Helper methods
   */
  private needsMoreInformation(analysisResults: any): boolean {
    const hasLocation = !!analysisResults.extractedInfo.location;
    const hasSymptoms = analysisResults.extractedInfo.symptoms.length >= 2;
    const hasProblemType = analysisResults.problemType !== 'unknown';

    return !hasLocation || !hasSymptoms || !hasProblemType;
  }

  private identifyMissingInformation(extractedInfo: any): string[] {
    const missing: string[] = [];

    if (!extractedInfo.location) missing.push('location');
    if (extractedInfo.symptoms.length < 2) missing.push('symptoms');
    if (!extractedInfo.duration) missing.push('duration');
    if (extractedInfo.safetyIssues.length === 0) missing.push('safety');

    return missing;
  }

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

  private getCallbackDelay(urgencyLevel: UrgencyLevel): number {
    const delays: Record<UrgencyLevel, number> = {
      emergency: 5 * 60 * 1000,      // 5 minutes
      critical: 10 * 60 * 1000,      // 10 minutes
      high: 30 * 60 * 1000,          // 30 minutes
      medium: 2 * 60 * 60 * 1000,    // 2 hours
      low: 24 * 60 * 60 * 1000       // 24 hours
    };

    return delays[urgencyLevel] || delays.medium;
  }

  private calculateResponseConfidence(context: AIResponseContext): number {
    const { analysisResults, conversation } = context;
    
    let confidence = 0.7; // Base confidence

    // Factor in analysis confidence
    confidence += analysisResults.confidence * 0.2;

    // Factor in conversation length
    const messageCount = conversation.messages.filter(m => m.sender === 'customer').length;
    if (messageCount >= 3) {
      confidence += 0.1;
    }

    return Math.min(0.95, confidence);
  }

  private generateReasoning(context: AIResponseContext, responseType: string): string {
    const { analysisResults, conversation } = context;
    
    return `Generated ${responseType} response based on problem type: ${analysisResults.problemType}, ` +
           `urgency: ${analysisResults.urgencyLevel}, conversation state: ${conversation.currentState}`;
  }

  private async generateAlternativeResponses(
    context: AIResponseContext, 
    responseType: string
  ): Promise<string[]> {
    // Generate 1-2 alternative responses with different tone/approach
    const alternatives: string[] = [];

    if (responseType === 'question') {
      alternatives.push('Можете ли да ми дадете още подробности за това какво точно се случва?');
    }

    if (responseType === 'completion') {
      alternatives.push('Отлично! Имам всичката нужна информация. Ще се свържа с вас скоро за да уговорим час.');
    }

    return alternatives;
  }

  private getFallbackResponse(context: AIResponseContext): GeneratedResponse {
    return {
      content: 'Благодаря за информацията. Ще се свържа с вас скоро за да обсъдим проблема подробно.',
      type: 'confirmation',
      nextState: 'COMPLETED',
      metadata: {
        confidence: 0.3,
        reasoning: 'Fallback response due to processing error',
        processingTime: 0
      }
    };
  }

  /**
   * Get business context from storage
   */
  private async getBusinessContext(): Promise<BusinessContext> {
    try {
      const stored = await AsyncStorage.getItem(this.BUSINESS_CONTEXT_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('[ResponseGenerator] Error loading business context:', error);
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
}
