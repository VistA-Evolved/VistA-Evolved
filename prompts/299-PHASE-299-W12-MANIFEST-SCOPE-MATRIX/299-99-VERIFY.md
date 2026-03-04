# Phase 299 -- W12-P1 VERIFY

## Gates

1. WAVE_12_MANIFEST.md exists and lists 10 phases (299-308)
2. Writeback scope matrix exists with all 6 domains
3. ADR-PACS-viewer.md exists
4. ADR-DICOM-store.md exists
5. ADR-telehealth-providers.md exists
6. ADR-HL7-ops.md exists
7. Scope matrix references existing route files
8. Manifest dependencies are acyclic
9. Evidence directory has prompts-scan.txt and manifest.txt
10. No PHI in any created file

## Run

```powershell
scripts/verify-phase299-manifest.ps1
```
