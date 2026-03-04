# Security Triage Runbook -- Phase 62

> Quick-reference for triaging security events and suspicious activity.

## 1. Suspicious Login Activity

### Detection

- Multiple `auth.failed` events from same IP in immutable audit
- `security.rate-limited` events spike
- Login from unexpected IP range or time zone

### Triage Commands

```bash
# Recent auth failures
curl -s http://127.0.0.1:3001/iam/audit?actionPrefix=auth.failed&limit=20 | jq .

# Rate limit events
curl -s http://127.0.0.1:3001/iam/audit?actionPrefix=security.rate-limited&limit=20 | jq .

# Check account lockout status (in API logs)
grep "account.*lock" logs/*.log
```

### Response Matrix

| Signal                      | Risk     | Action                                              |
| --------------------------- | -------- | --------------------------------------------------- |
| 5+ failures from 1 IP       | Medium   | Monitor -- rate limiter handles it (5 attempts/15m) |
| 50+ failures from 1 IP      | High     | Block IP at nginx/firewall                          |
| Failures across many IPs    | High     | Possible credential stuffing -- enable CAPTCHA/OIDC |
| Success after many failures | Critical | Verify legitimate user, check for compromised creds |

## 2. Unauthorized Data Access

### Detection

- `security.rbac-denied` events in immutable audit
- `policy.denied` events from policy engine
- User accessing patients outside their normal panel

### Triage Commands

```bash
# RBAC denials
curl -s http://127.0.0.1:3001/iam/audit?actionPrefix=security.rbac&limit=20 | jq .

# Policy denials
curl -s http://127.0.0.1:3001/iam/audit?actionPrefix=policy.denied&limit=20 | jq .

# Break-glass activations
curl -s http://127.0.0.1:3001/iam/audit?actionPrefix=policy.break-glass&limit=20 | jq .
```

### Response

- Single RBAC denial: likely misconfigured role, investigate and fix
- Repeated denials from same user: review user intent, possible privilege probe
- Break-glass without documented reason: escalate to compliance

## 3. API Abuse / DDoS Indicators

### Detection

- Rate limiter consistently active
- Unusual traffic patterns (high req/s from single source)
- Response time degradation without VistA issues

### Triage Commands

```bash
# Check current rate limit status
curl -s http://127.0.0.1:3001/metrics | grep rate_limit

# Check request throughput
curl -s http://127.0.0.1:3001/metrics | grep http_request_duration

# Active sessions (legitimate load indicator)
curl -s http://127.0.0.1:3001/iam/stats | jq .activeSessions
```

### Response

| Signal                   | Action                         |
| ------------------------ | ------------------------------ |
| Single IP high traffic   | Block at nginx: `deny <IP>;`   |
| Distributed high traffic | Enable WAF rules, consider CDN |
| Legitimate load spike    | Scale horizontally if possible |

## 4. Cross-Tenant Data Leak Suspicion

### Detection

- User seeing data from a different tenant/facility
- Cache returning stale data from wrong tenant

### Triage Commands

```bash
# Check session tenant assignment
# (requires admin session cookie)
curl -s -b "ehr_session=<token>" http://127.0.0.1:3001/iam/stats | jq .

# Verify cache isolation
# (tenant-scoped cache keys should never cross)
curl -s http://127.0.0.1:3001/admin/cache/stats | jq .
```

### Response

1. **Immediate:** Invalidate all caches: `POST /admin/cache/invalidate`
2. **Verify:** Check tenant middleware is registered (`tenant-context.ts`)
3. **Audit:** Review what data was accessed and by whom
4. **Fix:** If cache key lacked tenant prefix, apply `tenantCachedRpc()` wrapper

## 5. Quick Reference: Security Headers

VistA-Evolved sets these security headers via `security.ts`:

| Header                    | Value                           | Purpose                        |
| ------------------------- | ------------------------------- | ------------------------------ |
| X-Content-Type-Options    | nosniff                         | Prevent MIME sniffing          |
| X-Frame-Options           | DENY                            | Prevent clickjacking           |
| X-XSS-Protection          | 0                               | Defer to CSP (modern approach) |
| Strict-Transport-Security | max-age=31536000                | Force HTTPS                    |
| Referrer-Policy           | strict-origin-when-cross-origin | Limit referrer leakage         |
| Permissions-Policy        | (restrictive)                   | Limit browser APIs             |

## 6. Quick Reference: Auth Architecture

| Layer           | Mechanism                        | Config                               |
| --------------- | -------------------------------- | ------------------------------------ |
| Session         | httpOnly cookie (`ehr_session`)  | 8h absolute, 30m idle                |
| CSRF            | Session-bound synchronizer token | `csrfSecret` + `X-CSRF-Token` header |
| Rate limit      | Per-IP sliding window            | 200 req/min general, 10 login/min    |
| Account lockout | Per-access-code counter          | 5 attempts, 15m lockout              |
| OIDC (opt-in)   | JWT validation + JWKS            | `OIDC_ENABLED=true`                  |
| Policy engine   | Default-deny, ~40 actions        | `policy-engine.ts`                   |

## Related Files

- `apps/api/src/middleware/security.ts` -- Security middleware
- `apps/api/src/auth/policy-engine.ts` -- Policy engine
- `apps/api/src/lib/immutable-audit.ts` -- Hash-chained audit
- `docs/runbooks/incident-response.md` -- Full incident response
- `docs/runbooks/audit-integrity.md` -- Audit chain procedures
