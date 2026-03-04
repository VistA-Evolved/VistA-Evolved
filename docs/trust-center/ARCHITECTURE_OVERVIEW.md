# VistA-Evolved Architecture Overview

> High-level architecture for trust center stakeholders.
> Phase 316 (Wave 13)

## System Components

```
                    +-----------+
                    |  Browser  |
                    +-----+-----+
                          |
              +-----------+-----------+
              |                       |
        +-----v-----+         +------v------+
        |  Web App   |         | Portal App  |
        | (Next.js)  |         | (Next.js)   |
        +-----+------+         +------+------+
              |                       |
              +-----------+-----------+
                          |
                    +-----v-----+
                    |  API       |
                    | (Fastify)  |
                    +-----+-----+
                          |
         +------+----+---+---+----+------+
         |      |    |       |    |      |
    +----v-+ +-v--+ +v---+ +v--+ +v---+ +v----+
    |VistA | |PG  | |S3  | |KC | |PACS| |OTel |
    |MUMPS | |SQL | |Obj | |IAM| |Orth| |Coll |
    +------+ +----+ +----+ +---+ +----+ +-----+
```

## Key Architectural Properties

### 1. VistA-First

All clinical data flows through VistA MUMPS database via the XWB RPC Broker
protocol. The API serves as a modern gateway, not a replacement. VistA global
files remain the source of truth for:

- Patient demographics (File 2)
- Problems (File 9000011)
- Medications (File 100)
- Lab results (File 63)
- Orders (File 100)

### 2. Multi-Tenant

- Tenant isolation via PostgreSQL Row-Level Security (RLS)
- 21+ tables with ENABLE + FORCE RLS policies
- Tenant context set per-transaction (`SET LOCAL app.current_tenant_id`)
- In-memory stores are tenant-aware

### 3. Country-Pack Configurable

- Each deployment loads a `values.json` from `country-packs/<CC>/`
- Regulatory framework, terminology, modules, UI all driven by pack config
- No code branches per market — configuration only

### 4. Module System

- 14 system modules (kernel always enabled)
- 7 SKU profiles (FULL_SUITE down to single-module)
- Adapter pattern: VistA ↔ stub per module (auto-fallback)
- DB-backed entitlements with feature flags

### 5. Zero External Dependencies for Core Protocols

- PG wire protocol: `PgSimpleClient` (Node.js net + crypto only)
- S3 client: AWS Sig V4 (Node.js crypto + http only)
- JWT validation: Zero-dep RS/ES verification
- This minimizes supply chain attack surface

### 6. Defense in Depth

```
Request → Rate Limiter → Auth Gateway → CSRF Check → Module Guard
  → Policy Engine → Route Handler → RPC Broker (with circuit breaker)
    → VistA → Response → PHI Redaction → Audit Log
```

### 7. Observable

- OpenTelemetry tracing (opt-in)
- Prometheus metrics
- Structured logging with request ID propagation
- Production posture introspection (`/posture/*`)

## Data Flow Classification

| Data Class     | Storage           | Encryption           | Access Control            |
| -------------- | ----------------- | -------------------- | ------------------------- |
| Clinical (PHI) | VistA MUMPS       | VistA globals        | VistA DUZ + Policy Engine |
| Session        | PostgreSQL        | Token SHA-256        | httpOnly cookie           |
| Audit          | JSONL + S3        | Hash chain integrity | Admin only                |
| Analytics      | In-memory + ROcto | No PHI by design     | analytics_viewer/admin    |
| Imaging        | Orthanc + VistA   | DICOM/DICOMweb       | imaging_view permission   |
| Configuration  | JSON files + PG   | N/A                  | Admin only                |
