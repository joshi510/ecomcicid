# syntax=docker/dockerfile:1
# Build from the monorepo root:
#   docker build -f client/Dockerfile --build-arg VITE_API_URL=... --build-arg VITE_SITE_URL=... .

FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

RUN npm ci

COPY client ./client

ARG VITE_API_URL=http://localhost:5000/api
ARG VITE_SITE_URL=http://localhost:8080
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SITE_URL=$VITE_SITE_URL

RUN npm run build -w client

FROM nginx:1.27-alpine AS runner
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/client/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
