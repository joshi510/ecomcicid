import { memo } from 'react';
import { Link } from 'react-router-dom';
import { OptimizedImage } from '@/components/OptimizedImage';
import { formatPrice } from '@/lib/media';
import type { Product } from '@/lib/types';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80';

export const ProductCard = memo(function ProductCard({ product }: { product: Product }) {
  const image = product.images[0] ?? PLACEHOLDER;

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group block overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="overflow-hidden bg-neutral-100 dark:bg-neutral-800">
        <OptimizedImage
          src={image}
          alt={product.name}
          width={600}
          height={750}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        {product.category ? (
          <p className="text-xs text-neutral-500">{product.category.name}</p>
        ) : null}
        <p className="mt-1 text-sm font-medium tracking-tight">{product.name}</p>
        <p className="mt-1 text-sm text-neutral-500">
          {product.compareAtPrice ? (
            <>
              <span className="mr-2 line-through">{formatPrice(product.compareAtPrice)}</span>
              <span className="text-neutral-900 dark:text-neutral-100">{formatPrice(product.price)}</span>
            </>
          ) : (
            formatPrice(product.price)
          )}
        </p>
      </div>
    </Link>
  );
});
