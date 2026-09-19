import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { Badge, Button, Dropdown, Skeleton } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { ProductCard } from '@/components/product/ProductCard';
import { StarRating } from '@/components/product/StarRating';
import { apiGet } from '@/lib/api';
import type { Category, Pagination, Product } from '@/lib/types';

const PRICE_MAX = 2000;

const SORTS = [
  { id: 'newest', label: 'Newest', sort: 'createdAt', order: 'desc' },
  { id: 'price-asc', label: 'Price: low to high', sort: 'price', order: 'asc' },
  { id: 'popular', label: 'Popularity', sort: 'popularity', order: 'desc' },
] as const;

function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap((category) => [category, ...(category.children ?? [])]);
}

export default function Products() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? '';
  const minPrice = params.get('minPrice') ?? '0';
  const maxPrice = params.get('maxPrice') ?? String(PRICE_MAX);
  const minRating = Number(params.get('minRating') ?? 0);
  const sortIdParam = params.get('sortId');
  const sortParam = params.get('sort');
  const orderParam = params.get('order') ?? 'desc';
  const sortId =
    sortIdParam ??
    SORTS.find((item) => item.sort === sortParam && item.order === orderParam)?.id ??
    'newest';
  const page = Number(params.get('page') ?? 1);
  const search = params.get('search') ?? '';

  const activeSort = SORTS.find((item) => item.id === sortId) ?? SORTS[0];

  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceDraft, setPriceDraft] = useState({ min: Number(minPrice), max: Number(maxPrice) });

  useEffect(() => {
    setPriceDraft({ min: Number(minPrice), max: Number(maxPrice) });
  }, [minPrice, maxPrice]);

  useEffect(() => {
    apiGet<{ categories: Category[] }>('/categories')
      .then((data) => setCategories(flattenCategories(data.categories)))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const query = new URLSearchParams({
      page: String(page),
      limit: '12',
      sort: activeSort.sort,
      order: activeSort.order,
    });
    if (category) query.set('category', category);
    if (Number(minPrice) > 0) query.set('minPrice', minPrice);
    if (Number(maxPrice) < PRICE_MAX) query.set('maxPrice', maxPrice);
    if (minRating > 0) query.set('minRating', String(minRating));
    if (search) query.set('search', search);

    let active = true;
    setLoading(true);
    setError(null);
    apiGet<{ products: Product[]; pagination: Pagination }>(`/products?${query}`)
      .then((data) => {
        if (!active) return;
        setProducts(data.products);
        setPagination(data.pagination);
      })
      .catch(() => {
        if (!active) return;
        setError('Could not load products. Try again shortly.');
        setProducts([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeSort.order, activeSort.sort, category, maxPrice, minPrice, minRating, page, search]);

  const updateParams = (next: Record<string, string | null>, resetPage = true) => {
    const copy = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === '') copy.delete(key);
      else copy.set(key, value);
    }
    if (resetPage) copy.set('page', '1');
    setParams(copy);
  };

  const categoryName = useMemo(
    () => categories.find((item) => item.slug === category)?.name,
    [categories, category],
  );

  const filters = (
    <aside className="space-y-6">
      <div>
        <p className="text-sm font-semibold">Category</p>
        <div className="mt-3 space-y-1">
          <button
            type="button"
            className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm ${
              !category ? 'bg-neutral-100 font-medium dark:bg-neutral-900' : 'text-neutral-600'
            }`}
            onClick={() => updateParams({ category: null })}
          >
            All products
          </button>
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm ${
                category === item.slug
                  ? 'bg-neutral-100 font-medium dark:bg-neutral-900'
                  : 'text-neutral-600'
              }`}
              onClick={() => updateParams({ category: item.slug })}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold">Price</p>
        <div className="mt-3 space-y-3">
          <input
            type="range"
            min={0}
            max={PRICE_MAX}
            step={10}
            value={priceDraft.min}
            onChange={(event) =>
              setPriceDraft((current) => ({
                ...current,
                min: Math.min(Number(event.target.value), current.max),
              }))
            }
            onMouseUp={(event) => {
              const value = Number(event.currentTarget.value);
              updateParams({ minPrice: value > 0 ? String(value) : null });
            }}
            onTouchEnd={(event) => {
              const value = Number(event.currentTarget.value);
              updateParams({ minPrice: value > 0 ? String(value) : null });
            }}
            className="w-full accent-primary-500"
            aria-label="Minimum price"
          />
          <input
            type="range"
            min={0}
            max={PRICE_MAX}
            step={10}
            value={priceDraft.max}
            onChange={(event) =>
              setPriceDraft((current) => ({
                ...current,
                max: Math.max(Number(event.target.value), current.min),
              }))
            }
            onMouseUp={(event) => {
              const value = Number(event.currentTarget.value);
              updateParams({ maxPrice: value < PRICE_MAX ? String(value) : null });
            }}
            onTouchEnd={(event) => {
              const value = Number(event.currentTarget.value);
              updateParams({ maxPrice: value < PRICE_MAX ? String(value) : null });
            }}
            className="w-full accent-primary-500"
            aria-label="Maximum price"
          />
          <p className="text-xs text-neutral-500">
            ${priceDraft.min} – ${priceDraft.max}
            {priceDraft.max >= PRICE_MAX ? '+' : ''}
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold">Rating</p>
        <div className="mt-3 space-y-2">
          {[0, 4, 3, 2].map((rating) => (
            <button
              key={rating}
              type="button"
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                minRating === rating ? 'bg-neutral-100 font-medium dark:bg-neutral-900' : ''
              }`}
              onClick={() => updateParams({ minRating: rating ? String(rating) : null })}
            >
              {rating === 0 ? (
                'Any rating'
              ) : (
                <>
                  <StarRating value={rating} />
                  <span className="text-neutral-500">& up</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );

  return (
    <div>
      <Seo
        title={categoryName ?? 'All products'}
        description="Browse the Northline catalog. Filter by category, price, and rating."
        path={`/products${params.toString() ? `?${params}` : ''}`}
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary-600 text-sm font-medium">Catalog</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {categoryName ?? 'All products'}
          </h1>
          {pagination ? (
            <p className="mt-1 text-sm text-neutral-500">{pagination.total} pieces</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="lg:hidden"
            onClick={() => setFiltersOpen((value) => !value)}
          >
            <SlidersHorizontal className="size-4" />
            Filters
          </Button>
          <Dropdown
            align="right"
            trigger={
              <Button variant="outline">{activeSort.label}</Button>
            }
            items={SORTS.map((item) => ({
              label: item.label,
              onSelect: () => updateParams({ sortId: item.id }),
            }))}
          />
        </div>
      </div>

      {(category || minRating || Number(minPrice) > 0 || Number(maxPrice) < PRICE_MAX) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {categoryName ? <Badge>{categoryName}</Badge> : null}
          {minRating > 0 ? <Badge>{minRating}+ stars</Badge> : null}
          {Number(minPrice) > 0 || Number(maxPrice) < PRICE_MAX ? (
            <Badge>
              ${minPrice}–${maxPrice}
            </Badge>
          ) : null}
          <button
            type="button"
            className="text-xs text-neutral-500 underline"
            onClick={() =>
              updateParams({ category: null, minPrice: null, maxPrice: null, minRating: null })
            }
          >
            Clear filters
          </button>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
        <div className={`${filtersOpen ? 'block' : 'hidden'} lg:block`}>{filters}</div>
        <div>
          {error ? (
            <p className="text-danger-600 text-sm">{error}</p>
          ) : loading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="space-y-3">
                  <Skeleton className="aspect-[4/5] w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="text-sm text-neutral-500">No products match these filters.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {pagination && pagination.totalPages > 1 ? (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) }, false)}
              >
                Previous
              </Button>
              <span className="text-sm text-neutral-500">
                {page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page >= pagination.totalPages}
                onClick={() => updateParams({ page: String(page + 1) }, false)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
