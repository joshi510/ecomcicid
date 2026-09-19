import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistCartToken } from '@/lib/cartToken';
import { apiGet, apiSend, getApiError } from '@/lib/api';
import { isApiOffline } from '@/lib/offline';
import type { Cart, Product } from '@/lib/types';
import { toast } from '@/store/ui.store';

type CartState = {
  cart: Cart | null;
  drawerOpen: boolean;
  promoCode: string;
  loading: boolean;
  setPromoCode: (code: string) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  fetchCart: () => Promise<void>;
  addItem: (
    product: Pick<Product, 'id' | 'name' | 'slug' | 'price' | 'images'>,
    quantity?: number,
    options?: { openDrawer?: boolean },
  ) => Promise<void>;
  updateQty: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => void;
};

let cartEpoch = 0;
let pendingMutations = 0;

function emptyCart(): Cart {
  return { id: 'local', items: [], itemCount: 0, subtotal: '0.00' };
}

function beginMutation() {
  cartEpoch += 1;
  pendingMutations += 1;
  return cartEpoch;
}

function endMutation() {
  pendingMutations = Math.max(0, pendingMutations - 1);
}

function shouldApplyFetchedCart(current: Cart | null, incoming: Cart) {
  if (
    current &&
    current.items.length > 0 &&
    incoming.items.length === 0 &&
    incoming.id !== current.id
  ) {
    return false;
  }
  return true;
}

function applyCart(set: (partial: { cart: Cart }) => void, cart: Cart) {
  persistCartToken(cart.cartToken);
  set({ cart });
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: null,
      drawerOpen: false,
      promoCode: '',
      loading: false,
      setPromoCode: (promoCode) => set({ promoCode }),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
      fetchCart: async () => {
        if (pendingMutations > 0) return;
        const epoch = cartEpoch;
        try {
          const cart = await apiGet<Cart>('/cart');
          if (epoch !== cartEpoch) return;
          if (!shouldApplyFetchedCart(get().cart, cart)) return;
          applyCart(set, cart);
        } catch {
          if (epoch !== cartEpoch) return;
          set({ cart: get().cart ?? emptyCart() });
        }
      },
      addItem: async (product, quantity = 1, options) => {
        const previous = get().cart;
        const current = previous ?? emptyCart();
        const existing = current.items.find((item) => item.productId === product.id);
        const optimistic: Cart = existing
          ? {
              ...current,
              itemCount: current.itemCount + quantity,
              items: current.items.map((item) =>
                item.productId === product.id
                  ? {
                      ...item,
                      quantity: item.quantity + quantity,
                      lineTotal: (Number(item.unitPrice) * (item.quantity + quantity)).toFixed(2),
                    }
                  : item,
              ),
            }
          : {
              ...current,
              itemCount: current.itemCount + quantity,
              items: [
                ...current.items,
                {
                  id: `temp-${product.id}`,
                  productId: product.id,
                  quantity,
                  unitPrice: product.price,
                  lineTotal: (Number(product.price) * quantity).toFixed(2),
                  product: {
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    price: product.price,
                    images: product.images,
                    stockQuantity: 99,
                  },
                },
              ],
            };
        optimistic.subtotal = optimistic.items
          .reduce((sum, item) => sum + Number(item.lineTotal), 0)
          .toFixed(2);

        set({ cart: optimistic, drawerOpen: options?.openDrawer !== false });
        const epoch = beginMutation();
        try {
          const cart = await apiSend<Cart>('/cart/items', { productId: product.id, quantity });
          if (epoch !== cartEpoch) return;
          applyCart(set, cart);
        } catch (error) {
          if (isApiOffline(error)) {
            applyCart(set, optimistic);
            return;
          }
          set({ cart: previous });
          toast({
            variant: 'error',
            title: 'Could not add to cart',
            message: getApiError(error, 'Check stock and try again.'),
          });
          throw error;
        } finally {
          endMutation();
        }
      },
      updateQty: async (itemId, quantity) => {
        const previous = get().cart;
        if (!previous) return;
        const items = previous.items
          .map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  quantity,
                  lineTotal: (Number(item.unitPrice) * quantity).toFixed(2),
                }
              : item,
          )
          .filter((item) => item.quantity > 0);
        set({
          cart: {
            ...previous,
            items,
            itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
            subtotal: items.reduce((sum, item) => sum + Number(item.lineTotal), 0).toFixed(2),
          },
        });
        const epoch = beginMutation();
        try {
          const cart = await apiSend<Cart>(`/cart/items/${itemId}`, { quantity }, 'patch');
          if (epoch !== cartEpoch) return;
          applyCart(set, cart);
        } catch (error) {
          if (isApiOffline(error)) return;
          set({ cart: previous });
          toast({ variant: 'error', title: 'Could not update cart' });
        } finally {
          endMutation();
        }
      },
      clearCart: () => set({ cart: emptyCart() }),
      removeItem: async (itemId) => {
        const previous = get().cart;
        if (!previous) return;
        set({
          cart: {
            ...previous,
            items: previous.items.filter((item) => item.id !== itemId),
            itemCount: previous.items
              .filter((item) => item.id !== itemId)
              .reduce((sum, item) => sum + item.quantity, 0),
          },
        });
        const epoch = beginMutation();
        try {
          const cart = await apiSend<Cart>(`/cart/items/${itemId}`, undefined, 'delete');
          if (epoch !== cartEpoch) return;
          applyCart(set, cart);
        } catch (error) {
          if (isApiOffline(error)) return;
          set({ cart: previous });
          toast({ variant: 'error', title: 'Could not remove item' });
        } finally {
          endMutation();
        }
      },
    }),
    { name: 'ecom-cart', partialize: (state) => ({ promoCode: state.promoCode, cart: state.cart }) },
  ),
);
