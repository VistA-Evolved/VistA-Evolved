# Platform DB Security & Compliance Posture

> Phase 104 -- Security hardening for PlatformStore (SQLite + Postgres)

---

## 1. Access Control Model

### 1.1 Route-Level Authorization

All `/admin/payer-db/*` routes are protected by two layers:

1. **Security middleware (AUTH_RULES):** The regex
   `{ pattern: /^\/(admin|audit|reports)\//, auth: "admin" }` in
   `security.ts` requires admin-level auth for any `/admin/` route.
   This is the _gateway_ check.

2. **In-handler role enforcement (Phase 104):** Every mutation route
   (PATCH, POST, PUT, DELETE) also calls `requireRole(session, ["admin"])`
   inside the handler body. This is _defense-in-depth_ against AUTH_RULES
   misconfiguration or future refactoring.

### 1.2 Tenant Isolation

Every table has a `tenant_id` column (`TEXT NOT NULL DEFAULT 'default'`).
Isolation is enforced through three mechanisms:

| Layer       | Mechanism                       | Where                  |
| ----------- | ------------------------------- | ---------------------- |
| Application | Repos filter by `tenant_id`     | All PG repos           |
| Middleware  | `X-Tenant-Id` header or session | `tenant-middleware.ts` |
| Database    | RLS policies (opt-in)           | `pg-migrate.ts`        |

The `tenant-context.ts` sets `SET LOCAL app.current_tenant_id` on every
PG client before executing queries. This enables Postgres RLS to enforce
isolation at the database level.

### 1.3 Admin Bypass

Admin role gets superuser bypass at the _route_ level (can access any
tenant's data). This is **auditable**: all mutations include `actor`
(DUZ) and `reason` fields in the audit trail. No anonymous mutations
are possible.

---

## 2. Audit Trail

### 2.1 Architecture

Two audit subsystems coexist:

| System         | Table                  | Scope                 | Hash-Chained?             |
| -------------- | ---------------------- | --------------------- | ------------------------- |
| Platform Audit | `platform_audit_event` | PG-only, cross-domain | Yes (SHA-256)             |
| Payer Audit    | `payer_audit_event`    | Both SQLite + PG      | No (append-only triggers) |

### 2.2 Append-Only Enforcement

**Application level:** Audit repositories expose READ-ONLY methods only.
No update or delete functions exist in `audit-repo.ts`.

**Database level (PG):** Migration v7 adds `BEFORE UPDATE OR DELETE`
triggers on both audit tables:

```sql
CREATE TRIGGER trg_platform_audit_immutable
  BEFORE UPDATE OR DELETE ON platform_audit_event
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
```

The `prevent_audit_mutation()` function raises an exception with a
clear message identifying the table. Even a direct SQL `UPDATE` or
`DELETE` on the audit table will be blocked.

### 2.3 Tamper Detection (Hash Chain)

`platform_audit_event` uses SHA-256 hash chaining:

```
entry_hash = SHA-256(tenant_id | actor | action | entity_type | entity_id | detail | prev_hash | created_at)
prev_hash  = entry_hash of the previous entry (by created_at order)
```

Verification: `GET /admin/payer-db/audit/verify` walks the full chain
and confirms each hash matches the computed value.

### 2.4 Retention Policy

| Parameter        | Default               | Env Var                         |
| ---------------- | --------------------- | ------------------------------- |
| Retention period | 395 days (~13 months) | `PLATFORM_AUDIT_RETENTION_DAYS` |
| Auto-purge       | disabled              | `PLATFORM_AUDIT_AUTO_PURGE`     |
| Idempotency TTL  | 24 hours              | `IDEMPOTENCY_TTL_MS`            |

**Export before deletion:** Use `GET /admin/payer-db/audit/export`
with `since` and `until` query parameters to export entries as
PHI-sanitized JSON. Max 50K rows per export. All PHI patterns
(SSN, DOB) are scrubbed from `detail` fields.

**Retention view:** `GET /admin/payer-db/audit/retention` returns
the current policy configuration.

---

## 3. Data Integrity

### 3.1 Optimistic Concurrency

Migration v7 adds `version INTEGER NOT NULL DEFAULT 1` to all
mutable tables:

- `payer`
- `tenant_payer`
- `payer_capability`
- `payer_task`
- `payer_evidence_snapshot`

**How it works:**

1. Client reads an entity (response includes current `version`)
2. Client sends update with `expectedVersion` in request body
3. Server compares `expectedVersion` to current DB `version`
4. If mismatch: 409 Conflict with `CONCURRENCY_CONFLICT` error
5. If match: update proceeds, `version` incremented to `N+1`

**API usage:**

```json
PATCH /admin/payer-db/payers/AETNA-US
{
  "canonicalName": "Aetna (CVS Health)",
  "reason": "Name change after acquisition",
  "expectedVersion": 3
}
```

If another request updated the payer between the read and this PATCH,
the response will be:

```json
409 Conflict
{
  "ok": false,
  "error": "Optimistic concurrency conflict: expected version 3, found 4"
}
```

### 3.2 Attribution

Migration v7 adds `updated_by TEXT` to mutable tables. Every update
records the DUZ of the user who made the change.

---

## 4. Transmission Security

### 4.1 TLS Configuration

The PG connection pool supports TLS via environment variables:

| Env Var                | Values                                                           | Description                                  |
| ---------------------- | ---------------------------------------------------------------- | -------------------------------------------- |
| `PLATFORM_PG_SSL`      | `false` (default), `true`, `require`, `verify-ca`, `verify-full` | SSL mode                                     |
| `PLATFORM_PG_SSL_CA`   | File path                                                        | CA certificate for `verify-ca`/`verify-full` |
| `PLATFORM_PG_SSL_CERT` | File path                                                        | Client certificate (mutual TLS)              |
| `PLATFORM_PG_SSL_KEY`  | File path                                                        | Client private key (mutual TLS)              |

**SSL Modes:**

- `false`: No TLS (default -- development only)
- `true` / `require`: TLS enabled, certificate not validated (`rejectUnauthorized: false`)
- `verify-ca`: TLS enabled, server certificate verified against CA
- `verify-full`: TLS enabled, server certificate + hostname verified

**Production requirement:** Set `PLATFORM_PG_SSL=verify-full` with
a proper CA certificate. Never use `true`/`require` in production --
it's vulnerable to MITM attacks.

### 4.2 Connection String Security

- `PLATFORM_PG_URL` is loaded from `.env.local` (gitignored)
- The connection string is never logged
- Pool errors log only `err.message`, not the connection string

---

## 5. Row-Level Security (RLS)

### 5.1 Overview

PostgreSQL RLS is _optional_ and gated behind `PLATFORM_PG_RLS_ENABLED=true`.
When enabled, it provides defense-in-depth tenant isolation at the
database engine level.

### 5.2 Policy

Migration v7 creates the `create_tenant_rls_policy()` function:

```sql
CREATE OR REPLACE FUNCTION create_tenant_rls_policy(tbl TEXT) RETURNS void AS $$
BEGIN
  ALTER TABLE tbl ENABLE ROW LEVEL SECURITY;
  ALTER TABLE tbl FORCE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation ON tbl
    USING (tenant_id = current_setting('app.current_tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));
END;
$$ LANGUAGE plpgsql;
```

### 5.3 FORCE ROW LEVEL SECURITY

The `FORCE` keyword is critical: without it, table owners (the
connection user) bypass RLS entirely. With `FORCE`, even the owner
is subject to the policy.

**Considerations:**

1. **Superusers still bypass FORCE RLS.** The DB connection user
   should NOT be a superuser in production.
2. **Maintenance queries** (migrations, bulk imports) must set
   `app.current_tenant_id` before running, or they'll see no rows.
3. **Emergency access:** If RLS locks out all access, connect as
   superuser and `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`.
4. **Default tenant:** Single-tenant mode uses `'default'` as
   the tenant ID. All 21 tenant-scoped tables use this default.

### 5.4 Covered Tables

RLS policies apply to all 21 tenant-scoped tables:

- Core: platform_audit_event, idempotency_key, outbox_event
- Payer: payer, tenant_payer, payer_capability, payer_task,
  payer_evidence_snapshot, payer_audit_event
- Denial: denial_case, denial_action, denial_attachment,
  resubmission_attempt
- Payments: remittance_import, payment_record,
  reconciliation_match, underpayment_case
- Verification: eligibility_check, claim_status_check
- Matrix: capability_matrix_cell, capability_matrix_evidence

---

## 6. Secret & PHI Protection

### 6.1 Pre-Commit Hook

`.hooks/pre-commit.ps1` scans staged files for:

- Known sandbox credentials (`PROV123`, `PHARM123`, `NURSE123`)
- Generic credential patterns (`password =`, `api_key =`, `secret =`)

**Exempt files:** Login page (`page.tsx`), `.env.example`,
`.env.local`, `AGENTS.md`, `BUG-TRACKER.md`, runbooks, test files.

### 6.2 No PHI in Logs

- Audit detail fields are sanitized via `sanitizeAuditDetail()`
  which strips SSN (###-##-####), DOB patterns, and numeric SSN
- The PG pool error handler logs only `err.message`
- RPC broker debug logging uses `log.debug()` (suppressed in production)
- Analytics events structurally lack DFN fields (Phase 25)

### 6.3 Git-Ignored Secrets

| File               | Purpose              | Git Status    |
| ------------------ | -------------------- | ------------- |
| `.env.local`       | Runtime credentials  | `.gitignore`d |
| `cookies.txt`      | Test session cookies | `.gitignore`d |
| `data/platform.db` | SQLite data          | `.gitignore`d |

---

## 7. Migration v7: Security & Integrity

Migration v7 (`security_integrity_posture`) adds:

1. `version` column to 5 mutable tables
2. `updated_by` column to 4 mutable tables
3. `create_tenant_rls_policy()` PG function with FORCE RLS
4. `prevent_audit_mutation()` trigger function
5. Append-only triggers on `platform_audit_event` and `payer_audit_event`

---

## 8. Compliance Mapping

| Control               | HIPAA Reference | Implementation                                |
| --------------------- | --------------- | --------------------------------------------- |
| Access control        | 164.312(a)(1)   | AUTH_RULES + in-handler requireRole           |
| Audit trail           | 164.312(b)      | Hash-chained platform_audit_event             |
| Integrity controls    | 164.312(c)(1)   | Append-only triggers + optimistic concurrency |
| Transmission security | 164.312(e)(1)   | TLS config (PLATFORM_PG_SSL)                  |
| Authentication        | 164.312(d)      | Session-based auth + CSRF                     |
| PHI minimum necessary | 164.502(b)      | PHI sanitization in audit + analytics         |

---

## 9. Environment Variables Summary

| Variable                           | Default | Purpose                      |
| ---------------------------------- | ------- | ---------------------------- |
| `PLATFORM_PG_URL`                  | (none)  | PostgreSQL connection string |
| `PLATFORM_PG_SSL`                  | `false` | SSL mode                     |
| `PLATFORM_PG_SSL_CA`               | (none)  | CA certificate path          |
| `PLATFORM_PG_SSL_CERT`             | (none)  | Client certificate path      |
| `PLATFORM_PG_SSL_KEY`              | (none)  | Client private key path      |
| `PLATFORM_PG_RLS_ENABLED`          | `false` | Enable Row-Level Security    |
| `PLATFORM_AUDIT_RETENTION_DAYS`    | `395`   | Audit retention period       |
| `PLATFORM_AUDIT_AUTO_PURGE`        | `false` | Auto-purge expired entries   |
| `PLATFORM_PG_STATEMENT_TIMEOUT_MS` | `30000` | Max query time               |
| `PLATFORM_PG_IDLE_TX_TIMEOUT_MS`   | `10000` | Idle transaction timeout     |
