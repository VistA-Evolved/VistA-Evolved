# Phase 106 -- VistA Alignment Coverage (IMPLEMENT)

## User Request

Create an explicit, machine-checkable coverage map proving what is wired to
VistA vs what is pending. Five major deliverables:

1. `tools/rpc-extract/build-coverage-map.mjs` — alignment tool that
   cross-references CPRS Delphi extraction, Vivian RPC index, and API
   registry to produce unified coverage data
2. `docs/vista-alignment/rpc-coverage.json` + `rpc-coverage.md` —
   canonical machine-readable and human-readable coverage reports
3. CI/QA gate that FAILs if any `callRpc` invocation references an
   unregistered RPC
4. Integration-pending stub recognition (existing stubs already return
   `{ok: false}` — coverage tool now tracks their status)
5. Dev-mode UI banner showing `wired_to_vista: true/false` + `targetRpc`
   per panel

Hard rules: No mass documentation sprawl. No rewriting CPRS UI; only
coverage and correctness gates.

## Implementation Steps

1. **Inventory** — Located existing extraction tools (`tools/cprs-extract/`),
   CPRS catalog (975 RPCs), Vivian index (3,747 RPCs), and API registry
   (76 live + 22 exceptions at start).
2. **Coverage tool** — Created `tools/rpc-extract/build-coverage-map.mjs`
   that reads all three sources + scans for live `callRpc` sites + detects
   auto-generated stub routes.
3. **Coverage artifacts** — Generated `docs/vista-alignment/rpc-coverage.json`
   (1,016 tracked RPCs) and `rpc-coverage.md` (tables by status + domain).
4. **Panel wiring metadata** — Generated
   `apps/web/src/lib/vista-panel-wiring.ts` with per-panel wiring status
   for 20 panels.
5. **Registry fixes** — Added 7 missing RPCs to `rpcRegistry.ts`
   (ORWLRR INTERIMG, ORWPT ID INFO, ORWPT16 ID INFO, 4 scheduling RPCs)
   + corresponding exceptions.
6. **CI gate** — Created `scripts/verify-phase106-vista-alignment.ps1`
   (8 gates, 23 checks). Updated `verify-latest.ps1` to delegate.
7. **UI banner** — Created `VistaAlignmentBanner.tsx` (dev-mode only,
   production-safe, shows wired/partial/pending per panel).

## Verification Steps

```powershell
.\scripts\verify-phase106-vista-alignment.ps1
```

All 23 gates PASS:
- Gate 1: All 4 artifacts exist
- Gate 2: JSON valid, liveWired=76, CPRS=975, Vivian=3747
- Gate 3: 151 callRpc invocations, ALL reference registered RPCs
- Gate 4: All registry RPCs in Vivian or Exceptions
- Gate 5: Panel wiring has 20 panels with PANEL_WIRING + getPanelWiring exports
- Gate 6: 1016 RPCs tracked, all wired RPCs have call sites
- Gate 7: Console.log cap OK
- Gate 8: 3 stub route files return integration-pending

## Files Touched

- `tools/rpc-extract/build-coverage-map.mjs` (NEW)
- `docs/vista-alignment/rpc-coverage.json` (NEW, generated)
- `docs/vista-alignment/rpc-coverage.md` (NEW, generated)
- `apps/web/src/lib/vista-panel-wiring.ts` (NEW, generated)
- `apps/web/src/components/cprs/VistaAlignmentBanner.tsx` (NEW)
- `apps/api/src/vista/rpcRegistry.ts` (MODIFIED — 7 RPCs + 7 exceptions added)
- `scripts/verify-phase106-vista-alignment.ps1` (NEW)
- `scripts/verify-latest.ps1` (MODIFIED — delegates to Phase 106)
- `prompts/110-PHASE-106-VISTA-ALIGNMENT/106-01-IMPLEMENT.md` (NEW)
- `ops/summary.md` (NEW)
- `ops/notion-update.json` (NEW)
