# VistA-Evolved Architecture

> **⛔ THIS REPO IS FROZEN.** This architecture doc describes the **archived monorepo**.
> It does not reflect the current multi-repo architecture.
> See [ARCHIVE-STATUS.md](ARCHIVE-STATUS.md) for details.
>
> **Current architecture lives in the active repos:**
> - `vista-evolved-platform/AGENTS.md` — platform architecture and governance
> - `vista-evolved-vista-distro/docs/` — VistA runtime architecture

---

> Single source of truth for system architecture. Updated March 2026. **(Archived — reference only.)**

## System Overview

VistA-Evolved is a modern EHR platform built on top of the VA VistA system.
It wraps the proven VistA clinical engine with a modern API layer, web frontend,
patient portal, and supporting services while preserving VistA as the
authoritative source of truth for all clinical data.

```
                        ┌─────────────────────────────────┐
                        │         Load Balancer / CDN      │
                        └──────┬───────────┬──────────────┘
                               │           │
                   ┌───────────▼──┐  ┌─────▼──────────┐
                   │  apps/web    │  │  apps/portal    │
                   │  (Next.js)   │  │  (Next.js)      │
                   │  Clinician   │  │  Patient Self-  │
                   │  Workstation │  │  Service        │
                   └───────┬──────┘  └──────┬──────────┘
                           │                │
                    ┌──────▼────────────────▼──────┐
                    │         apps/api              │
                    │         (Fastify + Node.js)   │
                    │                               │
                    │  Auth │ RBAC │ ABAC │ Audit   │
                    │  RPC Pool │ Circuit Breaker   │
                    │  FHIR R4 Gateway              │
                    │  Module Guard │ SKU Control    │
                    └─┬────┬────┬────┬────┬────┬────┘
                      │    │    │    │    │    │
          ┌───────────▼┐ ┌▼──┐ ┌▼──┐ ┌▼──┐ ┌▼──┐ ┌▼──────────┐
          │ VistA      │ │PG │ │S3 │ │KC │ │OT │ │ Orthanc   │
          │ (YottaDB)  │ │16 │ │   │ │   │ │   │ │ + OHIF    │
          │ XWB RPC    │ │   │ │   │ │   │ │   │ │ DICOM     │
          └────────────┘ └───┘ └───┘ └───┘ └───┘ └───────────┘
           port 9431     5432        8080  4318    8042/3003
```

## Technology Stack

| Layer         | Technology                 | Purpose                                         |
| ------------- | -------------------------- | ----------------------------------------------- |
| Frontend      | Next.js 16 / React 19      | Clinician workstation + Patient portal          |
| API           | Fastify 5 / Node.js 24     | REST API + FHIR R4 gateway                      |
| VistA         | YottaDB / MUMPS            | Clinical data engine (XWB RPC protocol)         |
| Database      | PostgreSQL 16              | Platform state (sessions, tenants, audit)       |
| Cache         | Redis 7 (optional)         | Session cache, rate limiting, distributed locks |
| IAM           | Keycloak 24 (optional)     | OIDC / SAML for production SSO                  |
| Imaging       | Orthanc + OHIF             | DICOM/DICOMweb + web viewer                     |
| Observability | OTel + Jaeger + Prometheus | Distributed tracing + metrics                   |
| Analytics     | YottaDB/ROcto              | SQL analytics over aggregated metrics           |

## Monorepo Structure

```
VistA-Evolved/
├── apps/
│   ├── api/           Fastify API server (port 3001)
│   │   └── src/
│   │       ├── auth/          Session, OIDC, JWT, MFA
│   │       ├── fhir/          FHIR R4 gateway (7 resource types)
│   │       ├── middleware/     Security, rate limit, CORS, CSRF
│   │       ├── modules/       Module registry, capability service
│   │       ├── adapters/      VistA + stub adapters (5 domains)
│   │       ├── platform/      PG, runtime mode, store resolver
│   │       ├── rcm/           Revenue cycle management
│   │       ├── routes/        Clinical + admin REST endpoints
│   │       ├── telehealth/    Video visit provider layer
│   │       ├── vista/         XWB RPC broker + connection pool
│   │       └── lib/           Logger, audit, Redis, resilience
│   ├── web/           Clinician workstation (Next.js, port 3000)
│   └── portal/        Patient portal (Next.js, port 3002)
├── services/
│   ├── vista/         VistA Docker compose + M routines
│   ├── imaging/       Orthanc + OHIF compose
│   ├── keycloak/      Keycloak compose
│   ├── observability/ OTel Collector + Jaeger + Prometheus
│   └── analytics/     YottaDB/ROcto for SQL analytics
├── config/            modules.json, skus.json, capabilities.json
├── data/              Payer seed data, RPC catalogs
├── docs/              Runbooks, architecture docs, ADRs
├── prompts/           Phase IMPLEMENT/VERIFY/NOTES prompts
├── scripts/           Verification scripts, installers
└── qa/                QA gauntlet gates
```

## VistA Integration

All clinical data flows through the VistA RPC Broker using the XWB protocol.
The API never invents clinical data -- VistA is always the source of truth.

**Connection Architecture:**

- `rpcBrokerClient.ts` -- Single global socket (legacy, backward compatible)
- `rpcConnectionPool.ts` -- Pooled connections keyed by tenant:DUZ
- `rpc-resilience.ts` -- Circuit breaker, retry, timeout, metrics
- `safeCallRpc()` / `safeCallRpcWithList()` -- Drop-in resilient wrappers

**Key RPCs used (87+ available in VEHU):**

- Authentication: `XUS AV CODE`, `XWB CREATE CONTEXT`
- Patient: `ORWPT LIST ALL`, `ORWPT16 ID INFO`
- Allergies: `ORQQAL LIST`, `ORWDAL32 SAVE ALLERGY`
- Medications: `ORWPS ACTIVE`
- Vitals: `ORQQVI VITALS`
- Problems: `ORQQPL PROBLEM LIST`, `GMPL ADD SAVE`
- Notes: `TIU DOCUMENTS BY CONTEXT`, `TIU CREATE RECORD`
- Orders: `ORWORR AGET`, `ORWDXC ACCEPT` (drug checks)
- Labs: `ORWLRR INTERIM`

## Security Model

1. **Authentication**: VistA RPC (dev) or OIDC/Keycloak (production)
2. **Authorization**: RBAC + ABAC + policy engine (default-deny)
3. **Session**: PG-backed with in-memory cache (60s TTL), optional Redis
4. **CSRF**: Session-bound synchronizer token (not double-submit cookie)
5. **Audit**: SHA-256 hash-chained immutable audit trail
6. **PHI Redaction**: All audit entries sanitized via `sanitizeAuditDetail()`

## Multi-Tenancy

- Every PG table has `tenant_id` column
- Row Level Security (RLS) enforced in rc/prod modes
- Per-tenant module overrides via `tenant_module` table
- Per-tenant VistA routing via connection pool

## Data Plane

| Mode | PG Required | RLS | OIDC | SQLite  |
| ---- | ----------- | --- | ---- | ------- |
| dev  | No          | Off | Off  | OK      |
| test | No          | Off | Off  | OK      |
| rc   | Yes         | On  | Yes  | Blocked |
| prod | Yes         | On  | Yes  | Blocked |

## FHIR R4 Gateway

8 endpoints mapping VistA data to FHIR R4 resources:

- `GET /fhir/metadata` -- CapabilityStatement (public)
- `GET /fhir/Patient/:id` -- Patient read
- `GET /fhir/AllergyIntolerance?patient=N` -- Allergies
- `GET /fhir/Condition?patient=N` -- Problems
- `GET /fhir/Observation?patient=N&category=` -- Vitals/Labs
- `GET /fhir/MedicationRequest?patient=N` -- Medications
- `GET /fhir/DocumentReference?patient=N` -- Notes
- `GET /fhir/Encounter?patient=N` -- Encounters

Supports SMART-on-FHIR Bearer JWT or session cookie auth.

## Module System

12 system modules controlled by SKU profiles:

- kernel, clinical, portal, telehealth, imaging, analytics
- interop, intake, ai, iam, rcm, scheduling

Capabilities resolved per-tenant. Module guard middleware returns 403
for routes belonging to disabled modules.

## Key Architectural Decisions

1. **VistA-first**: All clinical reads/writes go through VistA RPCs.
   PG stores only platform state (sessions, tenants, audit, config).
2. **In-memory stores for VistA-mapped data**: Imaging worklist, telehealth
   rooms, and other data that mirrors VistA are intentionally in-memory
   with documented migration paths to VistA-native storage.
3. **Zero external deps for critical paths**: XWB protocol, S3 client,
   PG wire protocol, JWT validation all use Node.js built-ins only.
4. **Graceful degradation**: Redis, Keycloak, Orthanc, OTel are all
   optional. The system runs with VistA + PG minimum.

## Further Reading

- `AGENTS.md` -- AI agent and developer onboarding
- `docs/BUG-TRACKER.md` -- Bug history and lessons learned
- `docs/runbooks/` -- Step-by-step operational guides
- `docs/architecture/` -- Detailed architecture documents
