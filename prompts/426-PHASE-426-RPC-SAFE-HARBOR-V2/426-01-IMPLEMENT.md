# Phase 426 -- RPC Safe-Harbor List v2 (W26 P4)

## Objective

Produce a machine-readable safe-harbor classification for all write RPCs,
grading each by production readiness tier based on sandbox testing evidence.

## Changes

### New Files

| File | Purpose |
|------|---------|
| `data/vista/rpc-safe-harbor-v2.json` | 18 write RPCs classified across 5 safety tiers |

## Safety Tiers

| Tier | Count | Meaning |
|------|-------|---------|
| safe-harbor | 7 | Proven safe in sandbox, production-ready |
| supervised | 6 | Works but requires clinical oversight |
| experimental | 2 | Dev/test only, output not fully validated |
| blocked | 1 | Must not be called (absent or dangerous) |
| infrastructure | 2 | Internal-use (LOCK/UNLOCK) |

## Per-RPC Classification Fields

- `tier` -- safety tier
- `sandboxTested` -- boolean
- `requiresLock` -- whether ORWDX LOCK must bracket the call
- `prerequisites` -- RPCs that must be called first
- `relatedBugs` -- references to BUG-TRACKER.md entries
- `notes` -- implementation details and caveats

## Production Readiness Summary

- **Ready**: 7 RPCs (allergies, vitals, notes, problems, messaging)
- **Supervised**: 6 RPCs (orders, labs, encounters)
- **Dev/Test only**: 2 RPCs (medications auto-ack, consult results)
- **Blocked**: 1 RPC (ORQQPL EDIT SAVE -- absent from sandbox)

## Files Touched

- `data/vista/rpc-safe-harbor-v2.json` (new)
