# Phase 571 -- Rename Phase 566/567 Prompt Files for Consistency

## User Request

Remove naming drift in Phase 566/567 prompt files:

- Filenames are P1-1 / P1-3 instead of 566 / 567
- Internal "Files Touched" lists reference old folder names (`566-PHASE-P1-1-...`)

## Inventory

### prompts/566-PHASE-566-VISTA-RPC-BRIDGE/

- `P1-1-01-IMPLEMENT.md` -- heading says "P1-1", Files Touched references `566-PHASE-P1-1-VISTA-RPC-BRIDGE/`
- `P1-1-99-VERIFY.md` -- heading says "P1-1"

### prompts/567-PHASE-567-CONSOLIDATE-PATIENT-MODEL/

- `P1-3-01-IMPLEMENT.md` -- heading says "P1-3"
- `P1-3-99-VERIFY.md` -- heading says "P1-3"

### External references

- `docs/SESSION_LOG.md` -- mentions `566-PHASE-P1-1-VISTA-RPC-BRIDGE`
- `docs/QA_GAUNTLET_FAST_RESULTS.md` -- mentions `566-PHASE-P1-1-VISTA-RPC-BRIDGE`
- `docs/qa/phase-index.json` -- generated, will be rebuilt

## Implementation Steps

1. Rename `P1-1-01-IMPLEMENT.md` -> `566-01-IMPLEMENT.md`, update heading + internal refs
2. Rename `P1-1-99-VERIFY.md` -> `566-99-VERIFY.md`, update heading
3. Rename `P1-3-01-IMPLEMENT.md` -> `567-01-IMPLEMENT.md`, update heading
4. Rename `P1-3-99-VERIFY.md` -> `567-99-VERIFY.md`, update heading
5. No content deleted -- renaming + reference fixup only
6. Regenerate phase index artifacts

## Files Touched

- `prompts/566-PHASE-566-VISTA-RPC-BRIDGE/566-01-IMPLEMENT.md` (renamed from P1-1-01-IMPLEMENT.md)
- `prompts/566-PHASE-566-VISTA-RPC-BRIDGE/566-99-VERIFY.md` (renamed from P1-1-99-VERIFY.md)
- `prompts/567-PHASE-567-CONSOLIDATE-PATIENT-MODEL/567-01-IMPLEMENT.md` (renamed from P1-3-01-IMPLEMENT.md)
- `prompts/567-PHASE-567-CONSOLIDATE-PATIENT-MODEL/567-99-VERIFY.md` (renamed from P1-3-99-VERIFY.md)
- `docs/qa/phase-index.json` (regenerated)
- `prompts/571-PHASE-571-PROMPTS-566-567-CLEANUP/` (this prompt folder)
