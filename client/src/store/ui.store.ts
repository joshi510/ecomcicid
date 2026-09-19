import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export type Toast = {
  id: string;
  title: string;
  message?: string;
  variant: ToastVariant;
};

type UiState = {
  theme: 'light' | 'dark';
  toasts: Toast[];
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  pushToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
};

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      toasts: [],
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const theme = get().theme === 'light' ? 'dark' : 'light';
        applyTheme(theme);
        set({ theme });
      },
      pushToast: (toast) => {
        const id = crypto.randomUUID();
        set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
        window.setTimeout(() => get().dismissToast(id), 4200);
      },
      dismissToast: (id) => {
        set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
      },
    }),
    {
      name: 'ecom-ui',
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyTheme(state.theme);
        }
      },
    },
  ),
);

export function toast(toast: Omit<Toast, 'id'>) {
  useUiStore.getState().pushToast(toast);
}
