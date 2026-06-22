import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../utils/api';

// Auth Store
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post('/auth/login', { email, password });
          const { token, user } = res.data;
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          set({ user, token, isLoading: false });
          return { success: true };
        } catch (err) {
          const error = err.response?.data?.error || 'Login failed';
          set({ error, isLoading: false });
          return { success: false, error };
        }
      },

      signup: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post('/auth/signup', data);
          const { token, user } = res.data;
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          set({ user, token, isLoading: false });
          return { success: true };
        } catch (err) {
          const error = err.response?.data?.error || 'Signup failed';
          set({ error, isLoading: false });
          return { success: false, error };
        }
      },

      logout: () => {
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, token: null });
      },

      updateUser: (user) => set({ user }),

      initAuth: () => {
        const { token } = get();
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
      },

      updatePreferences: async (prefs) => {
        try {
          const res = await api.patch('/auth/preferences', prefs);
          set({ user: res.data.user });
        } catch (err) { console.error('Pref update failed:', err); }
      }
    }),
    { name: 'vins-auth', partialize: (state) => ({ user: state.user, token: state.token }) }
  )
);

// Theme Store
export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: next });
        document.body.classList.toggle('light', next === 'light');
      },
      initTheme: () => {
        const { theme } = get();
        document.body.classList.toggle('light', theme === 'light');
      }
    }),
    { name: 'vins-theme' }
  )
);

// UI Store
export const useUIStore = create((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
}));
