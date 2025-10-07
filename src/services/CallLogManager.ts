import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CallRecord, CallEvent, Contact } from '../utils/types';

// Mock call log data for development
// In production, this would use react-native-call-log or similar
interface MockCallData {
  id: string;
  phoneNumber: string;
  timestamp: number;
  duration: number;
  type: 'incoming' | 'outgoing' | 'missed';
  name?: string;
}

export class CallLogManager {
  private static instance: CallLogManager;
  private readonly CALL_EVENTS_KEY = '@ServiceTextPro:CallEvents';
  private readonly PROCESSED_CALLS_KEY = '@ServiceTextPro:ProcessedCalls';

  private constructor() {}

  public static getInstance(): CallLogManager {
    if (!CallLogManager.instance) {
      CallLogManager.instance = new CallLogManager();
    }
    return CallLogManager.instance;
  }

  /**
   * Get recent calls from device call log
   * For development, this returns mock data
   */
  public async getRecentCalls(limit: number = 50): Promise<CallRecord[]> {
    try {
      if (Platform.OS === 'android') {
        // In production, this would use react-native-call-log
        return await this.getMockCallData(limit);
      } else {
        // iOS implementation would go here
        return await this.getMockCallData(limit);
      }
    } catch (error) {
      console.error('Error getting recent calls:', error);
      return [];
    }
  }

  /**
   * Mock call data for development and testing
   */
  private async getMockCallData(limit: number): Promise<CallRecord[]> {
    const mockCalls: MockCallData[] = [
      {
        id: '1',
        phoneNumber: '+359888123456',
        timestamp: Date.now() - 300000, // 5 minutes ago
        duration: 0, // missed call
        type: 'missed',
        name: 'Иван Петров'
      },
      {
        id: '2',
        phoneNumber: '+359887654321',
        timestamp: Date.now() - 600000, // 10 minutes ago
        duration: 45,
        type: 'incoming',
        name: 'Мария Георгиева'
      },
      {
        id: '3',
        phoneNumber: '+359876543210',
        timestamp: Date.now() - 900000, // 15 minutes ago
        duration: 0,
        type: 'missed',
      },
      {
        id: '4',
        phoneNumber: '+359888999888',
        timestamp: Date.now() - 1800000, // 30 minutes ago
        duration: 120,
        type: 'outgoing',
        name: 'Строителна фирма'
      },
      {
        id: '5',
        phoneNumber: '+359877111222',
        timestamp: Date.now() - 3600000, // 1 hour ago
        duration: 0,
        type: 'missed',
        name: 'Спешен клиент'
      }
    ];

    return mockCalls.slice(0, limit).map(call => ({
      id: call.id,
      phoneNumber: call.phoneNumber,
      timestamp: call.timestamp,
      duration: call.duration,
      type: call.type,
      contactName: call.name,
    }));
  }

  /**
   * Get calls from native call log (production implementation)
   */
  private async getNativeCallLog(limit: number): Promise<CallRecord[]> {
    try {
      // This would use react-native-call-log in production
      // const CallLogs = require('react-native-call-log');
      // const calls = await CallLogs.loadAll();
      
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error accessing native call log:', error);
      return [];
    }
  }

  /**
   * Filter out spam/blocked numbers
   */
  public async filterSpamNumbers(calls: CallRecord[]): Promise<CallRecord[]> {
    try {
      // Get blocked numbers from storage
      const blockedNumbers = await this.getBlockedNumbers();
      
      return calls.filter(call => {
        // Filter out blocked numbers
        if (blockedNumbers.includes(call.phoneNumber)) {
          return false;
        }

        // Filter out obvious spam patterns
        if (this.isLikelySpam(call.phoneNumber)) {
          return false;
        }

        return true;
      });
    } catch (error) {
      console.error('Error filtering spam numbers:', error);
      return calls;
    }
  }

  /**
   * Check if a phone number is likely spam
   */
  private isLikelySpam(phoneNumber: string): boolean {
    // Basic spam detection patterns
    const spamPatterns = [
      /^\+1800/, // 1-800 numbers
      /^\+1888/, // 1-888 numbers
      /^0800/,   // 0800 numbers
      /^1234/,   // Sequential numbers
    ];

    return spamPatterns.some(pattern => pattern.test(phoneNumber));
  }

  /**
   * Get blocked numbers from storage
   */
  private async getBlockedNumbers(): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem('@ServiceTextPro:BlockedNumbers');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting blocked numbers:', error);
      return [];
    }
  }

  /**
   * Add number to blocked list
   */
  public async blockNumber(phoneNumber: string): Promise<void> {
    try {
      const blocked = await this.getBlockedNumbers();
      if (!blocked.includes(phoneNumber)) {
        blocked.push(phoneNumber);
        await AsyncStorage.setItem('@ServiceTextPro:BlockedNumbers', JSON.stringify(blocked));
      }
    } catch (error) {
      console.error('Error blocking number:', error);
    }
  }

  /**
   * Remove number from blocked list
   */
  public async unblockNumber(phoneNumber: string): Promise<void> {
    try {
      const blocked = await this.getBlockedNumbers();
      const filtered = blocked.filter(num => num !== phoneNumber);
      await AsyncStorage.setItem('@ServiceTextPro:BlockedNumbers', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error unblocking number:', error);
    }
  }

  /**
   * Store call event for processing
   */
  public async storeCallEvent(callEvent: CallEvent): Promise<void> {
    try {
      const events = await this.getStoredCallEvents();
      events.push(callEvent);
      
      // Keep only last 100 events
      const recentEvents = events.slice(-100);
      
      await AsyncStorage.setItem(this.CALL_EVENTS_KEY, JSON.stringify(recentEvents));
    } catch (error) {
      console.error('Error storing call event:', error);
    }
  }

  /**
   * Get stored call events
   */
  public async getStoredCallEvents(): Promise<CallEvent[]> {
    try {
      const stored = await AsyncStorage.getItem(this.CALL_EVENTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting stored call events:', error);
      return [];
    }
  }

  /**
   * Mark call event as processed
   */
  public async markEventProcessed(eventId: string): Promise<void> {
    try {
      const events = await this.getStoredCallEvents();
      const updatedEvents = events.map(event => 
        event.id === eventId 
          ? { ...event, processed: true }
          : event
      );
      
      await AsyncStorage.setItem(this.CALL_EVENTS_KEY, JSON.stringify(updatedEvents));
    } catch (error) {
      console.error('Error marking event as processed:', error);
    }
  }

  /**
   * Get unprocessed call events
   */
  public async getUnprocessedEvents(): Promise<CallEvent[]> {
    try {
      const events = await this.getStoredCallEvents();
      return events.filter(event => !event.processed);
    } catch (error) {
      console.error('Error getting unprocessed events:', error);
      return [];
    }
  }

  /**
   * Associate calls with existing contacts
   */
  public async associateCallsWithContacts(calls: CallRecord[]): Promise<CallRecord[]> {
    try {
      const { ContactService } = await import('./ContactService');
      const contactService = ContactService.getInstance();
      
      const associatedCalls = await Promise.all(
        calls.map(async (call) => {
          const contact = await contactService.findContactByPhone(call.phoneNumber);
          return {
            ...call,
            contactName: contact?.name || call.contactName,
            contactId: contact?.id,
          };
        })
      );

      return associatedCalls;
    } catch (error) {
      console.error('Error associating calls with contacts:', error);
      return calls;
    }
  }

  /**
   * Get call statistics
   */
  public async getCallStatistics(phoneNumber?: string): Promise<{
    totalCalls: number;
    missedCalls: number;
    answeredCalls: number;
    averageDuration: number;
  }> {
    try {
      const events = await this.getStoredCallEvents();
      let filteredEvents = events;

      if (phoneNumber) {
        filteredEvents = events.filter(event => 
          event.callRecord.phoneNumber === phoneNumber
        );
      }

      const calls = filteredEvents.map(event => event.callRecord);
      const totalCalls = calls.length;
      const missedCalls = calls.filter(call => call.type === 'missed').length;
      const answeredCalls = calls.filter(call => 
        call.type === 'incoming' && call.duration > 0
      ).length;

      const totalDuration = calls
        .filter(call => call.duration > 0)
        .reduce((sum, call) => sum + call.duration, 0);
      
      const averageDuration = answeredCalls > 0 ? totalDuration / answeredCalls : 0;

      return {
        totalCalls,
        missedCalls,
        answeredCalls,
        averageDuration,
      };
    } catch (error) {
      console.error('Error getting call statistics:', error);
      return {
        totalCalls: 0,
        missedCalls: 0,
        answeredCalls: 0,
        averageDuration: 0,
      };
    }
  }

  /**
   * Clear old call events (cleanup)
   */
  public async clearOldEvents(olderThanDays: number = 30): Promise<void> {
    try {
      const events = await this.getStoredCallEvents();
      const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
      
      const recentEvents = events.filter(event => 
        event.timestamp > cutoffTime
      );

      await AsyncStorage.setItem(this.CALL_EVENTS_KEY, JSON.stringify(recentEvents));
    } catch (error) {
      console.error('Error clearing old events:', error);
    }
  }
}

