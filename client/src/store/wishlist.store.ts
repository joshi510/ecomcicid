import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/lib/types';

export type WishlistItem = Pick<Product, 'id' | 'name' | 'slug' | 'price' | 'images'>;

type WishlistState = {
  items: WishlistItem[];
  has: (id: string) => boolean;
  toggle: (product: WishlistItem) => void;
  remove: (id: string) => void;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      has: (id) => get().items.some((item) => item.id === id),
      toggle: (product) => {
        const exists = get().items.some((item) => item.id === product.id);
        set({
          items: exists
            ? get().items.filter((item) => item.id !== product.id)
            : [...get().items, product],
        });
      },
      remove: (id) => set({ items: get().items.filter((item) => item.id !== id) }),
    }),
    { name: 'ecom-wishlist' },
  ),
);
