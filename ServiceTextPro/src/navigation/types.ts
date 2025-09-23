export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Chat: undefined;
  ChatDetail: {
    conversation: {
      id: string;
      customerPhone: string;
      customerName?: string;
      status: 'ai_active' | 'ivan_taken_over' | 'closed' | 'handoff_requested';
      conversationType?: 'phone' | 'marketplace';
      messages: Array<{
        id: string;
        text: string;
        sender: 'customer' | 'ai' | 'ivan';
        timestamp: string;
        isTyping?: boolean;
        isRead?: boolean;
        metadata?: {
          platform: 'viber' | 'whatsapp' | 'telegram';
          messageId?: string;
          deliveryStatus?: 'sent' | 'delivered' | 'read' | 'failed';
        };
      }>;
      lastActivity: string;
      callRecord?: any;
      aiConfidence?: number;
      urgency?: 'low' | 'medium' | 'high' | 'emergency';
    };
  };
  SMS: undefined;
  ReferralDashboard: undefined;
  Settings: undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  Consent: undefined;
  Privacy: undefined;
  DataRights: undefined;
  ProviderProfile: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
