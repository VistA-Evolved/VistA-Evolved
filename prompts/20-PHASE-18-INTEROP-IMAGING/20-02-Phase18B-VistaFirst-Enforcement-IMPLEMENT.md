# Phase 18B — VistA-First Enforcement for Interop & Imaging (IMPLEMENT)

> **Created by Phase 20 — VistA-First Grounding**
> This sub-phase retrofits Phase 18 with explicit VistA-first bindings.

---

## Context

Phase 18 built the **Interop Monitor** and **Imaging Integration** as platform
infrastructure. Both are functionally correct, but their documentation and code
comments need explicit VistA file bindings so future development always starts
from VistA's data model.

---

## Requirements

### R1: Interop Monitor → VistA HL7/HLO File Binding

- [ ] `apps/api/src/routes/interop.ts` header comment must reference VistA HL7 files (#870, #772, #773, #776, #779.x) and state that the platform registry is a **connector catalog**, not a replacement for VistA's HL7 engine
- [ ] `apps/api/src/config/integration-registry.ts` must include a comment block establishing that `hl7v2` type integrations will eventually read from VistA file #870 (HL LOGICAL LINK) for ground truth

### R2: Imaging Service → VistA Imaging File Binding

- [ ] `apps/api/src/services/imaging-service.ts` header comment must reference VistA Imaging files (#2005, #2005.1, #2005.2) and state that metadata flows from VistA, not from external PACS
- [ ] All imaging RPCs (`MAG4 REMOTE PROCEDURE`, `RA DETAILED REPORT`, `MAG4 PAT GET IMAGES`, `MAG4 IMAGE INFO`) must be listed with their FileMan file targets

### R3: Grounding Docs Referenced

- [ ] Top of `interop.ts`: `See: docs/interop-grounding.md`
- [ ] Top of `imaging-service.ts`: `See: docs/imaging-grounding.md`
- [ ] Both files in `docs/` must be committed before this sub-phase

---

## Verification

- Run `scripts/verify-latest.ps1`
- Confirm header comments contain VistA file references
- Confirm grounding docs exist and are referenced

---

## Files to Touch

- `apps/api/src/routes/interop.ts` (header comment update)
- `apps/api/src/config/integration-registry.ts` (add VistA binding comment)
- `apps/api/src/services/imaging-service.ts` (header comment update)
