# Phase 148 -- Production VistA Distribution Lane (IMPLEMENT)

> **Placeholder -- implementation deferred to Phase 148.**

## Scope
Close the production deployment blocker trio: RLS default-on, OIDC default-on,
and live payer connector testing. Targets from Phase 145 priority backlog:
Blockers #2, #5, #9.

## Key work
- Enable `PLATFORM_PG_RLS_ENABLED=true` by default in rc/prod runtime modes
- Enable `OIDC_ENABLED=true` by default in production configuration
- Test US clearinghouse connector with sandbox credentials
- Test PhilHealth eClaims connector with test mode
- Update deployment runbook with production checklist

## Constraints
- No CLAIM_SUBMISSION_ENABLED default change (stays false)
- RLS migration is additive (no data loss)
- OIDC fallback to VistA auth must remain for dev/test modes
