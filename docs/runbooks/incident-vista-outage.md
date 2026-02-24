# Incident Runbook: VistA Outage

## Severity: SEV-1 (all clinical reads/writes blocked)

## Symptoms
- `/vista/ping` returns 503 or times out
- Circuit breaker opens — `/ready` shows `circuitBreaker: "open"`
- Patient search, demographics, allergies, vitals all return errors
- Clinical write operations (orders, notes, allergies) fail

## Triage (first 5 minutes)

### 1. Check VistA Docker container
```bash
docker ps --filter "name=wv"
# Should show container running with healthy status

docker logs --tail 50 wv 2>&1
# Look for MUMPS errors, GT.M crash, or OOM
```

### 2. Check TCP connectivity to VistA
```bash
curl -s http://localhost:3001/vista/ping
# Or direct TCP probe
Test-NetConnection -ComputerName localhost -Port 9430
```

### 3. Check circuit breaker state
```bash
curl -s http://localhost:3001/ready | python -m json.tool
# circuitBreaker should be "closed" (healthy) or "open" (VistA down)
```

### 4. Check API logs for RPC errors
```bash
grep 'RPC\|XWB\|broker\|circuit' logs/*.log | tail -30
```

## Common Causes & Fixes

### Docker container stopped/crashed
- **Fix**: Restart the container
  ```bash
  docker compose -f services/vista/docker-compose.yml up -d
  # Wait 15-20 seconds for VistA to be ready
  sleep 20
  curl http://localhost:3001/vista/ping
  ```

### GT.M/YottaDB REQRUNDOWN error
- **Symptom**: Container running but VistA unresponsive
- **Fix**: Run mupip rundown inside the container
  ```bash
  docker exec wv su - wv -c "mupip rundown -reg '*'"
  ```
- **If mupip fails**: Restart the container entirely

### Port 9430 not exposed
- **Fix**: Check `docker-compose.yml` for correct port mapping
  ```yaml
  ports:
    - "9430:9430"
  ```

### VistA volume corruption
- **Symptom**: Container starts but RPCs return garbled data
- **Fix**: Pull fresh image and recreate
  ```bash
  docker compose -f services/vista/docker-compose.yml down
  docker pull worldvista/worldvista-ehr
  docker compose -f services/vista/docker-compose.yml up -d
  ```
- **CAUTION**: This resets all VistA data to stock image state
- **Impact**: Custom RPC registrations (ZVEMIOP, etc.) need re-install:
  ```bash
  pwsh scripts/install-interop-rpcs.ps1
  ```

### Half-open socket (stale connection)
- **Symptom**: First RPC after idle period fails, retries succeed
- **Fix**: API auto-detects via `isSocketHealthy()` (5-min idle threshold)
- **Manual**: Restart API to force fresh connection

## Circuit Breaker Recovery

The circuit breaker auto-recovers:
1. **Open** → 5+ consecutive failures, all RPCs blocked
2. **Half-open** → After 30s, allows one probe request
3. **Closed** → If probe succeeds, normal operation resumes

To force faster recovery:
```bash
# Restart the API (circuit breaker resets)
# Kill existing process, then:
cd apps/api && npx tsx --env-file=.env.local src/index.ts
```

## Degraded Mode Behavior

When VistA is down, the system degrades gracefully:
- `/health` returns 200 (liveness — always up)
- `/ready` returns `ok: false` with `circuitBreaker: "open"`
- Authentication uses cached sessions (if PG-backed)
- New logins fail (require VistA RPC)
- All clinical data reads return errors (no cached clinical data)
- RCM/admin/analytics features continue working (PG-backed)

## Recovery Verification
```bash
# VistA ping
curl -s http://localhost:3001/vista/ping

# Circuit breaker
curl -s http://localhost:3001/ready | python -m json.tool

# Clinical read
curl -s -b cookies.txt "http://localhost:3001/vista/default-patient-list"
```

## Post-Incident
- Review circuit breaker metrics in Prometheus/Grafana
- Check VistA container resource usage: `docker stats wv`
- Document root cause in BUG-TRACKER.md
- If data loss suspected, check VistA globals integrity
