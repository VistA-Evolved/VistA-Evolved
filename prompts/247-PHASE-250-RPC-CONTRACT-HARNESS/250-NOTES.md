# Phase 250 — NOTES — VistA RPC Contract Harness

## Design Decisions

### Why These 10 RPCs?
Selected to cover the critical path through a clinical session:
1. **XUS SIGNON SETUP** — auth prerequisite (every session starts here)
2. **ORWPT LIST ALL** — patient selection
3. **ORQQAL LIST** — allergy panel (safety-critical)
4. **GMV V/M ALLDATA** — vitals panel
5. **ORWPS ACTIVE** — active medications
6. **ORQQPL LIST** — problem list
7. **TIU DOCUMENTS BY CONTEXT** — clinical notes
8. **ORWORB FASTUSER** — notifications
9. **ORWLRR INTERIMG** — interim lab results
10. **ORQPT DEFAULT LIST SOURCE** — default patient list configuration

### PHI Sanitization Strategy
- Deny-pattern approach (block known PHI patterns) rather than allow-pattern
- SHA-256 hashing preserves referential integrity for test assertions
- FileMan date normalization ensures consistent timestamp format
- All sanitization runs BEFORE fixture files are written to disk

### RECORD vs REPLAY
- REPLAY is the default — CI never needs VistA
- RECORD is dev-only, requires explicit env var + live VistA
- Fixtures are committed to git (PHI-free after sanitization)
- Record tool uses dynamic import to avoid hard dep on broker client

### What This Does NOT Do
- Does not replace `safeCallRpc` or `rpc-resilience.ts`
- Does not modify the RPC broker client
- Does not add any production middleware
- Purely a testing/verification layer

## Risks
- Fixture drift: recorded fixtures may become stale if VistA patches change output format
- Mitigation: re-record periodically, version fixtures with timestamp
