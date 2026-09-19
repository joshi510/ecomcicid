import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  trailing?: ReactNode;
};

export function Input({ label, hint, error, trailing, className, id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="block space-y-1.5" htmlFor={inputId}>
      {label ? (
        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{label}</span>
      ) : null}
      <span className="relative block">
        <input
          id={inputId}
          className={cn(
            'h-10 w-full rounded-xl border bg-white px-3 text-sm text-neutral-900 shadow-sm transition-colors',
            'placeholder:text-neutral-400 focus:ring-2 focus:outline-none',
            'dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100',
            error
              ? 'border-danger-500 focus:ring-danger-500'
              : 'focus:border-primary-500 focus:ring-primary-500/30 border-neutral-200',
            trailing && 'pr-10',
            className,
          )}
          {...props}
        />
        {trailing ? (
          <span className="absolute inset-y-0 right-3 flex items-center text-neutral-400">
            {trailing}
          </span>
        ) : null}
      </span>
      {error ? <p className="text-danger-600 text-xs">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}
    </label>
  );
}
