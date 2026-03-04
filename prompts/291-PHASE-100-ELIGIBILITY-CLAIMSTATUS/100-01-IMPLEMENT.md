# Phase 100 — Eligibility + Claim Status Polling Framework (Adapter-first)

## User Request

Build a durable, adapter-first eligibility verification and claim status
polling framework. Three adapter tiers:

- **Manual**: user-entered results with MANUAL provenance
- **Sandbox**: deterministic simulation (reuse Phase 69 SandboxPayerAdapter)
- **EDI stubs**: 270/271 and 276/277 clearly labeled "integration pending"

No fake payer endpoints. No stored payer credentials. VistA remains source
for patient insurance info.

## Implementation Steps

### Step 0 — Inventory

- Phase 69 job queue (InMemoryJobQueue), pollers, sandbox adapter all exist
- DB schema has tables A–N; Phase 100 adds O (eligibility_check) and P (claim_status_check)
- Existing ring buffers replaced by SQLite persistence

### Step 1 — Adapter Interfaces + Manual Adapter

- Reuse PayerAdapter interface from payer-adapter.ts
- Add ManualPayerAdapter: user submits structured results directly
- Add EDI stub adapters: return integration-pending with target transaction sets

### Step 2 — DB Tables + Durable Store

- Table O: eligibility_check (patientDfn, payerId, provenance, eligible, response JSON, etc.)
- Table P: claim_status_check (claimRef, payerId, provenance, status, response JSON, etc.)
- Drizzle ORM schema + raw SQL migration
- Store layer with CRUD + history + stats

### Step 3 — API Routes

- POST /rcm/eligibility/check — run check (manual/sandbox/edi-stub)
- GET /rcm/eligibility/history — paginated history
- GET /rcm/eligibility/stats — aggregate statistics
- POST /rcm/claim-status/check — run check
- POST /rcm/claim-status/schedule — schedule recurring poll
- GET /rcm/claim-status/history — paginated history
- GET /rcm/claim-status/timeline/:claimRef — claim-specific timeline
- GET /rcm/claim-status/stats — aggregate statistics

### Step 4 — UI Pages

- Eligibility tab in RCM admin page
- Claim Status tab in RCM admin page

### Step 5 — Security + RBAC + Audit

- Session auth (existing /rcm/ catch-all)
- rcm_write permission for checks, rcm_view for reads
- All checks audited via appendRcmAudit

### Step 6 — Docs + Verification

- Runbook: docs/runbooks/rcm-eligibility-claimstatus-phase100.md
- Verification: scripts/verify-phase100-eligibility-claimstatus.ps1

## Files Touched

- apps/api/src/platform/db/schema.ts (add tables O, P)
- apps/api/src/platform/db/migrate.ts (add DDL)
- apps/api/src/rcm/eligibility/ (new directory)
  - types.ts, store.ts, manual-adapter.ts, edi-stub-adapter.ts, routes.ts
- apps/api/src/rcm/claim-status/ (new directory)
  - types.ts, store.ts, routes.ts
- apps/api/src/index.ts (register new routes)
- apps/web/src/app/cprs/admin/rcm/page.tsx (add tabs)
- docs/runbooks/rcm-eligibility-claimstatus-phase100.md
- scripts/verify-phase100-eligibility-claimstatus.ps1

## Verification Steps

- All tables created on startup
- Manual eligibility check persists to DB
- Sandbox eligibility check returns deterministic result
- EDI stub returns integration-pending
- Claim status check works for all 3 adapters
- History/timeline endpoints return persisted data
- Stats endpoint aggregates correctly
- Audit entries created for all checks
- No console.log, no hardcoded creds, no PHI leaks
- Build clean (tsc)
