import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

export function QuantityStepper({
  value,
  min = 1,
  max = 99,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-xl border border-neutral-200 dark:border-neutral-800">
      <button
        type="button"
        className={cn('px-3 py-2 text-neutral-500 hover:text-neutral-900')}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Decrease quantity"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="min-w-8 text-center text-sm font-medium">{value}</span>
      <button
        type="button"
        className="px-3 py-2 text-neutral-500 hover:text-neutral-900"
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Increase quantity"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
