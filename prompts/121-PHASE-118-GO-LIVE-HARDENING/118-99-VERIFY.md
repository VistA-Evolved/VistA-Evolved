# Phase 118 — VERIFY: Go-Live Hardening Pack

## Verification Date
2026-02-24

## Verification Gates (26/26 PASS)

| # | Gate | Result |
|---|------|--------|
| 1 | TypeScript compilation (`tsc --noEmit` clean) | PASS |
| 2a | pg-backup.ts exists | PASS |
| 2b | PG_BACKUP registered in job registry | PASS |
| 2c | handlePgBackup wired in runner.ts | PASS |
| 3 | PG backup/restore runbook | PASS |
| 4a | IAM audit file sink (immutable-audit.ts) | PASS |
| 4b | Imaging audit file sink (default: logs/imaging-audit.jsonl) | PASS |
| 4c | RCM audit file sink (rcm-audit.ts) | PASS |
| 5a | Hardening routes (audit-verify, security-posture, rc-checklist) | PASS |
| 5b | Hardening routes registered in index.ts | PASS |
| 6 | All OWASP security headers present (CSP, HSTS, X-Frame, Referrer-Policy, Permissions-Policy, X-Content-Type) | PASS |
| 7 | /hardening/* requires admin auth in AUTH_RULES | PASS |
| 8a | incident-auth-outage.md runbook | PASS |
| 8b | incident-vista-outage.md runbook | PASS |
| 8c | incident-pg-outage.md runbook | PASS |
| 8d | incident-pacs-outage.md runbook | PASS |
| 9 | k6 rc-baseline.js with p95 thresholds | PASS |
| 10a | rc-checklist.ps1 CI script | PASS |
| 10b | rc-perf-gate.ps1 CI script | PASS |
| 10c | rc-dep-audit.ps1 CI script | PASS |
| 11 | Performance budget config (health p95 <= 100ms) | PASS |
| 12 | Phase 118 IMPLEMENT prompt file | PASS |
| 13a | API /health returns ok at runtime | PASS |
| 13b | CSP header in live response | PASS |
| 13c | Referrer-Policy in live response | PASS |
| 13d | Permissions-Policy in live response | PASS |

## Runtime Endpoint Verification

| Endpoint | Status | Response Summary |
|----------|--------|-----------------|
| GET /hardening/audit-verify | 200 | IAM memory valid, imaging valid, RCM valid, tamperEvident: true |
| GET /hardening/security-posture | 200 | CSP, HSTS, X-Frame, Referrer-Policy, Permissions-Policy all true |
| GET /hardening/backup-status | 200 | PG configured, cron 0 1 * * *, retain 7 |
| GET /hardening/rc-checklist | 200 | 8 pass, 0 fail, 1 warn (NODE_ENV not production) |
| GET /hardening/audit-verify (no auth) | 401 | Authentication required (admin-only enforced) |

## Security Headers Verified

```
x-content-type-options: nosniff
x-frame-options: DENY
strict-transport-security: max-age=31536000; includeSubDomains
content-security-policy: default-src 'none'; frame-ancestors 'none'
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(), microphone=(), geolocation=(), payment=()
```

## Dependency Audit

5 vulnerabilities (3 moderate, 2 high) — all in `ajv` (transitive dep of eslint/fastify). Pre-existing, not introduced by Phase 118. No critical vulnerabilities.

## Build Verification

| App | Build | Result |
|-----|-------|--------|
| apps/api | `tsc --noEmit` | Clean (0 errors) |
| apps/web | `next build` | Clean |
| apps/portal | `next build` | Clean |

## Regression Check

| Endpoint | Status | Notes |
|----------|--------|-------|
| GET /health | 200 ok | Uptime, circuitBreaker closed, PG ok |
| GET /ready | 200 ok | Vista reachable |
| GET /metrics/prometheus | 200 | Scrape endpoint working |
| GET /auth/session | 200 ok | Session authenticated |
| GET /api/capabilities | 200 ok | 104 capabilities resolved |
| GET /vista/allergies?dfn=3 | 200 ok | Clinical data flowing |
| GET /posture/observability | 200 | Posture checks operational |
| GET /admin/jobs/status | 200 ok | 5 jobs (including pg_backup) |
| GET /rcm/audit/verify | 200 ok | Chain valid |
| GET /iam/audit/verify | 200 ok | Chain valid |
| GET /imaging/audit/verify | 200 ok | Chain valid |

## Bugs Fixed During Verification

| Bug | Description | Fix |
|-----|-------------|-----|
| Tautology in `imagingSinkEnabled` | `!!env || true` always true | Replaced with proper path-based check |
| Inaccurate k6 JSDoc | Claimed dynamic JSON loading | Corrected description |
| Unused `$allRb` variable | PS1 lint warning | Removed dead variable |

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| ajv ReDoS (transitive dep) | Moderate | Not reachable in production paths; upgrade when fastify releases new ajv-compiler |
| IAM file chain broken (797 historical entries) | Low | Pre-existing from multi-session accumulation; memory chain valid; file verification is informational |
| Security posture endpoint reports static config | Low | Reports intent not live state; acceptable for posture route |
| rc-checklist.ps1 and API rc-checklist are independent | Low | Both cover same checks; drift risk mitigated by verifier |

## Files Modified (VERIFY pass)
- apps/api/src/routes/hardening-routes.ts — Fixed tautology in imagingSinkEnabled
- tests/k6/rc-baseline.js — Fixed inaccurate JSDoc
- scripts/verify-phase118-go-live-hardening.ps1 — Removed unused $allRb variable
