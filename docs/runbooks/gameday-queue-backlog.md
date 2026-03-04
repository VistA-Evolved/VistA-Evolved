# GameDay Runbook: Queue Backlog

> **Scenario**: Background job queue (Graphile Worker) backs up due to failed jobs.
> **Objective**: Verify backpressure, alerting, and recovery.

---

## Pre-Conditions

- [ ] API running with Graphile Worker enabled
- [ ] PostgreSQL available
- [ ] Baseline: queue should be near-empty

---

## Drill Steps

### Step 1: Establish Baseline (T=0)

```bash
# Check current queue depth (if exposed via metrics)
curl -s http://localhost:3001/metrics/prometheus | grep job
curl -s http://localhost:3001/health | jq .
```

### Step 2: Simulate Backlog (T+0)

Option A — Direct DB injection (if PG access available):

```sql
-- Insert synthetic failed jobs
INSERT INTO graphile_worker.jobs (task_identifier, payload, attempts, max_attempts)
SELECT 'synthetic_task', '{"test": true}'::jsonb, 5, 5
FROM generate_series(1, 100);
```

Option B — Rapid API calls that queue work:

```bash
# Trigger many async operations in rapid succession
for i in $(seq 1 50); do
  curl -s -X POST http://localhost:3001/data-portability/bulk-export/kickoff \
    -H "Content-Type: application/json" \
    -b cookies.txt -d '{}' &
done
wait
```

### Step 3: Observe Backpressure (T+60s)

```bash
# API should still respond (not OOM or deadlocked)
curl -s http://localhost:3001/health | jq .

# Queue metrics should show backlog
curl -s http://localhost:3001/metrics/prometheus | grep queue
```

**Expected**: API remains responsive. Queue depth increases. No crash.

### Step 4: Monitor Recovery (T+300s)

```bash
# Queue should start draining
curl -s http://localhost:3001/metrics/prometheus | grep queue
```

---

## RPO/RTO Targets

| Metric  | Target                   | Notes                                                |
| ------- | ------------------------ | ---------------------------------------------------- |
| **RPO** | 0 - jobs persisted in PG | Jobs survive restart                                 |
| **RTO** | < 10 minutes             | Worker auto-recovers; failed jobs retry with backoff |

---

## Validation Checklist

- [ ] API remained responsive during backlog
- [ ] No OOM or memory pressure
- [ ] Failed jobs retried with backoff
- [ ] Queue eventually drained
- [ ] No data loss from queued operations
