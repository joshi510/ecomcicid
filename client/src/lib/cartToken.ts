const KEY = 'ecom-cart-token';

export function readStoredCartToken(): string | undefined {
  try {
    return localStorage.getItem(KEY) || undefined;
  } catch {
    return undefined;
  }
}

export function persistCartToken(token?: string | null) {
  if (!token) return;
  try {
    localStorage.setItem(KEY, token);
  } catch {
    // ignore quota / private mode
  }
}
