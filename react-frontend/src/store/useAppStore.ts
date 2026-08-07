import { create } from 'zustand';

interface AppState {
  isAuthenticated: boolean;
  username: string | null;
  datasetCount: number;
  login: (username: string) => void;
  logout: () => void;
  setDatasetCount: (count: number) => void;
}

const initialToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

export const useAppStore = create<AppState>((set) => ({
  isAuthenticated: !!initialToken,
  username: initialToken ? 'User' : null,
  datasetCount: 0,
  login: (username) => set({ isAuthenticated: true, username }),
  logout: () => {
    localStorage.removeItem('access_token');
    set({ isAuthenticated: false, username: null });
  },
  setDatasetCount: (count) => set({ datasetCount: count }),
}));
