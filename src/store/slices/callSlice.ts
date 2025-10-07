import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { CallRecord, CallEvent } from '../../utils/types';
import CallListenerService from '../../services/CallListener';
import { CallLogManager } from '../../services/CallLogManager';

interface CallSliceState {
  recentCalls: CallRecord[];
  callEvents: CallEvent[];
  isListening: boolean;
  isLoading: boolean;
  error: string | null;
  statistics: {
    totalCalls: number;
    missedCalls: number;
    answeredCalls: number;
    responsesSent: number;
  };
}

const initialState: CallSliceState = {
  recentCalls: [],
  callEvents: [],
  isListening: false,
  isLoading: false,
  error: null,
  statistics: {
    totalCalls: 0,
    missedCalls: 0,
    answeredCalls: 0,
    responsesSent: 0,
  },
};

// Async thunks
export const startCallListening = createAsyncThunk(
  'calls/startListening',
  async (_, { rejectWithValue }) => {
    try {
      const callListener = CallListenerService.getInstance();
      const success = await callListener.startListening();
      if (!success) {
        throw new Error('Failed to start call listening');
      }
      return true;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const stopCallListening = createAsyncThunk(
  'calls/stopListening',
  async (_, { rejectWithValue }) => {
    try {
      const callListener = CallListenerService.getInstance();
      const success = await callListener.stopListening();
      if (!success) {
        throw new Error('Failed to stop call listening');
      }
      return true;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const loadRecentCalls = createAsyncThunk(
  'calls/loadRecent',
  async (limit: number = 50, { rejectWithValue }) => {
    try {
      const callLogManager = CallLogManager.getInstance();
      const calls = await callLogManager.getRecentCalls(limit);
      return calls;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const loadCallEvents = createAsyncThunk(
  'calls/loadEvents',
  async (_, { rejectWithValue }) => {
    try {
      const callLogManager = CallLogManager.getInstance();
      const events = await callLogManager.getStoredCallEvents();
      return events;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const manualCallCheck = createAsyncThunk(
  'calls/manualCheck',
  async (_, { rejectWithValue }) => {
    try {
      const callListener = CallListenerService.getInstance();
      const events = await callListener.manualCheck();
      return events;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

const callSlice = createSlice({
  name: 'calls',
  initialState,
  reducers: {
    addCallEvent: (state, action: PayloadAction<CallEvent>) => {
      state.callEvents.unshift(action.payload);
      // Keep only last 100 events
      if (state.callEvents.length > 100) {
        state.callEvents = state.callEvents.slice(0, 100);
      }
      
      // Update statistics
      if (action.payload.callRecord.type === 'missed') {
        state.statistics.missedCalls++;
      }
      state.statistics.totalCalls++;
    },
    
    markEventProcessed: (state, action: PayloadAction<string>) => {
      const event = state.callEvents.find(e => e.id === action.payload);
      if (event) {
        event.processed = true;
      }
    },
    
    markResponseSent: (state, action: PayloadAction<string>) => {
      const event = state.callEvents.find(e => e.id === action.payload);
      if (event) {
        event.responseTriggered = true;
        state.statistics.responsesSent++;
      }
    },
    
    updateStatistics: (state, action: PayloadAction<Partial<CallSliceState['statistics']>>) => {
      state.statistics = { ...state.statistics, ...action.payload };
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    clearCallEvents: (state) => {
      state.callEvents = [];
    },
  },
  
  extraReducers: (builder) => {
    // Start listening
    builder
      .addCase(startCallListening.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startCallListening.fulfilled, (state) => {
        state.isLoading = false;
        state.isListening = true;
        state.error = null;
      })
      .addCase(startCallListening.rejected, (state, action) => {
        state.isLoading = false;
        state.isListening = false;
        state.error = action.payload as string;
      });
    
    // Stop listening
    builder
      .addCase(stopCallListening.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(stopCallListening.fulfilled, (state) => {
        state.isLoading = false;
        state.isListening = false;
        state.error = null;
      })
      .addCase(stopCallListening.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
    
    // Load recent calls
    builder
      .addCase(loadRecentCalls.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadRecentCalls.fulfilled, (state, action) => {
        state.isLoading = false;
        state.recentCalls = action.payload;
        state.error = null;
      })
      .addCase(loadRecentCalls.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
    
    // Load call events
    builder
      .addCase(loadCallEvents.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadCallEvents.fulfilled, (state, action) => {
        state.isLoading = false;
        state.callEvents = action.payload;
        state.error = null;
      })
      .addCase(loadCallEvents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
    
    // Manual call check
    builder
      .addCase(manualCallCheck.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(manualCallCheck.fulfilled, (state, action) => {
        state.isLoading = false;
        // Add new events to the beginning
        state.callEvents = [...action.payload, ...state.callEvents];
        // Keep only last 100 events
        if (state.callEvents.length > 100) {
          state.callEvents = state.callEvents.slice(0, 100);
        }
        state.error = null;
      })
      .addCase(manualCallCheck.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  addCallEvent,
  markEventProcessed,
  markResponseSent,
  updateStatistics,
  clearError,
  clearCallEvents,
} = callSlice.actions;

export default callSlice.reducer;

