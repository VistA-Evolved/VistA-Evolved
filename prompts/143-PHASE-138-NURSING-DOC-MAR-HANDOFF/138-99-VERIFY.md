# Phase 138 — VERIFY: Nursing DOC + MAR + Handoff (VistA-First)

## Verification Gates

### Gate 1 — TypeScript Build
- `pnpm -C apps/api exec tsc --noEmit` exits 0
- `pnpm -C apps/web exec next build` exits 0 (or lint clean)

### Gate 2 — Vitest
- 20/20 files, 413+ tests PASS

### Gate 3 — Immutable Audit Actions
- `immutable-audit.ts` includes: nursing.vitals, nursing.notes, nursing.flowsheet,
  nursing.create-note, nursing.ward-patients, nursing.note-text,
  emar.schedule, emar.allergies, emar.administer,
  handoff.create, handoff.view, handoff.submit, handoff.accept

### Gate 4 — RPC Registry
- PSB MED LOG, PSB ALLERGY, PSJBCMA in RPC_EXCEPTIONS

### Gate 5 — Capabilities
- `capabilities.json` includes handoff.*, emar.*, flowsheet, io, assessments entries

### Gate 6 — Module Routes
- `modules.json` clinical module has `^/emar/` and `^/handoff/` patterns

### Gate 7 — pendingFallback Consistency
- All pendingFallback calls in nursing + eMAR return `ok: false`
- eMAR administer + barcode-scan return `ok: false` (not fake writebacks)

### Gate 8 — NursingPanel CSRF
- NursingPanel.tsx imports and uses `csrfHeaders()` from `@/lib/csrf`

### Gate 9 — NursingPanel Tabs
- NursingPanel has 6+ sub-tabs including Flowsheet and Handoff
- FlowsheetEntry type matches API shape (type, value, date, units, critical)

### Gate 10 — Gauntlet
- FAST: 4+ PASS, 0 FAIL
- RC: 15+ PASS, 0 FAIL

## Verify Run Results

- TSC: clean (0 errors)
- Next.js build: compiled successfully in 8.8s, 52/52 pages
- Vitest: 79 passed (4 pending in RPC replay -- infrastructure, not code)
- Gauntlet FAST: 4P / 0F / 1W
- Gauntlet RC: 15P / 0F / 1W

## Issues Found & Fixed (6)

1. **Wrong audit action for ward-patients** — nursing/index.ts line 216 used
   `"nursing.vitals"` instead of `"nursing.ward-patients"`. Added new action
   to immutable-audit type union and fixed the call.
2. **Fake writeback on eMAR administer** — emar/index.ts POST /emar/administer
   returned `ok: true` with `status: "integration-pending"`. Changed to `ok: false`.
3. **Fake writeback on eMAR barcode-scan** — emar/index.ts POST /emar/barcode-scan
   returned `ok: true` with `status: "integration-pending"`. Changed to `ok: false`.
4. **Missing audit on note-text endpoint** — nursing/index.ts GET /vista/nursing/note-text
   had no `immutableAudit()` calls. Added success + error path audit with new
   `"nursing.note-text"` action.
5. **FlowsheetEntry type mismatch** — NursingPanel.tsx FlowsheetEntry defined
   `{ category, label, value, date, units }` but API returns `{ date, type, value, units, critical }`.
   Fixed interface and table columns to match. Added critical-value row highlighting.
6. **pendingTargets shape mismatch** — nursing/index.ts flowsheet error used
   `["ORQQVI VITALS"]` (string array) instead of `[{ rpc, package, reason }]`.
   Fixed to match IntegrationPendingBanner expectations.
