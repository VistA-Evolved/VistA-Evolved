# Phase 252 -- E2E Clinical Journeys (Wave 7 P5)

## Objective

Create evidence-mode clinical journey specs that exercise end-to-end workflows
with screenshot capture, network logging, and console error gating for pilot
go-live readiness.

## Implementation Steps

### 1. Journey Configuration (`apps/web/e2e/helpers/journey-config.ts`)

- `JourneyStep` interface: name, route, action, expectations, screenshot flag
- `ClinicalJourney` interface: id, name, domain, steps
- 3 journeys: Chart Review (7 steps), Admin Posture (3 steps), FHIR Smoke (2 steps)

### 2. Evidence Spec (`apps/web/e2e/clinical-journey-evidence.spec.ts`)

- Chart Review: login -> patient search -> cover sheet -> problems -> meds -> notes
- Admin Posture: admin landing -> integrations -> analytics
- FHIR Smoke: metadata CapabilityStatement, SMART discovery, health/ready/version, 401 checks
- Evidence artifacts: screenshots per step, network log JSON, console error gate

### 3. Reuses Existing Infrastructure

- `loginViaUI` from helpers/auth.ts
- `setupConsoleGate` from helpers/auth.ts
- `NetworkEvidence` from helpers/network-evidence.ts
- Playwright config unchanged

## Files Touched

- `apps/web/e2e/helpers/journey-config.ts` -- NEW
- `apps/web/e2e/clinical-journey-evidence.spec.ts` -- NEW
- `scripts/verify-phase252-e2e-journeys.ps1` -- NEW

## Depends On

- Phase 251 (P4) -- API + FHIR Contract Verification
- Existing: Playwright infrastructure, auth helpers, NetworkEvidence

## Verification

Run `scripts/verify-phase252-e2e-journeys.ps1` -- 19 gates, all must PASS.
