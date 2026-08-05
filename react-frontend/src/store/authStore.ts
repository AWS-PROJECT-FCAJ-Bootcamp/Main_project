/**
 * authStore — Zustand store cho trạng thái xác thực người dùng.
 *
 * - Lưu access token vào localStorage
 * - Refresh token được lưu trong HttpOnly cookie — không access từ JS
 * - Cloud: sẽ swap sang Cognito JWT; interface không đổi
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type UserRole = 'guest' | 'admin';

export interface AuthUser {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;

  setAuth: (token: string, user: AuthUser) => void;
  updateUser: (user: AuthUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isAdmin: false,

      setAuth: (token, user) =>
        set({
          accessToken: token,
          user,
          isAuthenticated: true,
          isAdmin: user.role === 'admin',
        }),

      updateUser: (user) =>
        set((s) => ({
          ...s,
          user,
          isAdmin: user.role === 'admin',
        })),

      clearAuth: () =>
        set({
          accessToken: null,
          user: null,
          isAuthenticated: false,
          isAdmin: false,
        }),
    }),
    {
      name: 'fsd-auth',           // localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
      }),
    }
  )
);

/** Shorthand selectors */
export const selectIsAdmin = (s: AuthState) => s.isAdmin;
export const selectUser = (s: AuthState) => s.user;
export const selectToken = (s: AuthState) => s.accessToken;
