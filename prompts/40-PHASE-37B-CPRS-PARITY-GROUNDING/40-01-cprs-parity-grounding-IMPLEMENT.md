# Phase 37B — VistA/Vivian Grounding + CPRS Parity Enforcement

## User Request
Stop dead-clicks, stop missing dialogs, stop invented behavior. Build a mechanical
parity harness that triangulates Delphi CPRS contracts, runtime RPCs in the WorldVistA
Docker sandbox, and FOIA-grounded VistA truth from Vivian/DOX references.

## Implementation Steps

### Step 0 — CPRS Contract Extraction
- Read existing `design/contracts/cprs/v1/` extraction (975 RPCs, 81 screens, etc.)
- Generate `docs/grounding/cprs-contract.extracted.json` merging tabs, menus,
  screens, RPCs, and forms into a single contract file

### Step 1 — Runtime RPC Catalog Endpoint
- Create M routine `ZVERPC.m` that lists all RPCs from File 8994
- Create install script `scripts/install-rpc-catalog.ps1`
- Add `GET /vista/rpc-catalog` API endpoint (cached 60s)

### Step 2 — Vivian/DOX Grounding Snapshot
- Create `scripts/vivian_snapshot.ts` to download DOX cache pages
- Parse DOX pages into `docs/grounding/vivian-index.json`
- Target packages: OR, TIU, GMTS, LR, RA, PSO, PSJ, IB, PRCA, XU, HL

### Step 3 — Parity Matrix Builder
- Create `scripts/build_parity_matrix.ts`
- Merge contract, runtime catalog, and Vivian index
- Output `docs/grounding/parity-matrix.json` and `.md`

### Step 4 — Dead-Click Enforcement
- Add Playwright tests for all tabs, menu items, and key flows
- Ensure no silent no-ops

### Step 5 — Verify Script
- Create `scripts/verify-phase37b-parity.ps1`
- Update `verify-latest.ps1` delegation

## Files Touched
- `prompts/40-PHASE-37B-CPRS-PARITY-GROUNDING/` — prompt capture
- `docs/grounding/` — all grounding artifacts
- `services/vista/ZVERPC.m` — M routine for RPC catalog
- `scripts/install-rpc-catalog.ps1` — installer
- `apps/api/src/index.ts` — new endpoint
- `scripts/vivian_snapshot.ts` — DOX fetcher
- `scripts/build_parity_matrix.ts` — matrix builder
- `tests/e2e/dead-clicks.spec.ts` — Playwright tests
- `scripts/verify-phase37b-parity.ps1` — verifier
- `ops/phase37b-summary.md` — ops summary
- `ops/phase37b-notion-update.json` — Notion update
