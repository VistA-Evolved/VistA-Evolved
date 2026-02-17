# Phase 20 — VistA-First Grounding — IMPLEMENT

## User Request
Enforce VistA-first binding across the entire platform. Produce grounding
documentation and enforcement prompts ensuring every clinical screen, integration
point, and reporting surface is traceable to VistA packages, RPCs, FileMan files,
and established interop standards (HL7/HLO, DICOM/IHE, FHIR).

## Hard Requirements (FAIL if violated)
- R1: VistA-first binding — every clinical action maps to VistA package + RPC(s)
- R2: Interop grounding — HL7/HLO model (files 771-779), not invented monitors
- R3: Imaging grounding — metadata in VistA, binaries in archive, OHIF/Orthanc
- R4: Reporting grounding — Health Summary + FileMan first, platform ops separate
- R5: FHIR posture — inventory WorldVistA FHIR; dev/test only unless governed
- R6: Octo SQL posture — read-only analytics overlay with PHI governance
- R7: AI posture — governed AI Gateway, no autonomous clinical decisions
- R8: Compliance — no PHI leaks, audit everything, imaging is high-risk
- R9: Preserve Phase 10-19 verifiers

## Implementation Steps
1. Create `docs/vista-capability-matrix.md` — full Screen→Package→RPC→File mapping
2. Create `docs/interop-grounding.md` — HL7/HLO architecture & monitor mapping
3. Create `docs/imaging-grounding.md` — VistA Imaging model & open-source stack
4. Create `docs/reporting-grounding.md` — clinical vs platform ops separation
5. Create `docs/fhir-posture.md` — WorldVistA FHIR inventory & production posture
6. Create `docs/octo-analytics-plan.md` — read-only analytics with PHI governance
7. Create `docs/ai-gateway-plan.md` — AI Gateway architecture & VistA integration
8. Create Phase 18/19 VistA-first enforcement prompts (4 files)
9. Minimal code corrections (interop, reporting, imaging UI labels)
10. Fix any remaining prompts ordering issues

## Verification Steps
- All 7 docs exist with required content
- Enforcement prompts created for Phase 18 and 19
- verify-latest.ps1 still passes (no regressions)
- Commit to main with SHA

## Files Touched
- `docs/vista-capability-matrix.md` (NEW)
- `docs/interop-grounding.md` (NEW)
- `docs/imaging-grounding.md` (NEW)
- `docs/reporting-grounding.md` (NEW)
- `docs/fhir-posture.md` (NEW)
- `docs/octo-analytics-plan.md` (NEW)
- `docs/ai-gateway-plan.md` (NEW)
- `prompts/20-PHASE-18-INTEROP-IMAGING/20-02-Phase18B-VistaFirst-Enforcement-IMPLEMENT.md` (NEW)
- `prompts/20-PHASE-18-INTEROP-IMAGING/20-90-Phase18B-VistaFirst-Enforcement-VERIFY.md` (NEW)
- `prompts/21-PHASE-19-REPORTING-GOVERNANCE/21-02-Phase19B-VistaFirst-Enforcement-IMPLEMENT.md` (NEW)
- `prompts/21-PHASE-19-REPORTING-GOVERNANCE/21-90-Phase19B-VistaFirst-Enforcement-VERIFY.md` (NEW)
- `prompts/22-PHASE-20-VISTA-FIRST-GROUNDING/22-01-Phase20-VistaFirst-Grounding-IMPLEMENT.md` (THIS FILE)
- `prompts/22-PHASE-20-VISTA-FIRST-GROUNDING/22-99-Phase20-VistaFirst-Grounding-VERIFY.md` (NEW)
- `ops/summary.md` (EDIT)
- `ops/notion-update.json` (EDIT)
