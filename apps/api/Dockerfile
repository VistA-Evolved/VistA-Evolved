# VistA-Evolved API — Production Dockerfile
# Two-stage build: install all deps → slim runtime with tsx
# tsx is required because the project uses ESM + TypeScript path resolution
# that tsc alone cannot produce runnable output for.

# ---- Stage 1: Install dependencies ----
FROM node:22-alpine AS deps
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifest + lockfile first for layer caching
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/

# Install ALL deps (tsx + typescript needed at runtime & type-check)
RUN pnpm install --frozen-lockfile --filter @vista-evolved/api

# ---- Stage 2: Minimal runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app

# Non-root user for security
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -D appuser

# Install pnpm (needed for node_modules resolution)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy deps from builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/apps/api/package.json ./apps/api/

# Copy source (tsx compiles on the fly)
COPY apps/api/src ./apps/api/src
COPY apps/api/tsconfig.json ./apps/api/

# Copy workspace root files needed for pnpm resolution
COPY pnpm-workspace.yaml package.json ./

# Create logs directory
RUN mkdir -p /app/logs && chown -R appuser:appgroup /app

# Set build metadata
ARG BUILD_SHA=unknown
ARG BUILD_TIME=unknown
ENV BUILD_SHA=${BUILD_SHA}
ENV BUILD_TIME=${BUILD_TIME}

# Runtime env defaults (overridden by docker-compose or Kubernetes)
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001
ENV LOG_FORMAT=json
ENV LOG_LEVEL=info
ENV AUDIT_SINK=file
ENV AUDIT_FILE_PATH=/app/logs/audit.jsonl

USER appuser
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3001/health || exit 1

CMD ["npx", "tsx", "apps/api/src/index.ts"]
