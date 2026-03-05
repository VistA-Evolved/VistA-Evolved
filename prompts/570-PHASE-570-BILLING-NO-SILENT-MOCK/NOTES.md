# Phase 570 Notes

## Summary

Billing must never silently run as mock outside dev/test.

## Key Finding

Requirements 1 and 3 are already fully implemented (Phase 284).
Requirement 2 has a minor gap: `/billing/health` doesn't surface
warnings or runtimeMode at the top level of the response envelope.

## What Exists (Phase 284)

- `initBillingProvider()` fails fast with clear error in rc/prod/demo/pilot
- Mock allowed in dev/test with loud ASCII-art warning
- `BillingHealthStatus` type has `provider`, `configuredForProduction`, `details`
- `docs/runbooks/billing-provider-readiness.md` documents all rules

## What This Phase Adds

- Export `isMockBillingForbidden()` for route-level use
- Enrich health endpoints with `warnings[]`, `runtimeMode`, `mockForbiddenInCurrentMode`
- Add explicit "Dev vs Demo vs Prod" decision table to runbook
