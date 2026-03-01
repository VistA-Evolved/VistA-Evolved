# Phase 368 — W19-P7: VERIFY

## Verification Steps

1. Attempt unauthorized dataset access — verify denied.
2. Authorized access — verify allowed and audited.
3. Column masking — verify sensitive fields hidden for non-admin.
4. Export with reason — verify audit log entry.

## Acceptance Criteria

- [ ] Unauthorized access returns 403
- [ ] Authorized access returns data and creates audit entry
- [ ] Column masking works per role
- [ ] Export audit log populated
