# Phase 175 -- Verify: Schema + Migration Single Source of Truth

## Verification Steps
- pg-migrate.ts is sole migration entry point, no SQLite schema references in active code, pnpm db:migrate script exists

## Acceptance Criteria
- [ ] Implementation complete per Wave 1 playbook
- [ ] pnpm -C apps/api build passes
- [ ] No regressions in existing tests