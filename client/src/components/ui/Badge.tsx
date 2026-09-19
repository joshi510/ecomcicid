import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const variants = {
  neutral: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  primary: 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-200',
  success: 'bg-success-50 text-success-700 dark:bg-emerald-950 dark:text-emerald-300',
  warning: 'bg-warning-50 text-warning-700 dark:bg-amber-950 dark:text-amber-300',
  danger: 'bg-danger-50 text-danger-700 dark:bg-red-950 dark:text-red-300',
} as const;

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: keyof typeof variants;
};

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
