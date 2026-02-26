# Phase 148 -- Production VistA Distribution Lane (IMPLEMENT)

## Scope

Create a production-ready VistA packaging lane so the project is not tied to
the WorldVistA demo Docker image. The current dev sandbox remains untouched;
this creates an _alternative_ "distro lane" with:

- Reproducible build from versioned sources
- Swap boundary contract (same RPC broker interface)
- Security posture (no default credentials, env-based config, minimal network)
- Compatibility test proving both lanes are interchangeable

## Key work

### A) `services/vista-distro/`
- Dockerfile + multi-stage build from YottaDB base image
- `entrypoint.sh` with readiness/health probes
- `build.env` for version pinning (YottaDB version, VistA routine source)
- Security: no baked-in credentials, env-only credential injection

### B) Swap boundary contract
- `swap-boundary.ts` in `apps/api/src/vista/` -- typed contract
- Versioned RPC catalog snapshot (`rpc-catalog-snapshot.json`)
- Health/readiness probe contract

### C) Compatibility test
- `scripts/verify-vista-compat.ps1` -- tests /vista/ping and basic RPC

### D) Runbook + migration checklist
- `docs/runbooks/vista-distro-lane.md`

### E) AGENTS.md section 7q + numbered lessons

## Files touched
- `services/vista-distro/` (NEW)
- `apps/api/src/vista/swap-boundary.ts` (NEW)
- `data/vista/rpc-catalog-snapshot.json` (NEW)
- `scripts/verify-vista-compat.ps1` (NEW)
- `docs/runbooks/vista-distro-lane.md` (NEW)
- `AGENTS.md` (UPDATED: section 7q)
