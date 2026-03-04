# GameDay Runbook: VistA RPC Broker Down

> **Scenario**: VistA Docker container stops or RPC broker port 9430 becomes unreachable.
> **Objective**: Verify graceful degradation, circuit breaker behavior, recovery.

---

## Pre-Conditions

- [ ] API running with `VISTA_HOST=127.0.0.1`, `VISTA_PORT=9430`
- [ ] VistA Docker sandbox running
- [ ] Baseline: `curl http://localhost:3001/vista/ping` → 200

---

## Drill Steps

### Step 1: Establish Baseline (T=0)

```bash
curl -s http://localhost:3001/vista/ping | jq .
curl -s http://localhost:3001/ready | jq .
curl -s http://localhost:3001/vista/allergies?dfn=3 -b cookies.txt | jq .ok
```

### Step 2: Simulate VistA Failure (T+0)

```bash
# Stop VistA container
docker compose -f services/vista/docker-compose.yml stop wv
```

### Step 3: Observe Degraded Behavior (T+30s)

```bash
# Ping should fail
curl -s http://localhost:3001/vista/ping | jq .

# Ready should report VistA down
curl -s http://localhost:3001/ready | jq .

# Clinical reads should fail gracefully
curl -s http://localhost:3001/vista/allergies?dfn=3 -b cookies.txt | jq .
# Expected: { ok: false, error: "circuit breaker open" } or similar

# Non-VistA routes (auth, admin, analytics) should still work
curl -s http://localhost:3001/health | jq .
```

**Expected**: Circuit breaker trips after 5 failures. 30s half-open recovery window. No crash.

### Step 4: Verify Circuit Breaker Metrics (T+60s)

```bash
# If Prometheus metrics enabled:
curl -s http://localhost:3001/metrics/prometheus | grep circuit
```

### Step 5: Restore VistA (T+120s)

```bash
docker compose -f services/vista/docker-compose.yml start wv
# Wait ~15s for port 9430 to be ready
sleep 15
```

### Step 6: Verify Recovery (T+150s)

```bash
# Wait for circuit breaker half-open probe
sleep 30

# Ping should recover
curl -s http://localhost:3001/vista/ping | jq .

# Clinical reads should resume
curl -s http://localhost:3001/vista/allergies?dfn=3 -b cookies.txt | jq .ok
```

---

## RPO/RTO Targets

| Metric  | Target      | Notes                                             |
| ------- | ----------- | ------------------------------------------------- |
| **RPO** | N/A         | VistA is source of truth; no data stored locally  |
| **RTO** | < 2 minutes | Circuit breaker auto-recovery after VistA restart |

---

## Validation Checklist

- [ ] API stayed up during VistA outage
- [ ] Circuit breaker tripped properly (5 failures → open)
- [ ] Non-VistA features continued working
- [ ] Recovery was automatic after VistA restart
- [ ] No orphaned locks left on VistA side
- [ ] Audit trail maintained continuity
