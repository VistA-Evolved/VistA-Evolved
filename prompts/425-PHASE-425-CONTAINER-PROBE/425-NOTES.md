# Phase 425 -- NOTES

- **Wave**: 26, Position 3 (W26 P3)
- **Type**: Infrastructure / Probe tooling
- **Risk**: Low -- new script, two new read/POST endpoints on existing route file
- **Dependencies**: Phase 424 (runtime matrix, drift detection functions)

## Key Decisions
1. Probe script uses Node.js `fetch()` to call the running API rather than
   connecting to VistA directly. This validates the full stack including
   auth context setup and RPC broker connection.
2. Capability snapshots are dated files under `data/vista/` and should be
   committed periodically to track regression baselines.
3. Drift endpoint accepts a baseline via POST body rather than reading from
   disk, making it useful for CI pipelines that may have their own baselines.
