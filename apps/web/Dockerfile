# VistA-Evolved Web (Next.js) — Production Dockerfile
# Multi-stage build: install → build → standalone runtime

# ---- Stage 1: Dependencies ----
FROM node:22-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package manifest + lockfile from the web directory
COPY apps/web/package.json apps/web/pnpm-lock.yaml ./

# Install all deps (need devDependencies for build)
RUN pnpm install --frozen-lockfile || pnpm install

# ---- Stage 2: Build ----
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Bring in installed node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy web source files (not node_modules or .next)
COPY apps/web/package.json apps/web/pnpm-lock.yaml ./
COPY apps/web/tsconfig.json apps/web/next.config.ts apps/web/next-env.d.ts ./
COPY apps/web/eslint.config.mjs ./
COPY apps/web/src ./src
COPY apps/web/public ./public

# Build-time env
ARG NEXT_PUBLIC_API_URL=http://api:3001
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN pnpm build

# ---- Stage 3: Minimal runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app

RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -D appuser

# Next.js standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

ARG BUILD_SHA=unknown
ARG BUILD_TIME=unknown
ENV BUILD_SHA=${BUILD_SHA}
ENV BUILD_TIME=${BUILD_TIME}
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
