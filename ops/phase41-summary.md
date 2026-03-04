# Phase 41 Summary — Vivian Snapshot Integration + RPC Catalog + Coverage Gates

## What Changed

### A) Vivian Snapshot Normalization

- Created `apps/api/src/tools/vivian/normalizeVivianSnapshot.ts` — extracts, deduplicates, and normalizes the Vivian cross-reference into a flat RPC index
- Generated `data/vista/vivian/rpc_index.json` (3,747 unique RPCs) + `rpc_index.hash` (SHA-256)
- Source: `docs/grounding/vivian-index.json` (200 packages, 4,721 raw RPCs)

### B) RPC Presence Probe

- Already existed: `ZVERPC.m` + `VE LIST RPCS` RPC + `GET /vista/rpc-catalog` (Phase 37B)
- Documented in new runbook: `docs/runbooks/vista-rpc-rpc-list-probe.md`

### C) RPC Coverage Matrix Tool

- Created `apps/api/src/tools/vista/buildRpcCoverageMatrix.ts`
- Compares Vivian index vs live VistA catalog
- Outputs: `rpc_present.json`, `rpc_missing_vs_vivian.json`, `rpc_extra_vs_vivian.json`, `rpc-coverage-report.md`
- Placeholder report at `docs/vista/rpc-coverage-report.md` (run tool for live data)

### D) RPC Registry (Build Gates)

- Created `apps/api/src/vista/rpcRegistry.ts` — 77 `RpcDefinition` entries + 13 `RPC_EXCEPTIONS`
- Covers all 17 domains: auth, allergies, billing, catalog, consults, imaging, inbox, interop, labs, medications, notes, orders, patients, problems, remote, reports, surgery, vitals
- Exports: `lookupRpc()`, `assertKnownRpc()`, `isKnownRpc()`, `getRpcsByDomain()`, `getRpcsByTag()`, `getAllRegisteredRpcNames()`, `getFullRpcInventory()`

### E) UI Action Registry + Debug Panel

- Created `apps/web/src/actions/actionRegistry.ts` — 49 CprsAction entries mapping every CPRS UI click to RPCs
- Created `apps/web/src/components/cprs/panels/RpcDebugPanel.tsx` — admin debug panel
- Created `apps/api/src/vista/rpcDebugData.ts` — server-side mirror of action data
- Added 3 API endpoints: `/vista/rpc-debug/actions`, `/vista/rpc-debug/registry`, `/vista/rpc-debug/coverage`

### F) Documentation

- `docs/vista/vivian-snapshot-format.md` — Vivian snapshot schema + update process
- `docs/runbooks/vista-rpc-rpc-list-probe.md` — RPC probe installation + usage
- `docs/vista/rpc-coverage-report.md` — Coverage report placeholder (auto-generated)

### G) Verification

- `scripts/verify-phase41-rpc-catalog.ps1` — 57 gates across 10 sections
- `scripts/verify-latest.ps1` updated to delegate to Phase 41

## How to Test Manually

```bash
# 1. Verify script (no Docker needed)
powershell -File scripts/verify-phase41-rpc-catalog.ps1

# 2. Re-run normalizer
cd apps/api && npx tsx src/tools/vivian/normalizeVivianSnapshot.ts

# 3. Generate live coverage report (requires API + Docker)
cd apps/api && npx tsx --env-file=.env.local src/index.ts  # in terminal 1
cd apps/api && npx tsx src/tools/vista/buildRpcCoverageMatrix.ts --api http://127.0.0.1:3001
```

## Verifier Output

```
Phase 41 VERIFY Results: 57 / 57
```

## Follow-ups

- Run `buildRpcCoverageMatrix.ts` against live API to generate full coverage data
- Wire `assertKnownRpc()` into `callRpc()` as an optional dev-mode guard
- Add Phase 41 gates to CI pipeline
