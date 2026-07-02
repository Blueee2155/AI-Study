import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { api } from '@/services/api';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post('/api/auth/login', { username, password });
          const { access_token, user } = res.data;
          set({ token: access_token, user, isAuthenticated: true, isLoading: false });
        } catch (err: any) {
          const msg = err.response?.data?.detail || '登录失败，请重试';
          set({ error: msg, isLoading: false });
          throw new Error(msg);
        }
      },

      register: async (username: string, email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post('/api/auth/register', { username, email, password });
          const { access_token, user } = res.data;
          set({ token: access_token, user, isAuthenticated: true, isLoading: false });
        } catch (err: any) {
          const msg = err.response?.data?.detail || '注册失败，请重试';
          set({ error: msg, isLoading: false });
          throw new Error(msg);
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }
        try {
          const res = await api.get('/api/auth/me');
          set({ user: res.data, isAuthenticated: true });
        } catch {
          set({ token: null, user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'ai-tutor-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);