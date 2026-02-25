# Phase 135 — Tenant Onboarding + Module Packaging (VERIFY)

## Gates

1. Tenant provisioning CLI creates tenant + seeds modules + audit trail
2. enable-module.mjs / disable-module.mjs toggle modules with audit
3. API: disabled module route returns 403 with MODULE_DISABLED
4. API: /api/tenant/entitlements returns current entitlements (session auth)
5. UI: deep-link to disabled module shows "Module Not Enabled" page
6. UI: admin sidebar hides links for disabled modules
7. CI tests pass: enforcement + provisioning round-trip
8. Runbook docs/runbooks/tenant-onboarding.md exists
9. TypeScript clean: api, web, portal
10. Gauntlet FAST: all pass, no WARN
11. Gauntlet RC: all pass
