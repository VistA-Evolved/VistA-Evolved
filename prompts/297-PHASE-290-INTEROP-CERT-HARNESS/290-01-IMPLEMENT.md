# Phase 290 -- Interop Certification Harness (IMPLEMENT)

## Goal
Create a structured interop certification harness that validates FHIR R4
conformance, SMART-on-FHIR readiness, and HL7v2 message pack correctness
against formal test assertions.

## Implementation Steps

1. Create `tests/interop/` directory structure:
   - `fhir-conformance.mjs` -- FHIR R4 CapabilityStatement + resource validation
   - `smart-readiness.mjs` -- SMART-on-FHIR launch sequence checks
   - `hl7-pack-suite.mjs` -- HL7v2 message pack validation against all registered packs
   - `run-interop-suite.ps1` -- Orchestrator

2. Create `tests/interop/assertions/` with reusable assertion helpers

3. Create `docs/runbooks/interop-certification.md`

4. Create verifier + evidence

## Files Touched
- `tests/interop/fhir-conformance.mjs` (NEW)
- `tests/interop/smart-readiness.mjs` (NEW)
- `tests/interop/hl7-pack-suite.mjs` (NEW)
- `tests/interop/assertions/fhir-assertions.mjs` (NEW)
- `tests/interop/run-interop-suite.ps1` (NEW)
- `docs/runbooks/interop-certification.md` (NEW)
- `scripts/verify-phase290-interop-cert.ps1` (NEW)
