# Phase 173-178 -- Verify: Production Convergence

## Verification Steps

1. Verify all production convergence items from Phase 173-178 are implemented
2. Check that runtime mode enforcement works (rc/prod require PG + OIDC)
3. Confirm swap boundary validates instance compatibility
4. Run `scripts/verify-latest.ps1` for overall health
5. Verify provisioning status endpoint returns correct routine health

## Acceptance Criteria

- [ ] All production-mode runtime guards enforce PG requirement
- [ ] OIDC mandatory in rc/prod mode
- [ ] Cookie secure flags aligned with PLATFORM_RUNTIME_MODE
- [ ] VistA routine provisioning status endpoint operational
- [ ] Data plane posture gates pass for dev mode
