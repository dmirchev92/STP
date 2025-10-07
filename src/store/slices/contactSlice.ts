import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Contact, ContactCategory, ContactPriority } from '../../utils/types';
import { ContactService } from '../../services/ContactService';

interface ContactSliceState {
  contacts: Contact[];
  selectedContact: Contact | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  filteredContacts: Contact[];
  statistics: {
    total: number;
    byCategory: Record<ContactCategory, number>;
    byPriority: Record<ContactPriority, number>;
  };
}

const initialState: ContactSliceState = {
  contacts: [],
  selectedContact: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  filteredContacts: [],
  statistics: {
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
  },
};

// Async thunks
export const loadContacts = createAsyncThunk(
  'contacts/load',
  async (_, { rejectWithValue }) => {
    try {
      const contactService = ContactService.getInstance();
      const contacts = await contactService.getContacts();
      return contacts;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const importDeviceContacts = createAsyncThunk(
  'contacts/import',
  async (_, { rejectWithValue }) => {
    try {
      const contactService = ContactService.getInstance();
      const contacts = await contactService.importDeviceContacts();
      return contacts;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const saveContact = createAsyncThunk(
  'contacts/save',
  async (contact: Contact, { rejectWithValue }) => {
    try {
      const contactService = ContactService.getInstance();
      await contactService.saveContact(contact);
      return contact;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const deleteContact = createAsyncThunk(
  'contacts/delete',
  async (contactId: string, { rejectWithValue }) => {
    try {
      const contactService = ContactService.getInstance();
      await contactService.deleteContact(contactId);
      return contactId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const searchContacts = createAsyncThunk(
  'contacts/search',
  async (query: string, { rejectWithValue }) => {
    try {
      const contactService = ContactService.getInstance();
      const contacts = await contactService.searchContacts(query);
      return { query, contacts };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const loadContactStatistics = createAsyncThunk(
  'contacts/loadStatistics',
  async (_, { rejectWithValue }) => {
    try {
      const contactService = ContactService.getInstance();
      const statistics = await contactService.getContactStatistics();
      return statistics;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

const contactSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    setSelectedContact: (state, action: PayloadAction<Contact | null>) => {
      state.selectedContact = action.payload;
    },
    
    updateContact: (state, action: PayloadAction<Contact>) => {
      const index = state.contacts.findIndex(c => c.id === action.payload.id);
      if (index >= 0) {
        state.contacts[index] = action.payload;
      }
      
      // Update filtered contacts if search is active
      if (state.searchQuery) {
        const filteredIndex = state.filteredContacts.findIndex(c => c.id === action.payload.id);
        if (filteredIndex >= 0) {
          state.filteredContacts[filteredIndex] = action.payload;
        }
      }
    },
    
    clearSearch: (state) => {
      state.searchQuery = '';
      state.filteredContacts = [];
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    clearContacts: (state) => {
      state.contacts = [];
      state.filteredContacts = [];
      state.selectedContact = null;
    },
  },
  
  extraReducers: (builder) => {
    // Load contacts
    builder
      .addCase(loadContacts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadContacts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.contacts = action.payload;
        state.error = null;
      })
      .addCase(loadContacts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
    
    // Import device contacts
    builder
      .addCase(importDeviceContacts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(importDeviceContacts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.contacts = action.payload;
        state.error = null;
      })
      .addCase(importDeviceContacts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
    
    // Save contact
    builder
      .addCase(saveContact.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveContact.fulfilled, (state, action) => {
        state.isLoading = false;
        const existingIndex = state.contacts.findIndex(c => c.id === action.payload.id);
        
        if (existingIndex >= 0) {
          state.contacts[existingIndex] = action.payload;
        } else {
          state.contacts.push(action.payload);
        }
        
        state.error = null;
      })
      .addCase(saveContact.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
    
    // Delete contact
    builder
      .addCase(deleteContact.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteContact.fulfilled, (state, action) => {
        state.isLoading = false;
        state.contacts = state.contacts.filter(c => c.id !== action.payload);
        state.filteredContacts = state.filteredContacts.filter(c => c.id !== action.payload);
        
        if (state.selectedContact?.id === action.payload) {
          state.selectedContact = null;
        }
        
        state.error = null;
      })
      .addCase(deleteContact.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
    
    // Search contacts
    builder
      .addCase(searchContacts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchContacts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.searchQuery = action.payload.query;
        state.filteredContacts = action.payload.contacts;
        state.error = null;
      })
      .addCase(searchContacts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
    
    // Load statistics
    builder
      .addCase(loadContactStatistics.pending, (state) => {
        state.error = null;
      })
      .addCase(loadContactStatistics.fulfilled, (state, action) => {
        state.statistics = action.payload;
        state.error = null;
      })
      .addCase(loadContactStatistics.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  setSelectedContact,
  updateContact,
  clearSearch,
  clearError,
  clearContacts,
} = contactSlice.actions;

export default contactSlice.reducer;

