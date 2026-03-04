# Phase 156 — Imaging Operationalization (Orthanc Profile + Wiring + CI Smoke)

## Role

Imaging integration engineer + SRE

## Goal

Close "Orthanc requires external docker service" gap by providing a supported
compose profile and wiring. Make imaging worklist + viewer posture testable.

## Non-negotiables

- No PHI in logs
- Orthanc must be optional (via Docker profile)
- CI must run a lightweight smoke that starts Orthanc and hits health endpoints

## Implementation Steps

### 1. Docker Compose Imaging Profile

- Existing `services/imaging/docker-compose.yml` already uses `profiles: [imaging]`
- Add imaging env vars to `apps/api/.env.example` (ORTHANC_URL, OHIF_URL, etc.)
- Ensure `docker-compose.prod.yml` documents imaging as optional

### 2. Imaging Health Route

- Add `GET /imaging/health` endpoint in API:
  - Probes Orthanc `/system` and OHIF health
  - Returns structured health for each component
  - Auth: session-level (existing imaging routes)
- Wire into existing imaging-viewer.ts `isOrthancReachable()` probe

### 3. CI Smoke Test

- Add `.github/workflows/ci-imaging-smoke.yml`
- Starts Orthanc service container (no OHIF needed for smoke)
- Hits `/system` directly, then API `/imaging/health` via test
- Lightweight: <2 min total

### 4. Env Var Documentation

- Add all 10+ imaging env vars to `.env.example` with comments

## Files Touched

- `apps/api/.env.example` — add imaging env vars
- `apps/api/src/routes/imaging-viewer.ts` — add `/imaging/health` endpoint
- `apps/api/src/middleware/security.ts` — AUTH_RULE for `/imaging/health`
- `.github/workflows/ci-imaging-smoke.yml` — new CI workflow
- `scripts/verify-phase156-imaging-orthanc.ps1` — new verifier
- `docs/runbooks/imaging-orthanc-operations.md` — new runbook
- `AGENTS.md` — Phase 156 additions
