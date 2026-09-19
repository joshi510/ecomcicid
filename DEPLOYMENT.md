# Deployment

Northline is an npm workspaces monorepo: `client` (Vite + React) and `server` (Express + Prisma + Postgres). Redis is optional for product-list caching.

## Local / staging with Docker

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
docker compose up --build
```

- API: http://localhost:5000 (`GET /api/health`)
- Storefront: http://localhost:8080
- Postgres: localhost:5432 (`postgres` / `postgres` / `ecom_db`)
- Redis: localhost:6379

Compose runs the API as `NODE_ENV=development` so HTTPS redirects do not fire on `http://localhost`. Override JWT and Stripe values with a root `.env` (see `docker-compose.yml`).

```bash
npm run docker:up      # compose up --build
npm run docker:down    # compose down
```

## Production build scripts

| Command | What it does |
|---|---|
| `npm run build:prod` | Production build of client and server |
| `npm run start:prod` | `prisma migrate deploy` then start the API |
| `npm run prisma:migrate:deploy -w server` | Apply committed migrations only |

Copy examples, never commit real secrets:

- `server/.env.production.example` → platform env / `server/.env.production`
- `client/.env.production.example` → Vercel/Netlify env or `client/.env.production`

Vite inlines `VITE_*` at **build** time. Changing the API URL later requires a frontend rebuild.

## Split hosting (required cookie setting)

The storefront and API are different sites on Vercel/Netlify + Render/Railway/Fly. Browsers will not send `SameSite=Strict` cookies on those cross-site XHR calls.

Set on the API:

```
COOKIE_SAMESITE=none
CLIENT_URL=https://your-storefront.example
```

`none` requires HTTPS (`Secure` cookies). Prefer a shared parent domain later (`shop.example.com` + `api.example.com`) and switch to `COOKIE_SAMESITE=strict`.

Point the storefront at:

```
VITE_API_URL=https://your-api.example/api
VITE_SITE_URL=https://your-storefront.example
```

Create a Stripe webhook for `https://your-api.example/api/payments/webhook`.

---

## Backend: Render

1. New **Web Service** from this repo. Runtime: **Docker**. Dockerfile: `server/Dockerfile`. Context: repo root.
2. Add a **PostgreSQL** database. Optional: **Redis**.
3. Set env vars from `server/.env.production.example`. Map `DATABASE_URL` and `REDIS_URL` from the add-ons.
4. Health check: `/api/health`.
5. After the first deploy, copy the service URL into `CLIENT_URL` on the API and `VITE_API_URL` on the frontend, then redeploy both.
6. Create a **Deploy Hook** and store it as GitHub secret `RENDER_DEPLOY_HOOK`.

Blueprint alternative: `render.yaml` (`CLIENT_URL` and Stripe keys stay manual).

## Backend: Railway

1. New project → **Deploy from GitHub**. Add **PostgreSQL** and **Redis**.
2. Service settings: Dockerfile `server/Dockerfile`, watch the repo root.
3. Railway injects `DATABASE_URL` and `REDIS_URL`. Add the rest from `server/.env.production.example`.
4. Public URL → `CLIENT_URL`. Start command is the image entrypoint (`prisma migrate deploy` then `node dist/index.js`).
5. Settings → Deploy → **Deploy webhook** → GitHub secret `RAILWAY_DEPLOY_HOOK`.

## Backend: Fly.io

```bash
fly launch --config fly.toml --no-deploy
fly postgres create --name ecom-pg
fly postgres attach ecom-pg
fly redis create
fly secrets set JWT_SECRET=... JWT_REFRESH_SECRET=... CLIENT_URL=https://shop.example.com \
  COOKIE_SAMESITE=none STRIPE_SECRET_KEY=... STRIPE_PUBLISHABLE_KEY=... STRIPE_WEBHOOK_SECRET=...
fly deploy --config fly.toml --dockerfile server/Dockerfile
```

`fly.toml` exposes port **8080** and checks `/api/health`. For GitHub Actions set `FLY_API_TOKEN` (and optional `FLY_APP`).

---

## Frontend: Vercel

1. Import the repo. Framework: Vite. Leave the root as the project root (`vercel.json` already sets install/build/output).
2. Environment variables:

   | Name | Example |
   |---|---|
   | `VITE_API_URL` | `https://ecom-api.onrender.com/api` |
   | `VITE_SITE_URL` | `https://your-app.vercel.app` |

3. Deploy. Copy the production URL into the API `CLIENT_URL` and redeploy the API.
4. For GitHub Actions: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (Project Settings → General).

SPA fallback is in `vercel.json`.

## Frontend: Netlify

1. Import the repo. Build command `npm run build -w client`, publish `client/dist` (see `netlify.toml`).
2. Set `VITE_API_URL` and `VITE_SITE_URL` in Site configuration → Environment variables.
3. For GitHub Actions: `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`. The workflow uses Netlify only when `VERCEL_TOKEN` is unset.

---

## GitHub Actions

`.github/workflows/ci.yml`:

1. On every PR and push: install → Prisma generate/migrate → lint → typecheck → test → production build.
2. On push to `main` after a green verify job: deploy API (Render hook, else Railway hook, else Fly), then deploy the storefront (Vercel, else Netlify).

Create a GitHub **Environment** named `production` if you want approval gates.

### Secrets

| Secret | Used for |
|---|---|
| `RENDER_DEPLOY_HOOK` | API deploy (preferred) |
| `RAILWAY_DEPLOY_HOOK` | API deploy (if no Render hook) |
| `FLY_API_TOKEN` / `FLY_APP` | API deploy (if no hooks) |
| `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` | Storefront |
| `NETLIFY_AUTH_TOKEN` / `NETLIFY_SITE_ID` | Storefront fallback |
| `VITE_API_URL` / `VITE_SITE_URL` | Inlined into the CI storefront build |

Missing deploy secrets skip that target; CI still passes.

---

## Production launch checklist

### Environment

- [ ] API `NODE_ENV=production`
- [ ] Distinct `JWT_SECRET` and `JWT_REFRESH_SECRET` (32+ random chars, not the example strings)
- [ ] `DATABASE_URL` points at managed Postgres with `sslmode=require`
- [ ] `REDIS_URL` set if you want shared product-list cache across instances
- [ ] `CLIENT_URL` is the exact storefront origin (scheme + host, no trailing slash)
- [ ] `COOKIE_SAMESITE=none` for split hosts, or `strict` on a shared parent domain
- [ ] Live Stripe keys (`sk_live_`, `pk_live_`) — not `sk_test_replace_me`
- [ ] Stripe webhook endpoint + `STRIPE_WEBHOOK_SECRET` for `/api/payments/webhook`
- [ ] `VITE_API_URL` and `VITE_SITE_URL` set **before** the frontend production build
- [ ] `client/public/sitemap.xml` host matches `VITE_SITE_URL`
- [ ] Tax / shipping env values match the live catalog
- [ ] First admin user created (register, then set `role = ADMIN` in Postgres)

### Data and backups

- [ ] Automated Postgres backups enabled (Render/Railway/Fly/RDS point-in-time recovery)
- [ ] Restore tested at least once
- [ ] Uploaded product images are on a persistent volume or object storage — container disks are ephemeral
- [ ] `prisma migrate deploy` is the only production schema path (never `db push`)

### Security

- [ ] Platform TLS is on; API `enforceHttps` + HSTS are active
- [ ] CORS origin is only the storefront
- [ ] Stripe webhook is the only unsigned raw-body route
- [ ] Secrets live in the host’s secret store, not in git
- [ ] GitHub environment protection / required reviewers on `production`

### Error monitoring (Sentry)

Not wired in the app yet. Before launch:

1. Create Sentry projects for `ecom-api` and `ecom-web`.
2. API: `@sentry/node` in `server/src/index.ts`, DSN in `SENTRY_DSN`.
3. Client: `@sentry/react` in `client/src/main.tsx`, DSN in `VITE_SENTRY_DSN` (public by design).
4. Confirm a test error appears from both production services.

### Analytics

Not wired yet. Before launch:

1. Add Plausible, GA4, or Fathom.
2. Client-only measurement IDs go in `VITE_*` (for example `VITE_PLAUSIBLE_DOMAIN`).
3. Do not send admin routes (`/admin`, `/account`) if that is your privacy policy.
4. Verify pageviews on `/` and `/products` after deploy.

### Go-live smoke test

- [ ] `GET /api/health` returns `database: up`
- [ ] Register, login, refresh (cookie present), logout
- [ ] Guest cart survives reload, then merges on login
- [ ] Checkout with a Stripe test card on the live webhook, then switch to live mode
- [ ] Admin product upload, archive, and order status
- [ ] Lighthouse on the production URL (see `LIGHTHOUSE.md`)
- [ ] `robots.txt` and `sitemap.xml` are reachable
