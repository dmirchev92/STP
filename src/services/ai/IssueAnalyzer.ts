import {
  AIConversation,
  AIMessage,
  ProblemType,
  UrgencyLevel,
  ConversationAnalysis,
  ExtractedEntity,
  RiskAssessment,
  Recommendation,
  CostEstimate
} from '../../utils/aiTypes';
import { BulgarianNLPProcessor } from './BulgarianNLPProcessor';

/**
 * AI Issue Analysis Engine
 * Analyzes customer problems and provides recommendations
 */
export class IssueAnalyzer {
  private static instance: IssueAnalyzer;
  private nlpProcessor: BulgarianNLPProcessor;

  private constructor() {
    this.nlpProcessor = BulgarianNLPProcessor.getInstance();
  }

  public static getInstance(): IssueAnalyzer {
    if (!IssueAnalyzer.instance) {
      IssueAnalyzer.instance = new IssueAnalyzer();
    }
    return IssueAnalyzer.instance;
  }

  /**
   * Analyze conversation and generate comprehensive issue analysis
   */
  async analyzeConversation(conversation: AIConversation): Promise<ConversationAnalysis> {
    try {
      console.log(`[IssueAnalyzer] Analyzing conversation ${conversation.id}`);

      // Extract all entities from all customer messages
      const allEntities = this.extractAllEntities(conversation.messages);

      // Classify problem type
      const problemType = await this.classifyProblemType(allEntities, conversation.messages);

      // Determine urgency level
      const urgencyLevel = await this.determineUrgencyLevel(allEntities, conversation.messages);

      // Generate issue description
      const issueDescription = this.generateIssueDescription(conversation.messages);

      // Extract structured information
      const extractedInfo = this.extractStructuredInformation(allEntities, conversation.messages);

      // Assess risk level
      const riskAssessment = await this.assessRisk(problemType, urgencyLevel, extractedInfo, allEntities);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(problemType, urgencyLevel, riskAssessment);

      // Estimate cost
      const estimatedCost = await this.estimateCost(problemType, extractedInfo);

      // Determine required tools
      const requiredTools = await this.determineRequiredTools(problemType, extractedInfo);

      // Generate safety warnings
      const safetyWarnings = await this.generateSafetyWarnings(riskAssessment, problemType);

      // Generate next steps
      const nextSteps = await this.generateNextSteps(problemType, urgencyLevel, riskAssessment);

      // Calculate overall confidence
      const confidence = this.calculateAnalysisConfidence(allEntities, conversation.messages);

      // Check if ready for callback
      const readyForCallback = await this.checkReadinessForCallback(extractedInfo, conversation.messages);

      const analysis: ConversationAnalysis = {
        problemType,
        urgencyLevel,
        issueDescription,
        extractedInfo,
        riskAssessment,
        recommendations,
        estimatedCost,
        requiredTools,
        safetyWarnings,
        nextSteps,
        readyForCallback,
        confidence
      };

      console.log(`[IssueAnalyzer] Analysis complete for ${conversation.id}: ${problemType} (${urgencyLevel})`);
      return analysis;

    } catch (error) {
      console.error(`[IssueAnalyzer] Error analyzing conversation ${conversation.id}:`, error);
      
      // Return default analysis
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Extract all entities from customer messages
   */
  private extractAllEntities(messages: AIMessage[]): ExtractedEntity[] {
    const allEntities: ExtractedEntity[] = [];
    
    messages
      .filter(m => m.sender === 'customer')
      .forEach(message => {
        if (message.entities) {
          allEntities.push(...message.entities);
        }
      });

    return allEntities;
  }

  /**
   * Classify the problem type based on entities and message content
   */
  private async classifyProblemType(entities: ExtractedEntity[], messages: AIMessage[]): Promise<ProblemType> {
    // Check for explicit problem type entities
    const problemTypeEntity = entities.find(e => e.type === 'problem_type' && e.confidence > 0.7);
    if (problemTypeEntity) {
      return problemTypeEntity.value as ProblemType;
    }

    // Rule-based classification using symptoms and keywords
    const allText = messages
      .filter(m => m.sender === 'customer')
      .map(m => m.content.toLowerCase())
      .join(' ');

    // Electrical problems
    if (this.containsKeywords(allText, ['контакт', 'щепсел', 'ток', 'захранване'])) {
      if (this.containsKeywords(allText, ['искри', 'парене', 'токов удар'])) {
        return 'electrical_outlet';
      }
      return 'electrical_outlet';
    }

    if (this.containsKeywords(allText, ['табло', 'автомати', 'предпазители', 'щит'])) {
      return 'electrical_panel';
    }

    if (this.containsKeywords(allText, ['кабел', 'жици', 'окабеляване', 'проводници'])) {
      return 'electrical_wiring';
    }

    if (this.containsKeywords(allText, ['лампа', 'осветление', 'светлина', 'крушка'])) {
      return 'electrical_lighting';
    }

    // Plumbing problems
    if (this.containsKeywords(allText, ['тече', 'течение', 'капе', 'мокро', 'наводнение'])) {
      return 'plumbing_leak';
    }

    if (this.containsKeywords(allText, ['запушено', 'блокирано', 'не тече', 'задръстване'])) {
      return 'plumbing_blockage';
    }

    if (this.containsKeywords(allText, ['налягане', 'слабо', 'няма вода', 'малко вода'])) {
      return 'plumbing_pressure';
    }

    if (this.containsKeywords(allText, ['топла вода', 'студено', 'не загрява'])) {
      return 'plumbing_heating';
    }

    // HVAC problems
    if (this.containsKeywords(allText, ['отопление', 'парно', 'радиатор', 'котел'])) {
      return 'hvac_heating';
    }

    if (this.containsKeywords(allText, ['климатик', 'климатизация', 'охлаждане', 'студено'])) {
      return 'hvac_cooling';
    }

    if (this.containsKeywords(allText, ['вентилация', 'въздух', 'духа', 'вентилатор'])) {
      return 'hvac_ventilation';
    }

    // General maintenance
    if (this.containsKeywords(allText, ['поддръжка', 'преглед', 'сервиз', 'профилактика'])) {
      return 'general_maintenance';
    }

    return 'unknown';
  }

  /**
   * Determine urgency level based on entities and content
   */
  private async determineUrgencyLevel(entities: ExtractedEntity[], messages: AIMessage[]): Promise<UrgencyLevel> {
    // Check for explicit urgency entities
    const urgencyEntity = entities.find(e => e.type === 'urgency_level' && e.confidence > 0.7);
    if (urgencyEntity) {
      return urgencyEntity.value as UrgencyLevel;
    }

    // Check for safety concerns
    const safetyEntities = entities.filter(e => e.type === 'safety_concern');
    if (safetyEntities.length > 0) {
      const criticalSafety = ['искри', 'парене', 'токов удар', 'наводнение', 'дим'];
      if (safetyEntities.some(se => criticalSafety.includes(se.value))) {
        return 'emergency';
      }
      return 'high';
    }

    // Check message sentiment and emotion
    const customerMessages = messages.filter(m => m.sender === 'customer');
    const hasUrgentEmotions = customerMessages.some(m => 
      m.sentiment?.emotions.some(e => e.emotion === 'urgent' && e.score > 0.5)
    );

    if (hasUrgentEmotions) {
      return 'high';
    }

    // Check time expressions
    const timeEntities = entities.filter(e => e.type === 'time');
    if (timeEntities.some(te => ['току що', 'сега', 'днес', 'веднага'].includes(te.value))) {
      return 'high';
    }

    if (timeEntities.some(te => ['тази седмица', 'скоро'].includes(te.value))) {
      return 'medium';
    }

    return 'medium';
  }

  /**
   * Generate issue description from messages
   */
  private generateIssueDescription(messages: AIMessage[]): string {
    const customerMessages = messages
      .filter(m => m.sender === 'customer' && m.intent?.category === 'problem_description')
      .map(m => m.content)
      .join(' ');

    return customerMessages || 'Клиентът описа технически проблем.';
  }

  /**
   * Extract structured information from entities and messages
   */
  private extractStructuredInformation(entities: ExtractedEntity[], messages: AIMessage[]) {
    const info = {
      symptoms: [] as string[],
      safetyIssues: [] as string[],
      additionalNotes: [] as string[]
    };

    // Extract location
    const locationEntity = entities.find(e => e.type === 'location');
    if (locationEntity) {
      info.location = locationEntity.value;
    }

    // Extract symptoms
    entities.filter(e => e.type === 'symptom').forEach(entity => {
      if (!info.symptoms.includes(entity.value)) {
        info.symptoms.push(entity.value);
      }
    });

    // Extract safety issues
    entities.filter(e => e.type === 'safety_concern').forEach(entity => {
      if (!info.safetyIssues.includes(entity.value)) {
        info.safetyIssues.push(entity.value);
      }
    });

    // Extract duration/time information
    const timeEntities = entities.filter(e => e.type === 'time' || e.type === 'duration');
    if (timeEntities.length > 0) {
      info.duration = timeEntities[0].value;
    }

    // Extract previous work mentions
    const allText = messages
      .filter(m => m.sender === 'customer')
      .map(m => m.content.toLowerCase())
      .join(' ');

    if (this.containsKeywords(allText, ['ремонт', 'поправка', 'смяна', 'нов', 'преди'])) {
      info.previousWork = 'Клиентът споменава скорошни промени или ремонти.';
    }

    // Extract customer availability
    if (this.containsKeywords(allText, ['свободен', 'удобно', 'време', 'кога'])) {
      info.customerAvailability = 'Клиентът е споделил информация за достъпността си.';
    }

    // Add additional notes from non-problem description messages
    messages
      .filter(m => m.sender === 'customer' && m.intent?.category !== 'problem_description')
      .forEach(message => {
        if (message.content.trim().length > 10) {
          info.additionalNotes.push(message.content);
        }
      });

    return info;
  }

  /**
   * Assess risk level based on problem type and extracted information
   */
  private async assessRisk(
    problemType: ProblemType,
    urgencyLevel: UrgencyLevel,
    extractedInfo: any,
    entities: ExtractedEntity[]
  ): Promise<RiskAssessment> {
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const factors: string[] = [];
    const immediateActions: string[] = [];
    const safetyPrecautions: string[] = [];

    // Assess based on problem type
    switch (problemType) {
      case 'electrical_outlet':
      case 'electrical_panel':
      case 'electrical_wiring':
        if (extractedInfo.safetyIssues.some((issue: string) => ['искри', 'парене', 'токов удар'].includes(issue))) {
          riskLevel = 'critical';
          factors.push('Опасност от токов удар или пожар');
          immediateActions.push('ВЕДНАГА спрете главния прекъсвач');
          immediateActions.push('Не докосвайте нищо електрическо');
        } else if (urgencyLevel === 'emergency') {
          riskLevel = 'high';
          factors.push('Електрически проблем с висока спешност');
        } else {
          riskLevel = 'medium';
          factors.push('Електрически проблем изисква професионална намеса');
        }
        safetyPrecautions.push('Не правете самостоятелни ремонти на електрическата инсталация');
        break;

      case 'plumbing_leak':
        if (extractedInfo.safetyIssues.includes('наводнение')) {
          riskLevel = 'high';
          factors.push('Риск от наводнение и щети');
          immediateActions.push('Спрете главния спирателен кран');
        } else {
          riskLevel = 'medium';
          factors.push('Течение може да причини щети');
        }
        safetyPrecautions.push('Спрете водоподаването към засегнатата зона');
        break;

      case 'hvac_heating':
        if (extractedInfo.symptoms.includes('мирише') || extractedInfo.symptoms.includes('дим')) {
          riskLevel = 'high';
          factors.push('Възможен проблем с горенето');
          immediateActions.push('Спрете котела и проветрете');
        } else {
          riskLevel = 'low';
        }
        break;

      default:
        riskLevel = 'low';
        factors.push('Стандартен технически проблем');
    }

    // Adjust based on urgency level
    if (urgencyLevel === 'emergency' && riskLevel !== 'critical') {
      riskLevel = 'high';
    }

    // Add general safety precautions
    safetyPrecautions.push('Не използвайте повредената система/уред');
    safetyPrecautions.push('При съмнение за опасност, напуснете помещението');

    return {
      level: riskLevel,
      factors,
      immediateActions,
      safetyPrecautions
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  private async generateRecommendations(
    problemType: ProblemType,
    urgencyLevel: UrgencyLevel,
    riskAssessment: RiskAssessment
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Immediate actions based on risk
    if (riskAssessment.immediateActions.length > 0) {
      recommendations.push({
        type: 'immediate_action',
        title: 'Незабавни действия',
        description: riskAssessment.immediateActions.join('. '),
        priority: 'high'
      });
    }

    // Safety recommendations
    if (riskAssessment.level === 'high' || riskAssessment.level === 'critical') {
      recommendations.push({
        type: 'safety',
        title: 'Мерки за безопасност',
        description: riskAssessment.safetyPrecautions.join('. '),
        priority: 'high'
      });
    }

    // Problem-specific recommendations
    switch (problemType) {
      case 'electrical_outlet':
        recommendations.push({
          type: 'preparation',
          title: 'Подготовка за ремонта',
          description: 'Осигурете достъп до електрическото табло. Уберете мебели около повредения контакт.',
          priority: 'medium'
        });
        break;

      case 'plumbing_leak':
        recommendations.push({
          type: 'temporary_fix',
          title: 'Временно решение',
          description: 'Поставете съд под течението. Затегнете леко връзките ако е възможно.',
          priority: 'medium'
        });
        break;

      case 'hvac_heating':
        recommendations.push({
          type: 'preparation',
          title: 'Подготовка',
          description: 'Проверете дали има достатъчно гориво (газ/мазут). Осигурете достъп до котела.',
          priority: 'low'
        });
        break;
    }

    return recommendations;
  }

  /**
   * Estimate cost based on problem type and complexity
   */
  private async estimateCost(problemType: ProblemType, extractedInfo: any): Promise<CostEstimate> {
    const costRanges: Record<ProblemType, { min: number; max: number }> = {
      electrical_outlet: { min: 30, max: 80 },
      electrical_panel: { min: 100, max: 300 },
      electrical_wiring: { min: 80, max: 250 },
      electrical_lighting: { min: 25, max: 60 },
      electrical_appliance: { min: 40, max: 120 },
      plumbing_leak: { min: 50, max: 150 },
      plumbing_blockage: { min: 40, max: 100 },
      plumbing_pressure: { min: 60, max: 180 },
      plumbing_heating: { min: 80, max: 200 },
      hvac_heating: { min: 100, max: 400 },
      hvac_cooling: { min: 80, max: 300 },
      hvac_ventilation: { min: 60, max: 200 },
      general_maintenance: { min: 50, max: 150 },
      unknown: { min: 50, max: 200 }
    };

    const baseCost = costRanges[problemType];
    
    // Adjust based on complexity factors
    let multiplier = 1.0;
    
    if (extractedInfo.safetyIssues.length > 0) {
      multiplier += 0.3; // Safety issues increase complexity
    }
    
    if (extractedInfo.symptoms.length > 3) {
      multiplier += 0.2; // Multiple symptoms indicate complexity
    }

    return {
      min: Math.round(baseCost.min * multiplier),
      max: Math.round(baseCost.max * multiplier),
      currency: 'BGN',
      factors: [
        'Цената включва диагностика и основни материали',
        'Крайната цена зависи от сложността на проблема',
        'Допълнителни материали се заплащат отделно'
      ],
      disclaimer: 'Това е приблизителна оценка. Точната цена ще бъде определена след оглед на място.'
    };
  }

  /**
   * Determine required tools based on problem type
   */
  private async determineRequiredTools(problemType: ProblemType, extractedInfo: any): Promise<string[]> {
    const toolSets: Record<ProblemType, string[]> = {
      electrical_outlet: ['Мултиметър', 'Отвертки', 'Клещи', 'Изолационна лента', 'Тестер за напрежение'],
      electrical_panel: ['Мултиметър', 'Специални клещи', 'Тестер', 'Автомати', 'Кабели'],
      electrical_wiring: ['Кабели', 'Кабелни муфи', 'Изолация', 'Инструменти за окабеляване'],
      electrical_lighting: ['Крушки', 'Ключове', 'Тестер', 'Осветителни тела'],
      electrical_appliance: ['Мултиметър', 'Резервни части', 'Инструменти за ремонт'],
      plumbing_leak: ['Тръби', 'Фитинги', 'Уплътнители', 'Ключове', 'Силикон'],
      plumbing_blockage: ['Спирали', 'Химикали', 'Помпа', 'Инструменти за отпушване'],
      plumbing_pressure: ['Манометър', 'Помпа', 'Вентили', 'Тръби'],
      plumbing_heating: ['Термостат', 'Нагревател', 'Изолация', 'Инструменти'],
      hvac_heating: ['Термостат', 'Филтри', 'Горелка', 'Инструменти за котли'],
      hvac_cooling: ['Хладилен агент', 'Компресор', 'Филтри', 'Инструменти'],
      hvac_ventilation: ['Вентилатори', 'Филтри', 'Канали', 'Инструменти'],
      general_maintenance: ['Основни инструменти', 'Резервни части', 'Материали'],
      unknown: ['Диагностични инструменти', 'Основни материали']
    };

    return toolSets[problemType] || toolSets.unknown;
  }

  /**
   * Generate safety warnings
   */
  private async generateSafetyWarnings(riskAssessment: RiskAssessment, problemType: ProblemType): Promise<string[]> {
    const warnings: string[] = [];

    if (riskAssessment.level === 'critical') {
      warnings.push('⚠️ КРИТИЧНО: Незабавно прекратете използването на системата!');
      warnings.push('🚨 ОПАСНОСТ: Възможен риск за живота и здравето!');
    }

    if (riskAssessment.level === 'high') {
      warnings.push('⚠️ ВНИМАНИЕ: Високо ниво на риск!');
    }

    // Problem-specific warnings
    if (problemType.startsWith('electrical_')) {
      warnings.push('⚡ Не докосвайте електрически елементи с мокри ръце');
      warnings.push('⚡ При искри или дим - веднага спрете електричеството');
    }

    if (problemType.startsWith('plumbing_')) {
      warnings.push('💧 Внимавайте с хлъзгави повърхности');
      warnings.push('💧 При силно течение - спрете водата от главния кран');
    }

    if (problemType.startsWith('hvac_')) {
      warnings.push('🔥 Не запалвайте огън близо до газови уреди');
      warnings.push('🌡️ Проветрявайте помещението при странни миризми');
    }

    return warnings;
  }

  /**
   * Generate next steps
   */
  private async generateNextSteps(
    problemType: ProblemType,
    urgencyLevel: UrgencyLevel,
    riskAssessment: RiskAssessment
  ): Promise<string[]> {
    const steps: string[] = [];

    // Immediate steps based on urgency
    if (urgencyLevel === 'emergency' || riskAssessment.level === 'critical') {
      steps.push('1. Веднага ще се свържа с вас за да уговорим час');
      steps.push('2. Ще дойда в рамките на 30-60 минути');
      steps.push('3. Ще направя пълна диагностика на място');
    } else if (urgencyLevel === 'high') {
      steps.push('1. Ще се свържа с вас до края на деня');
      steps.push('2. Ще уговорим час за утре или най-късно до 2 дни');
      steps.push('3. Ще подготвя необходимите материали');
    } else {
      steps.push('1. Ще се свържа с вас в рамките на 24 часа');
      steps.push('2. Ще уговорим удобен час за вас');
      steps.push('3. Ще направя оглед и ще дам точна оценка');
    }

    // Add completion steps
    steps.push('4. Ще изпълня ремонта професионално и качествено');
    steps.push('5. Ще тествам работата и ще дам гаранция');

    return steps;
  }

  /**
   * Calculate analysis confidence
   */
  private calculateAnalysisConfidence(entities: ExtractedEntity[], messages: AIMessage[]): number {
    let confidence = 0.5; // Base confidence

    // Factor in entity confidence
    if (entities.length > 0) {
      const avgEntityConfidence = entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length;
      confidence += avgEntityConfidence * 0.3;
    }

    // Factor in message count and quality
    const customerMessages = messages.filter(m => m.sender === 'customer');
    if (customerMessages.length >= 3) {
      confidence += 0.2;
    }

    // Factor in problem type identification
    const problemTypeEntity = entities.find(e => e.type === 'problem_type');
    if (problemTypeEntity && problemTypeEntity.confidence > 0.7) {
      confidence += 0.2;
    }

    return Math.min(0.95, Math.max(0.1, confidence));
  }

  /**
   * Check if ready for callback
   */
  private async checkReadinessForCallback(extractedInfo: any, messages: AIMessage[]): Promise<boolean> {
    const hasLocation = !!extractedInfo.location;
    const hasSymptoms = extractedInfo.symptoms.length >= 2;
    const hasEnoughMessages = messages.filter(m => m.sender === 'customer').length >= 3;

    return hasLocation && hasSymptoms && hasEnoughMessages;
  }

  /**
   * Get default analysis for error cases
   */
  private getDefaultAnalysis(): ConversationAnalysis {
    return {
      problemType: 'unknown',
      urgencyLevel: 'medium',
      issueDescription: 'Клиентът описа технически проблем.',
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
      nextSteps: [
        'Ще се свържа с клиента за допълнителна информация',
        'Ще уговорим час за оглед на място'
      ],
      readyForCallback: false,
      confidence: 0.1
    };
  }

  /**
   * Helper method to check if text contains keywords
   */
  private containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword.toLowerCase()));
  }
}
