# Run From Zero -- Complete Cold Start Checklist

This is the single canonical checklist for starting VistA-Evolved from a fresh
clone on a new machine. Follow every step in order.

## Prerequisites

- Node.js 24+ (LTS)
- pnpm 10+ (`corepack enable && corepack prepare pnpm@latest --activate`)
- Docker Desktop with at least 6 GB RAM allocated
- PowerShell 7+ (Windows) or bash (macOS/Linux)

## Step 1: Clone and Install

```bash
git clone https://github.com/VistA-Evolved/VistA-Evolved.git
cd VistA-Evolved
pnpm install
```

## Step 2: Start Docker Services

### Option A: One-Command Start (recommended)

```powershell
# PowerShell (Windows)
.\scripts\dev-up.ps1 -RuntimeLane vehu

# bash (macOS/Linux)
./scripts/dev-up.sh --profile vehu
```

This handles everything: Docker containers, env files, health checks, and
verification. Skip to Step 6 if using this option.

### Option B: Manual Start

```powershell
# Start VEHU VistA + PostgreSQL
cd services/vista
docker compose --profile vehu up -d
cd ../..

cd services/platform-db
docker compose up -d
cd ../..
```

Wait 15-30 seconds for VistA broker to initialize.

## Step 3: Configure API Credentials (first time only)

```powershell
cp apps/api/.env.example apps/api/.env.local
```

Edit `apps/api/.env.local` and set:

```
VISTA_HOST=127.0.0.1
VISTA_PORT=9431
VISTA_ACCESS_CODE=PRO1234
VISTA_VERIFY_CODE=PRO1234!!
PLATFORM_PG_URL=postgresql://ve_api:ve_dev_only_change_in_prod@127.0.0.1:5433/ve_platform
```

## Step 4: Provision VistA RPCs (first time only)

```powershell
.\scripts\install-vista-routines.ps1 -ContainerName vehu -VistaUser vehu
```

This copies all custom ZVE* M routines into VistA and registers RPCs.
Idempotent -- safe to run multiple times.

## Step 5: Start API and Web

```powershell
# Terminal 1: API
cd apps/api
npx tsx --env-file=.env.local src/index.ts

# Terminal 2: Web
cd apps/web
pnpm dev

# Terminal 3 (optional): Patient Portal
cd apps/portal
pnpm dev
```

## Step 6: Verify Everything Works

```powershell
# Health check
curl.exe http://127.0.0.1:3001/health

# VistA connectivity
curl.exe http://127.0.0.1:3001/vista/ping

# Patient search (requires login)
# See AGENTS.md Section 0A for login + test commands
```

Expected results:

- `/health` returns `{"ok":true}` with PG and circuit breaker status
- `/vista/ping` returns `{"ok":true,"vista":"reachable","port":9431}`
- Web UI loads at `http://localhost:3000`
- Portal loads at `http://localhost:3002` (if started)

## Step 7: Run Verification Suite

```powershell
.\scripts\verify-latest.ps1
```

This runs the RC verification gates. Use `-SkipDocker` to skip live VistA tests.

If you need to run the source-level dead-click tripwire directly from the repo
root, use `pnpm qa:tripwire:source`. The workspace root does not carry its own
`tsx` binary; the script delegates to the app-local runner under `apps/api`.

## Optional Services

### Imaging (Orthanc + OHIF)

```powershell
cd services/imaging
docker compose --profile imaging up -d
```

Orthanc: http://localhost:8042, OHIF: http://localhost:3003

### Keycloak (OIDC)

```powershell
cd services/keycloak
docker compose up -d
```

Keycloak admin: http://localhost:8080 (admin/admin)

### Analytics (YottaDB/Octo/ROcto)

```powershell
cd services/analytics
docker compose up -d
```

ROcto SQL: port 1338

### Observability (OTel + Jaeger + Prometheus)

```powershell
cd services/observability
docker compose up -d
```

Jaeger: http://localhost:16686, Prometheus: http://localhost:9090

## Port Map

| Service        | Port  | Notes                    |
| -------------- | ----- | ------------------------ |
| VistA Broker   | 9431  | VEHU XWB RPC             |
| VistA SSH      | 2223  | VEHU SSH access          |
| PostgreSQL     | 5433  | Platform DB              |
| API            | 3001  | Fastify                  |
| Web            | 3000  | Next.js (clinician)      |
| Portal         | 3002  | Next.js (patient)        |
| Orthanc        | 8042  | DICOM server (optional)  |
| OHIF           | 3003  | Viewer (optional)        |
| Keycloak       | 8080  | OIDC (optional)          |
| ROcto          | 1338  | SQL analytics (optional) |
| Jaeger         | 16686 | Tracing (optional)       |
| Prometheus     | 9090  | Metrics (optional)       |

## Credentials

| Service    | Username  | Password    | Notes                 |
| ---------- | --------- | ----------- | --------------------- |
| VistA VEHU | PRO1234   | PRO1234!!   | DUZ 1, PROGRAMMER,ONE |
| PostgreSQL | ve_api    | (see .env)  | Platform DB           |
| Keycloak   | admin     | admin       | Admin console         |

## Troubleshooting

- **Port 9431 not responding**: Wait 15-30s after container start. Check
  `docker logs vehu` for initialization progress.
- **PG connection refused**: Ensure platform-db container is running on 5433.
- **Migration errors**: Check API startup log for `migration_failed`. Fix
  before proceeding.
- **Added or renamed a prompt phase and verifier freshness fails**: Rebuild the
  canonical phase index with `pnpm qa:phase-index`, then rerun
  `./scripts/verify-latest.ps1`.
- **`G09` fails on TypeScript Web compile**: Isolate the exact frontend error
  with `pnpm -C apps/web exec tsc --noEmit` before rerunning the full verifier.
- **pnpm install fails**: Delete `node_modules` and `pnpm-lock.yaml`, then
  `pnpm install` again.

## Next Steps

- Read `AGENTS.md` for the full governance and development rules
- Read `docs/runbooks/runtime-lanes.md` for all 4 VistA lane options
- Run `.\scripts\verify-latest.ps1` to check system health
