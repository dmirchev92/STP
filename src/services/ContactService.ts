import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Contacts from 'react-native-contacts';
import { Contact, ContactCategory, ContactPriority, ContactMetadata, ContactPreferences } from '../utils/types';

export class ContactService {
  private static instance: ContactService;
  private readonly CONTACTS_KEY = '@ServiceTextPro:Contacts';
  private readonly CONTACT_METADATA_KEY = '@ServiceTextPro:ContactMetadata';
  private contactsCache: Contact[] = [];
  private lastCacheUpdate: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): ContactService {
    if (!ContactService.instance) {
      ContactService.instance = new ContactService();
    }
    return ContactService.instance;
  }

  /**
   * Request contacts permission
   */
  public async requestContactsPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Permission',
            message: 'ServiceText Pro needs access to your contacts to identify callers.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true; // iOS handles permissions differently
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      return false;
    }
  }

  /**
   * Import contacts from device phonebook
   */
  public async importDeviceContacts(): Promise<Contact[]> {
    try {
      const hasPermission = await this.requestContactsPermission();
      if (!hasPermission) {
        throw new Error('Contacts permission not granted');
      }

      const deviceContacts = await Contacts.getAll();
      const importedContacts: Contact[] = [];

      for (const deviceContact of deviceContacts) {
        if (deviceContact.phoneNumbers && deviceContact.phoneNumbers.length > 0) {
          const contact: Contact = {
            id: deviceContact.recordID || `contact_${Date.now()}_${Math.random()}`,
            name: `${deviceContact.givenName || ''} ${deviceContact.familyName || ''}`.trim() || 'Unknown',
            phoneNumbers: deviceContact.phoneNumbers.map(phone => this.normalizePhoneNumber(phone.number)),
            category: 'new_prospect', // Default category
            priority: 'medium', // Default priority
            preferences: {
              preferredPlatform: 'whatsapp', // Default to WhatsApp
              language: 'bg', // Default to Bulgarian
            },
            metadata: {
              totalCalls: 0,
              totalMissedCalls: 0,
              responseRate: 0,
            },
          };

          importedContacts.push(contact);
        }
      }

      // Store imported contacts
      await this.storeContacts(importedContacts);
      this.contactsCache = importedContacts;
      this.lastCacheUpdate = Date.now();

      console.log(`Imported ${importedContacts.length} contacts from device`);
      return importedContacts;
    } catch (error) {
      console.error('Error importing device contacts:', error);
      return [];
    }
  }

  /**
   * Normalize phone number format
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except +
    let normalized = phoneNumber.replace(/[^\d+]/g, '');
    
    // Handle Bulgarian numbers
    if (normalized.startsWith('0')) {
      normalized = '+359' + normalized.substring(1);
    } else if (normalized.startsWith('359') && !normalized.startsWith('+359')) {
      normalized = '+' + normalized;
    } else if (!normalized.startsWith('+') && normalized.length >= 9) {
      // Assume Bulgarian number if no country code
      normalized = '+359' + normalized;
    }

    return normalized;
  }

  /**
   * Find contact by phone number
   */
  public async findContactByPhone(phoneNumber: string): Promise<Contact | null> {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      const contacts = await this.getContacts();

      return contacts.find(contact => 
        contact.phoneNumbers.some(phone => 
          this.normalizePhoneNumber(phone) === normalizedPhone
        )
      ) || null;
    } catch (error) {
      console.error('Error finding contact by phone:', error);
      return null;
    }
  }

  /**
   * Get all contacts (with caching)
   */
  public async getContacts(): Promise<Contact[]> {
    try {
      // Return cached contacts if still valid
      if (this.contactsCache.length > 0 && 
          Date.now() - this.lastCacheUpdate < this.CACHE_DURATION) {
        return this.contactsCache;
      }

      // Load from storage
      const stored = await AsyncStorage.getItem(this.CONTACTS_KEY);
      if (stored) {
        this.contactsCache = JSON.parse(stored);
        this.lastCacheUpdate = Date.now();
        return this.contactsCache;
      }

      // If no stored contacts, try importing from device
      return await this.importDeviceContacts();
    } catch (error) {
      console.error('Error getting contacts:', error);
      return [];
    }
  }

  /**
   * Store contacts to AsyncStorage
   */
  private async storeContacts(contacts: Contact[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CONTACTS_KEY, JSON.stringify(contacts));
    } catch (error) {
      console.error('Error storing contacts:', error);
    }
  }

  /**
   * Add or update contact
   */
  public async saveContact(contact: Contact): Promise<void> {
    try {
      const contacts = await this.getContacts();
      const existingIndex = contacts.findIndex(c => c.id === contact.id);

      if (existingIndex >= 0) {
        contacts[existingIndex] = contact;
      } else {
        contacts.push(contact);
      }

      await this.storeContacts(contacts);
      this.contactsCache = contacts;
      this.lastCacheUpdate = Date.now();
    } catch (error) {
      console.error('Error saving contact:', error);
    }
  }

  /**
   * Categorize contact automatically
   */
  public async categorizeContact(contact: Contact): Promise<ContactCategory> {
    try {
      // Check if contact has service history
      if (contact.serviceHistory && contact.serviceHistory.length > 0) {
        return 'existing_customer';
      }

      // Check call frequency and patterns
      const metadata = contact.metadata;
      if (metadata) {
        // High-value customers
        if (metadata.averageJobValue && metadata.averageJobValue > 500) {
          return 'existing_customer';
        }

        // Frequent callers
        if (metadata.totalCalls > 10) {
          return 'existing_customer';
        }

        // Poor response rate might indicate spam
        if (metadata.responseRate < 0.2 && metadata.totalCalls > 5) {
          return 'blacklisted';
        }
      }

      // Check for business keywords in name
      const businessKeywords = [
        'фирма', 'еоод', 'ад', 'ет', 'company', 'ltd', 'inc',
        'строителна', 'електро', 'техник', 'майстор'
      ];

      const nameToCheck = contact.name.toLowerCase();
      if (businessKeywords.some(keyword => nameToCheck.includes(keyword))) {
        return 'supplier';
      }

      // Default to new prospect
      return 'new_prospect';
    } catch (error) {
      console.error('Error categorizing contact:', error);
      return 'new_prospect';
    }
  }

  /**
   * Determine contact priority
   */
  public async determineContactPriority(contact: Contact): Promise<ContactPriority> {
    try {
      const metadata = contact.metadata;
      
      if (metadata) {
        // VIP customers - high value and good response rate
        if (metadata.averageJobValue && metadata.averageJobValue > 1000 && 
            metadata.responseRate > 0.8) {
          return 'vip';
        }

        // High priority - good customers
        if (metadata.averageJobValue && metadata.averageJobValue > 300 && 
            metadata.responseRate > 0.6) {
          return 'high';
        }

        // Low priority - problematic contacts
        if (metadata.responseRate < 0.3 && metadata.totalCalls > 3) {
          return 'low';
        }
      }

      // Check category
      switch (contact.category) {
        case 'existing_customer':
          return 'high';
        case 'emergency':
          return 'vip';
        case 'supplier':
          return 'medium';
        case 'blacklisted':
          return 'low';
        default:
          return 'medium';
      }
    } catch (error) {
      console.error('Error determining contact priority:', error);
      return 'medium';
    }
  }

  /**
   * Update contact metadata after call
   */
  public async updateContactMetadata(
    phoneNumber: string, 
    callAnswered: boolean, 
    jobValue?: number
  ): Promise<void> {
    try {
      const contact = await this.findContactByPhone(phoneNumber);
      if (!contact) return;

      const metadata = contact.metadata || {
        totalCalls: 0,
        totalMissedCalls: 0,
        responseRate: 0,
      };

      metadata.totalCalls += 1;
      if (!callAnswered) {
        metadata.totalMissedCalls += 1;
      }
      
      metadata.responseRate = (metadata.totalCalls - metadata.totalMissedCalls) / metadata.totalCalls;
      metadata.lastContactDate = Date.now();

      if (jobValue && jobValue > 0) {
        const currentTotal = (metadata.averageJobValue || 0) * (metadata.totalCalls - 1);
        metadata.averageJobValue = (currentTotal + jobValue) / metadata.totalCalls;
      }

      contact.metadata = metadata;

      // Re-categorize and re-prioritize based on updated metadata
      contact.category = await this.categorizeContact(contact);
      contact.priority = await this.determineContactPriority(contact);

      await this.saveContact(contact);
    } catch (error) {
      console.error('Error updating contact metadata:', error);
    }
  }

  /**
   * Get contacts by category
   */
  public async getContactsByCategory(category: ContactCategory): Promise<Contact[]> {
    try {
      const contacts = await this.getContacts();
      return contacts.filter(contact => contact.category === category);
    } catch (error) {
      console.error('Error getting contacts by category:', error);
      return [];
    }
  }

  /**
   * Get contacts by priority
   */
  public async getContactsByPriority(priority: ContactPriority): Promise<Contact[]> {
    try {
      const contacts = await this.getContacts();
      return contacts.filter(contact => contact.priority === priority);
    } catch (error) {
      console.error('Error getting contacts by priority:', error);
      return [];
    }
  }

  /**
   * Search contacts
   */
  public async searchContacts(query: string): Promise<Contact[]> {
    try {
      const contacts = await this.getContacts();
      const lowercaseQuery = query.toLowerCase();

      return contacts.filter(contact => 
        contact.name.toLowerCase().includes(lowercaseQuery) ||
        contact.phoneNumbers.some(phone => phone.includes(query))
      );
    } catch (error) {
      console.error('Error searching contacts:', error);
      return [];
    }
  }

  /**
   * Get contact statistics
   */
  public async getContactStatistics(): Promise<{
    total: number;
    byCategory: Record<ContactCategory, number>;
    byPriority: Record<ContactPriority, number>;
  }> {
    try {
      const contacts = await this.getContacts();
      
      const byCategory: Record<ContactCategory, number> = {
        existing_customer: 0,
        new_prospect: 0,
        supplier: 0,
        emergency: 0,
        personal: 0,
        blacklisted: 0,
      };

      const byPriority: Record<ContactPriority, number> = {
        low: 0,
        medium: 0,
        high: 0,
        vip: 0,
      };

      contacts.forEach(contact => {
        byCategory[contact.category]++;
        byPriority[contact.priority]++;
      });

      return {
        total: contacts.length,
        byCategory,
        byPriority,
      };
    } catch (error) {
      console.error('Error getting contact statistics:', error);
      return {
        total: 0,
        byCategory: {
          existing_customer: 0,
          new_prospect: 0,
          supplier: 0,
          emergency: 0,
          personal: 0,
          blacklisted: 0,
        },
        byPriority: {
          low: 0,
          medium: 0,
          high: 0,
          vip: 0,
        },
      };
    }
  }

  /**
   * Clear contacts cache
   */
  public clearCache(): void {
    this.contactsCache = [];
    this.lastCacheUpdate = 0;
  }

  /**
   * Delete contact
   */
  public async deleteContact(contactId: string): Promise<void> {
    try {
      const contacts = await this.getContacts();
      const filteredContacts = contacts.filter(contact => contact.id !== contactId);
      
      await this.storeContacts(filteredContacts);
      this.contactsCache = filteredContacts;
      this.lastCacheUpdate = Date.now();
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  }
}

