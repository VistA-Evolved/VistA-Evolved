# Phase 27 VERIFY — Portal Core End-to-End

## User Request

Verify Phase 27 portal core implementation with:

1. Regression — verify-latest must be green
2. Portal E2E (Playwright): login, view record sections, export PDF, share lifecycle, messaging with attachments, proxy/sensitivity
3. Security tests: secret scan, PHI in logs, rate limit trigger
4. Contract drift check: portal-contract-v1.yaml vs actual routes

## Implementation Steps

1. Write `scripts/verify-phase1-to-phase27-portal-core.ps1` — full verifier
2. Write `apps/portal/e2e/portal-phase27.spec.ts` — E2E Playwright tests (API-level, no browser needed)
3. Write contract drift check in verifier (match YAML modules to actual API routes)
4. Update `scripts/verify-latest.ps1` to delegate to Phase 27
5. Run verifier, fix any failures, re-run until clean
6. Commit

## Verification Steps

- `scripts/verify-latest.ps1` exits 0
- All E2E tests pass
- Contract drift = 0 mismatches
- Secret scan clean
- API + portal + web all build

## Files Touched

- `scripts/verify-phase1-to-phase27-portal-core.ps1` (new)
- `scripts/verify-latest.ps1` (modified)
- `apps/portal/e2e/portal-phase27.spec.ts` (new)
- `prompts/29-PHASE-27-PORTAL-CORE/29-99-portal-core-VERIFY.md` (this file)
- `ops/summary.md` (modified)
- `ops/notion-update.json` (modified)
