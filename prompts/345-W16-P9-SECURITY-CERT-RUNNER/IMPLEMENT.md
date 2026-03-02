# Phase 345 -- W16-P9: Security Certification Runner

## Objective
Create a one-command certification runner that verifies all Wave 16 phases
(337-344) and produces a single PASS/FAIL verdict with evidence.

## Files to Create
- `scripts/verify-wave16-security.ps1` -- PowerShell certification script
- `apps/api/src/posture/security-cert-posture.ts` -- runtime posture endpoint

## Files to Edit
- `scripts/verify-latest.ps1` -- delegate to wave16 verifier
- `apps/api/src/posture/index.ts` -- register security cert posture

## Verification
- `npx tsc --noEmit` from `apps/api` must pass
- Script file must exist and contain all phase gates
