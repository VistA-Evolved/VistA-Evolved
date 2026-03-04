# Phase 425 -- Container-Probe Script + Capability Snapshot (W26 P3)

## Objective

Create a Node.js probe script that calls the API to generate dated capability
snapshots, add runtime-matrix and drift-detection API endpoints, and wire them
into the existing capabilities route.

## Changes

### New Files

| File                                   | Purpose                                                                      |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| `scripts/vista/probe-capabilities.mjs` | Node.js script: calls API, saves JSON snapshot, optional baseline comparison |

### Modified Files

| File                                  | Change                                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------------- |
| `apps/api/src/routes/capabilities.ts` | Added `GET /vista/runtime-matrix` and `POST /vista/runtime-matrix/drift` endpoints |

## API Endpoints Added

| Method | Path                          | Purpose                                                           |
| ------ | ----------------------------- | ----------------------------------------------------------------- |
| GET    | `/vista/runtime-matrix`       | Combined domain capability view (read/write readiness per domain) |
| POST   | `/vista/runtime-matrix/drift` | Compare current capabilities against a provided baseline snapshot |

## Probe Script Usage

```powershell
# Basic probe (requires running API + VistA)
node scripts/vista/probe-capabilities.mjs

# Custom API URL
node scripts/vista/probe-capabilities.mjs --api http://127.0.0.1:3001

# Compare against baseline
node scripts/vista/probe-capabilities.mjs --compare

# Custom output path
node scripts/vista/probe-capabilities.mjs --output data/vista/my-snapshot.json
```

## Files Touched

- `scripts/vista/probe-capabilities.mjs` (new)
- `apps/api/src/routes/capabilities.ts` (modified)
