# Phase 388 — W21-P11 Certification Runner — NOTES

## Decisions
- Script covers all 10 implementation phases + cross-cutting wiring + prompt/evidence folders
- Uses file existence + content grep — no runtime compilation or Docker dependency
- `-SkipDocker` flag allows CI/offline execution
- PowerShell 5.1 compatible: nested `Join-Path` calls (PS 5.1 does not support multi-argument form)

## Bug Fixes During Development
1. **`Join-Path` multi-arg**: PS 5.1 does not support `Join-Path $a "b" "c"` → replaced with nested `Join-Path (Join-Path $a "b") "c"`
2. **Root path**: `Split-Path -Parent (Split-Path -Parent $PSScriptRoot)` went one level too high → fixed to `Split-Path -Parent $PSScriptRoot`
3. **Store name**: Script checked `managed-devices` but actual store ID is `device-registry`
4. **Prompt folder suffix**: P1 folder is `378-W21-P1-MANIFEST-COVERAGE` not `378-W21-P1-MANIFEST`

## Coverage
| Section | Phase | Gates |
|---------|-------|-------|
| S1 | P1 Manifest + ADRs | 6 |
| S2 | P2 Edge Gateway | 5 |
| S3 | P3 Device Registry | 3 |
| S4 | P4 HL7v2 Ingest | 5 |
| S5 | P5 ASTM/POCT1-A | 7 |
| S6 | P6 SDC Ingest | 4 |
| S7 | P7 Alarms | 3 |
| S8 | P8 Infusion/BCMA | 4 |
| S9 | P9 Imaging Modality | 4 |
| S10 | P10 Normalization | 6 |
| S11 | Cross-cutting | 20 |
| S12 | Prompt + Evidence | 20 |
| **Total** | | **93** |
