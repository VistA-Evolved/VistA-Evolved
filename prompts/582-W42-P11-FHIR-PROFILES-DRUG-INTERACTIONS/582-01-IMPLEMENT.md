# Phase 582 — W42-P11: FHIR Profiles + Drug Interactions (Phase 7 + 8)

> Wave 42: Production Remediation | Position 11 of 15
> Depends on: Phase 578-580 (stub wiring for data sources), Phase 573 (RPC pool)

---

## Objective

Add 15+ FHIR US Core profile mappers and implement drug interaction checking. Required for ONC certification readiness.

---

## Part A: FHIR US Core Profile Expansion (Phase 7)

**Current:** ~7 profiles. **Required:** ~30+ for ONC.

Each profile needs:
1. A FHIR mapper in `apps/api/src/fhir/mappers/` that transforms VistA data to FHIR R4
2. Registration in the FHIR gateway router
3. Search parameter support (at minimum: `_id`, `patient`, date ranges)

**Profiles to add (prioritized):**

| Profile                 | VistA Data Source                    | Priority |
| ----------------------- | ------------------------------------ | -------- |
| Immunization            | ORQQPX IMMUN LIST                    | HIGH     |
| Procedure               | ORQQCN LIST + TIU DOCUMENTS          | HIGH     |
| DiagnosticReport (Lab)  | ORWLRR INTERIM                       | HIGH     |
| DiagnosticReport (Note)  | TIU DOCUMENTS BY CONTEXT             | HIGH     |
| Practitioner            | ORWPT SELECT                         | HIGH     |
| Medication              | ORWPS ACTIVE                         | HIGH     |
| Coverage                | IBCN INSURANCE QUERY                 | HIGH     |
| Organization            | VistA Institution file               | MEDIUM   |
| Location                | Hospital Location file               | MEDIUM   |
| CarePlan                | TIU notes filtered by plan type      | MEDIUM   |
| CareTeam                | ORQPT TEAM PATIENTS                  | MEDIUM   |
| Goal                    | Problem list goals                   | MEDIUM   |
| Provenance              | Audit trail data                     | MEDIUM   |
| ServiceRequest           | ORWDX orders                         | MEDIUM   |
| RelatedPerson           | DG patient contacts                  | LOW      |

**Files to create/modify:**
- `apps/api/src/fhir/mappers/` — One mapper per profile
- `apps/api/src/fhir/` — Gateway router registration
- `apps/api/src/vista/rpcRegistry.ts` — Ensure RPCs in registry

---

## Part B: Drug Interaction Checking (Phase 8, ONC Criterion a.4)

**Options:**
1. **VistA NDF**: File 50 (DRUG), File 50.6 (DRUG INTERACTION) — probe first
2. **RxNorm + openFDA**: Free fallback
3. **NLM DailyMed**: Drug label interaction sections

**Action:**
1. Probe VistA File 50.6 via new probe routine
2. If populated, use VistA NDF
3. If not, implement RxNorm API + openFDA integration
4. Wire into order check flow (ORWDXC)

**Files to create/modify:**
- `apps/api/src/pharmacy/drug-interactions.ts` — Interaction check service
- `apps/api/src/routes/orders.ts` — Call interaction check before order save
- `services/vista/` — Probe routine for File 50.6 (if needed)

---

## Key Patterns to Follow

1. **FHIR mappers**: Follow existing pattern in `apps/api/src/fhir/mappers/`; return FHIR R4 Resource.
2. **Search params**: Support `patient`, `_id`, date range per profile spec.
3. **Drug interaction**: Return severity, interacting drugs, recommendation; no proprietary code tables (AGENTS.md Phase 40).
4. **VistA-first**: Use VistA NDF when available; fallback to free APIs.

---

## Acceptance Criteria

- [ ] 15+ FHIR US Core profiles implemented with mappers
- [ ] All mappers registered in FHIR gateway
- [ ] Drug interaction checking wired to order flow
- [ ] VistA NDF probed; fallback to RxNorm/openFDA if empty
- [ ] No proprietary drug database code tables bundled
