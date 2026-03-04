# Platform DB Performance Posture

> Phase 103: DB Scale/Performance Engineering
> Last updated: 2026-02-23

## Overview

This document defines the performance posture for the Postgres-backed
PlatformStore. It covers connection pooling, partitioning strategy,
indexing, timeouts, retry logic, idempotency, and load testing.

The SQLite backend remains primary for dev/sandbox. All posture items
below apply to the Postgres path (`PLATFORM_PG_URL` configured).

---

## 1. Connection Pooling

### Current: node-postgres built-in pool

| Setting             | Env Var                            | Default  | Notes                            |
| ------------------- | ---------------------------------- | -------- | -------------------------------- |
| Min connections     | `PLATFORM_PG_POOL_MIN`             | 2        | Warm pool floor                  |
| Max connections     | `PLATFORM_PG_POOL_MAX`             | 10       | Ceiling for single API instance  |
| Idle timeout        | (hardcoded)                        | 30,000ms | Close idle connections after 30s |
| Connection timeout  | (hardcoded)                        | 5,000ms  | Fail fast on connect             |
| Statement timeout   | `PLATFORM_PG_STATEMENT_TIMEOUT_MS` | 30,000ms | Kill runaway queries             |
| Idle-in-transaction | `PLATFORM_PG_IDLE_TX_TIMEOUT_MS`   | 10,000ms | Kill stuck transactions          |

### Production recommended: PgBouncer

For production with multiple API replicas, add PgBouncer between API and Postgres:

```
API instances (N x pool=5) --> PgBouncer (pool=50) --> Postgres (max_connections=100)
```

**Recommended PgBouncer settings:**

```ini
[databases]
ve_platform = host=postgres port=5432 dbname=ve_platform

[pgbouncer]
pool_mode = transaction          ; release connection after each TX
max_client_conn = 200            ; N API replicas x max_pool_size
default_pool_size = 50           ; actual PG connections
reserve_pool_size = 5            ; overflow buffer
reserve_pool_timeout = 3         ; seconds before using reserve
server_idle_timeout = 60         ; close idle server connections
server_lifetime = 3600           ; force reconnect after 1hr
query_timeout = 30               ; matches statement_timeout
log_connections = 0              ; reduce log noise
log_disconnections = 0
```

**Why `transaction` mode (not `session`):**

- VistA-Evolved uses short-lived queries, not prepared statements or LISTEN/NOTIFY
- Transaction mode achieves 5-10x connection multiplexing efficiency
- Session mode is only needed for LISTEN/NOTIFY, advisory locks, or temp tables
- If advisory locks are needed later, use a separate `session` mode pool

**Deployment options:**

- **Docker sidecar**: `edoburu/pgbouncer:latest` in the same compose file
- **Kubernetes**: PgBouncer pod or sidecar container
- **Managed**: Cloud SQL Proxy, RDS Proxy, Supabase Supavisor

### Dev mode

No PgBouncer needed. The built-in node-postgres pool with max=10 is sufficient
for single-instance development. SQLite is still the default dev backend.

---

## 2. Partitioning Posture

### High-growth tables identified

| Table                  | Growth Pattern                      | Est. Rows/Month | Partition Candidate     |
| ---------------------- | ----------------------------------- | --------------- | ----------------------- |
| `platform_audit_event` | Append-only, never deleted          | 10K-100K        | **YES**                 |
| `outbox_event`         | High-volume, prunable after publish | 5K-50K          | YES (prune > partition) |
| `payer_audit_event`    | Append-only per payer change        | 1K-10K          | YES (when > 1M rows)    |
| `eligibility_check`    | One per eligibility verification    | 1K-10K          | Deferred                |
| `claim_status_check`   | One per status poll                 | 1K-10K          | Deferred                |
| `denial_action`        | Append per denial state change      | < 5K            | No                      |

### Strategy: DEFERRED to Phase 103B

Partitioning is **documented but not yet applied** because:

1. **Table recreation required**: PostgreSQL cannot add `PARTITION BY` to existing tables.
   Must `CREATE TABLE ... PARTITION BY RANGE (created_at)`, migrate data, drop old table.
2. **Operational complexity**: Needs quarterly partition creation (manual or pg_partman).
3. **Current volumes don't justify it**: < 10K rows in sandbox.
4. **Breaking change**: Migration must handle the table swap atomically.

### When to activate (trigger criteria)

Implement partitioning when ANY of these thresholds are crossed:

- `platform_audit_event` exceeds **1 million rows**
- Any time-series query exceeds **500ms at p95**
- Disk usage for audit tables exceeds **1 GB**

### Partition plan (for Phase 103B)

```sql
-- Step 1: Create partitioned replacement
CREATE TABLE platform_audit_event_new (
  LIKE platform_audit_event INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Step 2: Create monthly partitions (3 months ahead)
CREATE TABLE platform_audit_event_2026_01
  PARTITION OF platform_audit_event_new
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
-- ... etc

-- Step 3: Migrate data
INSERT INTO platform_audit_event_new SELECT * FROM platform_audit_event;

-- Step 4: Swap
ALTER TABLE platform_audit_event RENAME TO platform_audit_event_old;
ALTER TABLE platform_audit_event_new RENAME TO platform_audit_event;

-- Step 5: Automated partition management
-- Option A: pg_partman extension
-- Option B: Cron job: CREATE PARTITION for next month on 1st of each month
```

### Outbox pruning (alternative to partitioning)

For `outbox_event`, pruning published events is simpler than partitioning:

```sql
-- Run daily: delete published events older than 7 days
DELETE FROM outbox_event
WHERE published = true AND published_at < NOW() - INTERVAL '7 days';
```

---

## 3. Indexes

### Migration v6 adds 25+ indexes (Phase 103)

All indexes are `CREATE INDEX IF NOT EXISTS` -- safe for repeated application.

#### Composite indexes for common query patterns

| Table                  | Index                         | Columns                                     | Purpose                 |
| ---------------------- | ----------------------------- | ------------------------------------------- | ----------------------- |
| `payer`                | `idx_payer_tenant_active`     | `(tenant_id, active)`                       | Filtered list by tenant |
| `payer`                | `idx_payer_country_active`    | `(country_code, active)`                    | Country-filtered list   |
| `payer`                | `idx_payer_integration_mode`  | `(integration_mode)`                        | Mode-filtered queries   |
| `denial_case`          | `idx_denial_tenant_status`    | `(tenant_id, denial_status, deadline_date)` | Workqueue sorting       |
| `denial_case`          | `idx_denial_claim`            | `(claim_ref)`                               | Claim lookup            |
| `payer_audit_event`    | `idx_payer_audit_tenant_time` | `(tenant_id, created_at)`                   | Audit time-range        |
| `payment_record`       | `idx_payment_payer`           | `(payer_id)`                                | Reconciliation by payer |
| `payment_record`       | `idx_payment_status`          | `(status)`                                  | Status workqueue        |
| `reconciliation_match` | `idx_recon_tenant`            | `(tenant_id, match_status)`                 | Review queue            |
| `eligibility_check`    | `idx_eligibility_status`      | `(status, created_at)`                      | Polling                 |
| `claim_status_check`   | `idx_claim_status_status`     | `(status, created_at)`                      | Polling                 |

#### Unique constraints for idempotency

| Table              | Index                      | Columns                                 | Purpose                        |
| ------------------ | -------------------------- | --------------------------------------- | ------------------------------ |
| `tenant_payer`     | `idx_tenant_payer_unique`  | `(tenant_id, payer_id)`                 | Prevent duplicate tenant-payer |
| `payer_capability` | `idx_capability_payer_key` | `(payer_id, capability_key, tenant_id)` | Prevent duplicate capabilities |

#### Existing indexes (from v1-v5, already deployed)

- `platform_audit_event`: tenant+created_at, entity, action
- `idempotency_key`: tenant+key (unique), expires_at
- `outbox_event`: published+created_at, aggregate
- `payer`: tenant, country
- `payer_capability`: payer_id
- `denial_case`: tenant, payer, status
- `payment_record`: tenant, claim_ref

---

## 4. Timeouts + Retries

### Statement timeout

All connections have `statement_timeout` set at pool level (default 30s).
This kills any query that runs longer than the threshold. Protects against:

- Accidental full-table scans on large audit tables
- Runaway aggregation queries
- Deadlocked queries that consume connections

Configure via: `PLATFORM_PG_STATEMENT_TIMEOUT_MS=30000`

### Idle-in-transaction timeout

Connections idle inside a `BEGIN` block are killed after 10s (default).
This prevents connection leaks from forgotten `COMMIT`/`ROLLBACK`.

Configure via: `PLATFORM_PG_IDLE_TX_TIMEOUT_MS=10000`

### Retry logic (`pg-retry.ts`)

The `withPgRetry()` function wraps any PG operation with:

- **Exponential backoff**: 100ms base, 2x growth, 5s cap
- **Jitter**: Random component to prevent thundering herd
- **Max retries**: 3 (configurable)
- **Transient error detection**: Only retries on known-safe PG error codes:
  - `08xxx` (connection errors)
  - `40001` (serialization failure)
  - `40P01` (deadlock)
  - `57P01` (admin shutdown -- e.g. PgBouncer restart)
  - `53300` (too many connections)
  - ECONNREFUSED, ECONNRESET, ETIMEDOUT

Non-transient errors (constraint violations, syntax errors) fail immediately.

### Idempotency middleware (`idempotency.ts`)

Request-level deduplication for POST/PUT/PATCH mutations:

1. Client sends `Idempotency-Key: <uuid>` header
2. Middleware checks in-memory store for matching key
3. If found and not expired: return cached response with `Idempotency-Replayed: true`
4. If not found: proceed with request, cache response for 24 hours
5. If no header: request proceeds normally (no deduplication)

**Store**: In-memory Map (max 10K entries, lazy expiry pruning).
When PG is active, the `idempotency_key` table (Phase 101) provides
persistent storage. Migration to PG-backed store is a future enhancement.

**TTL**: 24 hours (configurable via `IDEMPOTENCY_TTL_MS`)

---

## 5. Load Testing

### k6 DB Load Test (`tests/k6/db-load.js`)

Tests payer-db endpoints under concurrent load:

| Scenario  | VUs  | Duration | Target           |
| --------- | ---- | -------- | ---------------- |
| Ramp-up   | 1-10 | 10s      | Gradual pressure |
| Sustained | 10   | 20s      | Steady state     |
| Ramp-down | 10-0 | 5s       | Graceful drain   |

**Thresholds:**

- Read latency p(95) < 500ms
- Write latency p(95) < 1000ms
- Error rate < 5%

**Endpoints tested:**

1. `GET /admin/payer-db/payers` -- paginated list
2. `GET /admin/payer-db/backend` -- lightweight health
3. `GET /admin/payer-db/payers/stats` -- aggregation
4. `GET /admin/payer-db/payers/:id` -- single record
5. `GET /admin/payer-db/audit` -- time-ordered list
6. `PATCH /admin/payer-db/payers/:id` -- write with idempotency

**Run manually:**

```bash
k6 run tests/k6/db-load.js
```

---

## 6. Environment Variables Reference

| Variable                           | Default  | Description                    |
| ---------------------------------- | -------- | ------------------------------ |
| `PLATFORM_PG_URL`                  | (none)   | Connection string for Postgres |
| `PLATFORM_PG_POOL_MIN`             | 2        | Minimum pool connections       |
| `PLATFORM_PG_POOL_MAX`             | 10       | Maximum pool connections       |
| `PLATFORM_PG_STATEMENT_TIMEOUT_MS` | 30000    | Query execution timeout        |
| `PLATFORM_PG_IDLE_TX_TIMEOUT_MS`   | 10000    | Idle transaction timeout       |
| `IDEMPOTENCY_TTL_MS`               | 86400000 | Idempotency key TTL (24h)      |

---

## 7. Monitoring Recommendations

### Pool metrics (available at `/admin/payer-db/backend`)

- `poolSize`: total connections in pool
- `idleCount`: connections not serving requests
- `waitingCount`: requests waiting for a connection (> 0 = pool exhaustion)

### Alert thresholds

| Metric                 | Warning     | Critical    |
| ---------------------- | ----------- | ----------- |
| Pool waiting count     | > 0 for 30s | > 5 for 10s |
| Statement timeout rate | > 1/min     | > 5/min     |
| Connection error rate  | > 0.5/min   | > 5/min     |
| p95 query latency      | > 200ms     | > 500ms     |

### Postgres-side monitoring

```sql
-- Connection count by state
SELECT state, count(*) FROM pg_stat_activity
WHERE datname = 've_platform' GROUP BY state;

-- Long-running queries
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND query_start < now() - interval '5 seconds';

-- Table sizes (for partition trigger)
SELECT relname, pg_size_pretty(pg_total_relation_size(oid))
FROM pg_class WHERE relname LIKE '%audit%' OR relname LIKE '%outbox%';

-- Index usage
SELECT indexrelname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public' ORDER BY idx_scan DESC;
```
