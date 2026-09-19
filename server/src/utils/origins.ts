import { env } from '../config/env.js';

export function isAllowedOrigin(origin?: string) {
  if (!origin) {
    return true;
  }

  if (origin === env.CLIENT_URL) {
    return true;
  }

  if (env.NODE_ENV === 'production') {
    return false;
  }

  try {
    const url = new URL(origin);
    const localHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    return localHost && (url.protocol === 'http:' || url.protocol === 'https:');
  } catch {
    return false;
  }
}
