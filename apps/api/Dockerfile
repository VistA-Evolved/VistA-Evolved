# VistA-Evolved API — Production Dockerfile
# Multi-stage build: install deps → compile TypeScript → minimal runtime image

# ---- Stage 1: Install + build ----
FROM node:22-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifest + lockfile
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json apps/api/

# Install production deps only
RUN pnpm install --frozen-lockfile --filter @vista-evolved/api

# Copy API source
COPY apps/api/ apps/api/

# Compile TypeScript
RUN cd apps/api && pnpm build

# ---- Stage 2: Minimal runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app

# Non-root user for security
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -D appuser

# Install pnpm for runtime
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy built output + node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/node_modules ./node_modules

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
  CMD wget -q --spider http://localhost:3001/health || exit 1

CMD ["node", "--enable-source-maps", "dist/index.js"]
