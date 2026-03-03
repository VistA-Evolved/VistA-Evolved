# Phase 536 — MHA VistA Writeback (TIU) [W39-P6]

## Objective
Add TIU note writeback for completed MHA administrations. When a clinician
administers a mental health instrument (Phase 535), the results can be filed
to VistA as a TIU document via `TIU CREATE RECORD` + `TIU SET DOCUMENT TEXT`.
Includes draft fallback when VistA RPCs are unavailable.

## Deliverables

### 1. File-note endpoint
`POST /vista/mha/administer/:id/file-note` in `apps/api/src/routes/mha/index.ts`
- Reads the administration from in-memory store
- Generates structured MHA note text (instrument name, scores, severity, items)
- Calls `TIU CREATE RECORD` with `[DFN, titleIen, DUZ, visitLocation, visitDate]`
- Calls `TIU SET DOCUMENT TEXT` with word-processing `"TEXT",N,0` keys
- Updates administration: `vistaFiled: true`, `vistaIen: docIen`
- Draft fallback when RPCs unavailable

### 2. Note text generator
`apps/api/src/routes/mha/note-generator.ts`
- Generates structured clinical note from MhaAdministration
- Standard MHA note format: instrument header, questions with answers, scoring summary, severity, red flags
- No PHI in the generator logic itself (DFN/patient name comes from VistA context)

### 3. Store policy registration
Add 2 entries to `apps/api/src/platform/store-policy.ts`:
- `mha-administration-store` (clinical_data, in_memory_only)
- `mha-patient-index` (index, in_memory_only)

## Files touched
- `apps/api/src/routes/mha/index.ts` — add file-note endpoint
- `apps/api/src/routes/mha/note-generator.ts` — new file
- `apps/api/src/platform/store-policy.ts` — add 2 entries
