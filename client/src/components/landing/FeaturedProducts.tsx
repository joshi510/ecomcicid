import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { OptimizedImage } from '@/components/OptimizedImage';
import { apiGet } from '@/lib/api';
import { formatPrice } from '@/lib/media';
import { fadeUp, stagger } from '@/lib/motion';
import type { Product } from '@/lib/types';
import { Skeleton } from '@/components/ui';

const FALLBACK: Product[] = [
  {
    id: '1',
    name: 'Linen lounge chair',
    slug: 'linen-lounge-chair',
    description: '',
    price: '640.00',
    compareAtPrice: '780.00',
    images: [
      'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    id: '2',
    name: 'Ceramic pour-over set',
    slug: 'ceramic-pour-over-set',
    description: '',
    price: '86.00',
    compareAtPrice: null,
    images: [
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    id: '3',
    name: 'Wool throw blanket',
    slug: 'wool-throw-blanket',
    description: '',
    price: '128.00',
    compareAtPrice: null,
    images: [
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    id: '4',
    name: 'Oak side table',
    slug: 'oak-side-table',
    description: '',
    price: '320.00',
    compareAtPrice: '390.00',
    images: [
      'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=900&q=80',
    ],
  },
];

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiGet<{ products: Product[] }>('/products?limit=8&sort=createdAt&order=desc')
      .then((data) => {
        if (active) setProducts(data.products.length > 0 ? data.products : FALLBACK);
      })
      .catch(() => {
        if (active) setProducts(FALLBACK);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-primary-600 text-sm font-medium">Trending now</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Featured pieces
          </h2>
        </div>
        <Link
          to="/products"
          className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
        >
          Shop all →
        </Link>
      </div>
      {loading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="aspect-[4/5] w-full" />
          ))}
        </div>
      ) : (
        <motion.div
          className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={stagger}
        >
          {products.slice(0, 8).map((product) => {
            const image = product.images[0] ?? FALLBACK[0].images[0];
            return (
              <motion.div key={product.id} variants={fadeUp} transition={{ duration: 0.4 }}>
                <Link
                  to={`/products/${product.slug}`}
                  className="group shadow-card hover:shadow-card-hover block overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all duration-300 hover:-translate-y-1 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                    <OptimizedImage
                      src={image}
                      alt={product.name}
                      width={600}
                      height={750}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-medium tracking-tight">{product.name}</p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {product.compareAtPrice ? (
                        <>
                          <span className="mr-2 line-through">
                            {formatPrice(product.compareAtPrice)}
                          </span>
                          <span className="text-neutral-900 dark:text-neutral-100">
                            {formatPrice(product.price)}
                          </span>
                        </>
                      ) : (
                        formatPrice(product.price)
                      )}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </section>
  );
}
