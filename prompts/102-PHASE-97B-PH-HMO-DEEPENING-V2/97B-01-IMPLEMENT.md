# Phase 97B — PH HMO Deepening Pack v2 (ALL IC HMOs) + LOA/Claim Packet Ops (IMPLEMENT)

## User Request

Deepen PH HMO coverage to ALL 27 Insurance Commission-licensed HMOs with:
- payer_type classification (L1, L3, TPA, etc.)
- operational capability keys expansion
- HMO adapter manifest generator for all 27 HMOs
- LOA engine v1 improvements (specialty-aware, per-HMO templates)
- Claim packet engine v1 (VistA-first annotations, per-HMO packet config)
- Contracting hub v1 (task management leveraging existing DB)
- PH market dashboard (summary of all HMO integrations)
- QA OS integration (new QA flows)

## Inventory (Phase 97B additions build on)

### Existing Foundation
- **28 PH payers** (1 PhilHealth + 27 HMOs) in `data/payers/ph_hmos.json`
- **27 enriched HMOs** in `data/payers/ph-hmo-registry.json` with capabilities/evidence
- **27 IC regulator records** in `data/regulator-snapshots/ph-ic-hmo-list.json`
- **SQLite DB** (Phase 95B) with 6 tables: payer, tenant_payer, payer_capability, payer_task, payer_evidence_snapshot, payer_audit_event
- **7 capability keys**: loa, eligibility, claimsSubmission, claimStatus, remittance, memberPortal, providerPortal
- **LOA system** (Phase 94): 7-state FSM, 10 endpoints, in-memory store, workflow engine
- **HMO portal adapters** (Phase 97): 5 per-HMO adapters (Maxicare, MediCard, Intellicare, PhilCare, ValuCare)
- **17 HMO portal endpoints** in hmo-portal-routes.ts
- **Claim entity** (Phase 38): 10-state FSM, in-memory store, 50+ RCM endpoints
- **Claims workflow** (Phase 94): payer-aware submission with packet generation

### Key Files to Modify
- `apps/api/src/platform/db/schema.ts` — add payerType column
- `apps/api/src/platform/db/repo/capability-repo.ts` — expand STANDARD_CAPABILITY_KEYS
- `data/payers/ph-hmo-registry.json` — add payerType + operational caps per HMO
- `apps/api/src/rcm/hmo-portal/adapters/index.ts` — adapter manifest generator
- `apps/web/src/app/cprs/admin/layout.tsx` — add nav entries

### Key Files to Create
- `apps/api/src/rcm/hmo-portal/adapter-manifest.ts` — manifest generator
- `apps/api/src/rcm/hmo-portal/loa-templates.ts` — per-HMO LOA templates
- `apps/api/src/rcm/hmo-portal/claim-packet-config.ts` — per-HMO claim packet config
- `apps/api/src/rcm/hmo-portal/contracting-hub.ts` — contracting hub engine
- `apps/api/src/rcm/hmo-portal/market-dashboard.ts` — PH market dashboard service
- `apps/api/src/rcm/hmo-portal/phase97b-routes.ts` — Phase 97B API routes
- `apps/web/src/app/cprs/admin/ph-market/page.tsx` — PH market dashboard UI
- `apps/web/src/app/cprs/admin/contracting-hub/page.tsx` — contracting hub UI
- `config/qa-flows/16-hmo-adapter-manifest.json` — QA flow
- `config/qa-flows/17-contracting-hub.json` — QA flow

## Implementation Steps

### A) payer_type classification + schema
- Add `payerType` column to `payer` table in schema.ts
- Values: hmo_l1 | hmo_l3 | tpa | government | private_insurance | other
- Add payerType to ph-hmo-registry.json for all 27 HMOs

### B) Capability matrix expansion
- Add operational keys to STANDARD_CAPABILITY_KEYS
- New keys: loa_submission_method, loa_turnaround_days, claim_packet_format, claim_deadline_days, preauth_portal_url, claims_portal_url, soa_frequency, denial_appeal_window_days, provider_enrollment_required, accreditation_type

### C) HMO adapter manifest generator
- Generates status for all 27 HMOs: which have portal adapters, which are manual-only
- Shows capability coverage, integration readiness, contracting status

### D) LOA engine improvements
- Per-HMO LOA template configurations (required fields, specialty rules)
- Better packet export with payer-specific formatting

### E) Claim packet engine
- Per-HMO claim packet config (required attachments, format preferences)
- VistA-first field annotations

### F) Contracting hub
- Leverages existing payerTask table in DB
- API routes for task CRUD with payer scoping
- Dashboard view grouped by payer + status

### G) API routes (phase97b-routes.ts)
- GET /rcm/hmo/manifest — adapter manifest
- GET /rcm/hmo/market-summary — PH market overview
- GET /rcm/hmo/contracting — contracting tasks
- POST /rcm/hmo/contracting — create task
- PATCH /rcm/hmo/contracting/:taskId — update task

### H) UI pages
- PH Market Dashboard page with summary cards
- Contracting Hub page with task management

### I) QA flows
- 16-hmo-adapter-manifest.json
- 17-contracting-hub.json

## Verification Steps
- `npx tsc --noEmit` in both apps/api and apps/web
- All existing verifiers pass (96B: 64/64, 86: 72/72, 95B: 34/34)
- New QA flows validate
- No credential storage
- No fake success
- VistA-first annotations present

## Files Touched
See "Key Files to Modify" and "Key Files to Create" above.
