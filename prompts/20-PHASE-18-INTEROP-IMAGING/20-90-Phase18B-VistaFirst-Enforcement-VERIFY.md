# Phase 18B — VistA-First Enforcement for Interop & Imaging (VERIFY)

> **Created by Phase 20 — VistA-First Grounding**

---

## Checks

### Interop VistA Binding
- [ ] `apps/api/src/routes/interop.ts` header references HL7 files #870, #772, #773, #776
- [ ] `apps/api/src/config/integration-registry.ts` has VistA binding comment for `hl7v2` type
- [ ] `docs/interop-grounding.md` exists and is non-empty

### Imaging VistA Binding
- [ ] `apps/api/src/services/imaging-service.ts` header references IMAGE #2005, #2005.1, #2005.2
- [ ] Imaging RPCs listed: `MAG4 REMOTE PROCEDURE`, `RA DETAILED REPORT`, `MAG4 PAT GET IMAGES`, `MAG4 IMAGE INFO`
- [ ] `docs/imaging-grounding.md` exists and is non-empty

### Doc References
- [ ] `interop.ts` contains `docs/interop-grounding.md`
- [ ] `imaging-service.ts` contains `docs/imaging-grounding.md`

### Regression
- [ ] `scripts/verify-latest.ps1` passes (no regressions)
