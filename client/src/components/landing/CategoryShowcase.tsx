import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Armchair, Headphones, Shirt, Sparkles, Watch, Wine } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { fadeUp, stagger } from '@/lib/motion';
import type { Category } from '@/lib/types';

const ICONS = [Armchair, Shirt, Watch, Sparkles, Headphones, Wine];

const FALLBACK: Category[] = [
  { id: 'living', name: 'Living', slug: 'living', parentId: null },
  { id: 'apparel', name: 'Apparel', slug: 'apparel', parentId: null },
  { id: 'objects', name: 'Objects', slug: 'objects', parentId: null },
  { id: 'wellness', name: 'Wellness', slug: 'wellness', parentId: null },
];

function flatten(categories: Category[]): Category[] {
  return categories.flatMap((category) => [category, ...(category.children ?? [])]);
}

export function CategoryShowcase() {
  const [categories, setCategories] = useState<Category[]>(FALLBACK);

  useEffect(() => {
    let active = true;
    apiGet<{ categories: Category[] }>('/categories')
      .then((data) => {
        const list = flatten(data.categories).slice(0, 6);
        if (active && list.length > 0) setCategories(list);
      })
      .catch(() => {
        if (active) setCategories(FALLBACK);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="bg-neutral-100/70 py-16 sm:py-20 dark:bg-neutral-900/40">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-primary-600 text-sm font-medium">Shop by room</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Categories</h2>
        <motion.div
          className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
        >
          {categories.slice(0, 6).map((category, index) => {
            const Icon = ICONS[index % ICONS.length];
            return (
              <motion.div key={category.id} variants={fadeUp}>
                <Link
                  to={`/products?category=${category.slug}`}
                  className="hover:shadow-card flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 dark:border-neutral-800 dark:bg-neutral-950"
                >
                  <span className="bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-200 flex size-12 items-center justify-center rounded-2xl">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-sm text-neutral-500">Explore the edit</p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
