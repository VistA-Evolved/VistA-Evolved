# VistA-Evolved Portal (Next.js patient-facing) — Production Dockerfile
# Multi-stage build: deps -> build -> standalone runtime
# Monorepo: requires workspace root + apps/portal + packages + shared

# ---- Stage 1: Dependencies ----
FROM node:22-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.29.2 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/portal/package.json apps/portal/
COPY apps/api/package.json apps/api/
COPY packages/ packages/
COPY shared/ shared/

RUN pnpm install --frozen-lockfile --filter portal...

# ---- Stage 2: Build ----
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.29.2 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/portal/node_modules ./apps/portal/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/portal/ apps/portal/
COPY apps/api/package.json apps/api/
COPY packages/ packages/
COPY shared/ shared/

WORKDIR /app/apps/portal

ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN pnpm build

# ---- Stage 3: Minimal runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app

RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -D appuser

COPY --from=builder /app/apps/portal/.next/standalone ./
COPY --from=builder /app/apps/portal/.next/static ./.next/static
COPY --from=builder /app/apps/portal/public ./public

ARG BUILD_SHA=unknown
ARG BUILD_TIME=unknown
ENV BUILD_SHA=${BUILD_SHA}
ENV BUILD_TIME=${BUILD_TIME}
ENV NODE_ENV=production
ENV PORT=3002
ENV HOSTNAME=0.0.0.0

RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3002/ || exit 1

CMD ["node", "server.js"]
