# Phase 66 --- Verification (OS v3)

## Gates

### Gate 1 --- Sanity
- API typecheck clean (0 new errors)
- verify-latest.ps1 passes

### Gate 2 --- Feature Integrity
- IdentityProvider interface exists with authenticate/callback/logout
- OIDC IdP implements IdentityProvider
- SAML broker IdP implements IdentityProvider
- VistA binding posture documented with pendingTargets
- IdP registry resolves providers by type
- OIDC callback route exchanges code for session
- CSRF protection on auth endpoints

### Gate 3 --- Security
- No tokens in localStorage (cookies only)
- httpOnly + secure + sameSite on session cookies
- CSRF double-submit pattern active
- Rate limits on auth endpoints
- No secrets logged in audit events
- Tenant isolation: sessions scoped to tenant

### Gate 4 --- Negative Tests
- Invalid OIDC state rejected
- Missing callback code returns error
- Expired/tampered JWT rejected
- CSRF violation returns 403
- Patient role cannot access /admin routes
- TenantA session cannot read TenantB data

### Gate 5 --- Registry
- capabilities.json has IAM capabilities
- IdP types registered in idp/index.ts
- Auth rules updated for new routes

### Gate 6 --- Regression
- Phase 65 implement verifier still passes
- Phase 64 verifier still passes
- TSC clean
