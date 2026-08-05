import { create } from 'zustand';
import { useAuthStore } from './authStore';

interface AppState {
  isAuthenticated: boolean;
  username: string | null;
  datasetCount: number;
  login: (username: string) => void;
  logout: () => void;
  setDatasetCount: (count: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isAuthenticated: false,
  username: null,
  datasetCount: 0,
  login: (username) => set({ isAuthenticated: true, username }),
  logout: () => {
    useAuthStore.getState().clearAuth();
    set({ isAuthenticated: false, username: null });
  },
  setDatasetCount: (count) => set({ datasetCount: count }),
}));

useAuthStore.subscribe((state) => {
  useAppStore.setState({
    isAuthenticated: state.isAuthenticated,
    username: state.user?.full_name || null,
  });
});
