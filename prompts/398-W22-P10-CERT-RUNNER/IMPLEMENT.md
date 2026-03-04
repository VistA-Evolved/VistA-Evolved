# 398-01-IMPLEMENT -- Specialty Certification Runner (W22-P10)

## User Request

Implement Phase 398: Specialty Certification Runner as the Wave 22 capstone verification phase.

## Implementation Steps

1. Create `scripts/verify-wave22-specialty.ps1` -- Certification runner with 90+ gates covering all W22 phases
2. Update `scripts/verify-latest.ps1` -- Delegate to wave22 runner
3. Create prompt folder `398-W22-P10-CERT-RUNNER/` with IMPLEMENT, VERIFY, NOTES
4. Create evidence folders for phases that lacked them

## Verification Gates (14 sections)

- Section 1: P1 Manifest + 4 ADRs + specialty coverage map (6 gates)
- Section 2: P2 Content Pack Framework -- files + types (7 gates)
- Section 3: P3 Inpatient Core -- files + types (7 gates)
- Section 4: P4 Pharmacy Deep -- files + types (7 gates)
- Section 5: P5 Lab Deep -- files + types (7 gates)
- Section 6: P6 Imaging/Radiology Deep -- files + types (7 gates)
- Section 7: P7 CDS Hooks + SMART -- files + types + CQF env (8 gates)
- Section 8: P8 Clinical Reasoning -- files + types (8 gates)
- Section 9: P9 Localization + Theming -- files + types (9 gates)
- Section 10: Route Registration (8 gates)
- Section 11: AUTH_RULES (8 gates)
- Section 12: Store Policy (21 gates)
- Section 13: TypeScript compilation (1 gate)
- Section 14: Prompt folders (10 gates)

## Files Touched

- `scripts/verify-wave22-specialty.ps1` (new)
- `scripts/verify-latest.ps1` (modified)
- `prompts/398-W22-P10-CERT-RUNNER/398-01-IMPLEMENT.md` (new)
- `prompts/398-W22-P10-CERT-RUNNER/398-99-VERIFY.md` (new)
- `prompts/398-W22-P10-CERT-RUNNER/398-NOTES.md` (new)
