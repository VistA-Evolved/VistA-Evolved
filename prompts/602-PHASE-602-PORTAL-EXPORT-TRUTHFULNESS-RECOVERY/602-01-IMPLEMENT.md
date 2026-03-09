# Phase 602 - Portal Export Truthfulness Recovery - IMPLEMENT

## Goal

Recover the patient-facing portal export and record portability flows so they use
the live immunizations and labs data paths where those routes already exist, and
stop reporting false "integration pending" copy when the record is simply empty.

## Implementation Steps

1. Inventory the current portal export and record portability data paths for
   immunizations and labs.
2. Confirm the original implementation intent from Phase 31, Phase 65, and Phase 80.
3. Verify the live backend posture for `/portal/health/immunizations` and
   `/portal/health/labs` against VEHU under a real portal session.
4. Fix `apps/api/src/routes/portal-core.ts` so export helpers fetch live
   immunizations and labs instead of silently falling through to empty arrays.
5. Fix `apps/api/src/routes/record-portability.ts` so immunizations are no
   longer hardcoded as pending and labs use the live `ORWLRR INTERIM` contract.
6. Update `apps/api/src/services/portal-pdf.ts` so empty live data renders
   truthful "no records on file" copy, while genuine pending/unavailable
   paths still surface target RPC metadata.
7. Update the relevant runbooks and ops artifacts for the recovered export
   contract.

## Files Touched

- `prompts/602-PHASE-602-PORTAL-EXPORT-TRUTHFULNESS-RECOVERY/602-01-IMPLEMENT.md`
- `prompts/602-PHASE-602-PORTAL-EXPORT-TRUTHFULNESS-RECOVERY/602-99-VERIFY.md`
- `apps/api/src/routes/portal-core.ts`
- `apps/api/src/routes/record-portability.ts`
- `apps/api/src/services/portal-pdf.ts`
- `docs/runbooks/phase31-sharing-exports.md`
- `docs/runbooks/phase80-record-portability.md`
- `ops/summary.md`
- `ops/notion-update.json`