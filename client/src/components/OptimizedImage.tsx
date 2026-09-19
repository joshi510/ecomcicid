import { memo } from 'react';
import { mediaUrl } from '@/lib/media';

type OptimizedImageProps = {
  src?: string | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
  sizes?: string;
  widths?: number[];
  priority?: boolean;
};

function withWidth(url: string, width: number) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('unsplash.com')) {
      return url;
    }
    parsed.searchParams.set('auto', 'format');
    parsed.searchParams.set('fit', 'crop');
    parsed.searchParams.set('w', String(width));
    parsed.searchParams.set('q', '75');
    parsed.searchParams.set('fm', 'webp');
    return parsed.toString();
  } catch {
    return url;
  }
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  sizes = '(max-width: 768px) 100vw, 50vw',
  widths = [400, 800, 1200],
  priority = false,
}: OptimizedImageProps) {
  const resolved = mediaUrl(src) ?? src ?? '';
  const srcSet = resolved.includes('unsplash.com')
    ? widths.map((value) => `${withWidth(resolved, value)} ${value}w`).join(', ')
    : undefined;

  return (
    <img
      src={srcSet ? withWidth(resolved, width) : resolved}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding={priority ? 'async' : 'async'}
      className={className}
    />
  );
});
