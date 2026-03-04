# VistA Evolved

Modern browser-based EHR built on proven VistA clinical logic.

## What This Is

VistA Evolved is a full-stack TypeScript platform that wraps the US Department
of Veterans Affairs VistA/MUMPS clinical engine with a modern React UI and
Fastify API layer. Every clinical read and write flows through **real VistA RPC
calls** -- no mock data, no shadow databases.

The stack covers: patient search, allergies, vitals, labs, meds, problems,
orders/CPOE, notes, imaging (Orthanc/OHIF), telehealth, RCM/billing,
scheduling, analytics, and an AI-assisted intake portal.

## Architecture Diagram

```mermaid
graph LR
  Browser["Browser"] --> Web["Next.js :3000"]
  Web --> API["Fastify API :3001"]
  API -->|XWB RPC| VistA["VEHU VistA :9431"]
  API --> PG["PostgreSQL :5433"]
  API -.->|optional| Orthanc["Orthanc :8042"]
  API -.->|optional| Keycloak["Keycloak :8080"]
  VistA --- YottaDB["YottaDB/MUMPS"]
```

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 24.x | [nodejs.org](https://nodejs.org/) |
| pnpm | 10.x | `corepack enable && corepack prepare pnpm@latest --activate` |
| Docker Desktop | Latest | [docker.com](https://www.docker.com/products/docker-desktop/) (enable WSL 2 on Windows) |

Allocate **at least 6 GB RAM** to Docker (VistA alone needs ~2 GB).

## Quick Start

```powershell
# 1. Clone
git clone https://github.com/<org>/VistA-Evolved.git
cd VistA-Evolved

# 2. Create API env file
Copy-Item apps/api/.env.example apps/api/.env.local
# Edit apps/api/.env.local — set at minimum:
#   VISTA_HOST=127.0.0.1
#   VISTA_PORT=9431
#   VISTA_ACCESS_CODE=PRO1234
#   VISTA_VERIFY_CODE=PRO1234!!
#   PLATFORM_PG_URL=postgresql://ve_api:ve_dev_only_change_in_prod@127.0.0.1:5433/ve_platform

# 3. Start VistA VEHU sandbox (takes ~60 s on first pull)
docker compose -f services/vista/docker-compose.yml --profile vehu up -d

# 4. Start PostgreSQL
docker compose -f services/platform-db/docker-compose.yml up -d

# 5. Install dependencies
pnpm install

# 6. Provision VistA RPCs (first time only)
.\scripts\install-vista-routines.ps1 -ContainerName vehu -VistaUser vehu

# 7. Seed demo data (optional — adds 10 sample claims)
pnpm seed:demo

# 8. Start the API (in one terminal)
cd apps/api
npx tsx --env-file=.env.local src/index.ts

# 9. Start the web UI (in another terminal)
cd apps/web
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with
**PRO1234 / PRO1234!!**. Search for patient **CARTER,DAVID** to see a full
chart.

### Services

| Service | Port | Container | Description |
|---------|------|-----------|-------------|
| VistA VEHU | 9431 (RPC), 2223 (SSH) | `vehu` | WorldVistA VEHU sandbox |
| PostgreSQL | 5433 | `ve-platform-db` | Platform database |
| API | 3001 | (local) | Fastify API server |
| Web | 3000 | (local) | Next.js clinician UI |

### Sandbox Credentials

| Access Code | Verify Code | User |
|-------------|-------------|------|
| PRO1234 | PRO1234!! | PROGRAMMER,ONE (DUZ 1) -- recommended |
| PROV123 | PROV123!! | PROVIDER,CLYDE WV (DUZ 87) |
| PHARM123 | PHARM123!! | PHARMACIST,LINDA WV |
| NURSE123 | NURSE123!! | NURSE,HELEN WV |

## Key Commands

```powershell
# Run the fast QA gauntlet (lint + type-check + unit tests)
pnpm qa:gauntlet:fast

# Run all unit tests
pnpm test

# Run Playwright E2E tests
pnpm test:e2e

# Provision VistA RPCs after a fresh container pull
.\scripts\install-vista-routines.ps1 -ContainerName vehu -VistaUser vehu

# Seed demo RCM claims
pnpm seed:demo

# Verify the latest phase
.\scripts\verify-latest.ps1

# Production posture check
pnpm qa:prod-posture
```

## Repo Structure

```
apps/
  api/          Fastify API server (port 3001)
  web/          Next.js clinician CPRS UI (port 3000)
  portal/       Next.js patient portal
config/         Module, SKU, and capability definitions
data/           Payer seed data, RPC catalog snapshots
docs/           Runbooks, architecture, decisions, bug tracker
scripts/        Verifiers, installers, QA gates
services/
  vista/        VistA Docker compose + MUMPS routines
  platform-db/  PostgreSQL Docker compose
  imaging/      Orthanc + OHIF Docker compose
  keycloak/     Keycloak IAM Docker compose
  observability/ OTel Collector + Jaeger + Prometheus
  analytics/    YottaDB/Octo/ROcto for BI
```

## For AI Agents

Read [AGENTS.md](AGENTS.md) before making any changes. It contains:

- VistA XWB RPC protocol details (critical byte-level fixes)
- Credential locations and Docker account table
- Architecture quick map with 180+ gotchas
- Bug tracker with 60+ root-cause analyses
- Mandatory governance rules (prompt capture, verification, docs)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, commit conventions,
and the PR checklist. All PRs require a green CI pipeline and an updated
`docs/SESSION_LOG.md` entry.
