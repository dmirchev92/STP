import { 
  AIMessage, 
  MessageIntent, 
  ExtractedEntity, 
  SentimentAnalysis, 
  ProblemType, 
  UrgencyLevel,
  BulgarianNLPConfig,
  BULGARIAN_KEYWORDS
} from '../../utils/aiTypes';

/**
 * Bulgarian Natural Language Processing Service
 * Handles Bulgarian text analysis for customer messages
 */
export class BulgarianNLPProcessor {
  private static instance: BulgarianNLPProcessor;
  private config: BulgarianNLPConfig;
  private isInitialized: boolean = false;

  private constructor() {
    this.config = {
      fallbackToRules: true,
      enableSentiment: true,
      enableEntityExtraction: true,
      confidenceThreshold: 0.7
    };
  }

  public static getInstance(): BulgarianNLPProcessor {
    if (!BulgarianNLPProcessor.instance) {
      BulgarianNLPProcessor.instance = new BulgarianNLPProcessor();
    }
    return BulgarianNLPProcessor.instance;
  }

  /**
   * Initialize the NLP processor
   */
  async initialize(config?: Partial<BulgarianNLPConfig>): Promise<boolean> {
    try {
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // In production, this would initialize external NLP services
      // For now, we use rule-based processing
      this.isInitialized = true;
      
      console.log('[BulgarianNLP] Initialized with rule-based processing');
      return true;
    } catch (error) {
      console.error('[BulgarianNLP] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Process a customer message and extract insights
   */
  async processMessage(message: AIMessage): Promise<{
    intent: MessageIntent;
    entities: ExtractedEntity[];
    sentiment: SentimentAnalysis;
    confidence: number;
  }> {
    try {
      console.log(`[BulgarianNLP] Processing message: "${message.content}"`);

      const text = message.content.toLowerCase().trim();
      
      // Extract intent
      const intent = await this.extractIntent(text);
      
      // Extract entities
      const entities = await this.extractEntities(text);
      
      // Analyze sentiment
      const sentiment = await this.analyzeSentiment(text);
      
      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(intent, entities, sentiment);

      return {
        intent,
        entities,
        sentiment,
        confidence
      };
    } catch (error) {
      console.error('[BulgarianNLP] Error processing message:', error);
      
      // Return default analysis
      return {
        intent: { name: 'unknown', confidence: 0.1, category: 'clarification' },
        entities: [],
        sentiment: { polarity: 'neutral', confidence: 0.5, emotions: [] },
        confidence: 0.1
      };
    }
  }

  /**
   * Extract message intent using Bulgarian keywords
   */
  private async extractIntent(text: string): Promise<MessageIntent> {
    const intents = [
      {
        name: 'problem_description',
        category: 'problem_description' as const,
        keywords: [
          'проблем', 'не работи', 'счупено', 'повредено', 'спря', 'не върви',
          'искри', 'тече', 'капе', 'запушено', 'блокирано', 'гърми'
        ]
      },
      {
        name: 'emergency',
        category: 'emergency' as const,
        keywords: BULGARIAN_KEYWORDS.urgencyIndicators.emergency
      },
      {
        name: 'question',
        category: 'question' as const,
        keywords: [
          'как', 'кога', 'къде', 'защо', 'колко', 'може ли', 'ще дойдете ли',
          'какво да правя', 'какво означава', 'нормално ли е'
        ]
      },
      {
        name: 'confirmation',
        category: 'confirmation' as const,
        keywords: BULGARIAN_KEYWORDS.confirmationWords.concat(['не', 'не е така', 'грешно'])
      },
      {
        name: 'location_sharing',
        category: 'location_sharing' as const,
        keywords: [
          'адрес', 'намирам се', 'на адрес', 'живея на', 'работя на',
          'в', 'на', 'до', 'близо до', 'срещу'
        ]
      },
      {
        name: 'scheduling',
        category: 'scheduling' as const,
        keywords: [
          'кога', 'час', 'време', 'днес', 'утре', 'довечера', 'сутрин',
          'следобед', 'вечер', 'уикенд', 'работни дни', 'свободен съм'
        ]
      },
      {
        name: 'complaint',
        category: 'complaint' as const,
        keywords: [
          'недоволен', 'лошо', 'зле', 'не ми харесва', 'проблем с',
          'не съм доволен', 'скъпо', 'бавно', 'некачествено'
        ]
      },
      {
        name: 'compliment',
        category: 'compliment' as const,
        keywords: [
          'благодаря', 'мерси', 'добре', 'отлично', 'перфектно', 'доволен',
          'харесва ми', 'професионално', 'бързо', 'качествено'
        ]
      },
      {
        name: 'goodbye',
        category: 'goodbye' as const,
        keywords: [
          'довиждане', 'чао', 'до скоро', 'приятен ден', 'благодаря за всичко',
          'приключихме', 'готово', 'край'
        ]
      }
    ];

    let bestMatch = { name: 'clarification', category: 'clarification' as const, confidence: 0.1 };

    for (const intent of intents) {
      const matches = intent.keywords.filter(keyword => text.includes(keyword));
      if (matches.length > 0) {
        const confidence = Math.min(0.95, matches.length * 0.3 + 0.4);
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            name: intent.name,
            category: intent.category,
            confidence
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Extract entities from Bulgarian text
   */
  private async extractEntities(text: string): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];

    // Extract problem type
    const problemType = this.extractProblemType(text);
    if (problemType) {
      entities.push(problemType);
    }

    // Extract urgency level
    const urgency = this.extractUrgencyLevel(text);
    if (urgency) {
      entities.push(urgency);
    }

    // Extract location
    const location = this.extractLocation(text);
    if (location) {
      entities.push(location);
    }

    // Extract symptoms
    const symptoms = this.extractSymptoms(text);
    entities.push(...symptoms);

    // Extract time expressions
    const timeExpressions = this.extractTimeExpressions(text);
    entities.push(...timeExpressions);

    // Extract safety concerns
    const safetyConcerns = this.extractSafetyConcerns(text);
    entities.push(...safetyConcerns);

    return entities;
  }

  /**
   * Extract problem type from text
   */
  private extractProblemType(text: string): ExtractedEntity | null {
    for (const [problemType, keywords] of Object.entries(BULGARIAN_KEYWORDS.problemTypes)) {
      for (const keyword of keywords) {
        const index = text.indexOf(keyword);
        if (index !== -1) {
          return {
            type: 'problem_type',
            value: problemType,
            confidence: 0.8,
            startIndex: index,
            endIndex: index + keyword.length,
            metadata: { keyword }
          };
        }
      }
    }
    return null;
  }

  /**
   * Extract urgency level from text
   */
  private extractUrgencyLevel(text: string): ExtractedEntity | null {
    for (const [urgencyLevel, keywords] of Object.entries(BULGARIAN_KEYWORDS.urgencyIndicators)) {
      for (const keyword of keywords) {
        const index = text.indexOf(keyword);
        if (index !== -1) {
          return {
            type: 'urgency_level',
            value: urgencyLevel,
            confidence: 0.9,
            startIndex: index,
            endIndex: index + keyword.length,
            metadata: { keyword }
          };
        }
      }
    }
    return null;
  }

  /**
   * Extract location mentions
   */
  private extractLocation(text: string): ExtractedEntity | null {
    for (const location of BULGARIAN_KEYWORDS.locations) {
      const index = text.indexOf(location);
      if (index !== -1) {
        return {
          type: 'location',
          value: location,
          confidence: 0.7,
          startIndex: index,
          endIndex: index + location.length
        };
      }
    }
    return null;
  }

  /**
   * Extract symptom descriptions
   */
  private extractSymptoms(text: string): ExtractedEntity[] {
    const symptoms: ExtractedEntity[] = [];
    
    for (const symptom of BULGARIAN_KEYWORDS.symptoms) {
      const index = text.indexOf(symptom);
      if (index !== -1) {
        symptoms.push({
          type: 'symptom',
          value: symptom,
          confidence: 0.8,
          startIndex: index,
          endIndex: index + symptom.length
        });
      }
    }

    return symptoms;
  }

  /**
   * Extract time expressions
   */
  private extractTimeExpressions(text: string): ExtractedEntity[] {
    const timeExpressions: ExtractedEntity[] = [];
    
    for (const timeExpr of BULGARIAN_KEYWORDS.timeExpressions) {
      const index = text.indexOf(timeExpr);
      if (index !== -1) {
        timeExpressions.push({
          type: 'time',
          value: timeExpr,
          confidence: 0.7,
          startIndex: index,
          endIndex: index + timeExpr.length
        });
      }
    }

    // Extract specific time patterns
    const timePatterns = [
      /(\d{1,2}:\d{2})/g,  // HH:MM format
      /(\d{1,2} часа?)/g,   // X hours
      /(\d{1,2} дни?)/g,    // X days
      /(\d{1,2} седмици?)/g // X weeks
    ];

    for (const pattern of timePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        timeExpressions.push({
          type: 'duration',
          value: match[1],
          confidence: 0.9,
          startIndex: match.index,
          endIndex: match.index + match[1].length
        });
      }
    }

    return timeExpressions;
  }

  /**
   * Extract safety concerns
   */
  private extractSafetyConcerns(text: string): ExtractedEntity[] {
    const safetyKeywords = [
      'опасно', 'рисково', 'искри', 'парене', 'дим', 'мирише', 'токов удар',
      'наводнение', 'протича', 'горещо', 'студено', 'не мога да докосна'
    ];

    const safetyConcerns: ExtractedEntity[] = [];
    
    for (const keyword of safetyKeywords) {
      const index = text.indexOf(keyword);
      if (index !== -1) {
        safetyConcerns.push({
          type: 'safety_concern',
          value: keyword,
          confidence: 0.9,
          startIndex: index,
          endIndex: index + keyword.length
        });
      }
    }

    return safetyConcerns;
  }

  /**
   * Analyze sentiment of Bulgarian text
   */
  private async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    // Positive indicators
    const positiveWords = [
      'добре', 'отлично', 'перфектно', 'доволен', 'харесва', 'благодаря',
      'мерси', 'професионално', 'бързо', 'качествено', 'супер'
    ];

    // Negative indicators
    const negativeWords = [
      'лошо', 'зле', 'недоволен', 'проблем', 'не работи', 'счупено',
      'повредено', 'скъпо', 'бавно', 'некачествено', 'ужасно'
    ];

    // Urgent/worried indicators
    const urgentWords = [
      'спешно', 'бързо', 'веднага', 'притеснен', 'безпокоя се', 'страхувам се'
    ];

    let positiveScore = 0;
    let negativeScore = 0;
    let urgentScore = 0;

    // Count positive words
    positiveWords.forEach(word => {
      if (text.includes(word)) positiveScore++;
    });

    // Count negative words
    negativeWords.forEach(word => {
      if (text.includes(word)) negativeScore++;
    });

    // Count urgent words
    urgentWords.forEach(word => {
      if (text.includes(word)) urgentScore++;
    });

    // Determine overall polarity
    let polarity: 'positive' | 'negative' | 'neutral' = 'neutral';
    let confidence = 0.5;

    if (positiveScore > negativeScore) {
      polarity = 'positive';
      confidence = Math.min(0.95, 0.5 + (positiveScore * 0.2));
    } else if (negativeScore > positiveScore) {
      polarity = 'negative';
      confidence = Math.min(0.95, 0.5 + (negativeScore * 0.2));
    }

    // Build emotion scores
    const emotions = [
      { emotion: 'urgent' as const, score: Math.min(1.0, urgentScore * 0.3) },
      { emotion: 'frustrated' as const, score: Math.min(1.0, negativeScore * 0.25) },
      { emotion: 'satisfied' as const, score: Math.min(1.0, positiveScore * 0.3) },
      { emotion: 'worried' as const, score: Math.min(1.0, urgentScore * 0.2) }
    ].filter(emotion => emotion.score > 0.1);

    return {
      polarity,
      confidence,
      emotions
    };
  }

  /**
   * Calculate overall confidence based on all analyses
   */
  private calculateOverallConfidence(
    intent: MessageIntent,
    entities: ExtractedEntity[],
    sentiment: SentimentAnalysis
  ): number {
    const intentWeight = 0.4;
    const entitiesWeight = 0.4;
    const sentimentWeight = 0.2;

    const entitiesConfidence = entities.length > 0 
      ? entities.reduce((sum, entity) => sum + entity.confidence, 0) / entities.length
      : 0.3;

    const overallConfidence = 
      (intent.confidence * intentWeight) +
      (entitiesConfidence * entitiesWeight) +
      (sentiment.confidence * sentimentWeight);

    return Math.min(0.95, Math.max(0.1, overallConfidence));
  }

  /**
   * Classify problem type based on extracted entities
   */
  async classifyProblemType(entities: ExtractedEntity[]): Promise<ProblemType> {
    const problemTypeEntity = entities.find(e => e.type === 'problem_type');
    if (problemTypeEntity && problemTypeEntity.confidence > this.config.confidenceThreshold) {
      return problemTypeEntity.value as ProblemType;
    }

    // Fallback classification based on symptoms and location
    const symptoms = entities.filter(e => e.type === 'symptom').map(e => e.value);
    const location = entities.find(e => e.type === 'location')?.value;

    // Rule-based classification
    if (symptoms.some(s => ['искри', 'парене', 'токов удар'].includes(s))) {
      return 'electrical_outlet';
    }

    if (symptoms.some(s => ['тече', 'капе', 'наводнение'].includes(s))) {
      return 'plumbing_leak';
    }

    if (symptoms.some(s => ['запушено', 'блокирано'].includes(s))) {
      return 'plumbing_blockage';
    }

    if (location === 'баня' && symptoms.some(s => ['студено', 'няма топла вода'].includes(s))) {
      return 'plumbing_heating';
    }

    return 'unknown';
  }

  /**
   * Determine urgency level from entities
   */
  async determineUrgencyLevel(entities: ExtractedEntity[]): Promise<UrgencyLevel> {
    const urgencyEntity = entities.find(e => e.type === 'urgency_level');
    if (urgencyEntity && urgencyEntity.confidence > this.config.confidenceThreshold) {
      return urgencyEntity.value as UrgencyLevel;
    }

    // Check for safety concerns
    const safetyConcerns = entities.filter(e => e.type === 'safety_concern');
    if (safetyConcerns.length > 0) {
      const dangerousSymptoms = ['искри', 'парене', 'токов удар', 'наводнение', 'дим'];
      if (safetyConcerns.some(sc => dangerousSymptoms.includes(sc.value))) {
        return 'emergency';
      }
      return 'high';
    }

    // Check time expressions for urgency
    const timeEntities = entities.filter(e => e.type === 'time');
    if (timeEntities.some(te => ['току що', 'сега', 'днес'].includes(te.value))) {
      return 'high';
    }

    return 'medium';
  }

  /**
   * Check if message indicates completion readiness
   */
  async isReadyForCompletion(entities: ExtractedEntity[], messageHistory: AIMessage[]): Promise<boolean> {
    // Check if we have enough information
    const hasLocation = entities.some(e => e.type === 'location');
    const hasSymptoms = entities.filter(e => e.type === 'symptom').length >= 2;
    const hasProblemType = entities.some(e => e.type === 'problem_type');
    const hasUrgency = entities.some(e => e.type === 'urgency_level');

    // Check conversation length (at least 3 exchanges)
    const customerMessages = messageHistory.filter(m => m.sender === 'customer').length;

    return hasLocation && hasSymptoms && hasProblemType && hasUrgency && customerMessages >= 3;
  }
}
