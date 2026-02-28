# Phase 177 -- Verify: Durability Audit + Restart Resilience

## Verification Steps
- All Map stores classified in store-policy.ts, restart test confirms durable data survives, no unregistered stores

## Acceptance Criteria
- [ ] Implementation complete per Wave 1 playbook
- [ ] pnpm -C apps/api build passes
- [ ] No regressions in existing tests