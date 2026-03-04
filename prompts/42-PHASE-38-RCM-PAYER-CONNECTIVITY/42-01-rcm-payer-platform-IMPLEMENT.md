# Phase 38 — RCM Gateway + Payer Connectivity Platform

## User Request

Implement enterprise-grade RCM Gateway + Payer Connectivity Platform:

1. Claim lifecycle domain model (draft → validated → submitted → accepted/rejected → paid/denied → appealed)
2. Multiple integration modes: Clearinghouse EDI (X12 837/835/270/271/276/277/275/278), PhilHealth eClaims, Portal/Batched File, Future FHIR
3. Payer Registry (authoritative catalogs + onboarding + integration mode classification)
4. Claim Scrubbing + Pre-submit validation engine
5. Auditing, security, PHI redaction, rate limiting

## Implementation Steps

### Step 0 — Inventory (completed)

- Billing adapter interface exists (`apps/api/src/adapters/billing/`)
- RCM module defined in `config/modules.json` (deps: kernel, clinical; adapter: billing)
- 3 capabilities defined (rcm.claims.view, rcm.claims.submit, rcm.eligibility.check) — all pending
- RCM_ONLY and FULL_SUITE SKUs include rcm
- Module guard blocks `/rcm/*` when disabled
- No AUTH_RULE for `/rcm/` — needs adding
- No route handlers exist — needs creating
- UI placeholder at `apps/web/src/app/cprs/admin/rcm/page.tsx`

### Step 1 — Create RCM domain model

- `apps/api/src/rcm/domain/claim.ts` — Claim entity, lifecycle states, audit events
- `apps/api/src/rcm/domain/payer.ts` — Payer entity, integration modes
- `apps/api/src/rcm/domain/remit.ts` — Remittance/EOB types

### Step 2 — Create payer registry

- `apps/api/src/rcm/payer-registry/registry.ts` — In-memory store + CRUD
- `data/payers/ph_hmos.json` — PhilHealth + PH HMO seed data
- `data/payers/us_core.json` — US clearinghouse payer list seed

### Step 3 — Create EDI core

- `apps/api/src/rcm/edi/types.ts` — X12 transaction types + internal representation
- `apps/api/src/rcm/edi/pipeline.ts` — Build → validate → send → track → receive

### Step 4 — Create validation engine

- `apps/api/src/rcm/validation/engine.ts` — Syntax → required → code sets → payer edits → score

### Step 5 — Create connectors

- `apps/api/src/rcm/connectors/types.ts` — Connector interface
- `apps/api/src/rcm/connectors/clearinghouse-connector.ts`
- `apps/api/src/rcm/connectors/philhealth-connector.ts`
- `apps/api/src/rcm/connectors/sandbox-connector.ts` — Simulated transport

### Step 6 — Create claim store + audit

- `apps/api/src/rcm/audit/rcm-audit.ts` — Hash-chained audit
- `apps/api/src/rcm/domain/claim-store.ts` — In-memory claim lifecycle store

### Step 7 — Create API routes

- `apps/api/src/rcm/rcm-routes.ts` — All /rcm/\* endpoints

### Step 8 — Wire into index.ts + security.ts

### Step 9 — Update capabilities + UI

- Update `config/capabilities.json` with new rcm.\* capabilities
- Replace UI placeholder with real tabbed interface

### Step 10 — Docs + verifier

## Verification Steps

- TypeScript compiles with 0 errors
- All /rcm/\* routes return correct responses
- Payer registry returns seeded data
- Validation engine produces deterministic edits
- PHI redaction tested
- Module guard blocks when RCM disabled

## Files Touched

- apps/api/src/rcm/\*\* (new)
- apps/api/src/index.ts (add import + registration)
- apps/api/src/middleware/security.ts (add AUTH_RULE)
- config/capabilities.json (add rcm capabilities)
- config/modules.json (update services list)
- data/payers/\*.json (new seed data)
- apps/web/src/app/cprs/admin/rcm/page.tsx (replace placeholder)
- docs/runbooks/rcm-\*.md (new)
- docs/architecture/rcm-\*.md (new)
- docs/security/rcm-phi-handling.md (new)
- AGENTS.md (update)
- scripts/verify-phase38-rcm.ps1 (new)
