import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Seo } from '@/components/Seo';
import { Badge, Button, Skeleton } from '@/components/ui';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductGallery } from '@/components/product/ProductGallery';
import { QuantityStepper } from '@/components/product/QuantityStepper';
import { StarRating } from '@/components/product/StarRating';
import { apiGet, getApiError } from '@/lib/api';
import { getCatalogProduct } from '@/lib/catalog';
import { formatPrice, mediaUrl } from '@/lib/media';
import type { ProductDetail } from '@/lib/types';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { toast } from '@/store/ui.store';

type Tab = 'description' | 'specs' | 'reviews';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const wishlistItems = useWishlistStore((state) => state.items);
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState<Tab>('description');
  const [pending, setPending] = useState<'cart' | 'buy' | null>(null);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    setError(null);
    setQuantity(1);
    apiGet<ProductDetail>(`/products/${slug}`)
      .then((data) => {
        if (active) setProduct(data);
      })
      .catch((err: unknown) =>
        getCatalogProduct(slug)
          .then((data) => {
            if (active) setProduct(data);
          })
          .catch(() => {
            if (active) setError(getApiError(err, 'Product not found'));
          }),
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="grid gap-10 lg:grid-cols-2">
        <Skeleton className="aspect-[4/5] w-full" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Product unavailable</h1>
        <p className="text-sm text-neutral-500">{error}</p>
        <Link to="/products" className="text-sm font-medium underline">
          Back to catalog
        </Link>
      </div>
    );
  }

  const inStock = (product.stockQuantity ?? 0) > 0;
  const lowStock = inStock && (product.stockQuantity ?? 0) <= 5;
  const saved = wishlistItems.some((item) => item.id === product.id);

  const addToCart = async (buyNow = false) => {
    setPending(buyNow ? 'buy' : 'cart');
    try {
      await addItem(product, quantity, { openDrawer: !buyNow });
      toast({ variant: 'success', title: buyNow ? 'Ready to checkout' : 'Added to cart' });
      if (buyNow) navigate('/checkout');
    } catch {
      /* cart store already toasts */
    } finally {
      setPending(null);
    }
  };

  return (
    <div>
      <Seo
        title={product.name}
        description={product.description.slice(0, 160) || `${product.name} at Northline.`}
        path={`/products/${product.slug}`}
        image={mediaUrl(product.images[0])}
      />
      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />
        <div>
          {product.category ? (
            <Link
              to={`/products?category=${product.category.slug}`}
              className="text-primary-600 text-sm font-medium"
            >
              {product.category.name}
            </Link>
          ) : null}
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{product.name}</h1>
          <div className="mt-3 flex items-center gap-3">
            <StarRating value={Math.round(product.reviewSummary.average)} size="md" />
            <span className="text-sm text-neutral-500">
              {product.reviewSummary.average.toFixed(1)} ({product.reviewSummary.count} reviews)
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <p className="text-2xl font-semibold">{formatPrice(product.price)}</p>
            {product.compareAtPrice ? (
              <p className="text-neutral-400 line-through">{formatPrice(product.compareAtPrice)}</p>
            ) : null}
          </div>
          <div className="mt-3">
            <Badge variant={inStock ? (lowStock ? 'warning' : 'success') : 'danger'}>
              {inStock ? (lowStock ? `Only ${product.stockQuantity} left` : 'In stock') : 'Out of stock'}
            </Badge>
          </div>
          <p className="mt-5 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
            {product.description}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <QuantityStepper
              value={quantity}
              max={Math.max(product.stockQuantity ?? 1, 1)}
              onChange={setQuantity}
            />
            <Button
              disabled={!inStock || pending !== null}
              onClick={() => void addToCart(false)}
            >
              {pending === 'cart' ? 'Adding…' : 'Add to cart'}
            </Button>
            <Button
              variant="secondary"
              disabled={!inStock || pending !== null}
              onClick={() => void addToCart(true)}
            >
              {pending === 'buy' ? 'Redirecting…' : 'Buy now'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                toggleWishlist({
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  price: product.price,
                  images: product.images,
                });
                toast({
                  variant: 'success',
                  title: saved ? 'Removed from wishlist' : 'Saved to wishlist',
                });
              }}
            >
              {saved ? 'Saved' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-12">
        <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800">
          {(
            [
              ['description', 'Description'],
              ['specs', 'Specifications'],
              ['reviews', 'Reviews'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`border-b-2 px-3 py-2 text-sm ${
                tab === id
                  ? 'border-neutral-900 font-medium dark:border-white'
                  : 'border-transparent text-neutral-500'
              }`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-5 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
          {tab === 'description' ? <p>{product.description || 'No description yet.'}</p> : null}
          {tab === 'specs' ? (
            <dl className="grid max-w-md grid-cols-2 gap-3">
              <dt className="text-neutral-500">SKU</dt>
              <dd>{product.sku ?? '—'}</dd>
              <dt className="text-neutral-500">Stock</dt>
              <dd>{product.stockQuantity ?? 0}</dd>
              <dt className="text-neutral-500">Category</dt>
              <dd>{product.category?.name ?? '—'}</dd>
            </dl>
          ) : null}
          {tab === 'reviews' ? (
            product.reviews.length === 0 ? (
              <p>No reviews yet.</p>
            ) : (
              <ul className="space-y-4">
                {product.reviews.map((review) => (
                  <li key={review.id} className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{review.user.name}</p>
                      <StarRating value={review.rating} />
                    </div>
                    {review.comment ? <p className="mt-2">{review.comment}</p> : null}
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </div>
      </div>

      {product.relatedProducts.length > 0 ? (
        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight">Related products</h2>
          <div className="mt-5 flex gap-5 overflow-x-auto pb-2">
            {product.relatedProducts.map((related) => (
              <div key={related.id} className="w-56 shrink-0">
                <ProductCard product={related} />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
