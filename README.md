# VistA Evolved

> **⛔ THIS REPO IS FROZEN — DO NOT USE FOR ACTIVE DEVELOPMENT.**
> This repository is archived as prototype/salvage/reference only.
> See [ARCHIVE-STATUS.md](ARCHIVE-STATUS.md) for full details.
>
> **Active repos:**
> - **vista-evolved-platform** — web UI, APIs, control plane, tenant admin
> - **vista-evolved-vista-distro** — VistA Docker runtime, upstream pins, overlay routines
>
> Do not start servers, install dependencies, or make changes here.
> Extract only what is needed into the active repos.

---

<details>
<summary>Archived README (reference only — do not follow these instructions)</summary>

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

| Tool           | Version | Install                                                                                 |
| -------------- | ------- | --------------------------------------------------------------------------------------- |
| Node.js        | 24.x    | [nodejs.org](https://nodejs.org/)                                                       |
| pnpm           | 10.x    | `corepack enable && corepack prepare pnpm@latest --activate`                            |
| Docker Desktop | Latest  | [docker.com](https://www.docker.com/products/docker-desktop/) (enable WSL 2 on Windows) |

Allocate **at least 6 GB RAM** to Docker (VistA alone needs ~2 GB).

## Quick Start -- Choose Your Profile

This repo supports **multiple VistA runtime lanes**. The two most common
are below. For all four lanes (VEHU, Legacy, Compose, Distro) with full
port maps, credentials, and env templates, see
[docs/runbooks/runtime-lanes.md](docs/runbooks/runtime-lanes.md).

Pick one profile and run a single command. Do not mix profiles in the same session.

| Profile            | VistA Image                 | Broker Port | Best For                                 |
| ------------------ | --------------------------- | ----------- | ---------------------------------------- |
| **vehu** (default) | `worldvista/vehu`           | **9431**    | Day-to-day dev, RPC truth, evidence docs |
| **compose**        | `worldvista/worldvista-ehr` | **9210**    | Full-stack containerized demo            |

### One-command start (recommended)

```powershell
# Windows / PowerShell (default profile = vehu)
.\scripts\dev-up.ps1 -RuntimeLane vehu

# Or the all-in-one containerized stack
.\scripts\dev-up.ps1 -RuntimeLane compose
```

```bash
# macOS / Linux
./scripts/dev-up.sh --profile vehu
./scripts/dev-up.sh --profile compose
```

The scripts will: check Docker, create env files with sane defaults if missing,
start the right containers, wait for the VistA broker to be healthy, run
`pnpm verify:vista` (which loads `apps/api/.env.local`), run `pnpm qa:gauntlet:fast`,
and print PASS/FAIL.

Use `--SkipVerify` (PowerShell) / `--skip-verify` (bash) to skip verification
and just start Docker services.

### Manual start (if you prefer)

<details>
<summary>VEHU profile -- manual steps</summary>

```powershell
# 1. Clone
git clone https://github.com/<org>/VistA-Evolved.git
cd VistA-Evolved

# 2. Create API env file (script does this automatically)
Copy-Item apps/api/.env.example apps/api/.env.local
# Edit apps/api/.env.local -- set at minimum:
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

# 7. Start the API (in one terminal)
cd apps/api
npx tsx --env-file=.env.local src/index.ts

# 8. Start the web UI (in another terminal)
cd apps/web
pnpm dev
```

</details>

<details>
<summary>Compose profile -- manual steps</summary>

```powershell
# 1. Clone
git clone https://github.com/<org>/VistA-Evolved.git
cd VistA-Evolved

# 2. Create root .env
Copy-Item .env.example .env
# Edit .env -- set POSTGRES_PASSWORD, VISTA_ACCESS_CODE=PROV123, VISTA_VERIFY_CODE=PROV123!!

# 3. Start everything (VistA + PG + Redis + API + Web)
docker compose up -d --build

# API is at http://localhost:4000, Web at http://localhost:5173
```

</details>

Open [http://localhost:3000](http://localhost:3000) (vehu) or
[http://localhost:5173](http://localhost:5173) (compose) and log in.
Search for patient **CARTER,DAVID** to see a full chart.

### Port Map

| Service          | VEHU Profile | Compose Profile  | Notes        |
| ---------------- | ------------ | ---------------- | ------------ |
| VistA RPC Broker | **9431**     | **9210**         | XWB protocol |
| VistA SSH        | 2223         | --               | VEHU only    |
| VistA Web UI     | --           | 8001             | Compose only |
| PostgreSQL       | 5433         | 5432             | Platform DB  |
| Redis            | --           | 6379             | Compose only |
| API (Fastify)    | 3001 (local) | 4000 (container) |              |
| Web (Next.js)    | 3000 (local) | 5173 (container) |              |

### Sandbox Credentials

| Access Code | Verify Code | User                       | Profile                |
| ----------- | ----------- | -------------------------- | ---------------------- |
| PRO1234     | PRO1234!!   | PROGRAMMER,ONE (DUZ 1)     | **vehu** (recommended) |
| PROV123     | PROV123!!   | PROVIDER,CLYDE WV (DUZ 87) | compose / vehu         |
| PHARM123    | PHARM123!!  | PHARMACIST,LINDA WV        | compose / vehu         |
| NURSE123    | NURSE123!!  | NURSE,HELEN WV             | compose / vehu         |

### Evidence Docs

`docs/VISTA_CONNECTIVITY_RESULTS.md` is generated under the **VEHU** profile.
It is the canonical RPC truth reference. Do not regenerate it under the compose
profile.

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

## Verify Your Setup (MANDATORY Before Any Work)

After starting the system, run this verification to confirm everything works
end-to-end against the real VistA Docker:

```powershell
# 1. Confirm Docker is running
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"

# 2. Confirm API starts cleanly (look for "Server listening" and PG init ok:true)
cd apps/api
npx tsx --env-file=.env.local src/index.ts

# 3. Confirm VistA connectivity
curl.exe -s http://127.0.0.1:3001/vista/ping
# Expected: {"ok":true,"vista":"reachable","port":9431}

curl.exe -s http://127.0.0.1:3001/health
# Expected: {"ok":true,...,"platformPg":{"ok":true,...}}

# 4. Confirm real clinical data flows from VistA
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"

curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/default-patient-list"
# Expected: {"ok":true,"count":38,"results":[...]}

curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/allergies?dfn=46"
# Expected: {"ok":true,"count":2,"results":[{"allergen":"SULFONAMIDE/RELATED ANTIMICROBIALS",...}]}

Remove-Item login-body.json, cookies.txt -ErrorAction SilentlyContinue
```

If any of these fail, do NOT proceed with coding. Fix the infrastructure first.
See [docs/runbooks/runtime-lanes.md](docs/runbooks/runtime-lanes.md) for
troubleshooting.

## VistA RPC Reference

This project integrates with VistA via the XWB RPC Broker protocol. Not all
RPCs listed in the Vivian index (3,747 RPCs) are available in the VEHU sandbox.

**Key files for RPC research:**

- `data/vista/vivian/rpc_index.json` -- Full Vivian RPC catalog (3,747 RPCs)
- `docs/vista-alignment/rpc-coverage.json` -- Cross-reference: CPRS + Vivian + API
- `apps/api/src/vista/rpcRegistry.ts` -- Which RPCs the API knows about (~170)
- `services/vista/ZVEPROB.m` -- Probe routine to check File 8994 in running VistA

**To check if an RPC exists in VistA:** Add it to `ZVEPROB.m` and run the probe
(see AGENTS.md Section 8 for instructions). Never assume an RPC exists or doesn't
exist without probing File 8994 in the running VEHU instance.

## For AI Agents (Cursor, Copilot, ChatGPT, etc.)

Read [AGENTS.md](AGENTS.md) before making any changes. It contains:

- **RULE ZERO: Docker-First Verification Protocol** -- you MUST start Docker
  and test against real VistA before and after writing any backend code
- VistA XWB RPC protocol details (critical byte-level fixes)
- Credential locations and Docker account table
- **Section 8: VistA RPC Availability Reference** -- confirmed available/missing
  RPCs with IENs, probe commands, and key data files
- Architecture quick map with 190+ gotchas
- Bug tracker with 60+ root-cause analyses
- Mandatory governance rules (prompt capture, verification, docs)

Also read:

- `.github/copilot-instructions.md` -- Copilot-specific build protocol with
  RPC availability tables and probe instructions
- `.cursor/rules/docker-first-verification.md` -- Cursor agent rules

**The #1 failure mode of AI-assisted development on this project** is writing
code that compiles but was never tested against the running VistA Docker.
Every AI agent MUST follow the Docker-First protocol in AGENTS.md Section 0A.
Code that was never executed against the live system is NOT considered done.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, commit conventions,
and the PR checklist. All PRs require a green CI pipeline and an updated
`docs/SESSION_LOG.md` entry.

</details>
