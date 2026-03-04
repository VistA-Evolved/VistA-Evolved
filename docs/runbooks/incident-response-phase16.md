# Incident Response — Phase 16

> Standard operating procedures for VistA-Evolved incidents.

## Severity Levels

| Level             | Description                | Response Time     | Example                                   |
| ----------------- | -------------------------- | ----------------- | ----------------------------------------- |
| **P1 — Critical** | System completely unusable | Immediate         | API down, VistA unreachable, auth broken  |
| **P2 — High**     | Major feature broken       | 1 hour            | Write-backs failing, circuit breaker open |
| **P3 — Medium**   | Degraded performance       | 4 hours           | High latency, cache ineffective           |
| **P4 — Low**      | Minor issue                | Next business day | UI cosmetic bug, non-blocking warning     |

## Quick Diagnostics

### 1. Check System Health

```bash
# Is the API process alive?
curl http://localhost:3001/health

# Can it reach VistA?
curl http://localhost:3001/ready

# What version is running?
curl http://localhost:3001/version

# Are RPCs healthy?
curl http://localhost:3001/metrics | jq '.rpcHealth.circuitBreaker'
```

### 2. Check Docker Containers

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs --tail=100 api
docker compose -f docker-compose.prod.yml logs --tail=100 web
```

### 3. Check VistA Sandbox

```bash
docker ps | grep wv
docker logs wv --tail=50
# Test raw TCP connectivity
Test-NetConnection -ComputerName 127.0.0.1 -Port 9430
```

## Common Incidents

### API Returns 503 / Circuit Breaker Open

**Symptoms:** `/ready` returns `{ ok: false, vista: "unreachable" }`, `/metrics` shows circuit breaker state: "open"

**Root cause:** VistA RPC Broker is down or unreachable.

**Resolution:**

1. Check VistA container: `docker ps | grep wv`
2. Restart if needed: `docker restart wv`
3. Wait 15s for VistA to initialize
4. Reset circuit breaker: `curl -X POST http://localhost:3001/admin/circuit-breaker/reset -H "Authorization: Bearer <token>"`
5. Verify: `curl http://localhost:3001/ready`

### Authentication Failures (401 on all requests)

**Symptoms:** Login succeeds but subsequent requests return 401.

**Root cause:** Session store cleared (process restart) or cookie not being sent.

**Resolution:**

1. Check if session cookie is set: browser DevTools → Application → Cookies
2. Verify CORS allows the origin: check `ALLOWED_ORIGINS` env var
3. Test login: `curl -v -X POST http://localhost:3001/auth/login -H 'Content-Type: application/json' -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'`
4. Check Set-Cookie header in response

### High Latency (>5s responses)

**Symptoms:** Pages load slowly, timeouts in UI.

**Root cause:** VistA RPC calls are slow, cache is cold, or network issues.

**Resolution:**

1. Check metrics: `curl http://localhost:3001/metrics | jq '.rpcHealth.perRpc'`
2. Look for high `avgDurationMs` per RPC
3. Check cache hit rate: `curl http://localhost:3001/metrics | jq '.rpcHealth.cache'`
4. If VistA is slow, check its system load
5. Invalidate cache if stale: `curl -X POST http://localhost:3001/admin/cache/invalidate -H "Authorization: Bearer <token>"`

### Memory Leak / OOM

**Symptoms:** Process killed, Docker restart loop.

**Resolution:**

1. Check memory: `curl http://localhost:3001/metrics | jq '.process'`
2. Check Docker: `docker stats vista-evolved-api`
3. If heap > 500MB, investigate:
   - Audit event accumulation (check `AUDIT_MAX_ENTRIES`)
   - Session store growth (check `SESSION_ABSOLUTE_TTL_MS`)
   - Cache growth (check `CACHE_MAX_ENTRIES`)
4. Restart: `docker compose -f docker-compose.prod.yml restart api`

### Port 3001 Already In Use (Windows Dev)

See: [windows-port-3001-fix.md](windows-port-3001-fix.md)

## Rollback Procedure

```bash
# 1. Identify the last known good image
docker images | grep vista-evolved

# 2. Stop current
docker compose -f docker-compose.prod.yml down

# 3. Deploy previous version
export BUILD_SHA=<previous-sha>
docker compose -f docker-compose.prod.yml up -d

# 4. Verify
curl http://localhost:3001/health
curl http://localhost:3001/version
```

## Escalation

| Issue                   | Escalate To                                  |
| ----------------------- | -------------------------------------------- |
| VistA RPC protocol bugs | See `docs/BUG-TRACKER.md` and `AGENTS.md` §2 |
| VistA database issues   | Site VistA DBA                               |
| Network/firewall        | Infrastructure team                          |
| Security incident       | See `SECURITY.md`                            |

## Post-Incident

1. Update `docs/BUG-TRACKER.md` with:
   - Symptoms observed
   - Root cause analysis
   - Fix applied
   - Preventive measures
2. Run verification: `.\scripts\verify-latest.ps1`
3. Ensure all PASS before closing
