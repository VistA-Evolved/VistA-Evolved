# Phase 364 — W19-P3: VERIFY

## Verification Steps

1. Run de-id on synthetic dataset — show before/after (synthetic only).
2. Verify denylist scan passes (no known identifier patterns survive).
3. Verify pseudonymization is deterministic within tenant.
4. Verify strict mode removes all direct identifiers.

## Acceptance Criteria

- [ ] De-id produces PHI-free output from synthetic input
- [ ] Denylist scan passes
- [ ] Pseudonymization is tenant-scoped and deterministic
- [ ] Documentation explicitly marks as engineering tool
