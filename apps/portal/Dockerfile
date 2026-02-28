# VistA-Evolved Portal (Next.js patient-facing) -- Production Dockerfile
# Multi-stage build: deps -> build -> standalone runtime
# Port: 3002, non-root user, standalone output

# ---- Stage 1: Dependencies ----
FROM node:22-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY apps/portal/package.json apps/portal/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# ---- Stage 2: Build ----
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=deps /app/node_modules ./node_modules
COPY apps/portal/package.json apps/portal/pnpm-lock.yaml* ./
COPY apps/portal/tsconfig.json apps/portal/next.config.ts apps/portal/next-env.d.ts ./
COPY apps/portal/src ./src
COPY apps/portal/public ./public

ARG NEXT_PUBLIC_API_URL=http://api:3001
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN pnpm build

# ---- Stage 3: Minimal runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app

RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -D appuser

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

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
