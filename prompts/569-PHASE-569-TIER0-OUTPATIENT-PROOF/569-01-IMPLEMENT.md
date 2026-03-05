# Phase 569: Tier-0 Outpatient Proof Run -- IMPLEMENT

## User Request

Create a single, repeatable "Tier-0 Proof Run" that a consulting firm or
hospital technical reviewer can run to confirm real end-to-end behavior.
The repo already contains a Clinic Day Simulator runner and QA journey
endpoints -- use them, harden them, and make them the official proof.

## Implementation Steps

1. Add T0_OUTPATIENT journey to `apps/api/src/qa/clinic-day-journeys.ts`
   - Steps: health check, default patient list, vitals, allergies, problems, logout
   - Only outpatient-safe RPCs: ORQPT DEFAULT LIST SOURCE, ORWPT LIST ALL,
     ORQQVI VITALS, ORQQAL LIST, ORQQPL PROBLEM LIST
   - No queue, template, order, or inpatient dependencies

2. Harden `scripts/qa/clinic-day-runner.mjs`
   - Add `--artifact-name` argument for custom output filenames

3. Create `scripts/verify-tier0.ps1` (Windows proof runner)
   - Gate 1: Docker VistA container check
   - Gate 2: API reachability
   - Gate 3: Run T0 journey via clinic-day-runner
   - Gate 4: Artifact integrity verification
   - Timestamped artifacts under artifacts/

4. Create `scripts/verify-tier0.sh` (bash proof runner)
   - Same 4 gates as PowerShell version

5. Add G14 gate to `scripts/verify-rc.ps1` (optional/non-blocking)

6. Update `docs/release/RC_SCOPE.md` with G14 documentation

7. Create `docs/TIER0_PROOF.md` -- full documentation

## Files Touched

- `apps/api/src/qa/clinic-day-journeys.ts` -- added T0_OUTPATIENT journey
- `scripts/qa/clinic-day-runner.mjs` -- added --artifact-name support
- `scripts/verify-tier0.ps1` -- NEW: Windows proof runner
- `scripts/verify-tier0.sh` -- NEW: bash proof runner
- `scripts/verify-rc.ps1` -- added G14 gate
- `docs/release/RC_SCOPE.md` -- documented G14
- `docs/TIER0_PROOF.md` -- NEW: proof documentation
