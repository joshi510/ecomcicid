import { cn } from '@/lib/cn';
import { useUiStore } from '@/store/ui.store';

const styles = {
  info: 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900',
  success: 'border-success-500/20 bg-success-50 dark:bg-emerald-950',
  warning: 'border-warning-500/20 bg-warning-50 dark:bg-amber-950',
  error: 'border-danger-500/20 bg-danger-50 dark:bg-red-950',
} as const;

export function ToastViewport() {
  const toasts = useUiStore((state) => state.toasts);
  const dismissToast = useUiStore((state) => state.dismissToast);

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          className={cn(
            'shadow-card pointer-events-auto rounded-2xl border p-4 text-left transition-all',
            styles[toast.variant],
          )}
          onClick={() => dismissToast(toast.id)}
        >
          <p className="text-sm font-semibold">{toast.title}</p>
          {toast.message ? (
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{toast.message}</p>
          ) : null}
        </button>
      ))}
    </div>
  );
}
