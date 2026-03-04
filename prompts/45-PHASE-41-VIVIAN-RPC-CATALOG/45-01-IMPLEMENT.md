# Phase 41 -- Vivian Snapshot Integration + RPC Catalog + Coverage Gates

## User Request

Integrate the existing Vivian snapshot (3,754 unique RPCs from docs/grounding/vivian-index.json)
with the live VistA sandbox RPC catalog (VE LIST RPCS) to produce:

1. Normalized rpc_index.json from Vivian data
2. RPC coverage matrix (Vivian vs live VistA instance)
3. Authoritative rpcRegistry.ts with build-time gates (unknown RPC = hard fail)
4. UI action registry mapping every CPRS click to its backing RPC(s)
5. Debug panel showing RPC mapping + presence status (admin/dev only)
6. "Integration pending" modals for actions with missing RPCs

## Implementation Steps

### A) Vivian Snapshot Normalization

- Source: docs/grounding/vivian-index.json (already exists, 3,754 unique RPCs)
- Tool: apps/api/src/tools/vivian/normalizeVivianSnapshot.ts
- Output: data/vista/vivian/rpc_index.json + rpc_index.hash
- Dedup, normalize whitespace/case, stable ordering, redact sensitive data

### B) VistA RPC Presence Probe

- Already implemented: ZVERPC.m + VE LIST RPCS RPC + GET /vista/rpc-catalog
- Verify installation in Docker sandbox
- Document in docs/runbooks/vista-rpc-rpc-list-probe.md

### C) RPC Coverage Matrix

- Tool: apps/api/src/tools/vista/buildRpcCoverageMatrix.ts
- Compare Vivian index vs live catalog
- Output: data/vista/vista_instance/rpc_present.json, rpc_missing_vs_vivian.json
- Generate: docs/vista/rpc-coverage-report.md

### D) rpcRegistry Build Gates

- apps/api/src/vista/rpcRegistry.ts
- Exports rpc(name) that asserts existence in Vivian index
- Tags: read-only, write, side-effectful
- Exceptions file for known-missing RPCs
- Refactor all callRpc sites to use registry

### E) UI Action Registry + Debug Panel

- apps/web/src/actions/actionRegistry.ts
- Each action: actionId, UI location, capability, expected RPC(s)
- Admin-only debug panel showing RPC mappings + presence
- "Integration pending" modal for missing-RPC actions

### F) Documentation

- docs/vista/vivian-snapshot-format.md
- docs/vista/rpc-coverage-report.md (generated)
- docs/runbooks/vista-rpc-rpc-list-probe.md

### G) Prompts Folder Integrity

- Verify ordering: 45-PHASE-41 is next after 44-PHASE-40
- No duplicate phase numbers, no gaps

## Verification Steps

- TypeScript compiles clean
- rpcRegistry covers all callRpc sites
- Coverage matrix generates successfully
- Vivian index contains 3,700+ RPCs
- No PHI/credentials in any output

## Files Touched

- apps/api/src/tools/vivian/normalizeVivianSnapshot.ts (new)
- apps/api/src/tools/vista/buildRpcCoverageMatrix.ts (new)
- apps/api/src/vista/rpcRegistry.ts (new)
- apps/web/src/actions/actionRegistry.ts (new)
- apps/web/src/components/cprs/panels/RpcDebugPanel.tsx (new)
- data/vista/vivian/rpc_index.json (generated)
- data/vista/vivian/rpc_index.hash (generated)
- docs/vista/vivian-snapshot-format.md (new)
- docs/vista/rpc-coverage-report.md (generated)
- docs/runbooks/vista-rpc-rpc-list-probe.md (new)
- scripts/verify-phase41-rpc-catalog.ps1 (new)
