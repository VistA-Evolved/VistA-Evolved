# Phase 315 — Compliance Evidence Mapping (W13-P7)

## Objective

Map each regulatory requirement (HIPAA, DPA_PH, DPA_GH) to the specific
code artifact, config file, or documentation that implements it. Expose
the matrix via REST endpoints for runtime compliance queries.

## Implementation Steps

1. Create `apps/api/src/services/compliance-matrix.ts`:
   - Types: ComplianceRequirement, ComplianceEvidence, ComplianceMatrix
   - 12 HIPAA requirements mapped to implementation artifacts
   - 6 DPA_PH requirements mapped
   - 5 DPA_GH requirements mapped
   - Summary and filtering functions
2. Create `apps/api/src/routes/compliance-routes.ts` — 7 endpoints
3. Create `docs/compliance/compliance-evidence-map.md` — human-readable matrix
4. Create prompts, evidence, verifier

## Files Touched

- `apps/api/src/services/compliance-matrix.ts` (new)
- `apps/api/src/routes/compliance-routes.ts` (new)
- `docs/compliance/compliance-evidence-map.md` (new)

## Verification

See `315-99-VERIFY.md`
