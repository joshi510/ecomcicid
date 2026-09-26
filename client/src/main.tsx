import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { ToastViewport } from '@/components/ui';
import { apiGet, apiSend } from '@/lib/api';
import { setCsrfToken } from '@/lib/csrf';
import type { User } from '@/lib/types';
import { useAuthStore } from '@/store/auth.store';
import { useUiStore } from '@/store/ui.store';
import { isApiOffline } from '@/lib/offline';
import App from './App';
import './index.css';

useUiStore.getState().setTheme(useUiStore.getState().theme);

void (async () => {
  try {
    const csrf = await apiGet<{ csrfToken: string }>('/csrf');
    if (csrf.csrfToken) {
      setCsrfToken(csrf.csrfToken);
    }
    const data = await apiSend<{ user: User; accessToken: string }>('/auth/refresh');
    if (data.user && data.accessToken) {
      useAuthStore.getState().setSession(data.user, data.accessToken);
    }
  } catch (error) {
    if (!isApiOffline(error)) {
      useAuthStore.getState().clearSession();
    }
  }
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
        <ToastViewport />
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
);
