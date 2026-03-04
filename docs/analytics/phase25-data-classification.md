# Phase 25 — Data Classification & Governance

> Defines data classes, allowed storage patterns, and access controls
> for the VistA-Evolved analytics subsystem.

## 1. Data Classification

All data in VistA-Evolved falls into one of four classes:

| Class                       | Description                                                       | Examples                                                                            | Storage                               | Access                                           |
| --------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------ |
| **Class 1 — PHI**           | Protected Health Information — patient-identifiable clinical data | Patient name, SSN, DFN, DOB, diagnoses, medications, notes text, imaging pixel data | VistA globals only (^DPT, ^TIU, etc.) | Session + clinical role, full audit trail        |
| **Class 2 — De-identified** | Clinical data with identifiers removed/hashed                     | Salted-hashed DFN, age ranges, diagnosis codes without patient linkage              | Analytics store (append-only)         | analytics_viewer + admin, audit trail            |
| **Class 3 — Aggregated**    | Statistical summaries with no individual-level data               | Daily order counts, hourly login counts, average RPC latency, modality volume       | Analytics SQL tables, BI exports      | analytics_viewer, SQL read-only user             |
| **Class 4 — Operational**   | Platform infrastructure metrics — no clinical content             | API uptime, heap memory, circuit breaker state, rate limit hits, cache stats        | Analytics event stream, /metrics      | Ops staff, monitoring tools, no auth on /metrics |

## 2. PHI Boundary Rules

### MUST stay in VistA / clinical subsystem

- Patient DFN (never in analytics store — only in audit subsystem)
- Patient name, SSN, DOB
- Clinical note text, medication details, allergy details
- DICOM pixel data, study-level metadata with patient names
- Any data retrievable via VistA RPCs that contains patient identifiers

### MAY cross into de-identified analytics

- Event counts per action type (e.g., "12 notes created today")
- Hashed user ID (salted SHA-256 of DUZ — not reversible without salt)
- Facility/tenant ID (not PHI)
- Timestamp (rounded to hour for aggregation)
- Error codes and categories (not error messages with patient data)

### NEVER in analytics

- Raw patient DFN, name, SSN, DOB
- Clinical note text or excerpts
- Medication names linked to patient
- Diagnosis text linked to patient
- DICOM instance UIDs linked to patient
- VistA credentials (access/verify codes)

## 3. Storage Patterns

### 3a. VistA Clinical Data (PHI class)

- **Source**: VistA RPC calls (ORWRP, TIU, GMRA, etc.)
- **Storage**: Pass-through only — API does not persist clinical data
- **Cache**: In-memory, per-user+patient, short TTL (≤60s), auto-evict
- **Access**: Session auth + appropriate clinical role
- **Audit**: Every access logged to general audit trail

### 3b. Analytics Event Stream (Operational + De-identified)

- **Source**: API middleware, route handlers, RPC resilience layer
- **Storage**: In-memory ring buffer (configurable max entries)
- **Persistence**: Optional JSONL file via `ANALYTICS_EVENT_FILE` env var
- **Access**: analytics_viewer permission (read), analytics_admin (export)
- **PHI safety**: Events are structurally prevented from containing PHI
  - No patient DFN field in event schema
  - User IDs are salted-hashed before storage
  - Detail fields pass through `sanitizeAnalyticsDetail()`

### 3c. Aggregated Metrics (Aggregated class)

- **Source**: Periodic aggregation job (hourly/daily) over event stream
- **Storage**: In-memory metrics tables + Octo SQL tables for BI
- **Access**: analytics_viewer (dashboards), SQL read-only user (BI tools)
- **PHI safety**: Only counts, averages, percentiles — no individual records

### 3d. Octo SQL Tables (Aggregated class)

- **Source**: ETL from aggregated metrics
- **Storage**: Dedicated YottaDB instance (NOT the clinical VistA engine)
- **Access**: ROcto wire protocol (PostgreSQL-compatible)
  - `bi_readonly` user — SELECT only on aggregate tables
  - `etl_writer` user — INSERT/UPDATE for aggregation jobs
- **Network**: Internal only by default; IP allowlist if exposed
- **PHI safety**: Tables contain only aggregated counts/averages

## 4. Access Control Matrix

| Resource                       | None | Session      | analytics_viewer | analytics_admin | admin        |
| ------------------------------ | ---- | ------------ | ---------------- | --------------- | ------------ |
| /metrics (ops)                 | ✅   | ✅           | ✅               | ✅              | ✅           |
| /analytics/dashboards/\*       | ❌   | ❌           | ✅               | ✅              | ✅           |
| /analytics/events (query)      | ❌   | ❌           | ✅               | ✅              | ✅           |
| /analytics/export/\*           | ❌   | ❌           | ❌               | ✅              | ✅           |
| /analytics/config              | ❌   | ❌           | ❌               | ✅              | ✅           |
| ROcto SQL (read-only)          | ❌   | ❌           | ✅               | ✅              | ✅           |
| ROcto SQL (write)              | ❌   | ❌           | ❌               | ❌              | ETL only     |
| /vista/reports (clinical)      | ❌   | ✅           | ✅               | ✅              | ✅           |
| /vista/reports/text (clinical) | ❌   | ✅ (+ audit) | ✅ (+ audit)     | ✅ (+ audit)    | ✅ (+ audit) |

## 5. Audit Requirements

| Action                     | When                         | What's Logged                             |
| -------------------------- | ---------------------------- | ----------------------------------------- |
| `analytics.view-dashboard` | Dashboard data requested     | Actor, dashboard type, tenant             |
| `analytics.export-metrics` | CSV/JSON export requested    | Actor, metric type, date range, row count |
| `analytics.query-events`   | Event stream queried         | Actor, filters applied                    |
| `analytics.sql-connect`    | ROcto connection established | Source IP, username, timestamp            |
| `phi.reports-view`         | VistA clinical report viewed | Actor, patient DFN, report type           |

## 6. Retention Policy

| Data Class         | Default Retention                   | Configurable                         |
| ------------------ | ----------------------------------- | ------------------------------------ |
| PHI (pass-through) | Not stored                          | N/A                                  |
| Analytics events   | 7 days in-memory, 90 days JSONL     | `ANALYTICS_RETENTION_DAYS`           |
| Aggregated metrics | 365 days                            | `ANALYTICS_AGGREGATE_RETENTION_DAYS` |
| Audit trail        | 90 days in-memory, indefinite JSONL | `AUDIT_RETENTION_DAYS`               |
| Octo SQL tables    | 365 days                            | Manual cleanup                       |

## 7. VistA-First Compliance

All clinical data flows through VistA RPCs. The analytics subsystem:

- **Does NOT** query VistA globals directly for analytics
- **Does NOT** store clinical data outside VistA's jurisdiction
- **Does** capture operational telemetry about API interactions
- **Does** aggregate de-identified usage patterns
- **Does** provide SQL access to aggregated (non-PHI) metrics only
