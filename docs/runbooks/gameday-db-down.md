# GameDay Runbook: Database Down

> **Scenario**: PostgreSQL becomes unreachable.
> **Objective**: Verify API behavior, recovery time, data integrity post-restore.

---

## Pre-Conditions

- [ ] API running with `PLATFORM_PG_URL` configured
- [ ] VistA Docker sandbox running
- [ ] Baseline health check: `curl http://localhost:3001/health` → 200
- [ ] Baseline readiness: `curl http://localhost:3001/ready` → `ok: true`

---

## Drill Steps

### Step 1: Establish Baseline (T=0)

```bash
# Record current state
curl -s http://localhost:3001/health | jq .
curl -s http://localhost:3001/ready | jq .
curl -s http://localhost:3001/posture/data-plane | jq .summary
```

Record: response times, open connections, circuit breaker state.

### Step 2: Simulate DB Failure (T+0)

```bash
# Stop PostgreSQL
docker compose -f services/keycloak/docker-compose.yml stop postgres
# OR for platform PG:
# docker stop vista-evolved-postgres
```

### Step 3: Observe Degraded Behavior (T+30s)

```bash
# Health should still return 200 (liveness)
curl -s http://localhost:3001/health | jq .

# Ready should return ok: false
curl -s http://localhost:3001/ready | jq .

# Clinical reads via VistA should STILL WORK
curl -s http://localhost:3001/vista/allergies?dfn=3 -b cookies.txt | jq .ok

# DB-dependent routes should fail gracefully
curl -s http://localhost:3001/posture/data-plane | jq .overallHealth
```

**Expected**: VistA reads continue. DB-dependent features return 503 or graceful error. No crash.

### Step 4: Verify Circuit Breaker (T+60s)

```bash
# Circuit breaker should be open for PG operations
curl -s http://localhost:3001/ready | jq .details
```

### Step 5: Restore Database (T+120s)

```bash
# Restart PostgreSQL
docker compose -f services/keycloak/docker-compose.yml start postgres
```

### Step 6: Verify Recovery (T+150s)

```bash
# Wait for circuit breaker half-open → closed
sleep 30

# Ready should recover
curl -s http://localhost:3001/ready | jq .ok
# Expected: true

# DB routes should work again
curl -s http://localhost:3001/posture/data-plane | jq .overallHealth
```

---

## RPO/RTO Targets

| Metric | Target | Method |
|--------|--------|--------|
| **RPO** (Recovery Point Objective) | 0 data loss for committed transactions | WAL + pg_dump |
| **RTO** (Recovery Time Objective) | < 5 minutes | Auto-reconnect + circuit breaker recovery |

---

## Validation Checklist

- [ ] API stayed up during DB outage
- [ ] VistA reads continued without interruption
- [ ] DB-dependent routes returned appropriate errors (not crashes)
- [ ] Recovery was automatic after DB restart
- [ ] No data corruption detected post-recovery
- [ ] Audit trail maintained continuity

---

## Escalation

If recovery does not occur within 10 minutes:
1. Check PG logs: `docker logs <postgres-container>`
2. Run `node scripts/backup-restore.mjs status`
3. If needed: `node scripts/backup-restore.mjs restore --from <backup-dir> --yes`
