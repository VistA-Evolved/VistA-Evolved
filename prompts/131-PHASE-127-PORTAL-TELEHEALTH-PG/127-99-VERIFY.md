# Phase 127 -- Verify: Portal Telehealth PG Migration

## Verification Steps

1. Confirm portal telehealth data persists across API restarts
2. Verify PG-backed telehealth session store operations (CRUD)
3. Check RLS enforcement for telehealth tables
4. Run existing telehealth verification scripts

## Acceptance Criteria
- [ ] Telehealth room data survives API restart
- [ ] PG migration includes telehealth tables with tenant_id
- [ ] RLS policies applied to telehealth tables
- [ ] No regressions in telehealth endpoint functionality
