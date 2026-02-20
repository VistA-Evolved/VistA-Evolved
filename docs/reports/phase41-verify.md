# Phase 41 VERIFY -- RPC Completeness & No Drift

**Date**: 2026-02-20
**Commit**: Phase41-VERIFY
**Verifier**: scripts/verify-phase41-rpc-catalog.ps1 (57/57 PASS)

---

## Gate Results

| Gate | Description | Result | Evidence |
|------|-------------|--------|----------|
| G41-1a | Normalizer runs and produces rpc_index.json | **PASS** | 3,747 RPCs written, hash `c9f89827...` |
| G41-1b | Dedupe verified | **PASS** | 3,747 total == 3,747 unique |
| G41-1c | Stable sorting verified | **PASS** | Ascending alphabetical confirmed |
| G41-2a | `/vista/rpc-catalog` returns rpcNames[] and count | **PASS** | 2,800 RPCs from live VistA sandbox |
| G41-2b | VE LIST RPCS installed and documented | **PASS** | IEN=3112, ZVERPC.m reads `^XWB(8994,*)` |
| G41-3a | rpc-coverage-report.md exists with counts | **PASS** | Overlap: 2,508 / Missing: 1,239 / Extra: 292 |
| G41-3b | Diff lists generated | **PASS** | rpc_present.json, rpc_missing_vs_vivian.json, rpc_extra_vs_vivian.json |
| G41-4a | All callRpc calls use registered RPCs | **PASS** | 46/46 literal RPC names in registry |
| G41-4b | RPC_REGISTRY + RPC_EXCEPTIONS cover all usage | **PASS** | 69 registry + 13 exceptions = 82 total |
| G41-4c | Unknown RPC usage = 0 | **PASS** | Repo scan found 0 unregistered RPCs |
| G41-5a | actionRegistry exists with major UI action mappings | **PASS** | 48 actions across 18 locations |
| G41-5b | No dead clicks (stub actions have pending modal) | **PASS** | 46 wired, 2 stub (orders.dc, orders.flag) |
| G41-5c | RPC debug panel + API endpoints operational | **PASS** | /vista/rpc-debug/{actions,registry,coverage} all return data |
| G41-6  | verify-latest.ps1 passes | **PASS** | 57/57 gates |

---

## Coverage Matrix Summary

| Metric | Count |
|--------|-------|
| Vivian index RPCs | 3,747 |
| Live VistA sandbox RPCs | 2,800 |
| Overlap (both) | 2,508 |
| Missing from sandbox | 1,239 |
| Extra in sandbox (not in Vivian) | 292 |
| Coverage (overlap / Vivian) | 66.9% |

---

## Action Registry Summary

| Metric | Count |
|--------|-------|
| Total UI actions | 48 |
| Wired (functional) | 46 |
| Stub (pending impl) | 2 |
| Integration-pending | 0 |
| Locations covered | 18 |

---

## RPC Registry Summary

| Metric | Count |
|--------|-------|
| RPC_REGISTRY entries | 69 |
| RPC_EXCEPTIONS entries | 13 |
| Unique RPCs in callRpc calls | 46 |
| Unregistered RPCs | 0 |

---

## Bug Fix During Verify

**BUG-063: ZVERPC.m used wrong global `^XTV(8994,*)` instead of `^XWB(8994,*)`**

- **Symptom**: `/vista/rpc-catalog` returned 0 RPCs despite RPC being installed
- **Root cause**: File 8994 (REMOTE PROCEDURE) stores data in `^XWB(8994,*)` on WorldVistA Docker. `^XTV(8994,*)` only has 4 entries (metadata). The GL node in `^DIC(8994,0,"GL")` confirms `^XWB(8994,`.
- **Fix**: Changed all `^XTV(8994,` references to `^XWB(8994,` in `LIST^ZVERPC`
- **Impact**: Catalog endpoint now returns 2,800 RPCs from live VistA

---

## Files Touched

- `services/vista/ZVERPC.m` -- Fixed `^XTV` -> `^XWB` in LIST entry (BUG-063)
- `scripts/verify-phase41-rpc-catalog.ps1` -- Updated check to match `^XWB`
- `docs/runbooks/vista-rpc-rpc-list-probe.md` -- Updated global reference
- `docs/vista/rpc-coverage-report.md` -- Replaced placeholder with generated report
- `data/vista/vista_instance/rpc_catalog_cache.json` -- Live catalog cache (generated)
- `data/vista/vista_instance/rpc_present.json` -- Coverage overlap (generated)
- `data/vista/vista_instance/rpc_missing_vs_vivian.json` -- Missing RPCs (generated)
- `data/vista/vista_instance/rpc_extra_vs_vivian.json` -- Extra RPCs (generated)
- `docs/reports/phase41-verify.md` -- This file
