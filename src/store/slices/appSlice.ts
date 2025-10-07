import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppState, AppMode, BusinessHours } from '../../utils/types';

interface AppSliceState extends AppState {
  isLoading: boolean;
  error: string | null;
  lastUpdate: number;
}

const initialState: AppSliceState = {
  isEnabled: false,
  currentMode: 'normal',
  businessHours: {
    enabled: true,
    schedule: {
      monday: { start: '08:00', end: '18:00' },
      tuesday: { start: '08:00', end: '18:00' },
      wednesday: { start: '08:00', end: '18:00' },
      thursday: { start: '08:00', end: '18:00' },
      friday: { start: '08:00', end: '18:00' },
      saturday: { start: '09:00', end: '15:00' },
      // Sunday is undefined - no work on Sundays
    },
    timezone: 'Europe/Sofia',
  },
  emergencyMode: false,
  isLoading: false,
  error: null,
  lastUpdate: Date.now(),
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setEnabled: (state, action: PayloadAction<boolean>) => {
      state.isEnabled = action.payload;
      state.lastUpdate = Date.now();
    },
    
    setCurrentMode: (state, action: PayloadAction<AppMode>) => {
      state.currentMode = action.payload;
      state.lastUpdate = Date.now();
    },
    
    setBusinessHours: (state, action: PayloadAction<BusinessHours>) => {
      state.businessHours = action.payload;
      state.lastUpdate = Date.now();
    },
    
    setEmergencyMode: (state, action: PayloadAction<boolean>) => {
      state.emergencyMode = action.payload;
      state.lastUpdate = Date.now();
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    resetApp: (state) => {
      return {
        ...initialState,
        lastUpdate: Date.now(),
      };
    },
  },
});

export const {
  setEnabled,
  setCurrentMode,
  setBusinessHours,
  setEmergencyMode,
  setLoading,
  setError,
  clearError,
  resetApp,
} = appSlice.actions;

export default appSlice.reducer;

