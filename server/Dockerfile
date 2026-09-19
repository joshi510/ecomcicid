# syntax=docker/dockerfile:1
# Build from the monorepo root:
#   docker build -f server/Dockerfile .

FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY server/prisma ./server/prisma

RUN npm ci

COPY server/tsconfig.json ./server/
COPY server/src ./server/src

RUN npm run prisma:generate -w server \
  && npm run build -w server

FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat \
  && addgroup -S app && adduser -S app -G app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY server/prisma ./server/prisma
COPY server/docker-entrypoint.sh ./server/docker-entrypoint.sh

RUN npm ci --omit=dev --workspace=server --include-workspace-root \
  && npm run prisma:generate -w server \
  && mkdir -p /app/server/uploads/products \
  && sed -i 's/\r$//' /app/server/docker-entrypoint.sh \
  && chmod +x /app/server/docker-entrypoint.sh \
  && chown -R app:app /app

COPY --from=builder /app/server/dist ./server/dist

USER app
WORKDIR /app/server
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 5000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
