# Phase 99 — RCM Payments + Reconciliation — IMPLEMENT

## User Request
Implement Phase 99: RCM Payments + Reconciliation with:
- Remittance ingestion (EDI 835 adapter + manual entry)
- Payment-to-claim matching engine (3-tier deterministic)
- Underpayment detection with FSM
- Bridge to Phase 98 Denials & Appeals
- VistA-first ledger posture — no fabricated payer APIs
- Durable SQLite persistence via platform DB

## Implementation Steps

### STEP 1 — Inventory
- Audit Phase 92 in-memory payments (6 files)
- Audit Phase 98 denials (bridge target)
- Audit Phase 91 claim lifecycle states
- Confirm DB schema latest letter (J), next = K-N

### STEP 2 — Data Model (types.ts)
- RemittanceImport, PaymentRecord, ReconciliationMatch, UnderpaymentCase
- Zod schemas for all CRUD + list queries
- Underpayment FSM (NEW → INVESTIGATING → APPEALING → RESOLVED → WRITTEN_OFF)
- EDI 835 parser adapter interface (Edi835Parser)
- NormalizedRemittance / NormalizedPaymentLine

### STEP 3 — DB Schema (schema.ts + migrate.ts)
- Tables K-N: remittance_import, payment_record, reconciliation_match, underpayment_case
- 12 indexes for query performance

### STEP 4 — Store (recon-store.ts)
- Full CRUD for all 4 entities
- Paginated list queries with filters
- ReconciliationStats aggregation
- All amounts in cents, dates as ISO 8601

### STEP 5 — EDI 835 Parser (edi835-parser.ts)
- Adapter interface with registry pattern
- Built-in scaffold-json parser for pre-structured JSON
- Parser swap without refactor

### STEP 6 — Matching Engine (matching-engine.ts)
- Tier 1: exact claimRef match
- Tier 2: trace number match
- Tier 3: patient + DOS + amount tolerance ($1 window)
- Auto-underpayment detection (>10% shortfall)
- Batch matching for import sets

### STEP 7 — API Routes (recon-routes.ts)
- 14 endpoints under /rcm/reconciliation/*
- Import batch, list/get payments, manual match, batch match
- Match review queue, confirm/reject match
- Underpayment CRUD with FSM guard
- Send-to-denials bridge (lazy import to Phase 98)
- Stats dashboard endpoint

### STEP 8 — UI (reconciliation/page.tsx)
- 5 tabs: Upload, Payments, Matches, Underpayments, Dashboard
- Status badges, pagination, match review actions
- Send-to-denials button on underpayments

### STEP 9 — Audit + Wiring
- 8 new audit actions in rcm-audit.ts (recon.*)
- Route registration in index.ts

### STEP 10 — Docs + Verification
- Prompts folder 104
- Runbook: rcm-reconciliation-phase99.md
- Verification script: verify-phase99-reconciliation.ps1

## Files Touched
- CREATED: apps/api/src/rcm/reconciliation/types.ts
- CREATED: apps/api/src/rcm/reconciliation/recon-store.ts
- CREATED: apps/api/src/rcm/reconciliation/edi835-parser.ts
- CREATED: apps/api/src/rcm/reconciliation/matching-engine.ts
- CREATED: apps/api/src/rcm/reconciliation/recon-routes.ts
- CREATED: apps/web/src/app/cprs/admin/reconciliation/page.tsx
- MODIFIED: apps/api/src/platform/db/schema.ts (4 tables K-N)
- MODIFIED: apps/api/src/platform/db/migrate.ts (CREATE TABLE + 12 indexes)
- MODIFIED: apps/api/src/rcm/audit/rcm-audit.ts (8 new actions)
- MODIFIED: apps/api/src/index.ts (import + register)
- CREATED: prompts/104-PHASE-99-RCM-RECONCILIATION/99-01-IMPLEMENT.md
- CREATED: prompts/104-PHASE-99-RCM-RECONCILIATION/99-99-VERIFY.md
- CREATED: docs/runbooks/rcm-reconciliation-phase99.md
- CREATED: scripts/verify-phase99-reconciliation.ps1

## Constraints
- No fabricated payer APIs, no fake payments
- Store provenance for all imported data
- No PHI in logs or audit
- VistA IB/AR remains authoritative ledger
- Reuse platform DB pattern from Phase 95B+98
