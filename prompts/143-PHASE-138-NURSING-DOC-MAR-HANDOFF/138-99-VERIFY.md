# Phase 138 — VERIFY: Nursing DOC + MAR + Handoff (VistA-First)

## Verification Gates

### Gate 1 — TypeScript Build
- `pnpm -C apps/api exec tsc --noEmit` exits 0
- `pnpm -C apps/web exec next build` exits 0 (or lint clean)

### Gate 2 — Vitest
- 20/20 files, 413+ tests PASS

### Gate 3 — Immutable Audit Actions
- `immutable-audit.ts` includes: nursing.vitals, nursing.notes, nursing.flowsheet,
  nursing.create-note, emar.schedule, emar.allergies, emar.administer,
  handoff.create, handoff.view, handoff.submit, handoff.accept

### Gate 4 — RPC Registry
- PSB MED LOG, PSB ALLERGY, PSJBCMA in RPC_EXCEPTIONS

### Gate 5 — Capabilities
- `capabilities.json` includes handoff.*, emar.*, flowsheet, io, assessments entries

### Gate 6 — Module Routes
- `modules.json` clinical module has `^/emar/` and `^/handoff/` patterns

### Gate 7 — pendingFallback Consistency
- All pendingFallback calls in nursing + eMAR return `ok: false`

### Gate 8 — NursingPanel CSRF
- NursingPanel.tsx imports and uses `csrfHeaders()` from `@/lib/csrf`

### Gate 9 — NursingPanel Tabs
- NursingPanel has 6+ sub-tabs including Flowsheet and Handoff

### Gate 10 — Gauntlet
- FAST: 4+ PASS, 0 FAIL
- RC: 15+ PASS, 0 FAIL
