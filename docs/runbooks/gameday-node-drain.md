# GameDay Runbook: Node Drain / Pod Eviction

> **Scenario**: API process is terminated (graceful shutdown) or pod is evicted.
> **Objective**: Verify graceful drain, in-flight request completion, reconnection.

---

## Pre-Conditions

- [ ] API running
- [ ] Active session with in-flight work (or simulated)
- [ ] Drain timeout configured: `SHUTDOWN_DRAIN_TIMEOUT_MS` (default 30s)

---

## Drill Steps

### Step 1: Establish Baseline (T=0)

```bash
curl -s http://localhost:3001/health | jq .
curl -s http://localhost:3001/ready | jq .
# Note PID for observation
```

### Step 2: Simulate Graceful Shutdown (T+0)

```bash
# Send SIGTERM to the API process
# In Docker:
docker kill --signal=SIGTERM <api-container>

# Or locally:
# Get PID and send signal
# kill -SIGTERM <pid>
```

### Step 3: Observe Drain Behavior (T+0 to T+30s)

**Expected during drain period**:

- `/ready` returns `ok: false` immediately (removed from load balancer)
- `/health` continues to return 200
- In-flight requests complete (up to drain timeout)
- RPC broker disconnected cleanly (`buildBye()` sent)
- Background jobs stop accepting new work
- Audit trail flushed

### Step 4: Verify Clean Shutdown

Check API logs for:

```
Graceful shutdown initiated
Disconnecting RPC broker...
Server closed
```

### Step 5: Restart and Verify (T+60s)

```bash
# Restart API
cd apps/api && npx tsx --env-file=.env.local src/index.ts

# Verify full recovery
curl -s http://localhost:3001/health | jq .
curl -s http://localhost:3001/ready | jq .
curl -s http://localhost:3001/vista/ping | jq .
```

---

## Graceful Shutdown Sequence

1. SIGTERM received
2. `/ready` → `ok: false` (K8s removes from endpoints)
3. Stop accepting new connections
4. Wait for in-flight requests (up to `SHUTDOWN_DRAIN_TIMEOUT_MS`)
5. `disconnectRpcBroker()` — sends `#BYE#` to VistA
6. `stopAggregationJob()` — stops analytics aggregation timer
7. `server.close()` — close Fastify
8. Exit 0

---

## RPO/RTO Targets

| Metric  | Target                                        | Notes                             |
| ------- | --------------------------------------------- | --------------------------------- |
| **RPO** | 0 - PG transactions committed before shutdown | In-memory stores lost (by design) |
| **RTO** | < 30 seconds                                  | New process startup time          |

---

## Validation Checklist

- [ ] Graceful shutdown logs appeared
- [ ] In-flight requests completed before exit
- [ ] RPC broker disconnected cleanly
- [ ] No orphaned VistA locks
- [ ] Restart was clean with no data corruption
- [ ] Audit trail maintained continuity across restart
