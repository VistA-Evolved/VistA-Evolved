# Phase 132 -- Verify: CSRF Synchronizer Token

## Verification Steps

1. Verify CSRF secret is generated at session creation and stored in DB
2. Confirm login response includes `csrfToken` field in JSON body
3. Verify `GET /auth/csrf-token` returns fresh token
4. Confirm `X-CSRF-Token` header is validated on mutation requests
5. Verify no `ehr_csrf` cookie is set (double-submit cookie removed)

## Acceptance Criteria

- [ ] CSRF uses session-bound synchronizer token, NOT double-submit cookie
- [ ] Login response body contains csrfToken field
- [ ] Mutation requests without X-CSRF-Token header are rejected
- [ ] Portal routes validate CSRF via `validateCsrf(req, reply, session.csrfSecret)`
