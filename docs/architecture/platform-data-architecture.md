# Platform Data Architecture

> **Phase 101 v2 — Postgres-first Platform Data Layer**
>
> This document defines the authoritative data boundaries, tenancy model,
> audit posture, and migration strategy for VistA-Evolved's platform tier.

---

## 1. Data Boundary — Authoritative Sources

| Data Class                                                                                | Authoritative Source                                                 | Read Model Allowed?                    | Notes                                                     |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------- |
| **Clinical data** (vitals, orders, notes, allergies, meds, labs)                          | **VistA / YottaDB**                                                  | Yes (short-TTL cache in API memory)    | Never duplicate into Platform DB. Always call VistA RPCs. |
| **Patient demographics**                                                                  | **VistA** (file 2)                                                   | Yes (API cache, 5-min TTL)             | Never store PII in Platform DB.                           |
| **Platform state** (payers, denials, recon, eligibility, claims, sessions, audit, config) | **PostgreSQL** (Platform DB)                                         | N/A — this IS the source               | Multi-tenant, ACID, horizontally scalable.                |
| **Evidence / EDI exports / uploads**                                                      | **Object storage** (S3/MinIO)                                        | Metadata in Postgres, blobs in storage | Local FS (`data/`) in dev; MinIO or S3 in prod.           |
| **Audit trails**                                                                          | **Dual sink**: Postgres (queryable) + JSONL (tamper-evident archive) | N/A — append-only in both              | Hash-chained entries written to both.                     |
| **Analytics (de-identified)**                                                             | **ROcto/YottaDB** (SQL analytics)                                    | Yes — read-only for BI tools           | No PHI. ETL from Postgres aggregations.                   |
| **Tenant configuration**                                                                  | **PostgreSQL**                                                       | Cached in API memory (5-min TTL)       | Source of truth in DB; cache for performance.             |

### Clinical vs Platform Boundary Rule

> **If data originates from a VistA RPC, VistA is authoritative.**
> The Platform DB may store references (DFN, IEN, claim-to-encounter linkage)
> but NEVER duplicate clinical content. Violation of this rule constitutes
> a data lineage defect.

---

## 2. Tenancy Model

### 2.1 Phase 101: Shared Database + `tenant_id` Column

```
┌────────────────────────────────────────┐
│         PostgreSQL (single DB)         │
│                                        │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ tenant_a │ │ tenant_b │ │ admin  │ │
│  │  (rows)  │ │  (rows)  │ │(global)│ │
│  └──────────┘ └──────────┘ └────────┘ │
│                                        │
│  Row Level Security (RLS) enforced     │
│  via SET app.current_tenant_id = ?     │
└────────────────────────────────────────┘
```

- **Every platform table** has a `tenant_id TEXT NOT NULL` column
  (exception: global reference tables like `payer` have nullable `tenant_id`)
- **Application-level enforcement**: The `TenantContext` module wraps every
  query to inject `WHERE tenant_id = ?` automatically
- **Optional RLS** (gated by `PLATFORM_DB_RLS_ENABLED=true`):
  - Postgres policies enforce `tenant_id = current_setting('app.current_tenant_id')`
  - This provides defense-in-depth even if application logic has bugs
  - Enabled in production; off in dev/test for simpler debugging

### 2.2 Future: Database-per-Tenant

When a large enterprise tenant needs data isolation:

1. Create a dedicated Postgres database
2. Point their `tenant_id` config to the dedicated connection string
3. The PlatformStore routes queries based on tenant config

This is architecturally supported but not implemented in Phase 101.

---

## 3. Database Schema Conventions

### Naming

- Tables: `snake_case` (e.g., `eligibility_check`, `platform_audit_event`)
- Columns: `snake_case` (e.g., `tenant_id`, `created_at`)
- Primary keys: `id TEXT` (UUID v4, prefixed where useful: `elig-`, `cstat-`)
- Timestamps: `TIMESTAMPTZ` (ISO 8601 with timezone)
- JSON columns: `JSONB` (Postgres native JSON)

### Required columns on every table

```sql
id           TEXT PRIMARY KEY,       -- UUID
tenant_id    TEXT NOT NULL,          -- tenant isolation
created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### Soft deletes

Prefer `deleted_at TIMESTAMPTZ` over physical DELETE for audit trail preservation.

---

## 4. Core Platform Tables (Phase 101)

### 4.1 `platform_audit_event` — Append-Only Audit

```sql
CREATE TABLE platform_audit_event (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  action        TEXT NOT NULL,         -- e.g., 'eligibility.checked'
  actor_id      TEXT,                  -- DUZ or system
  detail        JSONB,                 -- sanitized event payload
  prev_hash     TEXT,                  -- SHA-256 of previous entry (chain)
  entry_hash    TEXT NOT NULL,         -- SHA-256 of this entry
  ip_address    TEXT,                  -- hashed in production
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

No UPDATE or DELETE allowed. Enforced by application + optional Postgres trigger.

### 4.2 `idempotency_key` — Write Deduplication

```sql
CREATE TABLE idempotency_key (
  key           TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'processing',  -- processing | completed | failed
  response_code INTEGER,
  response_body JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_idemp_expires ON idempotency_key (expires_at);
```

TTL-based cleanup via periodic job. Prevents duplicate writes during retries.

### 4.3 `outbox_event` — Integration Event Outbox

```sql
CREATE TABLE outbox_event (
  id            TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  event_type    TEXT NOT NULL,         -- e.g., 'claim.submitted', 'eligibility.checked'
  payload       JSONB NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending | published | failed
  attempts      INTEGER NOT NULL DEFAULT 0,
  last_error    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at  TIMESTAMPTZ
);
CREATE INDEX idx_outbox_status ON outbox_event (status, created_at);
```

Pattern: Write domain event + outbox row in same transaction.
A background poller publishes pending events and marks them published.
Guarantees at-least-once delivery without distributed transactions.

---

## 5. Audit Logging Posture

### Dual-Sink Architecture

```
 API Route Handler
       │
       ├──► In-memory ring buffer (fast reads, 10K cap)
       ├──► Postgres platform_audit_event (queryable, indexed)
       └──► JSONL file (tamper-evident archive, compliance)
```

- **All three sinks receive every audit event** (best-effort for file sink)
- **Hash chaining**: Each entry includes `prev_hash` linking to predecessor
- **PHI sanitization**: Applied before writing to any sink
  (SSN, DOB, patient names, clinical content stripped)
- **Retention**: Configurable per tenant (default 7 years for HIPAA)

### Audit Actions

The existing `RcmAuditAction`, `ImagingAuditAction`, and general audit types
are preserved. The Postgres table uses a single `action TEXT` column that
accepts any action string from any domain.

---

## 6. Idempotency Posture

- Every write endpoint that creates or mutates resources SHOULD accept an
  `Idempotency-Key` header
- The key is stored in `idempotency_key` with the response
- Duplicate requests within TTL return the stored response (no re-execution)
- Keys expire after 24 hours (configurable via `IDEMPOTENCY_TTL_MS`)

### Phase 101 Scope

- Table + cleanup job created
- Middleware documented but activation is Phase 102+

---

## 7. Outbox Posture

- Domain operations write an `outbox_event` in the same transaction
- A background poller (5s interval) picks up `status = 'pending'` events
- Events are published to configured consumers (webhook, message queue)
- After successful publish: `status = 'published'`
- After max retries (5): `status = 'failed'`

### Phase 101 Scope

- Table + types created
- Poller infrastructure laid out but disabled (no consumers yet)

---

## 8. Connection Management

### Dev (Docker Compose)

```
Host: 127.0.0.1
Port: 5433 (non-default to avoid conflicts with local Postgres)
Database: ve_platform
User: ve_api
Password: dev-only-password (from .env.local, not committed)
```

### Production

```
PLATFORM_PG_URL=postgres://user:pass@host:5432/ve_platform?sslmode=require
PLATFORM_PG_POOL_MIN=2
PLATFORM_PG_POOL_MAX=20
PLATFORM_PG_RLS_ENABLED=true
```

### Connection Pool

- Uses `node-postgres` (`pg`) driver with Drizzle ORM
- Min 2, Max 20 connections (configurable)
- Idle timeout: 30s
- Statement timeout: 15s (matches RPC timeout)

---

## 9. Migration Strategy

### Approach: Parallel Run → Cutover

1. **Phase 101**: Add Postgres + PlatformStore. Existing SQLite remains primary.
   New platform tables (audit, idempotency, outbox) go to Postgres only.
2. **Phase 102**: Dual-write critical stores (claims, sessions, payers) to both
   SQLite and Postgres. Validate consistency.
3. **Phase 103**: Switch reads to Postgres. SQLite becomes backup.
4. **Phase 104**: Remove SQLite dependency. Postgres is sole platform DB.

### Rollback Safety

- Each phase is independently revertible
- SQLite is never removed until Postgres is proven in production
- Feature flags gate which DB backend is active

---

## 10. Technology Choices

| Concern           | Choice                               | Rationale                                                            |
| ----------------- | ------------------------------------ | -------------------------------------------------------------------- |
| ORM               | **Drizzle ORM** (existing)           | Already in `package.json`, team knows it, supports SQLite + Postgres |
| Driver            | **`pg`** (node-postgres)             | Most mature Node.js Postgres driver, Drizzle native support          |
| Migrations        | **Drizzle Kit** (existing) + raw SQL | `drizzle-kit` for schema gen, custom runner for RLS/triggers         |
| Connection pool   | **`pg.Pool`** built-in               | No additional dependency needed                                      |
| Schema definition | **`drizzle-orm/pg-core`**            | Postgres-native types (TIMESTAMPTZ, JSONB, TEXT)                     |
