# VistA-Evolved Trust Center

> Public-facing security and compliance posture documentation.
> Last updated: Phase 316 (Wave 13)

## 1. Platform Overview

VistA-Evolved is an open-source electronic health record platform built on
the U.S. Department of Veterans Affairs VistA system with modern web
architecture. It serves healthcare organizations across multiple countries
with configurable regulatory compliance.

### Supported Markets

| Market        | Framework             | Status | Country Pack |
| ------------- | --------------------- | ------ | ------------ |
| United States | HIPAA                 | Active | US v1.0.0    |
| Philippines   | DPA 2012 (R.A. 10173) | Active | PH v1.0.0    |
| Ghana         | DPA 2012 (Act 843)    | Draft  | GH v0.1.0    |

---

## 2. Security Architecture

### Authentication

| Method            | Description                                                   | Phase    |
| ----------------- | ------------------------------------------------------------- | -------- |
| VistA RPC Broker  | Native Access/Verify code authentication against VistA KERNEL | Phase 1  |
| OIDC / OAuth 2.0  | OpenID Connect with Keycloak (RS256-512, ES256-384-512)       | Phase 35 |
| WebAuthn Passkeys | FIDO2 passwordless via Keycloak WebAuthn provider             | Phase 35 |

- OIDC is mandatory in `rc` and `prod` runtime modes (Phase 150)
- Session tokens are SHA-256 hashed in database storage (Phase 150)
- CSRF protection uses session-bound synchronizer tokens (Phase 132)

### Authorization

- **Policy Engine**: Default-deny with ~40 action mappings (Phase 35)
- **Module Guard**: SKU-based route access control (Phase 37C)
- **Imaging RBAC**: Permission-based access with break-glass (Phase 24)
- **Analytics RBAC**: Role-mapped viewer/admin permissions (Phase 25)
- **RCM RBAC**: Admin-only claim management (Phase 38)

### Data Protection

- **PHI Redaction**: Centralized `sanitizeAuditDetail()` strips SSN, DOB,
  patient names, DFN from all audit/logging paths (Phase 151)
- **Analytics Isolation**: Analytics events structurally lack patient DFN;
  user IDs are salted SHA-256 hashed (Phase 25)
- **OTel PHI Strip**: Collector configuration deletes request/response bodies,
  DB statements, and patient attributes (Phase 36)
- **No PHI in Telehealth URLs**: Room IDs are opaque hex tokens (Phase 30)

---

## 3. Audit & Compliance

### Audit Trails

| Trail           | Scope                  | Chain Type         | Verification Endpoint       |
| --------------- | ---------------------- | ------------------ | --------------------------- |
| Immutable Audit | General operations     | SHA-256 hash chain | `GET /iam/audit/verify`     |
| Imaging Audit   | DICOMweb + imaging ops | SHA-256 hash chain | `GET /imaging/audit/verify` |
| RCM Audit       | Claims + billing       | SHA-256 hash chain | `GET /rcm/audit/verify`     |

- File-based JSONL persistence at `logs/immutable-audit.jsonl` (Phase 35)
- S3/MinIO audit shipping with SHA-256 manifests (Phase 157)
- Tenant-partitioned object keys for multi-tenant isolation

### Compliance Matrix

23 regulatory requirements mapped across three frameworks:

| Framework | Implemented | Partial | Planned | N/A | Coverage |
| --------- | ----------- | ------- | ------- | --- | -------- |
| HIPAA     | 8           | 2       | 1       | 1   | 91%      |
| DPA_PH    | 5           | 0       | 1       | 0   | 83%      |
| DPA_GH    | 4           | 0       | 1       | 0   | 80%      |

Access via `GET /compliance/matrix` (Phase 315).

### Known Gaps

| Gap                             | Frameworks | Status          |
| ------------------------------- | ---------- | --------------- |
| Breach notification workflow    | All        | Planned         |
| At-rest encryption verification | HIPAA      | Infra-dependent |
| TLS enforcement verification    | HIPAA      | Infra-dependent |

---

## 4. Data Residency

### Supported Regions

| Region  | Location            | Status  |
| ------- | ------------------- | ------- |
| us-east | Virginia, US        | Active  |
| us-west | Oregon, US          | Active  |
| ph-mnl  | Manila, Philippines | Active  |
| gh-acc  | Accra, Ghana        | Planned |
| eu-fra  | Frankfurt, EU       | Planned |
| local   | On-premise          | Active  |

- Tenant-scoped region assignment (immutable after creation)
- Cross-border transfer requires consent validation
- Per-region PG URL routing (Phase 311)

---

## 5. Infrastructure Security

### Runtime Modes

| Mode | PG Required | OIDC Required | SQLite Allowed | JSON Stores |
| ---- | ----------- | ------------- | -------------- | ----------- |
| dev  | No          | No            | Yes            | Yes         |
| test | No          | No            | Yes            | Yes         |
| rc   | Yes         | Yes           | No             | No          |
| prod | Yes         | Yes           | No             | No          |

### Rate Limiting

- General API: Fastify rate limiter (Phase 16)
- DICOMweb proxy: 120 req/60s per user (Phase 24)
- Configurable via environment variables

### Circuit Breaker

- 5 failures open, 30s half-open, 2 retries with backoff
- `/ready` returns `ok: false` when open (K8s readiness probe safe)
- `/health` always returns 200 (liveness)

### Graceful Shutdown

- 30s drain timeout (configurable via `SHUTDOWN_DRAIN_TIMEOUT_MS`)
- RPC broker disconnection on SIGINT/SIGTERM
- Aggregation jobs stopped cleanly

---

## 6. Third-Party Dependencies

### Infrastructure

| Component      | Version      | Purpose                |
| -------------- | ------------ | ---------------------- |
| WorldVistA EHR | Docker image | VistA MUMPS database   |
| Keycloak       | 24.x         | OIDC identity provider |
| PostgreSQL     | 16.x         | Platform database      |
| Orthanc        | Latest       | DICOM/PACS server      |
| OHIF Viewer    | Latest       | Medical imaging viewer |
| YottaDB/Octo   | Latest       | Analytics SQL engine   |

### Application

| Component   | Purpose                |
| ----------- | ---------------------- |
| Fastify     | API server             |
| Next.js     | Web + portal frontends |
| next-intl   | Internationalization   |
| prom-client | Prometheus metrics     |

No external database drivers — PG uses zero-dependency wire protocol (Phase 25D).
No external HTTP clients — S3 uses zero-dependency AWS Sig V4 (Phase 157).

---

## 7. Country Pack System

Each deployment is configured by a country pack (`country-packs/<CC>/values.json`)
that defines:

- Regulatory framework and consent model
- Terminology code systems (ICD-10-CM/WHO, CPT, LOINC, NDC)
- Data residency region and transfer rules
- Enabled modules and feature flags
- UI defaults (date/time/currency format)
- Reporting requirements and claim formats

Packs are validated at load time against known enum values. Invalid packs
are flagged but not blocked (allows draft packs for development).

---

## 8. Contact

For security concerns, contact the VistA-Evolved Core Team via the
repository's security policy.

---

_This document is auto-maintained alongside the codebase. Machine-readable
compliance data is available via the `/compliance/_` REST endpoints.\*
