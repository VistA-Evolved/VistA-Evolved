# VistA Distro Lane -- Runbook (Phase 148)

## Overview

The VistA Distro Lane provides a **reproducible, production-ready** alternative
to the WorldVistA demo Docker image. It builds a VistA instance from versioned
sources using YottaDB, with no baked-in credentials and minimal network exposure.

**Important:** The dev sandbox (`services/vista/`) is NOT replaced. Both lanes
coexist. Switch between them by changing `VISTA_HOST` and `VISTA_PORT`.

## Architecture

```
                     +------------------+
                     |  VistA-Evolved   |
                     |  Fastify API     |
                     |  (apps/api)      |
                     +--------+---------+
                              |
                     VISTA_HOST:VISTA_PORT
                              |
               +--------------+--------------+
               |                             |
    +----------+----------+     +-----------+-----------+
    | Dev Sandbox          |     | Distro Lane           |
    | worldvista/          |     | vista-evolved/        |
    |   worldvista-ehr     |     |   vista-distro        |
    | Port: 9430           |     | Port: 9431            |
    | Default creds: YES   |     | Default creds: NO     |
    | SSH: YES (port 2222) |     | SSH: NO               |
    | Reproducible: NO     |     | Reproducible: YES     |
    +----------------------+     +-----------------------+
```

## Quick Start

### 1. Build the Distro Image

```powershell
cd services/vista-distro

# Basic build
docker build -t vista-evolved/vista-distro:latest .

# Pinned build with metadata
docker build `
  --build-arg BUILD_SHA=$(git rev-parse --short HEAD) `
  --build-arg BUILD_DATE=$(Get-Date -Format o) `
  --build-arg VISTA_ROUTINE_REF=master `
  -t vista-evolved/vista-distro:$(Get-Date -Format yyyyMMdd) .
```

### 2. Run the Distro Container

```powershell
# Option A: docker run
docker run -d `
  -p 9431:9430 `
  -e VISTA_ADMIN_ACCESS=YOUR_ACCESS_CODE `
  -e VISTA_ADMIN_VERIFY=YOUR_VERIFY_CODE `
  --name vista-distro `
  vista-evolved/vista-distro:latest

# Option B: docker compose
cd services/vista-distro
$env:VISTA_DISTRO_ACCESS = "YOUR_ACCESS_CODE"
$env:VISTA_DISTRO_VERIFY = "YOUR_VERIFY_CODE"
docker compose --profile distro up -d
```

### 3. Verify Compatibility

```powershell
# Test against distro lane
.\scripts\verify-vista-compat.ps1 -Port 9431

# Test against dev sandbox (default)
.\scripts\verify-vista-compat.ps1
```

### 4. Switch API to Distro Lane

In `apps/api/.env.local`:

```dotenv
# Switch from dev sandbox to distro lane
VISTA_HOST=127.0.0.1
VISTA_PORT=9431
VISTA_ACCESS_CODE=YOUR_ACCESS_CODE
VISTA_VERIFY_CODE=YOUR_VERIFY_CODE
VISTA_INSTANCE_ID=vista-distro-lane
```

Restart the API:

```powershell
# Stop and restart
cd apps/api
npx tsx --env-file=.env.local src/index.ts
```

## Swap Boundary Contract

The swap boundary (`apps/api/src/vista/swap-boundary.ts`) defines what ANY
VistA instance must provide:

| Capability | Required | Test |
|-----------|----------|------|
| TCP probe on broker port | YES | `nc -z host port` |
| RPC auth (XUS SIGNON SETUP + XUS AV CODE) | YES | Login via API |
| CPRS context (XWB CREATE CONTEXT) | YES | Context set in rpcBrokerClient |
| Basic RPC reads | YES | Patient list, demographics |

## Security Posture

### Dev Sandbox

| Aspect | Value |
|--------|-------|
| Default credentials | YES (PROV123, PHARM123, NURSE123) |
| SSH exposed | YES (port 2222) |
| Network | All ports open |
| Suitable for production | NO |

### Distro Lane

| Aspect | Value |
|--------|-------|
| Default credentials | NO -- env-only injection |
| SSH exposed | NO |
| Network | Only RPC Broker port (9430) |
| Root filesystem | Read-only |
| Resource limits | 2GB RAM, 2 CPU |
| Health check | Built-in TCP probe |
| Suitable for production | YES (with proper credential management) |

## Version Pinning

Edit `services/vista-distro/build.env` to pin versions:

```
YOTTADB_VERSION=r2.02
VISTA_ROUTINE_REF=master  # or a specific tag/commit
```

For reproducible builds, always use a specific commit SHA instead of `master`:

```
VISTA_ROUTINE_REF=abc123def456
```

## Custom Routines

Place VistA-Evolved MUMPS routines (ZVE* namespace) in
`services/vista-distro/routines/`. They are copied into the container at
build time.

```powershell
# Copy required routines from dev sandbox
Copy-Item services/vista/ZVEMINS.m services/vista-distro/routines/
Copy-Item services/vista/ZVEMIOP.m services/vista-distro/routines/
# etc.
```

## Migration Checklist -- Cutover to Distro Lane

Use this checklist when transitioning a deployment from the dev sandbox to
the distro lane for production use.

### Pre-Cutover

- [ ] Build distro image with pinned versions (not `master`)
- [ ] Generate strong credentials (not WorldVistA defaults)
- [ ] Run compatibility test: `verify-vista-compat.ps1 -Port 9431`
- [ ] Copy required ZVE* routines to `routines/` directory
- [ ] Install custom RPCs (equivalent of `install-interop-rpcs.ps1`)
- [ ] Verify RPC catalog: all 137+ registered RPCs respond
- [ ] Test authentication with production credentials
- [ ] Test patient list, demographics, allergies reads
- [ ] Test write operations (add allergy, create order)
- [ ] Run gauntlet RC against distro instance

### Cutover

- [ ] Update `.env.local` / deployment config:
  - `VISTA_HOST` -> distro host
  - `VISTA_PORT` -> distro port (typically 9431)
  - `VISTA_ACCESS_CODE` -> production credentials
  - `VISTA_VERIFY_CODE` -> production credentials
  - `VISTA_INSTANCE_ID=vista-distro-lane`
- [ ] Restart API servers
- [ ] Verify `/vista/ping` returns `ok: true`
- [ ] Verify patient workflows end-to-end
- [ ] Monitor error rates for 30 minutes

### Post-Cutover

- [ ] Decommission dev sandbox container (optional, can keep for development)
- [ ] Set up automated image builds (CI/CD)
- [ ] Configure Docker secret management for credentials
- [ ] Set up monitoring/alerting on health check failures
- [ ] Schedule regular image rebuilds for security patches
- [ ] Document the production VistA version in deployment runbook

## Troubleshooting

### Container fails to start with credential error

```
FATAL: VISTA_ADMIN_ACCESS and VISTA_ADMIN_VERIFY must be set.
```

**Fix:** Pass credentials via environment variables:
```powershell
docker run -e VISTA_ADMIN_ACCESS=... -e VISTA_ADMIN_VERIFY=... ...
```

### Health check failing

Check if the RPC Broker is listening:
```powershell
docker exec vista-distro /opt/vista/health-check.sh
```

### RPC calls timing out

YottaDB may need shared memory cleanup after restart:
```powershell
docker exec vista-distro bash -c "source /opt/yottadb/current/ydb_env_set && mupip rundown -reg '*'"
```

### Port conflict with dev sandbox

The distro lane defaults to host port 9431 to avoid conflict with the dev
sandbox on 9430. If both need to run simultaneously, ensure different host ports.
