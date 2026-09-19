# Ecommerce (CI/CD)

Production-oriented ecommerce monorepo: a React storefront and an Express REST API, sharing one workspace for installs, linting, and formatting.

## Stack

| Layer   | Choice                                                          |
| ------- | --------------------------------------------------------------- |
| Client  | React 19, Vite, TypeScript, Tailwind CSS, React Router, Zustand |
| Server  | Node.js, Express, TypeScript, JWT-ready auth config             |
| Data    | PostgreSQL + Prisma ORM                                         |
| Quality | ESLint 9 (flat config) + Prettier                               |

Zustand is the client store for this project (lighter than Redux Toolkit for the same job). Swap later if you need time-travel debugging or a larger middleware ecosystem.

## Folder structure

```text
.
├── client/                 # Vite + React storefront
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/     # Shared UI
│   │   ├── hooks/
│   │   ├── lib/            # API client, helpers
│   │   ├── pages/
│   │   ├── store/          # Zustand stores
│   │   └── types/
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── server/                 # Express REST API
│   ├── prisma/             # schema.prisma
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── prisma/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── .env.example
│   └── package.json
├── eslint.config.js        # Shared lint rules (client + server)
├── .prettierrc
├── package.json            # npm workspaces root
└── README.md
```

This repo is scaffolding only — no product features yet.

## Prerequisites

- Node.js 20.19+ (22+ recommended)
- npm 10+
- PostgreSQL 15+ (needed once Prisma models and migrations are added)

## Setup

```bash
# from the repo root
npm install

# copy environment templates
copy client\.env.example client\.env
copy server\.env.example server\.env
```

On macOS/Linux use `cp` instead of `copy`.

Edit `server/.env` and set `DATABASE_URL` to your local Postgres instance. `JWT_SECRET` must be a long random string before auth is implemented.

## Run

Start both apps (two processes):

```bash
npm run dev
```

Or start them separately:

```bash
npm run dev:client    # http://localhost:5173
npm run dev:server    # http://localhost:5000
```

The API exposes `GET /api/health` so you can confirm the server (and database ping) is up. The client is a Tailwind-styled placeholder shell.

## Scripts

| Command                | What it does                     |
| ---------------------- | -------------------------------- |
| `npm run dev`          | Dev servers for all workspaces   |
| `npm run dev:client`   | Vite only                        |
| `npm run dev:server`   | Express (tsx watch) only         |
| `npm run build`        | Production builds                |
| `npm run lint`         | ESLint across the monorepo       |
| `npm run format`       | Prettier write                   |
| `npm run format:check` | Prettier check (CI-friendly)     |
| `npm run typecheck`    | `tsc --noEmit` in each workspace |

Workspace-local Prisma helpers (run from `server/` or with `-w server`):

```bash
npm run prisma:generate -w server
npm run prisma:migrate -w server
```

## Environment

**Client (`client/.env`)**

- `VITE_API_URL` — browser-facing API base (default `http://localhost:5000/api`)

**Server (`server/.env`)**

- `PORT`, `NODE_ENV`
- `DATABASE_URL` — Postgres connection string
- `JWT_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`
- `CLIENT_URL` — CORS origin (Vite default `http://localhost:5173`)
- `LOG_LEVEL` — Pino level (default `info`)
- `TAX_RATE`, `SHIPPING_FLAT_RATE`, `FREE_SHIPPING_THRESHOLD` — checkout totals
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`

Never commit real `.env` files. Templates live in each package as `.env.example`.
