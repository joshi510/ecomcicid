import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from '@/store/cart.store';
import CartPage from './Cart';

const item = {
  id: 'item-1',
  productId: 'prod-1',
  quantity: 2,
  unitPrice: '20.00',
  lineTotal: '40.00',
  product: {
    id: 'prod-1',
    name: 'Ceramic pour-over set',
    slug: 'ceramic-pour-over-set',
    price: '20.00',
    images: ['https://example.com/set.jpg'],
    stockQuantity: 10,
  },
};

describe('Cart page', () => {
  const updateQty = vi.fn();
  const removeItem = vi.fn();

  beforeEach(() => {
    updateQty.mockReset();
    removeItem.mockReset();
    useCartStore.setState({
      cart: { id: 'cart-1', items: [item], itemCount: 2, subtotal: '40.00' },
      promoCode: '',
      drawerOpen: false,
      updateQty,
      removeItem,
    });
  });

  it('renders an empty cart when there are no items', () => {
    useCartStore.setState({ cart: { id: 'cart-1', items: [], itemCount: 0, subtotal: '0.00' } });
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /continue shopping/i })).toHaveAttribute(
      'href',
      '/products',
    );
  });

  it('lets the shopper change quantity, remove a line, and save a promo code', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Ceramic pour-over set' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Checkout' })).toHaveAttribute('href', '/checkout');

    await user.click(screen.getByRole('button', { name: /increase quantity/i }));
    expect(updateQty).toHaveBeenCalledWith('item-1', 3);

    await user.click(screen.getByRole('button', { name: /remove/i }));
    expect(removeItem).toHaveBeenCalledWith('item-1');

    await user.type(screen.getByPlaceholderText(/promo code/i), 'save10');
    await user.click(screen.getByRole('button', { name: /apply/i }));
    expect(useCartStore.getState().promoCode).toBe('SAVE10');
    expect(screen.getByText(/saved code: save10/i)).toBeInTheDocument();
  });
});
