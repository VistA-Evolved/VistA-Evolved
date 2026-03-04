# Phase 138 — IMPLEMENT: Nursing DOC + MAR + Handoff (VistA-First)

## User Request

Harden and deepen the existing nursing documentation (Phase 68/84), eMAR (Phase 85),
and shift handoff (Phase 86) subsystems with:

1. **Immutable audit logging** on all nursing, eMAR, and handoff endpoints
2. **RPC registry completeness** — add BCMA/PSB target RPCs
3. **Capability registration** — add missing capabilities for handoff, flowsheet, I/O, assessments
4. **Module route wiring** — add `/emar/` and `/handoff/` to clinical module
5. **pendingFallback consistency** — fix `ok: true` on error → `ok: false`
6. **NursingPanel UI enhancements** — add Flowsheet and Handoff sub-tabs, fix CSRF headers
7. **No fake writes** — all write-like endpoints remain integration-pending with named RPC targets

## Implementation Steps

### Step 1 — Infrastructure Wiring

- Add `nursing.*`, `emar.*`, `handoff.*` audit actions to `immutable-audit.ts`
- Add PSB MED LOG, PSB ALLERGY, PSJBCMA to `rpcRegistry.ts` RPC_EXCEPTIONS
- Add missing capabilities to `capabilities.json` (handoff, flowsheet, io, assessments, emar)
- Add `^/emar/` and `^/handoff/` to clinical module in `modules.json`

### Step 2 — API Route Hardening

- Add `immutableAudit()` calls to all nursing, eMAR, and handoff read/write endpoints
- Fix `pendingFallback` returns to use `ok: false` in nursing and eMAR routes
- Ensure all error paths are consistent

### Step 3 — UI Enhancement

- Add `csrfHeaders()` to NursingPanel.tsx fetch helper
- Add Flowsheet sub-tab (calls `/vista/nursing/flowsheet?dfn=`)
- Add Handoff sub-tab (shows handoff reports list from `/handoff/reports`)
- Improve MAR tab to show eMAR schedule when available

### Step 4 — Verify

- TypeScript build clean
- Vitest 20/20 files, 413+ tests
- Gauntlet FAST + RC pass

## Files Touched

- `apps/api/src/lib/immutable-audit.ts` — add audit action types
- `apps/api/src/vista/rpcRegistry.ts` — add BCMA/PSB RPCs to exceptions
- `config/capabilities.json` — add 8 new capabilities
- `config/modules.json` — add emar + handoff route patterns
- `apps/api/src/routes/nursing/index.ts` — add immutableAudit, fix pendingFallback
- `apps/api/src/routes/emar/index.ts` — add immutableAudit, fix pendingFallback
- `apps/api/src/routes/handoff/index.ts` — switch to immutableAudit
- `apps/web/src/components/cprs/panels/NursingPanel.tsx` — CSRF + new tabs

## Verification

- `scripts/verify-latest.ps1`
- Gauntlet FAST + RC
