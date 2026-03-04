# Phase 87 — Philippines RCM Foundation (PayerOps core) — IMPLEMENT

> Prompt 93-01 | Phase 87 | 2025-01-XX

## User Request

Build a modular, payer-complete Philippines RCM foundation with:

- Facility-payer enrollment lifecycle (accreditation tracking)
- LOA (Letter of Authorization) workflow skeleton
- Credential vault (AES-256-GCM encrypted at rest)
- Manual + Portal adapter modes (no fake automation)
- Admin UI with 4 tabs (Enrollments, LOA, Credentials, Adapters)

## Non-Negotiable Requirements (A-G)

A. **VistA-first** — clinical data from VistA RPCs, never duplicated
B. **Payer-complete by registry** — 28 PH payers seeded from Insurance Commission data
C. **Modular productization** — feature-flagged under RCM module toggle
D. **No VA terminology** — Payer, Facility, Member (not "station", "VISN", "veteran")
E. **No placeholder success** — unsupported ops return `manual_required`
F. **Repo hygiene** — prompts + runbook + known-gaps + ops artifacts
G. **Security posture** — AES-256-GCM at rest, env-var master key, PHI redaction

## Implementation Steps

### Step 0 — Inventory

- Listed all existing RCM files (67+), routes (55+), payers (28 PH), adapters (3)
- Confirmed: NO LOA code, NO credential vault, NO ManualAdapter/PortalAdapter existed
- Existing payer registry and connector infrastructure reused

### Step 1 — Data Model + API Skeleton

1. `apps/api/src/rcm/payerOps/types.ts` — Domain types + adapter interface
2. `apps/api/src/rcm/payerOps/store.ts` — In-memory stores (enrollment, LOA, credential vault)
3. `apps/api/src/rcm/payerOps/credential-encryption.ts` — AES-256-GCM envelope encryption
4. `apps/api/src/rcm/payerOps/payerops-routes.ts` — 20+ Fastify route definitions
5. Registered in `apps/api/src/index.ts`
6. Updated `config/modules.json` with payerops data stores

### Step 2 — UI Page

7. `apps/web/src/app/cprs/admin/payerops/page.tsx` — 4 tabs (Enrollments, LOA, Credentials, Adapters)
8. Added nav link in `apps/web/src/app/cprs/admin/layout.tsx` (gated to 'rcm' module)

### Step 4 — Adapters

9. `apps/api/src/rcm/payerOps/manual-adapter.ts` — ManualAdapter + LOA submission pack generator
10. `apps/api/src/rcm/payerOps/portal-adapter.ts` — PortalAdapter + portal config registry

### Step 5 — Docs

11. `docs/runbooks/philippines-rcm-foundation.md` — Runbook
12. `prompts/93-PHASE-87-PH-RCM/93-01-IMPLEMENT.md` — This file
13. `prompts/93-PHASE-87-PH-RCM/93-99-VERIFY.md` — Verification prompt

## Files Touched

### New Files

- `apps/api/src/rcm/payerOps/types.ts`
- `apps/api/src/rcm/payerOps/store.ts`
- `apps/api/src/rcm/payerOps/credential-encryption.ts`
- `apps/api/src/rcm/payerOps/payerops-routes.ts`
- `apps/api/src/rcm/payerOps/manual-adapter.ts`
- `apps/api/src/rcm/payerOps/portal-adapter.ts`
- `apps/web/src/app/cprs/admin/payerops/page.tsx`
- `docs/runbooks/philippines-rcm-foundation.md`
- `prompts/93-PHASE-87-PH-RCM/93-01-IMPLEMENT.md`
- `prompts/93-PHASE-87-PH-RCM/93-99-VERIFY.md`

### Modified Files

- `apps/api/src/index.ts` — import + register payerOpsRoutes
- `apps/web/src/app/cprs/admin/layout.tsx` — add PayerOps nav link
- `config/modules.json` — add payerops data stores to RCM module

## Verification Steps

1. `tsc --noEmit` clean on API project
2. `GET /rcm/payerops/health` returns `{ ok: true }`
3. `GET /rcm/payerops/stats` returns aggregate counts
4. `POST /rcm/payerops/enrollments` creates enrollment
5. `POST /rcm/payerops/loa` creates LOA case
6. LOA status transitions validate against FSM
7. Credential CRUD operations work
8. Submission pack generator outputs checklist + email template
9. All adapters return `manual_required` status (no fake success)
10. Feature flag OFF = routes return 403
11. No PHI in adapter responses
12. PayerOps UI page renders with all 4 tabs
