# Getting Started — Developer Guide

> Human-readable onboarding guide for new developers (not AI agents).
> For AI agent onboarding, see `AGENTS.md` at the repo root.

## Prerequisites

- Node.js 24+ (LTS)
- pnpm 9+
- Docker Desktop (for VistA, PostgreSQL, optional services)
- PowerShell 7+ (for verification scripts on Windows)

## Quick Start (5 minutes)

```bash
# 1. Clone and install
git clone https://github.com/your-org/VistA-Evolved.git
cd VistA-Evolved
pnpm install

# 2. Start VistA Docker (VEHU lane recommended)
cd services/vista
docker compose --profile vehu up -d
cd ../..

# 3. Set up API credentials
cp apps/api/.env.example apps/api/.env.local
# Edit .env.local — set VISTA_PORT=9431 for VEHU

# 4. Provision VistA RPCs (first time only)
.\scripts\install-vista-routines.ps1 -ContainerName vehu -VistaUser vehu

# 5. Start the API
cd apps/api
npx tsx --env-file=.env.local src/index.ts

# 6. Start the web app (separate terminal)
cd apps/web
pnpm dev

# 7. Verify
curl http://127.0.0.1:3001/health
curl http://127.0.0.1:3001/vista/ping
```

## VistA Docker Lanes

| Lane | Container | Port | Best For |
|------|-----------|------|----------|
| VEHU | `vehu` | 9431 | Development (recommended) |
| Legacy | `wv` | 9430 | Backward compatibility |
| Distro | `distro` | 9431 | Custom builds |

## Default Credentials (VEHU)

| Access Code | Verify Code | User |
|-------------|-------------|------|
| PRO1234 | PRO1234!! | PROGRAMMER,ONE (admin) |

See `AGENTS.md` for WorldVistA Docker credentials.

## Project Structure

```
apps/api/    → Fastify API (port 3001)
apps/web/    → Clinician UI (port 3000)
apps/portal/ → Patient portal (port 3002)
services/    → Docker services (VistA, PG, Orthanc, Keycloak)
config/      → Module/SKU/capability definitions
prompts/     → Phase implementation/verification prompts
scripts/     → Automation and verification scripts
```

## Key Concepts

### VistA RPC Protocol
All clinical data comes from VistA via the XWB RPC Broker protocol.
The API connects to VistA over TCP, authenticates, sets a context,
and calls Remote Procedure Calls (RPCs) to read/write clinical data.

### Phase System
The project is built incrementally via numbered phases. Each phase has:
- `XX-01-IMPLEMENT.md` — Implementation instructions
- `XX-99-VERIFY.md` — Verification checklist
- Optional `XX-50-NOTES.md` — Design notes

### Adapters
Five adapter types abstract VistA integration:
- Clinical Engine (allergies, meds, vitals, notes, problems)
- Scheduling (appointments, clinic resources)
- Billing (claims, payers)
- Imaging (studies, worklists)
- Messaging (secure messages)

Each adapter has a VistA implementation and a stub fallback.

## Common Tasks

### Run the API
```bash
cd apps/api
npx tsx --env-file=.env.local src/index.ts
```
Do NOT use `pnpm dev` — it doesn't load `.env.local` (known bug).

### Run verification
```powershell
.\scripts\verify-latest.ps1
```

### Test a VistA RPC
```bash
curl -s http://127.0.0.1:3001/vista/ping
# Login first for authenticated endpoints
curl -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}'
# Then use the cookie
curl -s -b cookies.txt http://127.0.0.1:3001/vista/allergies?dfn=46
```

### Check FHIR endpoints
```bash
curl -s http://127.0.0.1:3001/fhir/metadata | jq .resourceType
# Returns: "CapabilityStatement"
```

## Environment Variables

See `apps/api/.env.example` for the full list. Key ones:

| Variable | Default | Purpose |
|----------|---------|---------|
| VISTA_HOST | 127.0.0.1 | VistA server hostname |
| VISTA_PORT | 9430 | VistA RPC Broker port |
| VISTA_ACCESS_CODE | — | VistA access code |
| VISTA_VERIFY_CODE | — | VistA verify code |
| PLATFORM_PG_URL | — | PostgreSQL connection URL |
| REDIS_URL | — | Redis connection URL (optional) |
| OIDC_ENABLED | false | Enable OIDC authentication |

## Further Reading

- `AGENTS.md` — Comprehensive technical reference (for AI + humans)
- `ARCHITECTURE.md` — System architecture overview
- `docs/BUG-TRACKER.md` — Bug history and lessons learned
- `docs/runbooks/` — Step-by-step operational guides
