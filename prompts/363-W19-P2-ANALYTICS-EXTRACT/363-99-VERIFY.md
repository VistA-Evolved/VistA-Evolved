# Phase 363 — W19-P2: VERIFY

## Verification Steps

1. Run extract against synthetic data — confirm counts per entity type.
2. Verify tenant isolation — extract for tenant A does not include tenant B data.
3. Verify incremental — second run only processes new/updated records.
4. Confirm PG tables created with tenant_id + RLS.

## Acceptance Criteria

- [ ] Extract runs without error on synthetic data
- [ ] Counts reported per entity type
- [ ] Tenant isolation verified
- [ ] Incremental extract tested (offset-based)
