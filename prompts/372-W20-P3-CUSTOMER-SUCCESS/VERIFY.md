# Phase 372 — W20-P3 VERIFY: Customer Success Tooling

## Verification Steps

1. Confirm service + routes compile (tsc --noEmit)
2. Confirm onboarding workflow creates tenant config
3. Confirm training mode toggle enables synthetic data banner
4. Confirm demo seeder populates synthetic patients/encounters

## Acceptance Criteria

- Tenant onboarding creates config with pack, country, region
- Training mode sets flag + seeds synthetic data
- Demo environment generator produces test-ready state
- All endpoints wired under /customer-success/ (admin only)
