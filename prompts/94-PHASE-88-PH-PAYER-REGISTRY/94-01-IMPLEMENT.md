# Phase 88 -- PH Payer Registry Ingestion + Capability Matrix -- IMPLEMENT

## User Request

Build Phase 88: PH payer registry ingestion and capability matrix.

- Repeatable ingestion pipeline from Insurance Commission HMO + HMO Broker lists
- Admin UI: Payer Directory with filters, merge, tier management
- Capability Matrix UI with evidence enforcement ("no green without proof")
- Full API endpoints (13 routes) under /rcm/payerops/
- Canonical runbook

## Implementation Steps

### Step 0: Inventory
- Searched entire codebase for existing payer registries, importers, HMO lists
- Found two-layer payer system: base payer-registry/registry.ts + enriched payerDirectory/
- Found existing 28 PH payers in data/payers/ph_hmos.json
- Phase 88 builds ON TOP of payerOps (Phase 87), not replacing existing systems

### Step 1: DB + data models
- Created apps/api/src/rcm/payerOps/registry-store.ts
  - PayerRegistrySource, RegistryPayer, PayerRelationship, RegistryDiffEntry, RegistrySnapshot
  - Source types: ic_hmo_list, ic_hmo_broker_list, manual, csv_import
  - Payer types: hmo, hmo_broker, government, insurer, other
  - Priority tiers: top5, top10, long_tail, untiered
  - CRUD, merge with alias mapping, snapshot recording
- Created apps/api/src/rcm/payerOps/capability-matrix.ts
  - CapabilityType (5 types), CapabilityMode (4 modes), CapabilityMaturity (4 levels)
  - Evidence enforcement: active requires >= 1 evidence link
  - Auto-demote: removing last evidence -> in_progress

### Step 2: Ingestion service
- Created apps/api/src/rcm/payerOps/ingest.ts
  - Loads from data/regulator-snapshots/ JSON files
  - Stores raw artifacts in /artifacts/regulator/<date>/ (gitignored)
  - Idempotent (hash-based dedup), versioned, diff-tracked
  - Always adds PhilHealth as government payer
  - Initializes capability matrix for new payers
- Created data/regulator-snapshots/ph-ic-hmo-list.json (27 HMOs)
- Created data/regulator-snapshots/ph-ic-hmo-broker-list.json (13 brokers)

### Step 3: API layer
- Created apps/api/src/rcm/payerOps/registry-routes.ts (13 endpoints)
- Registered in apps/api/src/index.ts

### Step 4: UI Payer Directory
- Created apps/web/src/app/cprs/admin/payer-directory/page.tsx
  - 3 tabs: Payer Registry, Ingestion Sources, Merge Tool
  - Filterable table, inline tier editing, snapshot diff view

### Step 5: UI Capability Matrix
- Created apps/web/src/app/cprs/admin/capability-matrix/page.tsx
  - Grid: payer rows x capability columns
  - Cell badges: mode + maturity + evidence count
  - Click-to-edit drawer with mode/maturity/evidence/notes
  - Legend, maturity color coding

### Step 6: Integration + docs
- Updated admin layout nav with Payer Directory + Capability Matrix links
- Created runbook: docs/runbooks/ph-payer-registry-ingestion.md
- Created ops artifacts

## Verification Steps
See 94-99-VERIFY.md

## Files Touched
- apps/api/src/rcm/payerOps/registry-store.ts (NEW)
- apps/api/src/rcm/payerOps/capability-matrix.ts (NEW)
- apps/api/src/rcm/payerOps/ingest.ts (NEW)
- apps/api/src/rcm/payerOps/registry-routes.ts (NEW)
- apps/api/src/index.ts (MODIFIED -- route registration)
- data/regulator-snapshots/ph-ic-hmo-list.json (NEW)
- data/regulator-snapshots/ph-ic-hmo-broker-list.json (NEW)
- apps/web/src/app/cprs/admin/payer-directory/page.tsx (NEW)
- apps/web/src/app/cprs/admin/capability-matrix/page.tsx (NEW)
- apps/web/src/app/cprs/admin/layout.tsx (MODIFIED -- nav links)
- docs/runbooks/ph-payer-registry-ingestion.md (NEW)
- prompts/94-PHASE-88-PH-PAYER-REGISTRY/94-01-IMPLEMENT.md (NEW)
- prompts/94-PHASE-88-PH-PAYER-REGISTRY/94-99-VERIFY.md (NEW)
