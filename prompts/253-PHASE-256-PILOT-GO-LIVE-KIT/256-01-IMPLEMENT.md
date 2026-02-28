# Phase 256 — Pilot Hospital Go-Live Kit (IMPLEMENT)

## Objective
Create a unified pilot go-live readiness kit that aggregates all Wave 7
verification, certification, and operational gates into actionable
deployment artifacts.

## Implementation Steps

### 1. Go-Live Runbook (`docs/pilot-go-live-kit.md`)
- Pre-deployment requirements (env vars, Docker services, PG)
- Infrastructure readiness (health/ready/posture endpoints)
- VistA integration (provisioning, RPC registry)
- Security certification (auth, RBAC, rate limiting, audit)
- Data layer (PG, in-memory stores, backup)
- Verification gates summary (all 9 Wave 7 phases)
- Operational runbook references
- **Day-1 Checklist** (T-7, T-1, T-0, T+1)
- **Rollback Plan** (immediate/data/full)
- **Sign-Off** table

### 2. Go-Live Gate Script (`ops/drills/run-go-live-gate.ps1`)
- Aggregates all Wave 7 verifier file existence checks
- Validates runbook content sections
- Checks pilot infrastructure (site-config, preflight, admin page)
- Checks all 8 verifier scripts + DR/resilience drills
- Produces GO/NO-GO verdict
- Writes timestamped JSON artifact to `artifacts/go-live-gate/`

### 3. Go-Live Certification Test (`apps/api/tests/go-live-certification.test.ts`)
- Vitest suite validating structural prerequisites
- 8 describe blocks: Kit Artifacts, Runbook Content, Pilot Infrastructure,
  Wave 7 Verifiers, Resilience Drills, DR Certification, CI Workflows,
  Gate Script Content, Documentation Completeness
- File existence + content pattern matching

### 4. Verifier (`scripts/verify-phase256-go-live-kit.ps1`)
- 22 gates covering all deliverables
- PS 5.1 compatible (pre-assigned `$g` pattern)

## Files Touched
- `docs/pilot-go-live-kit.md` — NEW
- `ops/drills/run-go-live-gate.ps1` — NEW
- `apps/api/tests/go-live-certification.test.ts` — NEW
- `scripts/verify-phase256-go-live-kit.ps1` — NEW

## Existing Files Leveraged (not modified)
- `apps/api/src/pilot/site-config.ts` — Phase 246
- `apps/api/src/pilot/preflight.ts` — Phase 246
- `apps/web/src/app/cprs/admin/pilot/page.tsx` — Phase 246
- All Wave 7 verifiers (P1-P8)
- All drill scripts (P7-P8)
