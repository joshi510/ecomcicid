import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ProductCard } from './ProductCard';

const product = {
  id: 'p1',
  name: 'Linen lounge chair',
  slug: 'linen-lounge-chair',
  description: 'A quiet chair.',
  price: '640.00',
  compareAtPrice: '780.00',
  images: ['https://example.com/chair.jpg'],
  category: { id: 'c1', name: 'Living', slug: 'living' },
};

describe('ProductCard', () => {
  it('links to the product detail page and shows sale pricing', () => {
    render(
      <MemoryRouter>
        <ProductCard product={product} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /linen lounge chair/i })).toHaveAttribute(
      'href',
      '/products/linen-lounge-chair',
    );
    expect(screen.getByText('Living')).toBeInTheDocument();
    expect(screen.getByText('$640.00')).toBeInTheDocument();
    expect(screen.getByText('$780.00')).toBeInTheDocument();
  });
});
