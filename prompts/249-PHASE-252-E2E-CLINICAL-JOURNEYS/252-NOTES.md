# Phase 252 -- NOTES -- E2E Clinical Journeys

## Design Decisions

### Evidence-Mode vs Run-Mode
The clinical journey evidence spec captures screenshots and network logs at each
step. This is designed for pilot go-live readiness evidence -- not for CI speed.

### Reuse over Reinvention
- `loginViaUI` from Phase 5's auth helper
- `setupConsoleGate` from Phase 74's console audit
- `NetworkEvidence` from Phase 74's network helper
- No new Playwright plugins or custom reporters needed

### Journey Structure
Journeys are data-driven via journey-config.ts. This allows:
- Adding new journeys without modifying the spec runner
- Sharing journey definitions across E2E specs and documentation
- Machine-readable journey metadata for pilot checklists

### Console Error Budget
The error gate allows up to 2 non-critical errors (hydration warnings,
favicon 404s). Zero-error is the goal but pragmatic tolerance avoids
flaky failures from Next.js development-mode warnings.

### FHIR Smoke is API-Only
The FHIR journey uses Playwright's `request` fixture (HTTP client) rather
than browser navigation. FHIR endpoints are consumed by external apps (EHR
connectors, SMART apps), not by the web UI directly.
