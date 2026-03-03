# Phase 485 — W33-P5: eMAR Writeback (BCMA)

## Goal
Convert 3 eMAR `integration-pending` endpoints to capability-driven
responses using `tier0Gate()`.

## Endpoints Targeted
| # | Method | Path | Primary RPC | Expected |
|---|--------|------|-------------|----------|
| 1 | GET | /emar/history | PSB MED LOG | unsupported-in-sandbox |
| 2 | POST | /emar/administer | PSB MED LOG | unsupported-in-sandbox |
| 3 | POST | /emar/barcode-scan | PSJBCMA | unsupported-in-sandbox |

## Implementation Steps
1. Import `tier0Gate` in `routes/emar/index.ts`
2. Replace 3 static integration-pending responses with `tier0Gate()` calls
3. Update audit outcome from `"success"` to `"blocked"` for gated endpoints
4. No new KNOWN_RPCS or SANDBOX_EXPECTED_MISSING entries needed

## Files Changed
- `apps/api/src/routes/emar/index.ts`
