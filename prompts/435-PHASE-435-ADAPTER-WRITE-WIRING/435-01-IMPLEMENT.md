# Phase 435 — Clinical Adapter Write Wiring (W27 P5)

## Objective
Wire the 4 clinical adapter write methods (addAllergy, addVital,
createNote, addProblem) from integration-pending stubs to real VistA
RPC calls, matching the exact parameter formats already proven in
route-direct implementations.

## Implementation Steps

1. **Wire `addAllergy()`**: Uses `safeCallRpcWithList` with OREDITED LIST params
   - GMRAGNT (allergen), GMRATYPE (D/F/O), GMRANATR, GMRAORIG, GMRACHT, GMRAOBHX
   - Optional: GMRASEVR, GMRACMTS, GMRASYMP reactions array
   - Response: first line split on ^ gives IEN

2. **Wire `addVital()`**: Uses `safeCallRpc` with formatted param string
   - Format: `DFN^datetime^vitalTypeIEN^value^units^qualifier^DUZ^location`
   - Response: check for ERROR substring

3. **Wire `createNote()`**: 2-step RPC sequence
   - Step 1: `TIU CREATE RECORD` with [DFN, titleIen, DUZ, visitLocation, visitDate]
   - Step 2: `TIU SET DOCUMENT TEXT` with [docIen, text, "1"]
   - Response: first line split on ^ gives docIen

4. **Wire `addProblem()`**: Uses `safeCallRpc` with positional params
   - `[DFN, DUZ, description, icdCode, onset, status]`
   - Response: first line split on ^ gives IEN

## Files Modified
- `apps/api/src/adapters/clinical-engine/vista-adapter.ts` — all 4 write methods wired
