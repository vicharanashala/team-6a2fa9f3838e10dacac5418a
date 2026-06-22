import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// Response interceptor
api.interceptors.response.use(
  res => res,
  err => {
    // Only auto-logout if it's NOT a login/signup request AND 401 status
    const isAuthRequest = err.config?.url?.includes('/auth/login') || err.config?.url?.includes('/auth/signup');
    
    if (err.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem('vins-auth');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
