# Phase 61 -- Patient Portal Digital Front Door v1

## User Request

Build a VistA-first patient portal "Digital Front Door" baseline:
- View record (wire remaining pending endpoints: labs, consults, surgery, DC summaries, reports)
- Download/share (already built Phase 31, confirm governance)
- Proxy access (already built Phase 29, confirm)
- Messaging (already built Phase 32, in-memory)
- Appointments (already built Phase 28, in-memory demo)
- Language settings (already built Phase 27, 7 languages)
- Privacy controls (sensitivity gating Phase 28)
- Optional AI assist (already built Phase 33, add governance labels)

## Key Finding -- Reuse Analysis

The portal was ALREADY extensively built in Phases 26-33:
- Full Next.js portal app (`apps/portal/`) with 15+ dashboard pages
- Portal auth (dev mode, separate session cookie)
- Portal IAM (registration, MFA, proxy, device sessions)
- 5 live VistA health endpoints (allergies, problems, vitals, meds, demographics)
- 5 pending endpoints (labs, consults, surgery, dc-summaries, reports)
- Messaging, appointments, sharing, exports, proxy, telehealth, AI help

Phase 61 is NOT greenfield. It is an enhancement/governance pass.

## Implementation Steps

### Step A: ADR -- Reuse analysis
- `docs/decisions/ADR-portal-reuse-v1.md`

### Step B: Wire 5 pending portal endpoints
Replace stub responses with actual VistA RPC calls using existing `portalRpc()` helper:
- `/portal/health/labs` -- ORWLRR INTERIM (params: DFN, startDate, endDate)
- `/portal/health/consults` -- ORQQCN LIST (params: DFN, start, stop, service, status)
- `/portal/health/surgery` -- ORWSR LIST (params: DFN, start, end, context, max)
- `/portal/health/dc-summaries` -- TIU DOCUMENTS BY CONTEXT (class=244, signed+unsigned)
- `/portal/health/reports` -- ORWRP REPORT TEXT (requires report ID param)

### Step C: Update Health Records UI
- Replace placeholder "integration pending" sections with real data tables
- Dynamic source badge based on `_integration` field

### Step D: AI assist governance
- Add disclaimer banner and governance labels to AI help page

### Step E: Portal-plan.json artifact
- Map each feature to endpoint + RPC + privacy classification

### Step F: Verifier script
- `scripts/verify-phase61-portal.ps1`

### Step G: Runbook + ops artifacts

## Files Touched

- `apps/api/src/routes/portal-auth.ts` -- Wire 5 pending endpoints
- `apps/portal/src/app/dashboard/health/page.tsx` -- Render real data
- `apps/portal/src/app/dashboard/ai-help/page.tsx` -- Governance banner
- `apps/portal/src/app/dashboard/page.tsx` -- Update source badges
- `docs/decisions/ADR-portal-reuse-v1.md` -- New
- `artifacts/phase61/portal-plan.json` -- New
- `scripts/verify-phase61-portal.ps1` -- New
- `docs/runbooks/phase61-portal-digital-front-door.md` -- New

## Verification

- `scripts/verify-phase61-portal.ps1`
