import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
const API_BASE_URL = 'http://192.168.0.129:3000/api/v1';
const API_TIMEOUT = 10000;

// Types
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: 'tradesperson' | 'employee' | 'admin';
  businessId?: string;
  isGdprCompliant: boolean;
}

export class ApiService {
  private static instance: ApiService;
  private authToken: string | null = null;

  private constructor() {
    this.loadAuthToken();
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private async loadAuthToken(): Promise<void> {
    try {
      this.authToken = await AsyncStorage.getItem('auth_token');
    } catch (error) {
      console.error('Error loading auth token:', error);
    }
  }

  private async saveAuthToken(token: string): Promise<void> {
    try {
      this.authToken = token;
      await AsyncStorage.setItem('auth_token', token);
    } catch (error) {
      console.error('Error saving auth token:', error);
    }
  }

  public async setAuthToken(token: string): Promise<void> {
    await this.saveAuthToken(token);
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log('makeRequest - URL:', url);
      const headers: any = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (this.authToken) {
        headers.Authorization = `Bearer ${this.authToken}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log('makeRequest - Response status:', response.status);
      console.log('makeRequest - Response ok:', response.ok);

      const data: any = await response.json();
      console.log('makeRequest - Response data:', data);

      if (!response.ok) {
        console.log('makeRequest - Response not ok, returning error');
        return {
          success: false,
          error: {
            code: data.error?.code || 'API_ERROR',
            message: data.error?.message || 'An error occurred',
          },
        };
      }

      console.log('makeRequest - Response ok, returning success');
      return {
        success: true,
        data: data.data || data,
      };
    } catch (error) {
      console.error('makeRequest - API request failed:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
    }
  }

  // Authentication Methods
  public async login(email: string, password: string): Promise<APIResponse<{ user: User; tokens: any }>> {
    const response = await this.makeRequest<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data?.tokens?.accessToken) {
      await this.saveAuthToken(response.data.tokens.accessToken);
    }

    return response as APIResponse<{ user: User; tokens: any }>;
  }

  public async getCurrentUser(): Promise<APIResponse<User>> {
    return this.makeRequest('/auth/me');
  }

  public async logout(): Promise<APIResponse<any>> {
    const response = await this.makeRequest('/auth/logout', {
      method: 'POST',
    });
    
    // Clear the auth token regardless of response
    this.authToken = null;
    await AsyncStorage.removeItem('auth_token');
    
    return response;
  }

  // Health Check
  public async healthCheck(): Promise<APIResponse<{ status: string; timestamp: string }>> {
    return this.makeRequest('/health');
  }

  // User Registration
  public async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    serviceCategory?: string;
    role: 'tradesperson';
    gdprConsents?: string[];
  }): Promise<APIResponse<{ user: User; tokens: any }>> {
    console.log('ApiService register - sending data:', userData);
    const response = await this.makeRequest<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    console.log('ApiService register - received response:', response);

    if (response.success && response.data?.tokens?.accessToken) {
      console.log('ApiService register - saving auth token');
      await this.saveAuthToken(response.data.tokens.accessToken);
    }

    return response as APIResponse<{ user: User; tokens: any }>;
  }

  // Sync Missed Calls to Backend
  public async syncMissedCalls(missedCalls: any[]): Promise<APIResponse<any>> {
    return this.makeRequest('/sync/missed-calls', {
      method: 'POST',
      body: JSON.stringify({ missedCalls }),
    });
  }

  // Sync SMS Data to Backend
  public async syncSMSSent(smsData: any[]): Promise<APIResponse<any>> {
    return this.makeRequest('/sync/sms-sent', {
      method: 'POST',
      body: JSON.stringify({ smsData }),
    });
  }

  // Get Dashboard Statistics
  public async getDashboardStats(): Promise<APIResponse<any>> {
    return this.makeRequest('/dashboard/stats');
  }

  public isAuthenticated(): boolean {
    return this.authToken !== null;
  }

  // Chat Methods - Unified API for both phone and marketplace conversations
  public async getConversations(userId: string): Promise<APIResponse> {
    console.log('📱 ApiService - Getting conversations for user:', userId);
    return this.makeRequest(`/chat/user/${userId}/conversations`);
  }

  public async getConversationMessages(
    conversationId: string, 
    conversationType: 'phone' | 'marketplace'
  ): Promise<APIResponse> {
    console.log('📱 ApiService - Getting messages for conversation:', conversationId, 'type:', conversationType);
    return this.makeRequest(`/chat/unified/${conversationId}/messages?conversationType=${conversationType}`);
  }

  public async sendMessage(conversationId: string, messageData: {
    text: string;
    platform?: string;
    conversationType?: 'phone' | 'marketplace';
  }): Promise<APIResponse> {
    const conversationType = messageData.conversationType || 'phone';
    
    if (conversationType === 'marketplace') {
      // For marketplace conversations, use the marketplace message format
      // Get current user info for sender name
      let senderName = 'Service Provider';
      try {
        const userResponse = await this.getCurrentUser();
        const user: any = (userResponse.data as any)?.user || userResponse.data;
        if (userResponse.success && user?.firstName) {
          senderName = `${user.firstName} ${user.lastName}`;
        }
      } catch (error) {
        console.warn('Could not get current user for sender name:', error);
      }

      const data = {
        conversationId,
        senderType: 'provider' as const,
        senderName,
        message: messageData.text,
      };
      
      console.log('📱 ApiService - Sending marketplace message');
      return this.makeRequest('/chat/messages', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } else {
      // For phone conversations, use the phone message format
      console.log('📱 ApiService - Sending phone message');
      return this.makeRequest('/messaging/send', {
        method: 'POST',
        body: JSON.stringify({
          conversationId,
          message: messageData.text,
          platform: messageData.platform || 'viber'
        }),
      });
    }
  }

  public async sendMarketplaceMessage(data: {
    conversationId: string;
    senderType: 'customer' | 'provider';
    senderName: string;
    message: string;
  }): Promise<APIResponse> {
    console.log('📱 ApiService - Sending marketplace message');
    return this.makeRequest('/chat/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async markMessagesAsRead(
    conversationId: string, 
    senderType: 'customer' | 'provider'
  ): Promise<APIResponse> {
    console.log('📱 ApiService - Marking messages as read');
    return this.makeRequest(`/chat/conversations/${conversationId}/read`, {
      method: 'PUT',
      body: JSON.stringify({ senderType }),
    });
  }

  public async requestHandoff(conversationId: string): Promise<APIResponse> {
    console.log('📱 ApiService - Requesting handoff for conversation:', conversationId);
    return this.makeRequest(`/chat/conversations/${conversationId}/handoff`, {
      method: 'POST',
    });
  }

  // Provider Profile - Create/Update
  public async upsertProviderProfile(payload: {
    userId: string;
    profile: any;
    gallery?: string[];
    certificates?: Array<{ title?: string; fileUrl?: string; issuedBy?: string; issuedAt?: string }>
  }): Promise<APIResponse> {
    return this.makeRequest('/marketplace/providers/profile', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Marketplace - Service Categories
  public async getServiceCategories(): Promise<APIResponse<any[]>> {
    return this.makeRequest('/marketplace/categories');
  }

  public async closeConversation(conversationId: string): Promise<APIResponse> {
    console.log('📱 ApiService - Closing conversation:', conversationId);
    return this.makeRequest(`/chat/conversations/${conversationId}/close`, {
      method: 'POST',
    });
  }
}

export default ApiService;