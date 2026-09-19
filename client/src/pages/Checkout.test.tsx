import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCartStore } from '@/store/cart.store';
import Checkout from './Checkout';

vi.mock('@/lib/api', () => ({
  apiSend: vi.fn(),
  getApiError: () => 'Could not start checkout',
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(),
}));

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: ReactNode }) => children,
  PaymentElement: () => <div>Payment element</div>,
  useStripe: () => null,
  useElements: () => null,
}));

const filledCart = {
  id: 'cart-1',
  itemCount: 1,
  subtotal: '40.00',
  items: [
    {
      id: 'item-1',
      productId: 'prod-1',
      quantity: 1,
      unitPrice: '40.00',
      lineTotal: '40.00',
      product: {
        id: 'prod-1',
        name: 'Oak side table',
        slug: 'oak-side-table',
        price: '40.00',
        images: [],
        stockQuantity: 4,
      },
    },
  ],
};

describe('Checkout form', () => {
  beforeEach(() => {
    useCartStore.setState({
      cart: filledCart,
      promoCode: '',
      drawerOpen: true,
      closeDrawer: vi.fn(),
      fetchCart: vi.fn(),
    });
  });

  it('shows an empty state when the cart has no items', () => {
    useCartStore.setState({ cart: { id: 'cart-1', items: [], itemCount: 0, subtotal: '0.00' } });
    render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>,
    );
    expect(screen.getByText(/your cart is empty/i)).toBeInTheDocument();
  });

  it('validates shipping fields before creating an order', async () => {
    const user = userEvent.setup();
    const { apiSend } = await import('@/lib/api');

    render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /continue to payment/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /continue to payment/i }));

    expect(await screen.findByText('Street address is required')).toBeInTheDocument();
    expect(screen.getByText('City is required')).toBeInTheDocument();
    expect(screen.getByText('Postal code is required')).toBeInTheDocument();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('submits a valid address and starts payment', async () => {
    const user = userEvent.setup();
    const { apiSend } = await import('@/lib/api');
    vi.mocked(apiSend)
      .mockResolvedValueOnce({
        id: 'order-1',
        orderNumber: 'ORD-1',
        status: 'PENDING',
        subtotal: '40.00',
        discountAmount: '0.00',
        shippingAmount: '9.99',
        taxAmount: '3.20',
        total: '53.19',
        currency: 'USD',
        coupon: null,
        shippingSnapshot: { line1: '100 Market Street', city: 'Austin', postalCode: '78701', country: 'US' },
        billingSnapshot: {},
        items: [{ id: 'oi-1', name: 'Oak side table', sku: 'OAK', unitPrice: '40.00', quantity: 1, lineTotal: '40.00' }],
        createdAt: new Date().toISOString(),
      })
      .mockResolvedValueOnce({
        clientSecret: 'secret',
        publishableKey: 'pk_test_123',
      });

    render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>,
    );

    await user.type(screen.getByRole('textbox', { name: 'Address' }), '100 Market Street');
    await user.type(screen.getByRole('textbox', { name: 'City' }), 'Austin');
    await user.type(screen.getByRole('textbox', { name: 'Postal code' }), '78701');
    await user.click(screen.getByRole('button', { name: /continue to payment/i }));

    expect(await screen.findByText('Payment element')).toBeInTheDocument();
    expect(apiSend).toHaveBeenCalledWith(
      '/orders',
      expect.objectContaining({
        sameBillingAsShipping: true,
        shippingAddress: expect.objectContaining({
          line1: '100 Market Street',
          city: 'Austin',
          postalCode: '78701',
          country: 'US',
        }),
      }),
    );
  });

  it('uses local test checkout when Stripe is not configured', async () => {
    const user = userEvent.setup();
    const { apiSend } = await import('@/lib/api');
    vi.mocked(apiSend)
      .mockResolvedValueOnce({
        id: 'order-1',
        orderNumber: 'ORD-1',
        status: 'PENDING',
        subtotal: '40.00',
        discountAmount: '0.00',
        shippingAmount: '9.99',
        taxAmount: '3.20',
        total: '53.19',
        currency: 'USD',
        coupon: null,
        shippingSnapshot: { line1: '100 Market Street', city: 'Austin', postalCode: '78701', country: 'US' },
        billingSnapshot: {},
        items: [{ id: 'oi-1', name: 'Oak side table', sku: 'OAK', unitPrice: '40.00', quantity: 1, lineTotal: '40.00' }],
        createdAt: new Date().toISOString(),
      })
      .mockResolvedValueOnce({
        mock: true,
        clientSecret: null,
        publishableKey: '',
      });

    render(
      <MemoryRouter>
        <Checkout />
      </MemoryRouter>,
    );

    await user.type(screen.getByRole('textbox', { name: 'Address' }), '100 Market Street');
    await user.type(screen.getByRole('textbox', { name: 'City' }), 'Austin');
    await user.type(screen.getByRole('textbox', { name: 'Postal code' }), '78701');
    await user.click(screen.getByRole('button', { name: /continue to payment/i }));

    expect(await screen.findByText(/local test checkout/i)).toBeInTheDocument();
    expect(screen.queryByText('Payment element')).not.toBeInTheDocument();
  });
});
