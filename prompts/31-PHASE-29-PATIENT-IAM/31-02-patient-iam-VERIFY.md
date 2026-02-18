# Phase 29 VERIFY -- Portal IAM + Proxy Workflows + Access Logs

## Gates

- G29-0: Phase 28 regression green; prompts contiguous; TSC clean
- G29-1: Auth -- lockout, password hashing, MFA scaffold, dev seed
- G29-2: Sessions -- device list, revoke, session TTL, cookie config
- G29-3: Proxy -- invitation CRUD, policy enforcement, accept/decline, audit
- G29-4: Access logs -- PHI sanitization, pagination, event types, caps
- G29-5: Security -- CSRF, rate limits, no console.log, no credential leaks
- G29-6: API index registration (portalIamRoutes + seedDevUsers)
- G29-7: Portal UI pages (Account, Proxy, Activity) with credentials:include
- G29-8: Route coverage (~22 endpoints verified)
- G29-9: Documentation (security doc, runbook, ops artifacts, VERIFY prompt)

## Script

```powershell
powershell -ExecutionPolicy Bypass -File scripts\verify-phase1-to-phase29.ps1 -SkipPlaywright -SkipE2E
```

## Result

See `docs/runbooks/phase29-verify-report.md` for full output.
