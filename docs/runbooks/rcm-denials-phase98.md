# RCM Denials & Appeals — Phase 98 Runbook

## Inventory

### Existing RCM persistence

- Platform DB: SQLite at `data/platform.db` (better-sqlite3 + drizzle-orm)
- 6 existing tables: payer, tenant_payer, payer_capability, payer_task, payer_evidence_snapshot, payer_audit_event
- In-memory stores: claim-store, payment-store, loa-store, workqueue-store (not migrated)

### Existing denial-adjacent code

- `rcm/domain/claim.ts` — Claim FSM with `denied` and `appealed` states
- `rcm/domain/remit.ts` — RemitAdjustment with CARC group codes
- `rcm/reference/carc-rarc.ts` — CARC/RARC reference tables (30 CARC, 20+ RARC codes)
- `rcm/audit/rcm-audit.ts` — Hash-chained audit with `claim.denied`, `claim.appealed`, `remit.denied` actions
- `rcm/workqueues/workqueue-store.ts` — In-memory work queue with `denial` type
- `rcm/edi/types.ts` — X12 835 types for remittance parsing

### What Phase 98 extends

- Platform DB: 4 new tables (denial_case, denial_action, denial_attachment, resubmission_attempt)
- RCM audit: 8 new action types for denial lifecycle
- Routes: new `/rcm/denials/*` endpoints (13 routes)
- UI: new `/cprs/admin/denials` page

### What Phase 98 does NOT touch

- Existing claim-store (in-memory) — denials reference claims by ID but don't own them
- Existing payer registry tables — unchanged
- Auth/RBAC middleware — reuses existing session + in-handler permission checks
- VistA RPC broker — no new RPC calls

## How to test

```bash
# 1. Start API
cd apps/api && npx tsx --env-file=.env.local src/index.ts

# 2. Login
curl -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login \
  -H "Content-Type: application/json" -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'

# 3. Create denial
curl -s -b cookies.txt -X POST http://127.0.0.1:3001/rcm/denials \
  -H "Content-Type: application/json" -H "x-csrf-token: <token>" \
  -d '{"payerId":"PH-MAXICARE","claimRef":"CLM-001","denialCodes":[{"type":"CARC","code":"50"}],"billedAmount":15000}'

# 4. List denials
curl -s -b cookies.txt "http://127.0.0.1:3001/rcm/denials?page=1&limit=20"
```
