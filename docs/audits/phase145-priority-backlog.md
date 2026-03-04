# Phase 145 -- Priority Backlog (Top 10 Real Blockers)

> Generated from system audit at commit `6c97fe4` (2026-02-26).
> Source: `qa/gauntlet/system-gap-matrix.json` + `artifacts/system-audit.json`

## Headline Numbers

| Metric                        | Value                              |
| ----------------------------- | ---------------------------------- |
| API endpoints                 | 1248                               |
| Unique RPCs used              | 85 / 162 registered                |
| In-memory Map stores          | 177 (37 high-risk, 30 medium-risk) |
| SQLite tables                 | 47                                 |
| UI pages                      | web=52, portal=25                  |
| `integration_pending` markers | 346 hits across 67 files           |
| `stub` markers                | 978 hits across 45 files           |
| `not_implemented` markers     | 433 hits across 14 files           |

---

## Top 10 Blockers

### 1. HIGH -- 37 high-risk in-memory Map stores (data loss on restart)

- **Module**: DATABASE_POSTURE (cross-cutting)
- **Why it matters**: Any API restart silently erases claims, payments, LOA packets, scheduling appointments, portal sessions, telehealth rooms, credentials, and more. Production unacceptable.
- **Key files**: `apps/api/src/rcm/domain/claim-store.ts`, `apps/api/src/rcm/payments/payment-store.ts`, `apps/api/src/rcm/loa/loa-store.ts`, `apps/api/src/rcm/payerOps/store.ts`, `apps/api/src/telehealth/room-store.ts`
- **Fix phase**: 146 (Durability Wave 3)

### 2. HIGH -- Multi-tenant RLS not enforced by default

- **Module**: MULTI_TENANCY
- **Why it matters**: Without `PLATFORM_PG_RLS_ENABLED=true`, tenant data leaks across boundaries. SQLite tables have no tenant isolation at all. Production blocker.
- **Key files**: `apps/api/src/posture/tenant-posture.ts`, `apps/api/src/platform/db/schema.ts`, `apps/api/src/platform/pg/pg-migrate.ts`
- **Fix phase**: 146 / 148 (production lane)

### 3. HIGH -- Scheduling SD module has sparse sandbox data

- **Module**: SCHEDULING_SDMODULE
- **Why it matters**: SD APPOINTMENT RPCs are registered but return empty results in WorldVistA Docker. No end-to-end scheduling workflow is provable without seeded data.
- **Key files**: `apps/api/src/routes/scheduling/`, `apps/api/src/adapters/scheduling/`
- **Fix phase**: 147 (Scheduling Depth V2)

### 4. HIGH -- RCM claim store is in-memory only

- **Module**: RCM_CORE
- **Why it matters**: Claims, remittances, and the full EDI pipeline state vanish on restart. The RCM domain has the highest density of high-risk Map stores (15+).
- **Key files**: `apps/api/src/rcm/domain/claim-store.ts`, `apps/api/src/rcm/edi/pipeline.ts`, `apps/api/src/rcm/payments/payment-store.ts`
- **Fix phase**: 146

### 5. HIGH -- Payer connectors are scaffolds with no live integration

- **Module**: PAYER_INTEGRATIONS_US / PAYER_INTEGRATIONS_PH
- **Why it matters**: Both US clearinghouse and PhilHealth eClaims connectors return simulated responses. No claim has ever been submitted to a real payer endpoint.
- **Key files**: `apps/api/src/rcm/connectors/clearinghouse-connector.ts`, `apps/api/src/rcm/connectors/philhealth-connector.ts`
- **Fix phase**: 148 (production distro lane)

### 6. HIGH -- Portal stores are all in-memory Maps

- **Module**: PORTAL_PATIENT
- **Why it matters**: Patient access logs, portal sessions, consent records, enrollment all lost on restart. Portal is a patient-facing surface where data loss is visible.
- **Key files**: `apps/api/src/portal-iam/access-log-store.ts`, `apps/api/src/portal-iam/portal-iam-routes.ts`
- **Fix phase**: 146

### 7. HIGH -- Imaging worklist/ingest are in-memory

- **Module**: IMAGING
- **Why it matters**: Imaging orders, worklist items, and Orthanc ingest reconciliation records vanish on restart. Quarantined studies must be re-triaged.
- **Key files**: `apps/api/src/services/imaging-worklist.ts`, `apps/api/src/services/imaging-ingest.ts`
- **Fix phase**: 146

### 8. MED -- 4 RPCs used in code but not in registry

- **Module**: VISTA_RPC_COVERAGE
- **Why it matters**: Unregistered RPCs bypass the RPC allowlist gate, risking silent drift between code and the Vivian-validated catalog.
- **Key RPCs**: `ORWPT APPTLST`, `SD W/L CURRENT STATUS` (+ 2 others)
- **Fix phase**: Immediate (can be done in this commit)

### 9. MED -- OIDC is opt-in, not default

- **Module**: AUTH_IAM
- **Why it matters**: Production deploys without OIDC means VistA RPC auth is the only path. No SSO, no MFA unless Keycloak is manually enabled.
- **Key files**: `apps/api/src/auth/oidc-provider.ts`
- **Fix phase**: 148 (production distro lane)

### 10. MED -- Telehealth room store is in-memory

- **Module**: TELEHEALTH
- **Why it matters**: Active telehealth sessions (room tokens, participant lists, waiting rooms) lost on restart. Patients in active calls may be disconnected.
- **Key files**: `apps/api/src/telehealth/room-store.ts`
- **Fix phase**: 146

---

## Burn-Down Plan

| Phase     | Scope                                                               | Blocker IDs    |
| --------- | ------------------------------------------------------------------- | -------------- |
| **146**   | Durability Wave 3: persist all high-risk Map stores to PG           | 1, 4, 6, 7, 10 |
| **147**   | Scheduling Depth V2: seed SD data, prove e2e workflow               | 3              |
| **148**   | Production VistA Distro: RLS default, OIDC default, live payer test | 2, 5, 9        |
| Immediate | Register 4 unregistered RPCs                                        | 8              |

---

_Curated from system audit output at `qa/gauntlet/system-gap-matrix.json`_
