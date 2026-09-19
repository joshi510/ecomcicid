export const SITE_NAME = 'Northline';

export function siteOrigin() {
  const configured = import.meta.env.VITE_SITE_URL;
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:5173';
}

export function siteUrl(path = '/') {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${siteOrigin()}${normalized}`;
}
