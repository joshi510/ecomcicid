import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { ProductCard } from '@/components/product/ProductCard';
import { useWishlistStore } from '@/store/wishlist.store';

export default function AccountWishlist() {
  const items = useWishlistStore((state) => state.items);
  const remove = useWishlistStore((state) => state.remove);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Wishlist</h1>
        <p className="mt-1 text-sm text-neutral-500">Pieces you’ve saved for later.</p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nothing saved yet.{' '}
          <Link to="/products" className="font-medium underline">
            Browse the catalog
          </Link>
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="space-y-2">
              <ProductCard
                product={{
                  ...item,
                  description: '',
                  compareAtPrice: null,
                }}
              />
              <Button variant="ghost" size="sm" onClick={() => remove(item.id)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
