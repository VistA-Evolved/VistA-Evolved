# Phase 429 Notes

## Decisions

- Uses dynamic import with vi.resetModules() to test each mode in isolation
- Env vars snapshotted/restored per test to prevent cross-contamination
- Mode property matrix covers all 4x4 combinations parametrically
- Tests are pure unit tests -- no server startup or network calls needed
- Adapter and SKU tests verify env var contract, not full adapter loading
