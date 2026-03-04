# Phase 484 — W33-P4: Nursing Writeback (Vitals + I/O + Assessments)

## Goal

Convert 5 nursing `integration-pending` endpoints to capability-driven
responses using `tier0Gate()` from Phase 482.

## Endpoints Targeted

| #   | Method | Path                          | Primary RPC   | Expected               |
| --- | ------ | ----------------------------- | ------------- | ---------------------- |
| 1   | GET    | /vista/nursing/tasks          | PSB MED LOG   | unsupported-in-sandbox |
| 2   | GET    | /vista/nursing/mar            | PSB ALLERGY   | unsupported-in-sandbox |
| 3   | POST   | /vista/nursing/mar/administer | PSB MED LOG   | unsupported-in-sandbox |
| 4   | GET    | /vista/nursing/io             | GMRIO RESULTS | unsupported-in-sandbox |
| 5   | GET    | /vista/nursing/assessments    | ZVENAS LIST   | unsupported-in-sandbox |

## Implementation Steps

1. Add GMRIO RESULTS, GMRIO ADD, ZVENAS LIST, ZVENAS SAVE to `KNOWN_RPCS`
2. Add same + ORWORDG IEN to `SANDBOX_EXPECTED_MISSING` in tier0-response.ts
3. Import `tier0Gate` in `routes/nursing/index.ts`
4. Replace each handler's static response with `tier0Gate()` call
5. Update audit outcome from `"success"` to `"blocked"` for gated endpoints
6. No new audit action types needed (all 5 already exist from Phase 138)

## Files Changed

- `apps/api/src/routes/nursing/index.ts`
- `apps/api/src/lib/tier0-response.ts`
- `apps/api/src/vista/rpcCapabilities.ts`
