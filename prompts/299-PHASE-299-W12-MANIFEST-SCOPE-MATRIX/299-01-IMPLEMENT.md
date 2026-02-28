# Phase 299 -- W12-P1 IMPLEMENT
## Manifest + Scope Matrix + OSS Reuse ADRs

### Goal
Lock the exact wave plan into /prompts and prevent drift. Decide OSS integrations.

### Steps
1. Compute BASE_PHASE from /prompts ordering prefixes (max 298 + 1 = 299)
2. Create /prompts/WAVE_12_MANIFEST.md with resolved phase IDs 299-308
3. Create writeback scope matrix: docs/clinical/writeback-scope-matrix.md
4. Create OSS reuse ADRs:
   - docs/adrs/ADR-PACS-viewer.md
   - docs/adrs/ADR-DICOM-store.md
   - docs/adrs/ADR-telehealth-providers.md
   - docs/adrs/ADR-HL7-ops.md
5. Create evidence: evidence/wave-12/299-manifest/
6. Create verification script: scripts/verify-phase299-manifest.ps1

### Files Touched
- prompts/WAVE_12_MANIFEST.md
- prompts/299-PHASE-299-W12-MANIFEST-SCOPE-MATRIX/299-01-IMPLEMENT.md
- prompts/299-PHASE-299-W12-MANIFEST-SCOPE-MATRIX/299-99-VERIFY.md
- prompts/299-PHASE-299-W12-MANIFEST-SCOPE-MATRIX/299-NOTES.md
- docs/clinical/writeback-scope-matrix.md
- docs/adrs/ADR-PACS-viewer.md
- docs/adrs/ADR-DICOM-store.md
- docs/adrs/ADR-telehealth-providers.md
- docs/adrs/ADR-HL7-ops.md
- scripts/verify-phase299-manifest.ps1
