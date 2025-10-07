// AI Conversation Engine types for ServiceText Pro

export interface AIConversation {
  id: string;
  contactId?: string;
  phoneNumber: string;
  platform: 'whatsapp' | 'viber' | 'telegram';
  status: ConversationStatus;
  currentState: ConversationState;
  messages: AIMessage[];
  analysis: ConversationAnalysis;
  startedAt: number;
  lastMessageAt: number;
  completedAt?: number;
  metadata: ConversationMetadata;
}

export type ConversationStatus = 
  | 'active'           // Currently ongoing
  | 'waiting_response' // Waiting for customer response
  | 'analyzing'        // AI is processing customer input
  | 'completed'        // All info gathered, ready for callback
  | 'escalated'        // Transferred to human
  | 'closed'           // Conversation ended
  | 'failed';          // Error occurred

export type ConversationState = 
  | 'INITIAL_RESPONSE'      // Auto-message sent
  | 'AWAITING_DESCRIPTION'  // Waiting for problem details
  | 'ANALYZING_PROBLEM'     // AI processing customer response
  | 'FOLLOW_UP_QUESTIONS'   // Asking for clarification
  | 'GATHERING_DETAILS'     // Getting specific information
  | 'PROVIDING_ADVICE'      // Giving initial guidance
  | 'SCHEDULING_VISIT'      // Arranging appointment
  | 'COMPLETED';            // All info gathered

export interface AIMessage {
  id: string;
  conversationId: string;
  sender: 'customer' | 'ai' | 'system';
  content: string;
  timestamp: number;
  messageType: 'text' | 'image' | 'location' | 'contact';
  language: 'bg' | 'en';
  intent?: MessageIntent;
  entities?: ExtractedEntity[];
  sentiment?: SentimentAnalysis;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface MessageIntent {
  name: string;
  confidence: number;
  category: IntentCategory;
  subcategory?: string;
}

export type IntentCategory = 
  | 'problem_description'   // Describing an issue
  | 'emergency'            // Emergency situation
  | 'question'             // Asking a question
  | 'confirmation'         // Yes/no response
  | 'location_sharing'     // Providing address/location
  | 'scheduling'           // Time/date related
  | 'complaint'            // Expressing dissatisfaction
  | 'compliment'           // Expressing satisfaction
  | 'clarification'        // Need more info
  | 'goodbye';             // Ending conversation

export interface ExtractedEntity {
  type: EntityType;
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  metadata?: Record<string, any>;
}

export type EntityType = 
  | 'problem_type'         // electrical, plumbing, hvac
  | 'urgency_level'        // low, medium, high, emergency
  | 'location'             // room, address, building part
  | 'symptom'              // не работи, искри, тече, etc.
  | 'time'                 // when problem started
  | 'duration'             // how long problem exists
  | 'previous_work'        // recent repairs/changes
  | 'tools_needed'         // specific tools mentioned
  | 'safety_concern'       // danger indicators
  | 'cost_estimate'        // price mentioned
  | 'availability'         // when customer is available
  | 'contact_method';      // preferred contact way

export interface SentimentAnalysis {
  polarity: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotions: EmotionScore[];
}

export interface EmotionScore {
  emotion: 'angry' | 'frustrated' | 'worried' | 'satisfied' | 'urgent' | 'calm';
  score: number;
}

export interface ConversationAnalysis {
  problemType: ProblemType;
  urgencyLevel: UrgencyLevel;
  issueDescription: string;
  extractedInfo: ExtractedInformation;
  riskAssessment: RiskAssessment;
  recommendations: Recommendation[];
  estimatedCost?: CostEstimate;
  requiredTools?: string[];
  safetyWarnings?: string[];
  nextSteps: string[];
  readyForCallback: boolean;
  confidence: number;
}

export type ProblemType = 
  | 'electrical_outlet'     // контакт проблеми
  | 'electrical_panel'      // табло проблеми
  | 'electrical_wiring'     // окабеляване проблеми
  | 'electrical_lighting'   // осветление проблеми
  | 'electrical_appliance'  // уред проблеми
  | 'plumbing_leak'         // течение
  | 'plumbing_blockage'     // запушване
  | 'plumbing_pressure'     // налягане проблеми
  | 'plumbing_heating'      // отопление проблеми
  | 'hvac_heating'          // отопление
  | 'hvac_cooling'          // охлаждане
  | 'hvac_ventilation'      // вентилация
  | 'general_maintenance'   // общо поддържане
  | 'unknown';              // неясен проблем

export type UrgencyLevel = 
  | 'low'        // може да изчака дни
  | 'medium'     // трябва в рамките на ден-два
  | 'high'       // трябва днес
  | 'emergency'  // веднага - опасност
  | 'critical';  // критично - спиране на работа

export interface ExtractedInformation {
  location?: string;           // къде е проблемът
  symptoms: string[];          // какво се случва
  duration?: string;           // от кога е проблемът
  previousWork?: string;       // скорошни ремонти
  safetyIssues: string[];     // опасности
  customerAvailability?: string; // кога е свободен клиентът
  preferredTime?: string;      // предпочитано време
  additionalNotes: string[];   // допълнителни бележки
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  immediateActions: string[];
  safetyPrecautions: string[];
}

export interface Recommendation {
  type: 'immediate_action' | 'preparation' | 'safety' | 'temporary_fix';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export interface CostEstimate {
  min: number;
  max: number;
  currency: 'BGN';
  factors: string[];
  disclaimer: string;
}

export interface ConversationMetadata {
  customerLanguage: 'bg' | 'en';
  platformSpecific?: Record<string, any>;
  aiModel: string;
  processingTime: number;
  tokensUsed?: number;
  apiCalls: number;
  errorCount: number;
}

// Bulgarian NLP specific types
export interface BulgarianNLPConfig {
  modelEndpoint?: string;
  apiKey?: string;
  fallbackToRules: boolean;
  enableSentiment: boolean;
  enableEntityExtraction: boolean;
  confidenceThreshold: number;
}

export interface BulgarianKeywords {
  problemTypes: Record<ProblemType, string[]>;
  urgencyIndicators: Record<UrgencyLevel, string[]>;
  locations: string[];
  symptoms: string[];
  timeExpressions: string[];
  confirmationWords: string[];
  negationWords: string[];
}

// Pre-defined Bulgarian keywords for problem identification
export const BULGARIAN_KEYWORDS: BulgarianKeywords = {
  problemTypes: {
    electrical_outlet: ['контакт', 'контакти', 'щепсел', 'ток', 'захранване', 'утка'],
    electrical_panel: ['табло', 'разпределително', 'предпазители', 'автомати', 'щит'],
    electrical_wiring: ['кабел', 'кабели', 'жици', 'окабеляване', 'проводници'],
    electrical_lighting: ['лампа', 'лампи', 'осветление', 'светлина', 'крушка', 'LED'],
    electrical_appliance: ['уред', 'машина', 'електроуред', 'апарат', 'устройство'],
    plumbing_leak: ['тече', 'течение', 'капе', 'мокро', 'влага', 'наводнение'],
    plumbing_blockage: ['запушено', 'запушване', 'блокирано', 'не тече', 'задръстване'],
    plumbing_pressure: ['налягане', 'слабо', 'силно', 'няма вода', 'малко вода'],
    plumbing_heating: ['отопление', 'топла вода', 'котел', 'радиатор', 'парно'],
    hvac_heating: ['отопление', 'парно', 'радиатор', 'котел', 'топло'],
    hvac_cooling: ['климатик', 'климатизация', 'охлаждане', 'студено', 'вентилатор'],
    hvac_ventilation: ['вентилация', 'въздух', 'духа', 'смуче', 'вентилатор'],
    general_maintenance: ['поддръжка', 'ремонт', 'преглед', 'сервиз', 'профилактика'],
    unknown: []
  },
  urgencyIndicators: {
    emergency: ['спешно', 'авария', 'опасно', 'парене', 'искри', 'токов удар', 'наводнение'],
    critical: ['веднага', 'незабавно', 'току що', 'критично', 'много спешно'],
    high: ['днес', 'сега', 'бързо', 'не може да чака', 'важно'],
    medium: ['скоро', 'тази седмица', 'в близо време', 'когато можете'],
    low: ['няма бързане', 'когато имате време', 'не е спешно', 'може да изчака']
  },
  locations: [
    'кухня', 'баня', 'тоалетна', 'хол', 'спалня', 'детска', 'коридор', 'балкон',
    'мазе', 'таван', 'гараж', 'двор', 'градина', 'офис', 'магазин', 'склад',
    'вход', 'стълбище', 'асансьор', 'покрив', 'фасада', 'стена', 'под', 'таван'
  ],
  symptoms: [
    'не работи', 'не върви', 'спря', 'счупено', 'повредено', 'изгоря',
    'искри', 'пуши', 'мирише', 'гърми', 'пука', 'шуми', 'вибрира',
    'тече', 'капе', 'наводнява', 'блокирано', 'запушено', 'студено', 'топло'
  ],
  timeExpressions: [
    'току що', 'преди малко', 'днес', 'вчера', 'тази седмица', 'миналата седмица',
    'от утре', 'от вчера', 'от няколко дни', 'от седмица', 'от месец'
  ],
  confirmationWords: ['да', 'точно', 'правилно', 'така е', 'верно', 'добре'],
  negationWords: ['не', 'не е', 'не точно', 'грешно', 'друго', 'различно']
};

// Conversation flow configuration
export interface ConversationFlow {
  initialQuestions: FlowQuestion[];
  followUpQuestions: Record<ProblemType, FlowQuestion[]>;
  emergencyFlow: FlowQuestion[];
  completionCriteria: CompletionCriteria;
}

export interface FlowQuestion {
  id: string;
  text: string;
  type: 'open' | 'closed' | 'choice' | 'location' | 'time';
  required: boolean;
  followUp?: string[];
  condition?: QuestionCondition;
}

export interface QuestionCondition {
  field: keyof ExtractedInformation;
  operator: 'exists' | 'equals' | 'contains' | 'missing';
  value?: any;
}

export interface CompletionCriteria {
  requiredFields: (keyof ExtractedInformation)[];
  minimumSymptoms: number;
  riskAssessmentRequired: boolean;
  customerConfirmationRequired: boolean;
}

// AI Response generation types
export interface AIResponseContext {
  conversation: AIConversation;
  lastCustomerMessage: AIMessage;
  analysisResults: ConversationAnalysis;
  businessContext: BusinessContext;
}

export interface BusinessContext {
  technicianName: string;
  profession: string;
  experience: string;
  workingHours: string;
  emergencyPhone: string;
  currentTime: Date;
  isBusinessHours: boolean;
}

export interface GeneratedResponse {
  content: string;
  type: 'question' | 'advice' | 'confirmation' | 'scheduling' | 'completion';
  nextState: ConversationState;
  followUpActions?: FollowUpAction[];
  metadata: ResponseMetadata;
}

export interface FollowUpAction {
  type: 'set_reminder' | 'create_task' | 'send_summary' | 'escalate';
  delay?: number;
  data?: Record<string, any>;
}

export interface ResponseMetadata {
  confidence: number;
  reasoning: string;
  alternativeResponses?: string[];
  processingTime: number;
}
