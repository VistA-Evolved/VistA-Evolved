# Phase 581 — W42-P10: Integration-Pending Features (Phase 5)

> Wave 42: Production Remediation | Position 10 of 15
> Depends on: Phase 578-580 (stub wiring), Phase 573 (RPC pool)

---

## Context

Wave 42 production-remediation prompt. Use this section to capture execution context, dependencies, and prerequisites before changing code.

## Implementation Steps

1. Execute the objective and task sections below in order.
2. Keep changes deterministic and minimal.
3. Record any deviations from the stated approach in Decisions.

## Files Changed

List the source files, configs, scripts, docs, and tests changed while executing this prompt.

## Decisions

Record design choices, trade-offs, or scope trims made during execution.

## Evidence Captured

List the commands, runtime checks, artifacts, and logs that prove the work is complete.

---

## Objective

Implement nursing, eMAR, inpatient, clinical procedures, and order checks. Wire routes that CAN work with existing RPCs; mark only truly unavailable routes as `integration-pending` with explicit `vistaGrounding` metadata.

---

## 5A: Nursing

**What to build:**

- Flowsheet via ORQQVI VITALS (already working) + nursing assessment template
- I&O (Intake & Output) via TIU CREATE RECORD with I&O template
- MAR via ORWPS ACTIVE + PSB MED LOG (PSB not in sandbox — mark integration-pending)
- Nursing tasks via TIU DOCUMENTS BY CONTEXT (filter nursing document class)
- Critical thresholds via GMRC notification RPCs (if available)

**Action:** Wire flowsheet, tasks, notes via TIU. Mark PSB-dependent routes as `integration-pending` with `vistaGrounding: { targetRpc: 'PSB MED LOG', targetPackage: 'PSB' }`.

---

## 5B: eMAR/BCMA

**What to build:**

- Med schedule from ORWPS ACTIVE (already working)
- Allergy check from ORQQAL LIST (already working)
- Administration history from ORWPS DETAIL
- Barcode scan validation (client-side NDC/UPC check + med lookup)
- PSB MED LOG for administration recording (not in sandbox)

**Action:** Wire schedule, allergy check, history. Implement client-side barcode validation. Mark PSB MED LOG as `integration-pending` with `vistaGrounding`.

---

## 5C: Inpatient ADT Writes

**What to build:**

- Census from ORQPT WARDS + ORQPT WARD PATIENTS (already working)
- Bedboard visualization (UI only, data from above RPCs)
- ADMIT/TRANSFER/DISCHARGE writes via DGPM\* RPCs (not in sandbox)

**Action:** Census and bedboard implementable NOW. Mark ADT writes as `integration-pending` with `vistaGrounding: { targetRpc: 'DGPM*', vistaFiles: ['^DGPM'] }`.

---

## 5D: Clinical Procedures

**What to build:**

- CP/MD results from ORQQCN LIST/DETAIL (consult RPCs, in registry)
- TIU CLINPROC document class
- Medicine package results (MD CLIO, MD TMD\* — may not be standard)

**Action:** Wire ORQQCN LIST and DETAIL. Mark MD package RPCs as `integration-pending` if not available.

---

## 5E: Order Checks

**What to build:**

- ORWDXC ACCEPT, ORWDXC DISPLAY, ORWDXC SAVECHK for order check evaluation
- Order check types, severity, categories

**Action:** Wire ORWDXC RPCs. They may return empty in sandbox without drug interaction data; wiring is correct for production.

---

## Files to Create/Modify

- `apps/api/src/routes/nursing.ts` or equivalent — Nursing routes
- `apps/api/src/routes/emar/index.ts` — eMAR routes
- `apps/api/src/routes/inpatient/` or `bed-management.ts` — Census, bedboard, ADT
- `apps/api/src/routes/clinical-procedures/index.ts` — CP routes
- `apps/api/src/routes/orders.ts` — Order check integration
- `apps/api/src/vista/rpcRegistry.ts` — Add any new RPCs

---

## Key Patterns to Follow

1. **integration-pending response**: `{ ok: false, status: 'integration-pending', vistaGrounding: { targetRpc, targetPackage, vistaFiles, migrationPath } }`
2. **No silent no-ops**: Every clickable element must work or show integration-pending (AGENTS.md rule 4).
3. **vistaGrounding**: Provide exact RPC names, VistA files, and migration path for production cutover.

---

## Acceptance Criteria

- [ ] Nursing flowsheet, tasks, notes via TIU work
- [ ] eMAR schedule, allergy, history work; PSB MED LOG marked integration-pending
- [ ] Census and bedboard work; ADT writes marked integration-pending
- [ ] ORQQCN LIST/DETAIL wired; MD package marked integration-pending if unavailable
- [ ] ORWDXC RPCs wired
- [ ] All integration-pending routes have vistaGrounding metadata
