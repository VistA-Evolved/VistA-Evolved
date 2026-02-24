# Incident Runbook: Authentication Outage

## Severity: SEV-1 if all users affected, SEV-2 if intermittent

## Symptoms
- Users cannot log in — `/auth/login` returns 500 or hangs
- Session validation fails — `/auth/session` returns 401 for valid cookies
- Login page shows "Authentication failed" repeatedly

## Triage (first 5 minutes)

### 1. Check API health
```bash
curl -s http://localhost:3001/health | python -m json.tool
curl -s http://localhost:3001/ready | python -m json.tool
```

### 2. Check VistA connectivity (auth uses VistA RPC)
```bash
curl -s http://localhost:3001/vista/ping
```
If VistA ping fails → escalate to **VistA Outage** runbook.

### 3. Check session store backend
```bash
# If PG-backed sessions
curl -s http://localhost:3001/health  # Check platformPg.ok
docker exec ve-platform-db pg_isready -U ve_api -d ve_platform

# If SQLite-backed sessions
ls -la data/platform.db  # Must exist and be writable
```

### 4. Check logs for auth errors
```bash
# API log (structured JSON)
grep '"url":"/auth/login"' logs/*.log | tail -20
grep 'XWB\|RPC\|session' logs/*.log | tail -20
```

## Common Causes & Fixes

### VistA RPC Broker unreachable
- **Symptom**: Login hangs, then times out
- **Fix**: Restart Docker VistA container
  ```bash
  docker compose -f services/vista/docker-compose.yml restart
  ```
- **Verify**: `curl http://localhost:3001/vista/ping` returns 200

### Session store corruption (SQLite)
- **Symptom**: Existing sessions fail validation, new logins work
- **Fix**: Delete and recreate the SQLite DB
  ```bash
  rm data/platform.db*
  # Restart API — migrations will recreate tables
  ```
- **Impact**: All active sessions invalidated (users must re-login)

### PG session table locked
- **Symptom**: Login succeeds but session store write fails
- **Fix**: Check for long-running transactions
  ```sql
  SELECT pid, state, query, age(clock_timestamp(), query_start)
  FROM pg_stat_activity WHERE state != 'idle' ORDER BY query_start;
  -- Kill stuck transactions
  SELECT pg_terminate_backend(pid) FROM pg_stat_activity
  WHERE state = 'idle in transaction' AND age(clock_timestamp(), query_start) > interval '5 minutes';
  ```

### Circuit breaker open
- **Symptom**: `/ready` returns `circuitBreaker: "open"`
- **Fix**: Wait 30s for half-open recovery, or restart API
- **Root cause**: 5+ consecutive VistA RPC failures

### Rate limiter blocking login attempts
- **Symptom**: 429 responses on `/auth/login`
- **Fix**: Wait for rate limit window (60s) to reset
- **Check**: `X-RateLimit-Remaining` header in 429 response

## Escalation
1. If VistA-related → VistA Outage runbook
2. If PG-related → PG Outage runbook
3. If neither → check API process health, restart if needed

## Recovery Verification
```bash
# Login should succeed
curl -s -c cookies.txt -X POST -H "Content-Type: application/json" \
  -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}' \
  http://localhost:3001/auth/login

# Session should validate
curl -s -b cookies.txt http://localhost:3001/auth/session
```

## Post-Incident
- Check audit trail: `GET /iam/audit?action=auth`
- Review rate limiter stats
- Document root cause in BUG-TRACKER.md
