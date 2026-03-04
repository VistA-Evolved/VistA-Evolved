# RCM Reconciliation — Phase 99 Runbook

## Overview

Phase 99 adds durable payment reconciliation to VistA-Evolved's RCM pipeline.
Remittance data (EDI 835 or manual) is ingested, matched to claims, and
underpayments are flagged and can be escalated to the Phase 98 Denials loop.

**VistA-first**: VistA IB/AR remains the authoritative ledger.
This module provides a reconciliation overlay with full provenance tracking.

## Architecture

```
Remittance Source (835 JSON / Manual)
        |
        v
  edi835-parser.ts (adapter)
        |
        v
  recon-store.ts (SQLite: platform DB tables K-N)
        |
        v
  matching-engine.ts (3-tier deterministic)
        |
        v
  underpayment detection --> Phase 98 Denials bridge
```

### Tables (platform.db)

| Letter | Table                | Purpose                            |
| ------ | -------------------- | ---------------------------------- |
| K      | remittance_import    | Import batch metadata + provenance |
| L      | payment_record       | Individual payment lines           |
| M      | reconciliation_match | Payment-to-claim match records     |
| N      | underpayment_case    | Shortfall tracking + denial bridge |

### Matching Engine — 3 Tiers

1. **Exact Claim Ref** (confidence: 100) — claimRef string equality
2. **Trace Number** (confidence: 90) — payment trace number matches claim ref
3. **Patient + DOS + Amount** (confidence: 60) — fuzzy match with $1.00 tolerance

Matches above 80% confidence are auto-matched. Below 80% → REVIEW_REQUIRED.

### Underpayment Detection

Flagged when paid < 90% of expected (billed amount by default).
States: NEW → INVESTIGATING → APPEALING → RESOLVED → WRITTEN_OFF.

Send-to-denials bridge creates a Phase 98 DenialCase and links it via
`denialCaseId`.

## API Endpoints

| Method | Path                                                  | Purpose                  |
| ------ | ----------------------------------------------------- | ------------------------ |
| POST   | /rcm/reconciliation/import                            | Import remittance batch  |
| GET    | /rcm/reconciliation/imports                           | List imports             |
| GET    | /rcm/reconciliation/imports/:id                       | Import detail + payments |
| GET    | /rcm/reconciliation/payments                          | Paginated payments       |
| GET    | /rcm/reconciliation/payments/:id                      | Payment + matches        |
| POST   | /rcm/reconciliation/payments/:id/match                | Manual match             |
| POST   | /rcm/reconciliation/match-batch                       | Run matching on import   |
| GET    | /rcm/reconciliation/matches/review                    | Review queue             |
| PATCH  | /rcm/reconciliation/matches/:id                       | Confirm/reject match     |
| GET    | /rcm/reconciliation/underpayments                     | Paginated underpayments  |
| GET    | /rcm/reconciliation/underpayments/:id                 | Underpayment detail      |
| PATCH  | /rcm/reconciliation/underpayments/:id                 | Update status (FSM)      |
| POST   | /rcm/reconciliation/underpayments/:id/send-to-denials | Bridge to denials        |
| GET    | /rcm/reconciliation/stats                             | Dashboard stats          |

## UI

`/cprs/admin/reconciliation` — 5 tabs:

- **Upload Remittance**: Paste JSON → import batch
- **Payments**: Paginated list with status filter
- **Review Matches**: Confirm/reject low-confidence matches
- **Underpayments**: View shortfalls, send to denials
- **Dashboard**: Stats cards (totals, matched, unmatched, shortfall)

## EDI 835 Parser

Uses adapter pattern. Built-in `scaffold-json` parser accepts:

```json
{
  "entries": [
    {
      "claimRef": "CLM-001",
      "payerId": "PAYER-A",
      "billedAmount": 500.0,
      "paidAmount": 450.0,
      "allowedAmount": 480.0,
      "serviceDate": "2024-01-15",
      "rawCodes": [{ "type": "CARC", "code": "45" }]
    }
  ],
  "sourceType": "EDI_835",
  "originalFilename": "batch-2024-01.json"
}
```

Custom parsers registered via `registerParser(parser)`.

## Audit Actions

| Action                     | When                      |
| -------------------------- | ------------------------- |
| recon.imported             | Remittance batch imported |
| recon.payment_created      | Payment record created    |
| recon.matched              | Payment matched to claim  |
| recon.batch_matched        | Batch matching completed  |
| recon.confirmed            | Match confirmed/rejected  |
| recon.underpayment_created | Underpayment flagged      |
| recon.underpayment_updated | Status transition         |
| recon.sent_to_denials      | Escalated to denial case  |

## Testing

```powershell
# Run verification
.\scripts\verify-phase99-reconciliation.ps1

# Manual smoke test (API must be running)
curl -s http://localhost:3001/rcm/reconciliation/stats | jq .
curl -s -X POST http://localhost:3001/rcm/reconciliation/import \
  -H 'Content-Type: application/json' \
  -d '{"entries":[{"claimRef":"CLM-001","payerId":"P1","billedAmount":500,"paidAmount":450}],"sourceType":"MANUAL"}'
```

## Known Limitations

- Matching engine uses in-memory claim registry for demo; production should
  query VistA IB/AR or Phase 91 claim store
- EDI 835 parser is scaffold-only (accepts JSON, not raw X12 wire format)
- Financial amounts in cents — always multiply by 100 on import
- Platform DB resets with fresh `data/platform.db`; back up regularly

## Files

- `apps/api/src/rcm/reconciliation/types.ts` — Domain model
- `apps/api/src/rcm/reconciliation/recon-store.ts` — SQLite CRUD
- `apps/api/src/rcm/reconciliation/edi835-parser.ts` — Parser adapter
- `apps/api/src/rcm/reconciliation/matching-engine.ts` — 3-tier matcher
- `apps/api/src/rcm/reconciliation/recon-routes.ts` — 14 API endpoints
- `apps/web/src/app/cprs/admin/reconciliation/page.tsx` — UI
