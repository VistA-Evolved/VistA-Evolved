# Phase 435 — Notes

## What Changed
- Wired `addAllergy()` to `ORWDAL32 SAVE ALLERGY` via safeCallRpcWithList
- Wired `addVital()` to `GMV ADD VM` via safeCallRpc
- Wired `createNote()` to `TIU CREATE RECORD` + `TIU SET DOCUMENT TEXT` (2-step)
- Wired `addProblem()` to `ORQQPL ADD SAVE` via safeCallRpc

## Key Decisions
- Reused exact parameter formats from existing route implementations
- All 4 RPCs already registered in rpcRegistry.ts — no new entries needed
- Error handling uses try/catch + log.warn per project convention
- ADT and pharmacy adapter methods remain integration-pending (different RPCs)
