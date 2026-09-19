import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiSend } from '@/lib/api';
import type { Cart } from '@/lib/types';
import { useCartStore } from './cart.store';

vi.mock('@/lib/api', () => ({
  apiGet: vi.fn(),
  apiSend: vi.fn(),
  getApiError: () => 'failed',
}));

vi.mock('@/store/ui.store', () => ({
  toast: vi.fn(),
}));

const product = {
  id: 'prod-1',
  name: 'Wool throw',
  slug: 'wool-throw',
  price: '10.00',
  images: ['https://example.com/throw.jpg'],
};

describe('cart store add-to-cart', () => {
  beforeEach(() => {
    useCartStore.setState({
      cart: { id: 'local', items: [], itemCount: 0, subtotal: '0.00' },
      drawerOpen: false,
    });
    vi.mocked(apiSend).mockReset();
  });

  it('optimistically adds an item and opens the mini cart', async () => {
    vi.mocked(apiSend).mockResolvedValue({
      id: 'server-cart',
      itemCount: 1,
      subtotal: '10.00',
      items: [
        {
          id: 'line-1',
          productId: product.id,
          quantity: 1,
          unitPrice: '10.00',
          lineTotal: '10.00',
          product: { ...product, stockQuantity: 4 },
        },
      ],
    });

    const pending = useCartStore.getState().addItem(product, 1);
    expect(useCartStore.getState().drawerOpen).toBe(true);
    expect(useCartStore.getState().cart?.itemCount).toBe(1);

    await pending;
    expect(apiSend).toHaveBeenCalledWith('/cart/items', { productId: product.id, quantity: 1 });
    expect(useCartStore.getState().cart?.id).toBe('server-cart');
  });

  it('does not let a stale empty fetch overwrite a successful add', async () => {
    let resolveFetch: ((value: Cart) => void) | undefined;
    vi.mocked(apiGet).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.mocked(apiSend).mockResolvedValue({
      id: 'server-cart',
      itemCount: 1,
      subtotal: '10.00',
      items: [
        {
          id: 'line-1',
          productId: product.id,
          quantity: 1,
          unitPrice: '10.00',
          lineTotal: '10.00',
          product: { ...product, stockQuantity: 4 },
        },
      ],
    });

    const fetching = useCartStore.getState().fetchCart();
    await useCartStore.getState().addItem(product, 1);
    expect(useCartStore.getState().cart?.id).toBe('server-cart');

    resolveFetch?.({ id: 'empty-guest', items: [], itemCount: 0, subtotal: '0.00' });
    await fetching;
    expect(useCartStore.getState().cart?.id).toBe('server-cart');
    expect(useCartStore.getState().cart?.itemCount).toBe(1);
  });

  it('rolls back when the API rejects the add', async () => {
    vi.mocked(apiSend).mockRejectedValue(new Error('OUT_OF_STOCK'));

    await expect(useCartStore.getState().addItem(product, 1)).rejects.toThrow();
    expect(useCartStore.getState().cart?.items).toHaveLength(0);
  });
});
