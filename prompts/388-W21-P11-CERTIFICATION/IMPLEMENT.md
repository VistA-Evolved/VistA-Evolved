# Phase 388 — W21-P11 Certification Runner — IMPLEMENT

## User Request

Build a push-button certification runner that validates all 10 Wave 21 implementation phases (P1–P10) in a single invocation, with color-coded PASS/FAIL output and a summary exit code.

## Implementation Steps

1. Create `scripts/verify-wave21-devices.ps1` with 12 verification sections:
   - S1: P1 Manifest + 5 ADR files
   - S2: P2 Edge Device Gateway (types / store / routes / sidecar / runbook)
   - S3: P3 Device Registry (types / store / routes)
   - S4: P4 HL7v2 MLLP Ingest (parser / routes / 3 fixtures)
   - S5: P5 ASTM + POCT1-A (parsers / routes / fixture counts)
   - S6: P6 SDC Ingest (routes / sidecar / consumer / Dockerfile)
   - S7: P7 Alarms Pipeline (types / store / routes)
   - S8: P8 Infusion/BCMA Bridge (types / store / routes / Right-6)
   - S9: P9 Imaging Modality (types / store / routes / MPPS auto-link)
   - S10: P10 Normalization (engine / routes / mapping tables / function)
   - S11: Cross-cutting wiring (barrel, register-routes, AUTH_RULES, store-policy)
   - S12: Prompt + Evidence folders for all 10 phases
2. PowerShell 5.1 compatible (nested `Join-Path`, no multi-arg form)
3. `-SkipDocker` parameter for CI environments
4. Exit code 0 only when all gates pass

## Files Touched

- `scripts/verify-wave21-devices.ps1` (new — ~270 lines, 93 gates)

## Verification

- Run `.\scripts\verify-wave21-devices.ps1 -SkipDocker` → 93/93 PASS
