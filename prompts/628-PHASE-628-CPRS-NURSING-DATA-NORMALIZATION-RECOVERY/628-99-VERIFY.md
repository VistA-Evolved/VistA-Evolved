# Phase 628 - CPRS Nursing Data Normalization Recovery - Verify

## Verification target

Ensure the Nursing panel renders live VistA-backed vitals, flowsheet data, and nursing notes truthfully, without leaking raw FileMan timestamps or internal TIU field fragments into clinician-facing tables.

## Required checks

1. `GET /vista/nursing/vitals?dfn=46` returns `ok: true` with `rpcUsed: ["ORQQVI VITALS"]`.
2. Each nursing vitals item includes a human-readable `date` value derived from FileMan format.
3. No nursing vitals item renders a FileMan timestamp in the `units` field.
4. `GET /vista/nursing/flowsheet?dfn=46` returns `ok: true` and its rows no longer append timestamps into the value column.
5. `GET /vista/nursing/notes?dfn=46` returns `ok: true` with `rpcUsed: ["TIU DOCUMENTS BY CONTEXT"]`.
6. Nursing note rows expose human-readable dates and author names instead of raw TIU wire-format fragments.
7. Nursing note status comes from the TIU status field, not the author field.
8. Live browser verification on `/cprs/chart/46/nursing` confirms:
   - Vitals table is readable
   - Flowsheet table is readable
   - Notes table is readable
9. Diagnostics report no new errors in `apps/api/src/routes/nursing/index.ts`.