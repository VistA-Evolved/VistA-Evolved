# Phase 74 — Reality Verification Pack v2 (E2E Evidence + Click Audit + Tripwires)

## User Request

Make it impossible for verification to pass if the UI is broken, dead-clicking,
or returning ok:true without real effects.

## Implementation Steps

### A. Enhanced Click Audit Suite (`apps/web/e2e/click-audit-v2.spec.ts`)

- Extend Phase 72 click-audit with portal basics, scheduling, messaging
- Capture network requests per click as evidence
- Write network evidence JSON to artifacts on completion
- Add portal smoke route coverage (dashboard, appointments, messages)
- Every visible button/tab must produce: navigation, modal, network request,
  state change, pending label, or disabled-with-tooltip -- else FAIL

### B. No Fake Success Enforcement (`apps/api/src/middleware/no-fake-success.ts`)

- Enhance existing Phase 72 middleware with stricter classification
- Add `reportViolationsForVerifier()` export: returns structured violations
  suitable for automated gate checking
- Wire `/admin/fake-success-audit` endpoint returning categorized violations
  (critical, warning, exempt) for the verifier script to consume

### C. Network Evidence Capture (`apps/web/e2e/helpers/network-evidence.ts`)

- Helper that attaches to page, records all API requests + responses
- Writes `artifacts/verify/phase74/e2e/network.json` with:
  - url, method, status, timing, requestSize, responseSize
- Used by click-audit-v2 automatically

### D. Tripwire Proof (`tests/tripwire/`)

- `tripwire-dead-click.test.ts`: programmatically seeds a dead-click
  (button with no handler), runs audit logic, confirms it FAILS, then
  removes the seed and confirms PASS
- `tripwire-fake-success.test.ts`: seeds an ok:true response with no
  effectProof, runs middleware validation logic, confirms it FAILS, then
  removes the seed and confirms PASS
- These are unit-level tests (no browser needed) that prove the gates work

### E. Verifier (`scripts/verify-phase74-reality-v2.ps1`)

- 30+ gates covering all deliverables
- TSC clean on api + web
- Structural checks on all new files
- verify-latest.ps1 updated

## Verification Steps

- `scripts/verify-phase74-reality-v2.ps1 -SkipDocker` passes all gates
- TSC clean on apps/api and apps/web
- Tripwire tests prove bidirectional detection (seed fail -> remove -> pass)
- Network evidence helper writes valid JSON structure

## Files Touched

### New

- `apps/web/e2e/click-audit-v2.spec.ts`
- `apps/web/e2e/helpers/network-evidence.ts`
- `tests/tripwire/tripwire-dead-click.test.ts`
- `tests/tripwire/tripwire-fake-success.test.ts`
- `scripts/verify-phase74-reality-v2.ps1`
- `prompts/79-PHASE-74-REALITY-VERIFIER-V2/79-01-IMPLEMENT.md`
- `prompts/79-PHASE-74-REALITY-VERIFIER-V2/79-99-VERIFY.md`

### Modified

- `apps/api/src/middleware/no-fake-success.ts` (add reportViolationsForVerifier)
- `apps/api/src/index.ts` (add /admin/fake-success-audit endpoint)
- `scripts/verify-latest.ps1` (point to Phase 74)
