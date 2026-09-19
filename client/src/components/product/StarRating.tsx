import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';

export function StarRating({
  value,
  onChange,
  size = 'sm',
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md';
}) {
  const cls = size === 'md' ? 'size-5' : 'size-3.5';

  return (
    <div className="inline-flex items-center gap-0.5" role={onChange ? 'radiogroup' : 'img'}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onChange}
          aria-label={`${star} star${star === 1 ? '' : 's'}`}
          className={cn(!onChange && 'pointer-events-none')}
          onClick={() => onChange?.(star === value ? 0 : star)}
        >
          <Star
            className={cn(
              cls,
              star <= value ? 'fill-amber-400 text-amber-400' : 'text-neutral-300 dark:text-neutral-700',
            )}
          />
        </button>
      ))}
    </div>
  );
}
