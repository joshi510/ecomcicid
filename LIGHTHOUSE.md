# Lighthouse performance checklist

Run Chrome Lighthouse (Mobile + Desktop) against the production build (`npm run build -w client && npm run preview -w client`). Aim for Performance ≥ 90, SEO ≥ 95, Best Practices ≥ 95.

## Largest Contentful Paint (LCP)

- [x] Hero image is preloaded in `index.html` with `fetchpriority="high"`.
- [x] Hero and product cards reserve space with `width`/`height` and `aspect-*` to avoid late layout.
- [x] Unsplash images request WebP (`fm=webp`) and a width-matched `srcset`.
- [x] Inter is loaded with `display=swap` and font origins are preconnected.
- [x] Routes are code-split (`React.lazy`) so the home chunk stays small.
- [ ] Serve the storefront over HTTP/2 or HTTP/3 in production.
- [ ] Replace the remote hero with a self-hosted, compressed WebP/AVIF when a CDN is available.

## Cumulative Layout Shift (CLS)

- [x] Images always include width, height, and an aspect-ratio box.
- [x] Product grid skeletons match the final card aspect ratio (`4/5`).
- [x] Cart/checkout summaries render after data is present; empty states do not swap layout late.
- [ ] Avoid injecting late webfonts that change metrics; consider `size-adjust` if CLS appears on headings.

## Other Lighthouse items

- [x] Per-route titles and meta descriptions via `react-helmet-async`.
- [x] `robots.txt` and `sitemap.xml` in `client/public`.
- [x] Account, admin, cart, and checkout are `noindex`.
- [x] Gzip/Brotli: API responses are compressed (`compression` middleware).
- [x] Product listing responses send `Cache-Control` and an optional Redis/memory cache.
- [ ] Enable Brotli at the CDN/nginx layer for static JS/CSS.
- [ ] Confirm Stripe.js is only loaded on `/checkout` (route-split already).

## Suggested command

```bash
npm run build -w client
npm run preview -w client
# then run Lighthouse against http://localhost:4173
```
