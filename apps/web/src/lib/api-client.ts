import axios from 'axios';
import { clearAuthSession, getAccessToken, redirectToLogin } from '@/lib/auth';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRedirectingToLogin = false;

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && shouldRedirectToLogin(error.config?.url) && !isRedirectingToLogin) {
      isRedirectingToLogin = true;
      clearAuthSession();
      redirectToLogin(getCurrentPath());
    }

    return Promise.reject(error);
  },
);

function shouldRedirectToLogin(url?: string) {
  if (typeof window === 'undefined') {
    return false;
  }

  if (window.location.pathname === '/login') {
    return false;
  }

  return !url?.includes('/auth/login');
}

function getCurrentPath() {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return `${window.location.pathname}${window.location.search}`;
}
