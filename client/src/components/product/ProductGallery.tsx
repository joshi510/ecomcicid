import { useState } from 'react';
import { OptimizedImage } from '@/components/OptimizedImage';
import { mediaUrl } from '@/lib/media';
import { cn } from '@/lib/cn';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80';

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const urls = (images.length > 0 ? images : [PLACEHOLDER]).map((src) => mediaUrl(src) ?? src);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const current = urls[active] ?? PLACEHOLDER;

  return (
    <div>
      <button
        type="button"
        onClick={() => setZoom(true)}
        className="block w-full overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-900"
      >
        <OptimizedImage
          src={current}
          alt={`${name} – image ${active + 1}`}
          width={900}
          height={1100}
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="aspect-[4/5] w-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </button>
      {urls.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {urls.map((src, index) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(index)}
              className={cn(
                'size-16 shrink-0 overflow-hidden rounded-xl border-2',
                index === active ? 'border-primary-500' : 'border-transparent',
              )}
            >
              <img src={src} alt={`${name} thumbnail ${index + 1}`} className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
      {zoom ? (
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 p-6"
          onClick={() => setZoom(false)}
          aria-label="Close zoomed image"
        >
          <img src={current} alt={`${name} zoomed`} className="max-h-full max-w-full rounded-2xl object-contain" />
        </button>
      ) : null}
    </div>
  );
}
