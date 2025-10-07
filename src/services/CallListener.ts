import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid } from 'react-native';
import { CallRecord, CallEvent, Contact } from '../utils/types';
import { CallLogManager } from './CallLogManager';
import { ContactService } from './ContactService';

interface CallListenerModule {
  startListening(): Promise<boolean>;
  stopListening(): Promise<boolean>;
  isListening(): Promise<boolean>;
}

class CallListenerService {
  private static instance: CallListenerService;
  private callLogManager: CallLogManager;
  private contactService: ContactService;
  private eventEmitter: NativeEventEmitter | null = null;
  private isListening: boolean = false;
  private lastProcessedCallId: string | null = null;

  private constructor() {
    this.callLogManager = CallLogManager.getInstance();
    this.contactService = ContactService.getInstance();
    this.setupEventEmitter();
  }

  public static getInstance(): CallListenerService {
    if (!CallListenerService.instance) {
      CallListenerService.instance = new CallListenerService();
    }
    return CallListenerService.instance;
  }

  private setupEventEmitter(): void {
    if (Platform.OS === 'android') {
      // For now, we'll use polling instead of native events
      // In production, this would be replaced with a proper native module
      this.startPollingCallLog();
    }
  }

  /**
   * Request necessary permissions for call log access
   */
  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        ]);

        return (
          granted[PermissionsAndroid.PERMISSIONS.READ_CALL_LOG] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.READ_CONTACTS] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (error) {
        console.error('Error requesting permissions:', error);
        return false;
      }
    }
    return true; // iOS handles permissions differently
  }

  /**
   * Start monitoring for missed calls
   */
  public async startListening(): Promise<boolean> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        throw new Error('Required permissions not granted');
      }

      this.isListening = true;
      console.log('CallListener: Started monitoring for missed calls');
      return true;
    } catch (error) {
      console.error('Error starting call listener:', error);
      return false;
    }
  }

  /**
   * Stop monitoring for missed calls
   */
  public async stopListening(): Promise<boolean> {
    try {
      this.isListening = false;
      console.log('CallListener: Stopped monitoring for missed calls');
      return true;
    } catch (error) {
      console.error('Error stopping call listener:', error);
      return false;
    }
  }

  /**
   * Polling mechanism to check for new missed calls
   * In production, this would be replaced with proper native event listeners
   */
  private startPollingCallLog(): void {
    setInterval(async () => {
      if (!this.isListening) return;

      try {
        await this.checkForNewMissedCalls();
      } catch (error) {
        console.error('Error checking for missed calls:', error);
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Check for new missed calls and process them
   */
  private async checkForNewMissedCalls(): Promise<void> {
    try {
      const recentCalls = await this.callLogManager.getRecentCalls(50);
      const missedCalls = recentCalls.filter(call => call.type === 'missed');

      for (const call of missedCalls) {
        if (this.lastProcessedCallId && call.id <= this.lastProcessedCallId) {
          continue; // Already processed this call
        }

        await this.processMissedCall(call);
        this.lastProcessedCallId = call.id;
      }
    } catch (error) {
      console.error('Error checking for new missed calls:', error);
    }
  }

  /**
   * Process a missed call and trigger appropriate response
   */
  private async processMissedCall(callRecord: CallRecord): Promise<void> {
    try {
      console.log(`Processing missed call from ${callRecord.phoneNumber}`);

      // Get contact information
      const contact = await this.contactService.findContactByPhone(callRecord.phoneNumber);

      // Create call event
      const callEvent: CallEvent = {
        id: `event_${callRecord.id}_${Date.now()}`,
        callRecord,
        contact: contact || undefined,
        timestamp: Date.now(),
        processed: false,
        responseTriggered: false,
      };

      // Store call event
      await this.callLogManager.storeCallEvent(callEvent);

      // Trigger auto-response workflow
      await this.triggerAutoResponse(callEvent);

      console.log(`Processed missed call event: ${callEvent.id}`);
    } catch (error) {
      console.error('Error processing missed call:', error);
    }
  }

  /**
   * Trigger auto-response workflow for missed call
   */
  private async triggerAutoResponse(callEvent: CallEvent): Promise<void> {
    try {
      // Import ResponseEngine dynamically to avoid circular dependencies
      const { ResponseEngine } = await import('./ResponseEngine');
      const responseEngine = ResponseEngine.getInstance();
      
      await responseEngine.processCallEvent(callEvent);
    } catch (error) {
      console.error('Error triggering auto-response:', error);
    }
  }

  /**
   * Get current listening status
   */
  public getListeningStatus(): boolean {
    return this.isListening;
  }

  /**
   * Manually check for missed calls (for testing purposes)
   */
  public async manualCheck(): Promise<CallEvent[]> {
    const events: CallEvent[] = [];
    
    try {
      const recentCalls = await this.callLogManager.getRecentCalls(10);
      const missedCalls = recentCalls.filter(call => call.type === 'missed');

      for (const call of missedCalls) {
        const contact = await this.contactService.findContactByPhone(call.phoneNumber);
        
        const callEvent: CallEvent = {
          id: `manual_${call.id}_${Date.now()}`,
          callRecord: call,
          contact: contact || undefined,
          timestamp: Date.now(),
          processed: false,
          responseTriggered: false,
        };

        events.push(callEvent);
      }
    } catch (error) {
      console.error('Error during manual check:', error);
    }

    return events;
  }
}

export default CallListenerService;

