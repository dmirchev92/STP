// Messaging platform types for ServiceText Pro

export interface MessageTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  language: 'bg' | 'en';
  subject?: string;
  content: string;
  variables: TemplateVariable[];
  triggers: TemplateTrigger[];
  platform: MessagingPlatform[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export type TemplateCategory = 
  | 'business_hours'
  | 'after_hours'
  | 'emergency'
  | 'new_customer'
  | 'existing_customer'
  | 'job_site'
  | 'vacation'
  | 'follow_up';

export interface TemplateVariable {
  key: string;
  name: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

export interface TemplateTrigger {
  condition: TriggerCondition;
  value?: any;
}

export type TriggerCondition = 
  | 'contact_category'
  | 'contact_priority'
  | 'business_hours'
  | 'emergency_keywords'
  | 'call_frequency'
  | 'time_of_day';

export type MessagingPlatform = 'whatsapp' | 'viber' | 'telegram';

export interface MessageRequest {
  id: string;
  platform: MessagingPlatform;
  recipient: string;
  content: string;
  templateId?: string;
  variables?: Record<string, string>;
  priority: MessagePriority;
  scheduledAt?: number;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
}

export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface MessageResponse {
  id: string;
  platform: MessagingPlatform;
  status: MessageStatus;
  messageId?: string;
  deliveredAt?: number;
  readAt?: number;
  error?: string;
  retryAfter?: number;
}

export type MessageStatus = 
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'expired';

export interface PlatformConfig {
  whatsapp?: WhatsAppConfig;
  viber?: ViberConfig;
  telegram?: TelegramConfig;
}

export interface WhatsAppConfig {
  businessAccountId: string;
  accessToken: string;
  phoneNumberId: string;
  webhookVerifyToken: string;
  enabled: boolean;
}

export interface ViberConfig {
  authToken: string;
  botName: string;
  avatar?: string;
  enabled: boolean;
}

export interface TelegramConfig {
  botToken: string;
  botUsername: string;
  enabled: boolean;
}

export interface MessageStats {
  platform: MessagingPlatform;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  deliveryRate: number;
  readRate: number;
  averageDeliveryTime: number;
  lastUpdated: number;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  platform: MessagingPlatform;
  sender: 'user' | 'bot';
  content: string;
  timestamp: number;
  messageType: 'text' | 'image' | 'document' | 'location';
  metadata?: Record<string, any>;
}

export interface Conversation {
  id: string;
  platform: MessagingPlatform;
  contactId?: string;
  phoneNumber: string;
  status: ConversationStatus;
  messages: ConversationMessage[];
  startedAt: number;
  lastMessageAt: number;
  tags: string[];
  assignedTo?: string;
  priority: MessagePriority;
}

export type ConversationStatus = 
  | 'active'
  | 'waiting'
  | 'resolved'
  | 'closed'
  | 'archived';

// Bulgarian message templates
export const BULGARIAN_TEMPLATES = {
  BUSINESS_HOURS_MISSED_CALL: {
    name: 'Пропуснато обаждане - работно време',
    content: 'Здравейте! В момента не мога да отговоря на телефона. Ще се свържа с Вас възможно най-скоро. За спешни случаи, моля свържете се с мен на {emergencyPhone}.',
    variables: ['emergencyPhone']
  },
  AFTER_HOURS_MISSED_CALL: {
    name: 'Пропуснато обаждане - извън работно време',
    content: 'Здравейте! Обаждате се извън работното ми време ({workHours}). Ще се свържа с Вас утре. За спешни случаи: {emergencyPhone}.',
    variables: ['workHours', 'emergencyPhone']
  },
  EMERGENCY_RESPONSE: {
    name: 'Спешен отговор',
    content: 'СПЕШНО: Получих Вашето обаждане за спешен случай. Свързвам се с Вас в рамките на 15 минути. Ако не мога да се свържа, обърнете се към: {backupContact}.',
    variables: ['backupContact']
  },
  NEW_CUSTOMER: {
    name: 'Нов клиент',
    content: 'Здравейте! Благодаря за обаждането. Аз съм {technicianName}, {profession} с {experience} години опит. Ще се свържа с Вас в рамките на {responseTime} за да обсъдим Вашия проблем.',
    variables: ['technicianName', 'profession', 'experience', 'responseTime']
  },
  EXISTING_CUSTOMER: {
    name: 'Съществуващ клиент',
    content: 'Здравейте, {customerName}! Получих Вашето обаждане. Ще се свържа с Вас скоро за да обсъдим проблема. Последният път работихме заедно по {lastService}.',
    variables: ['customerName', 'lastService']
  },
  JOB_SITE_MODE: {
    name: 'На работа',
    content: 'В момента съм на работно място и не мога да отговоря. Ще завърша към {finishTime} и ще се свържа с Вас. За спешни случаи: {emergencyPhone}.',
    variables: ['finishTime', 'emergencyPhone']
  },
  VACATION_MODE: {
    name: 'В отпуска',
    content: 'В момента съм в отпуска до {returnDate}. За спешни случаи се обърнете към {alternativeContact} - {alternativePhone}. Ще се свържа с Вас след завръщането си.',
    variables: ['returnDate', 'alternativeContact', 'alternativePhone']
  },
  FOLLOW_UP: {
    name: 'Проследяване',
    content: 'Здравейте! Как върви работата, която направих при Вас на {serviceDate}? Ако има някакви проблеми или въпроси, моля свържете се с мен.',
    variables: ['serviceDate']
  }
};

// Emergency keywords for different platforms
export const EMERGENCY_PATTERNS = {
  bulgarian: [
    'спешно', 'авария', 'парене', 'искри', 'току що',
    'веднага', 'незабавно', 'опасно', 'не работи',
    'наводнение', 'късо съединение', 'дим', 'мирише',
    'гърми', 'пукна', 'изтече', 'блокирано'
  ],
  english: [
    'urgent', 'emergency', 'fire', 'sparks', 'burning',
    'immediately', 'dangerous', 'not working', 'flood',
    'short circuit', 'smoke', 'smell', 'exploded',
    'burst', 'leaked', 'blocked'
  ]
};

export interface MessageQueue {
  pending: MessageRequest[];
  processing: MessageRequest[];
  failed: MessageRequest[];
  completed: MessageRequest[];
}

export interface DeliveryReport {
  messageId: string;
  platform: MessagingPlatform;
  recipient: string;
  status: MessageStatus;
  timestamp: number;
  errorCode?: string;
  errorMessage?: string;
}
