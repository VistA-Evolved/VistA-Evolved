# Phase 26 — Portal & Telehealth: VistA-First Grounding + Contract + Skeleton — IMPLEMENT

## User Request

Build the foundational layer for a patient-facing health portal that is
grounded in VistA as the single source of clinical truth. Produce a
comprehensive contract, capability matrix, and a working portal skeleton
with its own auth domain, audit trail, and license guardrails.

## Implementation Steps

### Step 0 — Inventory
1. Catalog all VistA RPCs currently wired (35 live RPCs)
2. Catalog reference repos: HealtheMe (Apache 2.0), Ottehr (MIT), AIOTP (NC — observe only)
3. Build competitive baseline (MyChart-equivalent feature matrix)

### Step 1 — Portal Contract
4. Create `docs/contracts/portal/portal-contract-v1.yaml` — modules, VistA RPC mappings, security rules, no-parallel-engine rule
5. Create `docs/contracts/portal/portal-capability-matrix.md` — Module | Screen | VistA Source | Status

### Step 2 — Implementation
6. Create `apps/portal/` — New Next.js app (port 3002)
   - Login page (dev-mode sandbox credentials)
   - Dashboard with summary cards
   - Health Records page (8 clinical sections with DataSourceBadge)
   - Medications page
   - Messages placeholder
   - Appointments placeholder
   - Telehealth placeholder
   - Profile page
   - `PortalNav` component — no dead clicks, plain-language labels
   - `DataSourceBadge` component — "Live — Health System" or "Integration Pending"
7. Create `apps/api/src/routes/portal-auth.ts` — separate portal session domain
   - `POST /portal/auth/login` — dev-mode patient DFN mapping
   - `POST /portal/auth/logout`
   - `GET /portal/auth/session`
   - 10 DFN-scoped health proxy routes (`/portal/health/*`)
8. Create `apps/api/src/services/portal-audit.ts` — PHI-safe portal audit trail
9. Create `scripts/license-guard.ps1` — scans for AIOTP code copying, VA terminology
10. Create `THIRD_PARTY_NOTICES.md`
11. Update `security.ts` AUTH_RULES for `/portal/*` routes

### Step 3 — Prompts & Docs
12. Create prompts folder `28-PHASE-26-PORTAL-TELEHEALTH/`
13. Create runbook `docs/runbooks/portal-grounding.md`
14. Create ops artifacts

## Verification Steps

1. `pnpm install` succeeds
2. `pnpm -r build` passes (all three apps: web, portal, api)
3. License guard passes: `.\scripts\license-guard.ps1`
4. No VA terminology in portal UI strings
5. No PHI in log output
6. All portal routes exist and respond
7. Existing verify-latest remains green

## Files Touched

### Created
- `docs/contracts/portal/vista-source-inventory.md`
- `docs/contracts/portal/reference-repos-inventory.md`
- `docs/contracts/portal/competitive-baseline.md`
- `docs/contracts/portal/portal-contract-v1.yaml`
- `docs/contracts/portal/portal-capability-matrix.md`
- `apps/portal/` (entire app skeleton — 15+ files)
- `apps/api/src/routes/portal-auth.ts`
- `apps/api/src/services/portal-audit.ts`
- `scripts/license-guard.ps1`
- `THIRD_PARTY_NOTICES.md`
- `prompts/28-PHASE-26-PORTAL-TELEHEALTH/`
- `docs/runbooks/portal-grounding.md`
- `ops/summary.md`
- `ops/notion-update.json`

### Modified
- `apps/api/src/index.ts` — register portal routes
- `apps/api/src/middleware/security.ts` — add portal AUTH_RULES
