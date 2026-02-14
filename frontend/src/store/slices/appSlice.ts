import { PayloadAction, createSlice } from '@reduxjs/toolkit';

export interface AppState {
  initialized: boolean;
  bootstrapping: boolean;
  globalLoading: boolean;
  error: string | null;
}

const initialState: AppState = {
  initialized: false,
  bootstrapping: false,
  globalLoading: false,
  error: null,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    bootstrapRequested(state) {
      state.bootstrapping = true;
      state.error = null;
    },
    bootstrapSucceeded(state) {
      state.bootstrapping = false;
      state.initialized = true;
      state.error = null;
    },
    bootstrapFailed(state, action: PayloadAction<string>) {
      state.bootstrapping = false;
      state.error = action.payload;
    },
    setGlobalLoading(state, action: PayloadAction<boolean>) {
      state.globalLoading = action.payload;
    },
  },
});

export const {
  bootstrapRequested,
  bootstrapSucceeded,
  bootstrapFailed,
  setGlobalLoading,
} = appSlice.actions;

export default appSlice.reducer;
