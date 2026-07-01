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

      updateBookmarkedQueries: (bookmarkedQueries) =>
        set(state => ({ user: { ...state.user, bookmarkedQueries } })),

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
    { name: 'vins-auth', partialize: (state) => ({ user: state.user, token: state.token }), storage: {
      getItem: (name) => {
        try { const val = sessionStorage.getItem(name); return val ? JSON.parse(val) : null; } catch { return null; }
      },
      setItem: (name, value) => {
        try { sessionStorage.setItem(name, JSON.stringify(value)); } catch {}
      },
      removeItem: (name) => {
        try { sessionStorage.removeItem(name); } catch {}
      }
    } }
  )
);

// Theme Store
export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'system',
      setTheme: (t) => {
        let actualTheme = t;
        if (t === 'system') {
          actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        set({ theme: t });
        document.body.classList.toggle('dark', actualTheme === 'dark');
        document.body.classList.toggle('light', actualTheme === 'light');
      },
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme: next });
        // Toggle .dark class for Tailwind dark: variant support
        document.body.classList.toggle('dark', next === 'dark');
        document.body.classList.toggle('light', next === 'light');
      },
      initTheme: () => {
        const { theme } = get();
        const actual = theme === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
          : theme;
        document.body.classList.toggle('dark', actual === 'dark');
        document.body.classList.toggle('light', actual === 'light');
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
