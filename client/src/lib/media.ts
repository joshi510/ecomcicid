export function mediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const api = import.meta.env.VITE_API_URL ?? '/api';
  const origin = api.replace(/\/api\/?$/, '');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export function formatPrice(value: string | number) {
  const amount = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(amount)) return value.toString();
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
