# Phase 218 -- Fix What Verification Finds

## User Request

Q218: Review Q217 verification findings and fix any RPC communication issues.

## Implementation Steps

1. Review Q217 static verification report (3 PASS, 0 WARN, 0 FAIL)
2. Audit the one finding Q217 DID catch: unregistered `ORWCV VST` -- already fixed in Q217 commit
3. Investigate 29 registered RPCs not directly in routes:
   - 27 are used in adapters/services/capability infrastructure (valid)
   - 2 are "pre-registered" for planned features (`ORQPT DEFAULT LIST SOURCE`, `ORQQPX REMINDER DETAIL`)
4. Conclusion: no additional fixes required -- Q217 already resolved the only issue

## Findings Summary

### Fixed in Q217

- `ORWCV VST` was used in `clinical-engine/vista-adapter.ts` via `safeCallRpc` but not in `rpcRegistry.ts`
- Added to registry under `scheduling` domain with `read` tag

### Pre-registered RPCs (intentional, no action needed)

- `ORQPT DEFAULT LIST SOURCE` -- companion to active `ORQPT DEFAULT PATIENT LIST`, planned for list source picker
- `ORQQPX REMINDER DETAIL` -- companion to active `ORQQPX REMINDERS LIST`, planned for reminder detail view

### Coverage Stats

- 138 registered RPCs, 111 unique RPCs used in routes
- 0 unregistered RPCs
- 0 domain conflicts
- 907 total routes, 115 live, 686 stubs

## Files Touched

- (none -- all fixes were made in Q217)

## Verification Steps

- Q217 verification: 3 PASS, 0 WARN, 0 FAIL
- All QA gates: green
