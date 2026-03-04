# Store Policy — VistA-Evolved

> **Canonical standard for all data stores in the API layer.**
> Phase 114: Durability Wave 1.

---

## 1. Store Classifications

Every data store in `apps/api/src/**` MUST be tagged with one of these
classifications. The classification determines persistence requirements.

### A. Durable Domain State

**Definition:** Application state that represents real workflow progress,
user sessions, work queue items, audit trails, configuration, or any data
whose loss would require human re-entry or cause operational harm.

**Rules:**

- MUST be persisted in the platform database (SQLite dev, Postgres prod).
- MUST survive API restart without data loss.
- MUST have a corresponding Drizzle schema table in `platform/db/schema.ts`.
- MUST have a repo layer in `platform/db/repo/`.
- Map-based stores are **forbidden** for durable domain state.

**Examples:** Auth sessions, RCM work queue items, payer capability matrix,
claim drafts, credential artifacts, module entitlements, audit events.

### B. Ephemeral Cache

**Definition:** Computed or derived data that can be reconstructed from
durable sources. Performance optimization only.

**Rules:**

- MUST have a TTL (time-to-live). Default max: 5 minutes.
- MUST be reconstructable from DB or external source on cache miss.
- Map-based stores are acceptable with TTL enforcement.
- MUST include a `classification: "ephemeral-cache"` tag or comment.
- Loss on restart is acceptable and expected.

**Examples:** RPC capability cache, parsed RPC results, session lookup cache
(with DB fallback), compiled regex caches.

### C. Seed / Config Data

**Definition:** Static or slowly-changing reference data loaded from JSON
files, environment variables, or config modules at startup.

**Rules:**

- JSON files in `config/` or `data/` are read-only at runtime.
- Changes require code deployment or admin import endpoint.
- May be loaded into DB via seed/import (one-time, idempotent).
- NEVER mutated by application logic at runtime.

**Examples:** `config/modules.json`, `config/skus.json`,
`data/payers/*.json`, payer seed files.

### D. Snapshots / Exports

**Definition:** Point-in-time captures written to disk for audit,
compliance, or export purposes.

**Rules:**

- Written to `data/` or `artifacts/` directories.
- Immutable once written (append-only or versioned).
- Not the active system of record.
- May be imported back via admin endpoints.

**Examples:** `data/rcm-exports/*.x12`, `data/regulator-snapshots/`,
`data/evidence/`.

---

## 2. Enforcement Rules

### New Map Store Requirement

Any new `Map<>` store in `apps/api/src/**` requires:

1. Classification tag in a header comment.
2. If Ephemeral Cache: TTL value and reconstruction source documented.
3. If Durable Domain State: **rejected** -- must use DB repo instead.
4. Justification comment explaining why a Map is appropriate.

### PHI / ePHI Rules

- Stores containing PHI (patient DFN, names, SSN, DOB, clinical data)
  MUST follow redaction rules from `AGENTS.md`.
- Raw PHI values MUST NOT appear in log output.
- Session tokens MUST be stored as hashes, never raw values.
- Audit entries MUST sanitize PHI before persistence.

### Migration Path for Legacy Map Stores

Existing Map stores classified as Durable Domain State must be migrated
to DB-backed repos. Each migration follows this pattern:

1. Add DB table to `schema.ts` + DDL to `migrate.ts`.
2. Create repo in `platform/db/repo/`.
3. Update the store module to delegate to the repo.
4. Preserve the existing public API (function signatures unchanged).
5. Add restart-durability test coverage.

---

## 3. Current Store Inventory (Phase 114)

| Store                                 | Classification       | Status                                                  |
| ------------------------------------- | -------------------- | ------------------------------------------------------- |
| `session-store.ts` (auth)             | Durable Domain State | **Migrated** (Phase 114)                                |
| `workqueue-store.ts` (RCM)            | Durable Domain State | **Migrated** (Phase 114)                                |
| `capability-matrix.ts` (PayerOps)     | Durable Domain State | **Migrated** (Phase 114)                                |
| `registry-store.ts` (PayerOps)        | Durable Domain State | DB-backed via payer-repo (Phase 95B)                    |
| `store.ts` (PayerOps enrollments/LOA) | Durable Domain State | DB-backed via loa_request/credential tables (Phase 110) |
| `claim-store.ts` (RCM claims)         | Durable Domain State | DB-backed via claim_draft (Phase 111)                   |
| `room-store.ts` (telehealth)          | Ephemeral Cache      | Acceptable (4hr TTL, rooms are transient)               |
| `imaging-worklist.ts`                 | Ephemeral Cache      | Acceptable (documented migration plan)                  |
| `imaging-ingest.ts`                   | Ephemeral Cache      | Acceptable (quarantine is transient)                    |
| `analytics-store.ts`                  | Ephemeral Cache      | Acceptable (ring buffer, aggregated to DB)              |
| RPC capability cache                  | Ephemeral Cache      | Acceptable (5min TTL)                                   |
| Account lockout store                 | Ephemeral Cache      | Acceptable (security rate-limiting, short TTL)          |
