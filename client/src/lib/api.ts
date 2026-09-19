import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { readStoredCartToken } from '@/lib/cartToken';
import { readCsrfToken } from '@/lib/csrf';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/ui.store';
import type { ApiSuccess } from '@/lib/types';

const baseURL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const refreshClient = axios.create({
  baseURL,
  withCredentials: true,
});

function withCsrf(config: InternalAxiosRequestConfig) {
  const csrf = readCsrfToken();
  if (csrf) {
    config.headers['X-CSRF-Token'] = csrf;
  }
  return config;
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const cartToken = readStoredCartToken();
  if (cartToken) {
    config.headers['X-Cart-Token'] = cartToken;
  }
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return withCsrf(config);
});

refreshClient.interceptors.request.use(withCsrf);

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<ApiSuccess<{ accessToken: string; user: { id: string } }>>('/auth/refresh')
      .then((response) => {
        const token = response.data.data.accessToken;
        const current = useAuthStore.getState();
        if (current.user) {
          current.setSession(current.user, token);
        }
        return token;
      })
      .catch(() => {
        useAuthStore.getState().clearSession();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string }>) => {
    const original = error.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;

    if (
      status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes('/auth/refresh')
    ) {
      original._retry = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }

    const method = original?.method?.toUpperCase() ?? 'GET';
    const silent =
      method === 'GET' ||
      original?.url?.includes('/auth/refresh') ||
      original?.url?.includes('/csrf');

    if (status && status >= 500 && !silent) {
      toast({
        variant: 'error',
        title: 'Something went wrong',
        message: 'Please try again shortly.',
      });
    }

    return Promise.reject(error);
  },
);

export async function apiGet<T>(url: string) {
  const response = await api.get<ApiSuccess<T>>(url);
  return response.data.data;
}

export async function apiSend<T>(
  url: string,
  body?: unknown,
  method: 'post' | 'put' | 'patch' | 'delete' = 'post',
) {
  const response = await api.request<ApiSuccess<T>>({ url, method, data: body });
  return response.data.data;
}

export async function apiForm<T>(url: string, body: FormData, method: 'post' | 'put' = 'post') {
  const response = await api.request<ApiSuccess<T>>({ url, method, data: body });
  return response.data.data;
}

export function getApiError(error: unknown, fallback = 'Something went wrong') {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? fallback;
  }
  return fallback;
}
