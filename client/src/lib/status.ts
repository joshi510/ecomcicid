export const ORDER_STATUSES = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;

export function orderBadgeVariant(status: string): 'neutral' | 'primary' | 'success' | 'warning' | 'danger' {
  if (status === 'PENDING') return 'warning';
  if (status === 'DELIVERED') return 'success';
  if (status === 'CANCELLED') return 'danger';
  if (status === 'PAID' || status === 'SHIPPED') return 'primary';
  return 'neutral';
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
