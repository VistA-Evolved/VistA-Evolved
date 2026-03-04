# Production Deployment — Phase 16

> Deploy VistA-Evolved API + Web via Docker and reverse proxy.

## Prerequisites

1. Docker + Docker Compose installed
2. VistA sandbox accessible (Docker or remote host)
3. `.env.prod` created from `apps/api/.env.example` with real credentials
4. TLS certificates (for production; skip for staging/dev)

## Architecture

```
┌──────────┐     ┌──────────┐     ┌───────────────┐
│  nginx   │────▶│  web     │     │   VistA RPC   │
│  (proxy) │     │ (Next.js)│     │  Broker:9430  │
│  :443    │     │ :3000    │     └───────────────┘
│          │────▶│          │            ▲
│          │     └──────────┘            │
│          │────▶┌──────────┐────────────┘
│          │     │  api     │
│          │     │(Fastify) │
│          │     │ :3001    │
└──────────┘     └──────────┘
```

## Quick Start (Staging)

```bash
# 1. Set build metadata
export BUILD_SHA=$(git rev-parse --short HEAD)
export BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# 2. Build and run
docker compose -f docker-compose.prod.yml up -d --build

# 3. Verify
curl http://localhost/health
curl http://localhost/ready
curl http://localhost/version
```

## Environment Variables

All environment variables are documented in `apps/api/.env.example`.

Critical production variables:
| Variable | Required | Description |
|----------|----------|-------------|
| `VISTA_HOST` | Yes | VistA RPC Broker hostname |
| `VISTA_PORT` | Yes | VistA RPC Broker port (default: 9430) |
| `VISTA_ACCESS_CODE` | Yes | VistA sign-on access code |
| `VISTA_VERIFY_CODE` | Yes | VistA sign-on verify code |
| `ALLOWED_ORIGINS` | Yes (prod) | Comma-separated allowed CORS origins |
| `LOG_LEVEL` | No | Logging level (default: info) |
| `AUDIT_SINK` | No | Audit destination: memory, file, stdout (default: memory) |

## Building Images

```bash
# API image
docker build -f apps/api/Dockerfile \
  --build-arg BUILD_SHA=$(git rev-parse --short HEAD) \
  --build-arg BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  -t vista-evolved-api:latest .

# Web image
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://ehr.example.com \
  --build-arg BUILD_SHA=$(git rev-parse --short HEAD) \
  -t vista-evolved-web:latest .
```

## TLS Setup

1. Place certificates in `certs/cert.pem` and `certs/key.pem`
2. Uncomment SSL directives in `nginx/nginx.conf`
3. Uncomment the cert volume mounts in `docker-compose.prod.yml`
4. Restart: `docker compose -f docker-compose.prod.yml restart proxy`

## Health Check Endpoints

| Endpoint   | Purpose         | Expected                                |
| ---------- | --------------- | --------------------------------------- |
| `/health`  | Process alive   | `{ ok: true, uptime: N }`               |
| `/ready`   | VistA reachable | `{ ok: true, vista: "reachable" }`      |
| `/version` | Build metadata  | `{ commitSha, buildTime, nodeVersion }` |
| `/metrics` | RPC stats       | Circuit breaker + cache + latencies     |

## Local Development (unchanged)

Local dev is unaffected by the Docker setup:

```bash
pnpm -C apps/api dev    # API on :3001
pnpm -C apps/web dev    # Web on :3000
```

## Rolling Updates

```bash
export BUILD_SHA=$(git rev-parse --short HEAD)
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d --no-deps api
# Wait for health check to pass, then:
docker compose -f docker-compose.prod.yml up -d --no-deps web
docker compose -f docker-compose.prod.yml up -d --no-deps proxy
```

## Graceful Shutdown

The API handles SIGTERM/SIGINT gracefully:

1. Stops accepting new connections
2. Drains in-flight requests
3. Logs shutdown audit event
4. Exits cleanly

Docker stop sends SIGTERM by default — the container will shut down gracefully
within the default 10s timeout.
