# VistA-Evolved — Codebase Inventory

> Generated: 2026-03-04 | Prompt: P0-1 Full Codebase Inventory
> This file is the canonical reference for the entire codebase structure.

---

## 1. TOP-LEVEL STRUCTURE

| Folder                    | Description                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/`               | Fastify API backend — all REST endpoints, VistA RPC client, auth, RCM billing, imaging, scheduling, telehealth, analytics |
| `apps/web/`               | Next.js CPRS clinician UI — patient chart, admin dashboards, clinical panels, order entry                                 |
| `apps/portal/`            | Next.js patient portal — health records, messaging, appointments, telehealth, intake, rx refills                          |
| `packages/locale-utils/`  | Shared i18n/localization utilities                                                                                        |
| `config/`                 | JSON config files: modules.json, skus.json, capabilities.json, certification scenarios, compat lanes, performance budgets |
| `data/`                   | Seed data: payer JSON files (us_core.json, ph_hmos.json), RPC catalog snapshots, capability maps                          |
| `services/vista/`         | WorldVistA Docker dev sandbox (port 9430), custom MUMPS routines (ZVE\*), docker-compose                                  |
| `services/vista-distro/`  | Reproducible VistA distro build lane (port 9431), Dockerfile, entrypoint, health check                                    |
| `services/imaging/`       | Orthanc DICOM server + OHIF viewer Docker services                                                                        |
| `services/analytics/`     | YottaDB/Octo/ROcto for SQL analytics                                                                                      |
| `services/keycloak/`      | Keycloak 24 + PostgreSQL for IAM/OIDC                                                                                     |
| `services/observability/` | OTel Collector + Jaeger + Prometheus stack                                                                                |
| `services/platform-db/`   | PostgreSQL platform database Docker service                                                                               |
| `services/edge-gateway/`  | Edge gateway service scaffolding                                                                                          |
| `services/hl7/`           | HL7 MLLP service scaffolding                                                                                              |
| `services/sdc/`           | Structured Data Capture service                                                                                           |
| `infra/keycloak/`         | Keycloak realm export JSON, setup docs                                                                                    |
| `infra/opa/policy/`       | OPA Rego authorization policies + role data                                                                               |
| `nginx/`                  | Nginx reverse proxy configuration                                                                                         |
| `scripts/`                | Verification scripts, install scripts, QA gates, migration tools, backup/restore                                          |
| `tools/`                  | RPC extraction tools (build-coverage-map.mjs)                                                                             |
| `tests/`                  | k6 load/smoke tests                                                                                                       |
| `docs/`                   | Runbooks, architecture docs, bug tracker, ADRs, QA phase index, security docs                                             |
| `prompts/`                | Phase implementation + verification prompt files (canonical project history)                                              |
| `qa/`                     | Gauntlet QA framework, gate definitions                                                                                   |
| `country-packs/`          | Country-specific configuration packs                                                                                      |
| `design/`                 | Design assets and specifications                                                                                          |
| `reference/`              | Reference documentation and standards                                                                                     |
| `vendor/`                 | Third-party vendor integrations                                                                                           |
| `evidence/`               | QA evidence artifacts (gitignored)                                                                                        |
| `artifacts/`              | Build/verify artifacts (gitignored)                                                                                       |
| `logs/`                   | Runtime logs including immutable audit JSONL (gitignored)                                                                 |
| `ops/`                    | Operations summaries and Notion update artifacts                                                                          |
| `.github/`                | GitHub Actions CI workflows, Copilot instructions                                                                         |
| `.hooks/`                 | Git hooks (pre-commit anti-sprawl enforcement)                                                                            |

---

## 2. API ROUTES — COMPLETE LIST

**Total: ~2,410 HTTP endpoints across ~150 route files**

### 2.1 Infrastructure & Health

| File              | Method | Endpoint             | Auth | VistA RPC / DB               |
| ----------------- | ------ | -------------------- | ---- | ---------------------------- |
| index.ts (inline) | GET    | /health              | none | —                            |
| index.ts (inline) | GET    | /ready               | none | circuit breaker state        |
| index.ts (inline) | GET    | /version             | none | —                            |
| index.ts (inline) | GET    | /metrics/prometheus  | none | prom-client registry         |
| index.ts (inline) | GET    | /vista/ping          | none | TCP probe port 9430          |
| index.ts (inline) | GET    | /vista/swap-boundary | none | VistaSwapBoundary descriptor |

### 2.2 Authentication & Session

| File                         | Method | Endpoint                  | Auth    | VistA RPC / DB                  |
| ---------------------------- | ------ | ------------------------- | ------- | ------------------------------- |
| auth/auth-routes.ts          | POST   | /auth/login               | none    | XUS AV CODE, XWB CREATE CONTEXT |
| auth/auth-routes.ts          | POST   | /auth/logout              | none    | session store                   |
| auth/auth-routes.ts          | GET    | /auth/session             | none    | session store                   |
| auth/auth-routes.ts          | GET    | /auth/csrf-token          | none    | session csrf_secret             |
| auth/auth-routes.ts          | GET    | /auth/permissions         | none    | policy engine                   |
| auth/auth-routes.ts          | GET    | /auth/rbac-matrix         | none    | RBAC config                     |
| auth/idp/idp-routes.ts       | GET    | /auth/idp/providers       | none    | IdP registry                    |
| auth/idp/idp-routes.ts       | GET    | /auth/idp/authorize/:type | none    | OIDC/SAML flow                  |
| auth/idp/idp-routes.ts       | GET    | /auth/idp/callback/:type  | none    | OIDC/SAML callback              |
| auth/idp/idp-routes.ts       | POST   | /auth/idp/vista-bind      | none    | VistA user binding              |
| auth/idp/idp-routes.ts       | GET    | /auth/idp/vista-status    | none    | VistA binding check             |
| auth/idp/idp-routes.ts       | GET    | /auth/idp/health          | none    | IdP health                      |
| routes/session-management.ts | GET    | /auth/sessions            | session | session security store          |
| routes/session-management.ts | GET    | /auth/security-events     | session | security event store            |
| routes/session-management.ts | GET    | /auth/step-up/status      | session | step-up auth state              |
| routes/session-management.ts | POST   | /auth/mfa/enroll          | session | MFA enrollment                  |
| routes/session-management.ts | GET    | /auth/mfa/status          | session | MFA state                       |

### 2.3 IAM & Security

| File                             | Method                    | Endpoint                       | Auth    | VistA RPC / DB                   |
| -------------------------------- | ------------------------- | ------------------------------ | ------- | -------------------------------- |
| routes/iam-routes.ts             | GET                       | /iam/audit/events              | session | immutable audit store            |
| routes/iam-routes.ts             | GET                       | /iam/audit/stats               | session | audit statistics                 |
| routes/iam-routes.ts             | GET                       | /iam/audit/verify              | session | hash chain verify                |
| routes/iam-routes.ts             | GET                       | /iam/policy/capabilities       | session | policy engine                    |
| routes/iam-routes.ts             | POST                      | /iam/policy/evaluate           | session | policy engine                    |
| routes/iam-routes.ts             | GET                       | /iam/policy/roles              | session | role definitions                 |
| routes/iam-routes.ts             | GET                       | /iam/oidc/config               | none    | OIDC discovery                   |
| routes/iam-routes.ts             | GET                       | /iam/biometric/providers       | session | biometric registry               |
| routes/iam-routes.ts             | GET                       | /iam/health                    | session | IAM subsystem health             |
| routes/scim-routes.ts            | GET                       | /scim/v2/ServiceProviderConfig | none    | SCIM config                      |
| routes/scim-routes.ts            | GET                       | /scim/v2/Schemas               | bearer  | SCIM schemas                     |
| routes/scim-routes.ts            | GET                       | /scim/v2/ResourceTypes         | bearer  | SCIM resource types              |
| routes/scim-routes.ts            | GET/POST/PUT/PATCH/DELETE | /scim/v2/Users[/:id]           | bearer  | SCIM user CRUD                   |
| routes/scim-routes.ts            | GET/POST/PUT/DELETE       | /scim/v2/Groups[/:id]          | bearer  | SCIM group CRUD                  |
| routes/secrets-routes.ts         | GET                       | /secrets/keys                  | admin   | key provider                     |
| routes/secrets-routes.ts         | POST                      | /secrets/keys                  | admin   | key provider                     |
| routes/secrets-routes.ts         | POST                      | /secrets/keys/:id/rotate       | admin   | rotation manager                 |
| routes/secrets-routes.ts         | GET                       | /secrets/encrypt-health        | admin   | encryption health                |
| routes/secrets-routes.ts         | GET                       | /secrets/health                | admin   | secrets health                   |
| routes/tenant-security-routes.ts | GET/PUT                   | /tenant-security/policy        | admin   | tenant security policy store     |
| routes/tenant-security-routes.ts | GET                       | /tenant-security/effective     | admin   | effective policy                 |
| routes/tenant-security-routes.ts | POST                      | /tenant-security/validate      | admin   | policy validation                |
| routes/tenant-security-routes.ts | GET                       | /tenant-security/health        | admin   | tenant security health           |
| routes/privacy-routes.ts         | \*                        | /privacy/\*                    | session | sensitivity tags, access reasons |
| routes/siem-routes.ts            | \*                        | /siem/\*                       | admin   | SIEM status, alert rules         |

### 2.4 VistA Clinical (Core — Inline Routes)

| File     | Method | Endpoint                    | Auth    | VistA RPC                |
| -------- | ------ | --------------------------- | ------- | ------------------------ |
| index.ts | GET    | /vista/patient-search       | session | ORWPT LIST ALL           |
| index.ts | GET    | /vista/patient-demographics | session | ORWPT SELECT             |
| index.ts | GET    | /vista/allergies            | session | ORQQAL LIST              |
| index.ts | POST   | /vista/allergies/add        | session | ORWDAL32 SAVE ALLERGY    |
| index.ts | GET    | /vista/vitals               | session | GMV EXTRACT REC          |
| index.ts | GET    | /vista/notes                | session | TIU DOCUMENTS BY CONTEXT |
| index.ts | GET    | /vista/medications          | session | ORWPS ACTIVE             |
| index.ts | GET    | /vista/problems             | session | ORQQPL LIST              |
| index.ts | GET    | /vista/consults             | session | ORWCV VST                |
| index.ts | GET    | /vista/surgery              | session | ORWSR                    |
| index.ts | GET    | /vista/labs                 | session | ORWLR REPORT             |
| index.ts | GET    | /vista/reports              | session | ORWRP2 HS COMP FILES     |
| index.ts | GET    | /vista/default-patient-list | session | ORWPT LIST ALL           |
| index.ts | GET    | /vista/rpc-info             | session | RPC registry             |
| index.ts | POST   | /vista/rpc-call             | session | dynamic RPC call         |
| index.ts | GET    | /vista/utf8/rpc-probe       | session | UTF-8 probe              |
| index.ts | GET    | /vista/utf8/patient-probe   | session | UTF-8 patient probe      |
| index.ts | POST   | /vista/utf8/round-trip      | session | UTF-8 round trip test    |

### 2.5 CPRS Deep Integration

| File                        | Method   | Endpoint                        | Auth    | VistA RPC                             |
| --------------------------- | -------- | ------------------------------- | ------- | ------------------------------------- |
| routes/cprs/orders-cpoe.ts  | GET      | /vista/cprs/orders/dialog-list  | session | ORWDX DGNM                            |
| routes/cprs/orders-cpoe.ts  | GET      | /vista/cprs/orders/quick-list   | session | ORWDXQ DLGNAME                        |
| routes/cprs/orders-cpoe.ts  | GET      | /vista/cprs/orders/detail       | session | ORWOR DETAIL                          |
| routes/cprs/orders-cpoe.ts  | POST     | /vista/cprs/orders/sign         | session | ORWOR1 SIG → cpoe_order_sign_event PG |
| routes/cprs/orders-cpoe.ts  | POST     | /vista/cprs/orders/release      | session | ORWDX release                         |
| routes/cprs/orders-cpoe.ts  | POST     | /vista/cprs/orders/discontinue  | session | ORWDXA DC                             |
| routes/cprs/tiu-notes.ts    | GET      | /vista/cprs/notes/titles        | session | TIU PERSONAL TITLE LIST               |
| routes/cprs/tiu-notes.ts    | POST     | /vista/cprs/notes/create        | session | TIU CREATE RECORD                     |
| routes/cprs/tiu-notes.ts    | POST     | /vista/cprs/notes/set-text      | session | TIU SET DOCUMENT TEXT                 |
| routes/cprs/tiu-notes.ts    | POST     | /vista/cprs/notes/sign          | session | TIU SIGN RECORD                       |
| routes/cprs/tiu-notes.ts    | GET      | /vista/cprs/notes/detail        | session | TIU GET RECORD TEXT                   |
| routes/cprs/wave1-routes.ts | GET      | /vista/cprs/orders-summary      | session | ORWORB FASTUSER                       |
| routes/cprs/wave1-routes.ts | GET      | /vista/cprs/appointments        | session | ORWCV VST                             |
| routes/cprs/wave1-routes.ts | GET      | /vista/cprs/reminders           | session | ORQQPX REMINDERS UNEVALUATED          |
| routes/cprs/wave1-routes.ts | GET      | /vista/cprs/meds/detail         | session | ORWPS detail                          |
| routes/cprs/wave1-routes.ts | GET      | /vista/cprs/labs/chart          | session | lab chart RPCs                        |
| routes/cprs/wave1-routes.ts | GET      | /vista/cprs/problems/icd-search | session | ICD search                            |
| routes/cprs/wave2-routes.ts | POST     | /vista/cprs/problems            | session | problem write RPCs                    |
| routes/cprs/wave2-routes.ts | POST     | /vista/cprs/notes               | session | TIU CREATE RECORD                     |
| routes/cprs/wave2-routes.ts | POST     | /vista/cprs/orders              | session | ORWDX SAVE                            |
| routes/cprs/wave2-routes.ts | POST     | /vista/cprs/meds                | session | medication order RPCs                 |
| routes/cprs/wave2-routes.ts | POST     | /vista/cprs/labs                | session | lab order RPCs                        |
| routes/cprs/wave2-routes.ts | POST     | /vista/cprs/vitals              | session | GMV ADD VM                            |
| routes/cprs/wave2-routes.ts | POST     | /vista/cprs/allergies           | session | ORWDAL32 SAVE ALLERGY                 |
| routes/cprs/wave2-routes.ts | POST     | /vista/cprs/consults            | session | consult write RPCs                    |
| routes/cprs/wave2-routes.ts | GET      | /vista/cprs/write-status        | session | write status check                    |
| routes/cprs/wave2-routes.ts | GET/POST | /vista/cprs/lock[-status]       | session | ORWDX LOCK                            |
| routes/cprs/wave2-routes.ts | POST     | /vista/cprs/unlock              | session | ORWDX UNLOCK                          |

### 2.6 Clinical Domain Routes (Deep)

| File                  | Endpoints | Auth    | Description                                                                           |
| --------------------- | --------- | ------- | ------------------------------------------------------------------------------------- |
| routes/orders.ts      | ~136      | session | Order dialogs, sets, protocols, Med/Lab/Rad/Consult entry, quick orders, order checks |
| routes/notes.ts       | ~112      | session | TIU management: templates, autosave, co-signing, addenda, objects, encounter linking  |
| routes/meds.ts        | ~60       | session | Medication orders, renewals, inpatient/outpatient, dose calc, drug interactions       |
| routes/labs.ts        | ~37       | session | Lab results, panels, orders, specimens                                                |
| routes/problems.ts    | ~26       | session | Problem list management, ICD search                                                   |
| routes/reports.ts     | ~39       | session | Clinical report generation, export                                                    |
| routes/write-backs.ts | ~9        | session | Direct VistA write operations (sign, release, ack, create)                            |

### 2.7 VistA Interop & Provisioning

| File                      | Method   | Endpoint                   | Auth    | VistA RPC                   |
| ------------------------- | -------- | -------------------------- | ------- | --------------------------- |
| routes/vista-interop.ts   | GET      | /vista/interop/hlo/status  | admin   | ZVEM HLO STATUS             |
| routes/vista-interop.ts   | GET      | /vista/interop/hlo/queues  | admin   | ZVEM HLO QUEUE LIST         |
| routes/vista-interop.ts   | POST     | /vista/interop/hlo/send    | admin   | ZVEM HLO SEND MSG           |
| routes/vista-interop.ts   | GET      | /vista/interop/registry    | admin   | ZVEM REGISTRY STATUS        |
| routes/vista-interop.ts   | GET      | /vista/interop/\* (6 more) | admin   | HL7 interop RPCs            |
| routes/vista-provision.ts | GET      | /vista/provision/status    | admin   | RPC capability probe        |
| routes/vista-rcm.ts       | GET      | /vista/rcm/encounters      | session | ORWPCE PCE4NOTE             |
| routes/vista-rcm.ts       | GET      | /vista/rcm/insurance       | session | DG SENSITIVE PATIENT ACCESS |
| routes/vista-rcm.ts       | GET      | /vista/rcm/\* (8 more)     | session | IB/PRCA billing RPCs        |
| routes/vista-mailman.ts   | GET/POST | /vista/mailman/\* (5)      | session | Mailman RPCs                |

### 2.8 Portal Routes

| File                            | Endpoints | Auth           | Description                                                       |
| ------------------------------- | --------- | -------------- | ----------------------------------------------------------------- |
| routes/portal-auth.ts           | ~16       | portal session | Login, session, clinical data reads (via portal session)          |
| routes/portal-core.ts           | ~43       | portal session | Messaging, appointments, health education, preferences, documents |
| routes/portal-documents.ts      | ~5        | portal session | Document generation and retrieval                                 |
| routes/portal-mailman.ts        | ~3        | portal session | VistA Mailman messaging for patients                              |
| portal-iam/portal-iam-routes.ts | ~23       | own auth       | Registration, login, MFA, profile, proxy access, devices          |

### 2.9 Imaging

| File                           | Endpoints | Auth    | Description                                          |
| ------------------------------ | --------- | ------- | ---------------------------------------------------- |
| routes/imaging-proxy.ts        | ~11       | session | DICOMweb proxy (QIDO-RS, WADO-RS, STOW-RS) → Orthanc |
| routes/imaging-audit-routes.ts | ~4        | session | Hash-chained imaging audit trail                     |
| services/imaging-authz.ts      | ~4        | session | Break-glass start/active/revoke/history              |
| services/imaging-devices.ts    | ~6        | admin   | DICOM device CRUD + C-ECHO                           |
| services/imaging-ingest.ts     | ~5        | service | Orthanc callback, unmatched, link, stats             |
| services/imaging-service.ts    | ~8        | session | Studies, modalities, routes, config                  |
| services/imaging-worklist.ts   | ~5        | session | Worklist CRUD + stats                                |

### 2.10 Scheduling

| File                                  | Endpoints | Auth    | VistA RPC                                                        |
| ------------------------------------- | --------- | ------- | ---------------------------------------------------------------- |
| routes/scheduling/index.ts            | ~34       | session | SDES GET APPT, SDES GET APPT TYPES, SDOE LIST ENCOUNTERS, SD W/L |
| routes/scheduling/writeback-routes.ts | ~4        | session | SDES scheduling writebacks                                       |
| routes/dept-scheduling-routes.ts      | ~22       | session | Department-level scheduling                                      |

### 2.11 RCM (Revenue Cycle Management)

| File                                            | Endpoints | Auth    | Description                                                 |
| ----------------------------------------------- | --------- | ------- | ----------------------------------------------------------- |
| rcm/rcm-routes.ts                               | ~100+     | session | Claims CRUD, payers, connectors, EDI, submit, export, audit |
| rcm/claim-lifecycle/claim-lifecycle-routes.ts   | ~20       | session | Claim state machine transitions                             |
| rcm/credential-vault/credential-vault-routes.ts | ~22       | session | Payer credential vaulting                                   |
| rcm/denials/denial-routes.ts                    | ~13       | session | Denial management + appeals                                 |
| rcm/eligibility/routes.ts                       | ~11       | session | 270/271 eligibility verification                            |
| rcm/evidence/evidence-routes.ts                 | ~9        | session | Claim evidence attachments                                  |
| rcm/hmo-portal/hmo-portal-routes.ts             | ~18       | session | HMO portal workflow                                         |
| rcm/hmo-portal/phase97b-routes.ts               | ~14       | session | HMO portal deep integration                                 |
| rcm/loa/loa-routes.ts                           | ~10       | session | Letter of Authorization                                     |
| rcm/payerOps/payerops-routes.ts                 | ~22       | session | Payer operations hub                                        |
| rcm/payerOps/philhealth-routes.ts               | ~14       | session | PhilHealth integration                                      |
| rcm/payerOps/registry-routes.ts                 | ~13       | session | Payer registry management                                   |
| rcm/payers/payer-admin-routes.ts                | ~13       | session | Payer admin CRUD                                            |
| rcm/payers/ph-hmo-routes.ts                     | ~7        | session | PH HMO-specific routes                                      |
| rcm/payments/payment-routes.ts                  | varies    | session | Payment tracking                                            |
| rcm/philhealth-eclaims3/eclaims3-routes.ts      | ~12       | session | PhilHealth eClaims v3                                       |
| rcm/philhealth-eclaims3/transport-routes.ts     | ~5        | session | eClaims transport                                           |
| rcm/reconciliation/recon-routes.ts              | ~14       | session | Payment reconciliation                                      |
| rcm/workflows/claims-workflow-routes.ts         | ~10       | session | Claims workflow engine                                      |
| rcm/workflows/remittance-routes.ts              | ~7        | session | 835 remittance processing                                   |

### 2.12 Other Major Route Files

| File                                      | Endpoints | Auth          | Description                                                               |
| ----------------------------------------- | --------- | ------------- | ------------------------------------------------------------------------- |
| routes/telehealth.ts                      | ~13       | session/none  | Room management, join, device check                                       |
| routes/analytics-routes.ts                | ~12       | session       | Dashboards, events, aggregated, ETL                                       |
| routes/analytics-extract-routes.ts        | ~18       | session       | Analytics data extraction                                                 |
| routes/reporting.ts + reporting-routes.ts | ~19       | session       | Operational/clinical reports                                              |
| cds/cds-routes.ts                         | ~23       | session       | CDS services, rules, SMART apps                                           |
| clinical-reasoning/reasoning-routes.ts    | ~29       | session       | Libraries, measures, plan definitions                                     |
| content-packs/pack-routes.ts              | ~15       | session/admin | Order sets, flowsheets, CDS rules                                         |
| interop-gateway/gateway-routes.ts         | ~19       | session       | Channels, pipelines, mediators                                            |
| document-exchange/exchange-routes.ts      | ~9        | session       | Document submissions                                                      |
| exchange-packs/pack-routes.ts             | ~11       | session       | Profiles, connectors, transactions                                        |
| mpi/mpi-routes.ts                         | ~8        | session       | Patient identity matching/merge                                           |
| fhir/fhir-routes.ts                       | ~9        | fhir          | FHIR R4 Patient, Allergy, Condition, Observation, MedicationRequest, etc. |
| bulk-data/bulk-routes.ts                  | ~7        | session       | Bulk export/import                                                        |
| consent-pou/consent-routes.ts             | ~8        | session       | Consent directives, evaluate                                              |
| provider-directory/directory-routes.ts    | ~14       | session       | Practitioners, organizations, locations                                   |
| queue/queue-routes.ts                     | ~15       | session       | Queue ticket management                                                   |
| intake/intake-routes.ts + brain-routes.ts | ~29       | none          | Intake sessions, AI brain, TIU drafts                                     |
| devices/\* (9 files)                      | ~91       | admin/service | Device registry, gateway, HL7v2/ASTM ingest, BCMA                         |
| service-lines/ed/ed-routes.ts             | ~10       | session       | ED board, visits, beds                                                    |
| service-lines/icu/icu-routes.ts           | ~14       | session       | ICU admissions, flowsheets, vents, I/O, scores                            |
| service-lines/or/or-routes.ts             | ~11       | session       | OR cases, rooms, blocks, milestones                                       |
| routes/admin.ts                           | ~18       | admin         | Tenants, feature flags, UI defaults, modules                              |
| routes/admin-payer-db-routes.ts           | ~24       | admin         | Payer DB admin CRUD                                                       |
| routes/module-capability-routes.ts        | ~15       | session       | Capabilities, modules, SKUs, marketplace                                  |
| routes/module-entitlement-routes.ts       | ~8        | admin         | Module catalog, entitlements, feature flags                               |
| posture/index.ts                          | ~11       | admin         | Observability, tenant, performance, data-plane posture                    |
| routes/hardening-routes.ts                | ~4        | admin         | Audit verify, security posture, backup, RC checklist                      |
| routes/audit-shipping-routes.ts           | ~4        | admin         | S3 shipping status, trigger, manifests                                    |
| routes/facility-routes.ts                 | ~20       | admin         | Multi-facility management                                                 |
| routes/multi-cluster-routes.ts            | ~15       | admin         | Multi-cluster orchestration                                               |
| routes/global-routing-routes.ts           | ~17       | admin         | Global traffic routing                                                    |
| routes/data-plane-sharding-routes.ts      | ~16       | admin         | Data plane shard management                                               |
| routes/dr-gameday-routes.ts               | ~19       | admin         | DR scenarios, game day exercises                                          |
| routes/scale-performance-routes.ts        | ~19       | admin         | Scale/perf profiling                                                      |
| routes/sre-support-posture-routes.ts      | ~32       | admin         | SRE tooling, support posture                                              |
| routes/release-train-routes.ts            | ~27       | admin         | Release train management                                                  |
| routes/regulatory-routes.ts               | ~24       | admin         | Regulatory reporting, data classification                                 |
| routes/data-rights-routes.ts              | ~19       | admin         | Retention, deletion, legal holds                                          |
| routes/certification-pipeline.ts          | ~18       | admin         | Certification suites/runs                                                 |
| routes/ai-gateway.ts                      | ~11       | session       | AI gateway requests/models/policy                                         |
| billing/billing-routes.ts                 | ~11       | admin         | SaaS billing plans, subscriptions, usage                                  |
| localization/localization-routes.ts       | ~27       | session       | Locales, translations, country packs                                      |
| migration/migration-routes.ts             | ~25       | session       | Import/export, FHIR/CCDA import, reconcile                                |
| templates/template-routes.ts              | ~18       | session       | Note/order templates CRUD                                                 |
| workflows/workflow-routes.ts              | ~13       | session       | Workflow engine                                                           |
| writeback/writeback-routes.ts             | ~9        | session       | VistA writeback management                                                |

### Auth Level Reference

| Auth Level       | Meaning                                      |
| ---------------- | -------------------------------------------- |
| `none`           | No authentication required                   |
| `session`        | Valid session cookie required                |
| `admin`          | Admin role session required                  |
| `service`        | X-Service-Key header (constant-time compare) |
| `bearer`         | SCIM Bearer token (in-handler)               |
| `fhir`           | Session OR SMART bearer token                |
| `portal session` | Separate portal authentication               |

---

## 3. DATABASE MODELS — COMPLETE LIST

### 3.1 PostgreSQL Tables (Drizzle ORM — pg-schema.ts)

**~80 tables total** in `apps/api/src/platform/pg/pg-schema.ts`

#### Core Platform (8 tables)

| Table                  | Key Fields                                                                                                                                                                                    | Notes                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `platform_audit_event` | id(uuid), tenantId, actor, actorRole, action, entityType, entityId, detail(jsonb), prevHash, entryHash, createdAt                                                                             | Hash-chained         |
| `idempotency_key`      | id(uuid), tenantId, key, method, path, statusCode, responseBody(jsonb), createdAt, expiresAt                                                                                                  | 24h TTL              |
| `outbox_event`         | id(uuid), tenantId, eventType, aggregateType, aggregateId, payload(jsonb), published, createdAt                                                                                               | Transactional outbox |
| `auth_session`         | id, tenantId, userId, userName, userRole, facilityStation, facilityName, divisionIen, tokenHash, csrfSecret, ipHash, userAgentHash, createdAt, lastSeenAt, expiresAt, revokedAt, metadataJson |                      |
| `module_catalog`       | moduleId(PK), name, description, version, alwaysEnabled, dependenciesJson, routePatternsJson, adaptersJson, permissionsJson, dataStoresJson, healthCheckEndpoint, createdAt, updatedAt        |                      |
| `tenant_module`        | id, tenantId, moduleId, enabled, planTier, enabledAt, disabledAt, enabledBy, createdAt, updatedAt                                                                                             |                      |
| `tenant_feature_flag`  | id, tenantId, flagKey, flagValue, moduleId, description, rolloutPercentage, userTargeting(jsonb), createdAt, updatedAt                                                                        |                      |
| `module_audit_log`     | id, tenantId, actorId, actorType, entityType, entityId, action, beforeJson, afterJson, reason, createdAt                                                                                      |                      |

#### Payer Domain (6 tables)

| Table                     | Key Fields                                                                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `payer`                   | id, tenantId, canonicalName, aliases(jsonb), countryCode, regulatorSource, regulatorLicenseNo, category, payerType, integrationMode, active, version |
| `tenant_payer`            | id, tenantId, payerId(FK), status, notes, vaultRef, version                                                                                          |
| `payer_capability`        | id, tenantId, payerId(FK), capabilityKey, value, confidence, evidenceSnapshotId, reason                                                              |
| `payer_task`              | id, tenantId, payerId(FK), title, description, status, dueDate                                                                                       |
| `payer_evidence_snapshot` | id, tenantId, sourceType, sourceUrl, asOfDate, sha256, storedPath, parserVersion, status, payerCount                                                 |
| `payer_audit_event`       | id, tenantId, actorType, actorId, entityType, entityId, action, beforeJson(jsonb), afterJson(jsonb), reason                                          |

#### Denial & Reconciliation (8 tables)

| Table                  | Key Fields                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `denial_case`          | ~25 fields: claimRef, vistaClaimIen, patientDfn, payerId, denialStatus, denialCodes(jsonb), monetary amounts |
| `denial_action`        | id, tenantId, denialId, actor, actionType, payloadJson, previousStatus, newStatus                            |
| `denial_attachment`    | id, tenantId, denialId, label, refType, storedPath, sha256                                                   |
| `resubmission_attempt` | id, tenantId, denialId, method, referenceNumber, followUpDate, notes                                         |
| `remittance_import`    | id, tenantId, sourceType, fileHash, originalFilename, parserName/Version, lineCount, totalPaidCents          |
| `payment_record`       | ~20 fields: claimRef, payerId, monetary amounts, traceNumber, rawCodesJson                                   |
| `reconciliation_match` | id, tenantId, paymentId, claimRef, matchConfidence, matchMethod, matchStatus                                 |
| `underpayment_case`    | id, tenantId, claimRef, paymentId, expectedAmountCents, paidAmountCents, deltaCents, status                  |

#### RCM Durability (6 tables — Phase 126)

| Table                 | Key Fields                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `rcm_claim`           | ~40 fields mirroring Claim interface (JSON as text)                                              |
| `rcm_remittance`      | ~20 fields mirroring Remittance interface                                                        |
| `rcm_claim_case`      | ~25 fields for lifecycle case tracking                                                           |
| `edi_acknowledgement` | id, tenantId, type, disposition, claimId, controlNumbers, errorsJson, idempotencyKey             |
| `edi_claim_status`    | id, tenantId, claimId, payerClaimId, categoryCode, statusCode, totalCharged/Paid, idempotencyKey |
| `edi_pipeline_entry`  | id, tenantId, claimId, transactionSet, stage, connectorId, payload, attempts                     |

#### RCM Work Queue (2 tables)

| Table                 | Key Fields                                                                    |
| --------------------- | ----------------------------------------------------------------------------- |
| `rcm_work_item`       | ~30 fields: type, status, claimId, payerId, priority, assignedTo, lockedBy/At |
| `rcm_work_item_event` | id, tenantId, workItemId, action, beforeStatus, afterStatus, actor, detail    |

#### RCM Domain PG Parity (12 tables — Phase 174)

| Table                   | Key Fields                                                              |
| ----------------------- | ----------------------------------------------------------------------- |
| `integration_evidence`  | ~18 fields for payer connectivity research                              |
| `loa_request`           | ~25 fields for Letter of Authorization / prior auth                     |
| `loa_attachment`        | id, loaRequestId, tenantId, attachmentType, fileName, storagePath       |
| `accreditation_status`  | ~15 fields for payer enrollment/credentialing                           |
| `accreditation_task`    | id, accreditationId, tenantId, title, status, priority, dueDate         |
| `credential_artifact`   | ~18 fields for NPI, DEA credentials                                     |
| `credential_document`   | id, credentialId, tenantId, fileName, mimeType, storagePath, sha256Hash |
| `claim_draft`           | ~35 fields for full claim lifecycle entity                              |
| `claim_lifecycle_event` | id, claimDraftId, tenantId, fromStatus, toStatus, actor, reason         |
| `scrub_rule`            | ~18 fields for claim validation rules                                   |
| `scrub_result`          | id, claimDraftId, tenantId, ruleId, severity, message, blocksSubmission |
| `rcm_durable_job`       | id, tenantId, type, status, payloadJson, attempts, idempotencyKey       |

#### Portal & Telehealth (5 tables — Phase 127)

| Table                    | Key Fields                                                                 |
| ------------------------ | -------------------------------------------------------------------------- |
| `portal_message`         | ~20 fields for patient-provider messaging                                  |
| `portal_access_log`      | id, tenantId, userId, eventType, description, metadataJson                 |
| `portal_patient_setting` | id, tenantId, patientDfn, language, notificationsJson, displayJson         |
| `telehealth_room`        | ~18 fields: appointmentId, patientDfn, providerDuz, roomStatus, meetingUrl |
| `telehealth_room_event`  | id, tenantId, roomId, eventType, actorId, actorRole                        |

#### Imaging (2 tables — Phase 128)

| Table                  | Key Fields                              |
| ---------------------- | --------------------------------------- |
| `imaging_work_item`    | ~22 fields mirroring WorklistItem       |
| `imaging_ingest_event` | ~18 fields with eventType discriminator |

#### Scheduling (3 tables)

| Table                         | Key Fields                                                         |
| ----------------------------- | ------------------------------------------------------------------ |
| `scheduling_waitlist_request` | id, tenantId, patientDfn, clinicName, priority, status             |
| `scheduling_booking_lock`     | id, tenantId, lockKey, holderDuz, expiresAt                        |
| `scheduling_lifecycle`        | id, tenantId, appointmentRef, patientDfn, state, vistaIen, rpcUsed |

#### Service Lines (20 tables — Wave 38)

| Table                                                                                         | Key Fields                                            |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `ed_visit`                                                                                    | ~18 fields for ED visit lifecycle                     |
| `ed_bed`                                                                                      | id, tenantId, zone, bedNumber, status, currentVisitId |
| `or_case`                                                                                     | ~18 fields for surgical case lifecycle                |
| `or_room`, `or_block`                                                                         | OR room and scheduling block management               |
| `icu_admission`                                                                               | ~16 fields for ICU admission lifecycle                |
| `icu_bed`, `icu_flowsheet_entry`, `icu_vent_record`, `icu_io_record`, `icu_score`             | ICU data                                              |
| `managed_device`, `device_patient_association`, `device_location_mapping`, `device_audit_log` | Device management                                     |
| `radiology_order`                                                                             | ~25 fields for radiology order lifecycle              |
| `reading_worklist_item`                                                                       | ~17 fields for study-to-radiologist assignment        |
| `rad_report`                                                                                  | ~22 fields for report lifecycle (draft→prelim→final)  |
| `dose_registry_entry`                                                                         | ~18 fields for radiation dose tracking                |
| `rad_critical_alert`                                                                          | ~18 fields for critical finding communication         |
| `peer_review`                                                                                 | Radiology peer review scoring                         |

#### Other Tables

| Table                                                                    | Source                         |
| ------------------------------------------------------------------------ | ------------------------------ |
| `portal_user`, `portal_session`, `portal_refill`, `portal_task`          | Portal subsystem               |
| `portal_sensitivity_config`, `portal_share_link`, `portal_export`        | Portal features                |
| `portal_patient_identity`                                                | OIDC-to-DFN mapping            |
| `tenant_oidc_mapping`                                                    | Tenant OIDC config (Phase 153) |
| `cpoe_order_sign_event`                                                  | Order sign audit (Phase 154)   |
| `job_run_log`                                                            | Job queue audit                |
| `eligibility_check`, `claim_status_check`                                | Eligibility & claim status     |
| `capability_matrix_cell`, `capability_matrix_evidence`                   | Payer capability matrix        |
| `payer_dossier`, `payer_onboarding_task`                                 | Payer dossier (Phase 514)      |
| `user_locale_preference`, `intake_question_schema`, `clinic_preferences` | I18N & clinic                  |
| `patient_consent`, `patient_portal_pref`                                 | Patient consent (Phase 140)    |

### 3.2 Key TypeScript Domain Models

| File                             | Model                                                                                                           | Fields                             | DUPLICATE?                           |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------ |
| rcm/domain/claim.ts              | `Claim`                                                                                                         | ~45 fields (status FSM: 10 states) | YES — mirrors `rcm_claim` PG table   |
| rcm/domain/payer.ts              | `Payer`                                                                                                         | ~20 fields                         | YES — mirrors `payer` PG table       |
| rcm/domain/remit.ts              | `Remittance`                                                                                                    | ~20 fields                         | YES — mirrors `rcm_remittance` PG    |
| rcm/edi/types.ts                 | `EdiClaim837`                                                                                                   | ~30 fields (X12 5010)              | No                                   |
| rcm/edi/types.ts                 | `EdiRemittance835`                                                                                              | ~15 fields                         | No                                   |
| rcm/edi/types.ts                 | `PipelineEntry`                                                                                                 | ~15 fields (10-stage FSM)          | YES — mirrors `edi_pipeline_entry`   |
| rcm/denials/types.ts             | `DenialCase`                                                                                                    | ~25 fields (8-state FSM)           | YES — mirrors `denial_case` PG       |
| rcm/reconciliation/types.ts      | `PaymentRecord`                                                                                                 | ~20 fields                         | YES — mirrors `payment_record` PG    |
| auth/session-store.ts            | `SessionData`                                                                                                   | 12 fields                          | YES — mirrors `auth_session` PG      |
| telehealth/types.ts              | `TelehealthRoom`                                                                                                | ~10 fields                         | YES — mirrors `telehealth_room` PG   |
| adapters/types.ts                | `PatientRecord`, `AllergyRecord`, `VitalRecord`, `NoteRecord`, `MedicationRecord`, `ProblemRecord`, `LabResult` | varies                             | No — adapter interfaces              |
| adapters/scheduling/interface.ts | `Appointment`, `TimeSlot`, `ClinicInfo`, `WaitListEntry`                                                        | varies                             | No                                   |
| services/imaging-worklist.ts     | `WorklistItem`                                                                                                  | ~25 fields                         | YES — mirrors `imaging_work_item` PG |
| services/analytics-store.ts      | `AnalyticsEvent`                                                                                                | ~15 fields (no PHI)                | No                                   |
| lib/immutable-audit.ts           | `ImmutableAuditEntry`                                                                                           | ~15 fields (hash-chained)          | No                                   |
| intake/types.ts                  | `IntakeSession`, `IntakePack`, `QuestionnaireItem`                                                              | varies                             | No                                   |
| service-lines/ed/types.ts        | `EdVisit`, `EdBed`                                                                                              | varies                             | YES — mirrors PG tables              |
| service-lines/or/types.ts        | `OrCase`, `OrRoom`                                                                                              | varies                             | YES — mirrors PG tables              |
| service-lines/icu/types.ts       | `IcuAdmission`, `IcuBed`                                                                                        | varies                             | YES — mirrors PG tables              |
| radiology/types.ts               | `RadOrder`, `RadReport`                                                                                         | varies                             | YES — mirrors PG tables              |

**Duplication Pattern**: Every in-memory domain model has a corresponding Drizzle PG table with flattened/JSON-serialized fields plus `tenantId` for RLS. This is intentional — TS interfaces are canonical shapes, PG tables are persistence layer.

### 3.3 Zod Validation Schemas

| File                        | Schemas    | Purpose                                                                                        |
| --------------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| lib/validation.ts           | 15 schemas | Core clinical input validation (Login, PatientSearch, AllergyAdd, VitalsAdd, NoteCreate, etc.) |
| rcm/reconciliation/types.ts | 11 schemas | Payment/remittance import validation                                                           |
| rcm/denials/types.ts        | 10 schemas | Denial case creation/update validation                                                         |
| jobs/registry.ts            | 5 schemas  | Job payload validation (eligibility poll, claim status, backup)                                |
| routes/vista-interop.ts     | 4 schemas  | HL7 message query validation                                                                   |

---

## 4. REACT COMPONENTS — COMPLETE LIST

**Total: 161 .tsx files (0 .jsx)**

### 4.1 Portal App (`apps/portal/`) — 28 files

| File                             | Component              | Module             | API Fetch                           |
| -------------------------------- | ---------------------- | ------------------ | ----------------------------------- |
| src/app/page.tsx                 | LoginPage              | Portal Auth        | YES — POST /portal/auth/login       |
| src/app/layout.tsx               | RootLayout             | Portal Shell       | No                                  |
| src/app/dashboard/layout.tsx     | DashboardLayout        | Portal Shell       | No                                  |
| src/app/dashboard/page.tsx       | DashboardPage          | Portal Home        | No                                  |
| dashboard/health/page.tsx        | HealthRecordsPage      | Clinical Records   | YES — 11 endpoints                  |
| dashboard/medications/page.tsx   | MedicationsPage        | Medications        | YES — fetchMedications              |
| dashboard/messages/page.tsx      | MessagesPage           | Secure Messaging   | YES — inbox, drafts, sent, create   |
| dashboard/appointments/page.tsx  | AppointmentsPage       | Scheduling         | YES — appointments, scheduling mode |
| dashboard/telehealth/page.tsx    | TelehealthPage         | Telehealth         | YES — portal telehealth endpoints   |
| dashboard/records/page.tsx       | RecordsPage            | Record Portability | YES — exports, shares               |
| dashboard/tasks/page.tsx         | TasksPage              | Patient Tasks      | YES — /portal/tasks                 |
| dashboard/intake/page.tsx        | IntakeStartPage        | Intake             | YES — /intake/sessions              |
| dashboard/intake/[id]/page.tsx   | IntakeSessionPage      | Intake             | YES — session, next-question        |
| dashboard/refills/page.tsx       | RefillsPage            | Rx Refills         | YES — /portal/refills               |
| dashboard/documents/page.tsx     | DocumentsPage          | Documents          | YES — /portal/documents             |
| dashboard/consents/page.tsx      | ConsentsPage           | Consent Mgmt       | YES — /portal/consents              |
| dashboard/sharing/page.tsx       | ShareRecordsPage       | Record Sharing     | YES — /portal/shares                |
| dashboard/exports/page.tsx       | ExportPage             | Health Export      | YES — export endpoints              |
| dashboard/proxy/page.tsx         | ProxyPage              | Family/Proxy       | YES — profiles, invitations         |
| dashboard/profile/page.tsx       | ProfilePage            | Profile/Settings   | YES — demographics, settings        |
| dashboard/immunizations/page.tsx | ImmunizationsPage      | Immunizations      | YES — fetchImmunizations            |
| dashboard/activity/page.tsx      | ActivityPage           | Access Audit       | YES — audit log                     |
| dashboard/account/page.tsx       | AccountPage            | Account Settings   | YES — /portal/iam/session           |
| dashboard/ai-help/page.tsx       | AIHelpPage             | AI Lab Education   | YES — fetchLabEducation             |
| share/[token]/page.tsx           | ShareViewerPage        | External Share     | YES — previewShare                  |
| kiosk/intake/page.tsx            | KioskStartPage         | Kiosk Intake       | YES — /kiosk/sessions               |
| kiosk/intake/[id]/page.tsx       | KioskIntakeSessionPage | Kiosk Intake       | YES — session, save                 |
| components/portal-nav.tsx        | PortalNav              | Portal Nav         | No                                  |

### 4.2 Web App — CPRS Shell (`apps/web/`) — 20 files

| File                                    | Component               | Module             | API Fetch                    |
| --------------------------------------- | ----------------------- | ------------------ | ---------------------------- |
| src/app/page.tsx                        | Home (redirect)         | Root               | No                           |
| src/app/layout.tsx                      | RootLayout              | Root Shell         | No                           |
| stores/cprs-ui-state.tsx                | CPRSUIProvider          | UI State           | YES — /ui-prefs              |
| stores/tenant-context.tsx               | TenantProvider          | Multi-tenant       | YES — /admin/my-tenant       |
| stores/session-context.tsx              | SessionProvider         | Auth               | YES — session endpoints      |
| stores/patient-context.tsx              | PatientProvider         | Patient Context    | No                           |
| stores/data-cache.tsx                   | DataCacheProvider       | Data Cache         | YES — central clinical fetch |
| components/I18nProvider.tsx             | I18nProvider            | i18n               | YES — locale files           |
| components/ui/ErrorBoundary.tsx         | ErrorBoundary           | Error Handling     | No                           |
| components/terminal/BrowserTerminal.tsx | BrowserTerminal         | WebSocket Console  | YES — WebSocket              |
| cprs/CPRSMenuBar.tsx                    | CPRSMenuBar             | CPRS Shell         | No                           |
| cprs/CPRSTabStrip.tsx                   | CPRSTabStrip            | CPRS Shell         | No                           |
| cprs/PatientBanner.tsx                  | PatientBanner           | CPRS Shell         | No                           |
| cprs/DegradedBanner.tsx                 | DegradedBanner          | System Health      | YES — /ready polling         |
| cprs/CPRSModals.tsx                     | CPRSModals              | CPRS Dialogs       | YES — dispatches to various  |
| cprs/IntegrationPendingModal.tsx        | IntegrationPendingModal | Integration Status | No                           |
| cprs/VistaAlignmentBanner.tsx           | VistaAlignmentBanner    | Dev Tooling        | No                           |
| cprs/WriteReviewBanner.tsx              | WriteReviewBanner       | Write Safety       | YES — writeback review       |
| cprs/LanguageSwitcher.tsx               | LanguageSwitcher        | i18n               | No                           |
| cprs/ActionInspector.tsx                | ActionInspector         | Dev Tooling        | No                           |

### 4.3 Web App — CPRS Dialogs (7 files)

| File                             | Component            | API Fetch                       |
| -------------------------------- | -------------------- | ------------------------------- |
| dialogs/AcknowledgeLabDialog.tsx | AcknowledgeLabDialog | YES — POST /vista/cprs/labs/ack |
| dialogs/AddAllergyDialog.tsx     | AddAllergyDialog     | YES — POST allergy add          |
| dialogs/AddMedicationDialog.tsx  | AddMedicationDialog  | YES — POST med order            |
| dialogs/AddVitalDialog.tsx       | AddVitalDialog       | YES — POST vitals add           |
| dialogs/AddProblemDialog.tsx     | AddProblemDialog     | YES — POST problem add          |
| dialogs/EditProblemDialog.tsx    | EditProblemDialog    | YES — POST problem edit         |
| dialogs/CreateNoteDialog.tsx     | CreateNoteDialog     | YES — POST note create          |

### 4.4 Web App — CPRS Clinical Panels (22 files)

| File                               | Component               | API Fetch                                      |
| ---------------------------------- | ----------------------- | ---------------------------------------------- |
| panels/CoverSheetPanel.tsx         | CoverSheetPanel         | YES — orders-summary, immunizations, reminders |
| panels/ProblemsPanel.tsx           | ProblemsPanel           | YES — via useDataCache                         |
| panels/MedsPanel.tsx               | MedsPanel               | YES — via useDataCache                         |
| panels/OrdersPanel.tsx             | OrdersPanel             | YES — orders, order-checks, sign               |
| panels/NotesPanel.tsx              | NotesPanel              | YES — notes CRUD                               |
| panels/ConsultsPanel.tsx           | ConsultsPanel           | YES — consults endpoints                       |
| panels/LabsPanel.tsx               | LabsPanel               | YES — via useDataCache                         |
| panels/DCSummPanel.tsx             | DCSummPanel             | YES — TIU text                                 |
| panels/SurgeryPanel.tsx            | SurgeryPanel            | YES — via useDataCache                         |
| panels/ImmunizationsPanel.tsx      | ImmunizationsPanel      | YES — /vista/immunizations                     |
| panels/ReportsPanel.tsx            | ReportsPanel            | YES — reports, imaging                         |
| panels/ImagingPanel.tsx            | ImagingPanel            | YES — studies, worklist, devices, audit        |
| panels/TelehealthPanel.tsx         | TelehealthPanel         | YES — rooms, create/join/end                   |
| panels/NursingPanel.tsx            | NursingPanel            | YES — notes, flowsheet, tasks                  |
| panels/MHAPanel.tsx                | MHAPanel                | YES — MHA instruments                          |
| panels/MessagingTasksPanel.tsx     | MessagingTasksPanel     | YES — staff messaging                          |
| panels/AIAssistPanel.tsx           | AIAssistPanel           | YES — /ai/request                              |
| panels/IntakePanel.tsx             | IntakePanel             | YES — intake by patient                        |
| panels/PatientLOAPanel.tsx         | PatientLOAPanel         | YES — LOA endpoints                            |
| panels/LongitudinalPanel.tsx       | LongitudinalPanel       | YES — longitudinal timeline                    |
| panels/ClinicalProceduresPanel.tsx | ClinicalProceduresPanel | No (integration pending)                       |
| panels/RpcDebugPanel.tsx           | RpcDebugPanel           | No (static data)                               |
| panels/ADTPanel.tsx                | ADTPanel                | YES — ADT endpoints                            |

### 4.5 Web App — Admin Pages (52 files)

| File                               | Component              | Module              |
| ---------------------------------- | ---------------------- | ------------------- |
| admin/analytics/page.tsx           | AnalyticsPage          | Analytics           |
| admin/alignment/page.tsx           | AlignmentPage          | VistA Alignment     |
| admin/adapters/page.tsx            | AdaptersPage           | Adapter Mgmt        |
| admin/audit-viewer/page.tsx        | AuditViewerPage        | Immutable Audit     |
| admin/billing/page.tsx             | BillingPage            | SaaS Billing        |
| admin/branding/page.tsx            | BrandingPage           | Tenant Branding     |
| admin/break-glass/page.tsx         | BreakGlassPage         | Break-Glass         |
| admin/capability-matrix/page.tsx   | CapabilityMatrixPage   | Payer Capability    |
| admin/certification/page.tsx       | CertificationPage      | Security Cert       |
| admin/claims-queue/page.tsx        | ClaimsQueuePage        | Claims Lifecycle    |
| admin/claims-workbench/page.tsx    | ClaimsWorkbenchPage    | HMO Claims          |
| admin/compliance/page.tsx          | CompliancePage         | Regulatory          |
| admin/contracting-hub/page.tsx     | ContractingHubPage     | HMO Contracting     |
| admin/denial-cases/page.tsx        | DenialCasesPage        | Denial Mgmt         |
| admin/denials/page.tsx             | DenialsPage            | Denials (legacy)    |
| admin/exports/page.tsx             | ExportsPage            | Data Exports        |
| admin/hmo-portal/page.tsx          | HmoPortalPage          | HMO Portal          |
| admin/integrations/page.tsx        | IntegrationsPage       | Integration Console |
| admin/loa-queue/page.tsx           | LOAQueuePage           | LOA Queue           |
| admin/loa-workbench/page.tsx       | LOAWorkbenchPage       | LOA Workbench       |
| admin/migration/page.tsx           | MigrationPage          | Data Migration      |
| admin/module-disabled/page.tsx     | ModuleDisabledPage     | Module Guard        |
| admin/module-validation/page.tsx   | ModuleValidationPage   | Module Validation   |
| admin/modules/page.tsx             | ModulesPage            | Module Mgmt         |
| admin/onboarding/page.tsx          | OnboardingPage         | Tenant Onboarding   |
| admin/ops/page.tsx                 | OpsPage                | Operations          |
| admin/payer-db/page.tsx            | PayerDbPage            | Payer DB            |
| admin/payer-directory/page.tsx     | PayerDirectoryPage     | Payer Directory     |
| admin/payer-intelligence/page.tsx  | PayerIntelligencePage  | Payer Intelligence  |
| admin/payer-registry/page.tsx      | PayerRegistryPage      | Payer Registry      |
| admin/payerops/page.tsx            | PayerOpsPage           | PayerOps Hub        |
| admin/payments/page.tsx            | PaymentsPage           | Payments            |
| admin/performance/page.tsx         | PerformancePage        | Performance         |
| admin/ph-hmo-console/page.tsx      | PhHmoConsolePage       | PH HMO Console      |
| admin/ph-market/page.tsx           | PhMarketPage           | PH Market           |
| admin/philhealth-claims/page.tsx   | PhilHealthClaimsPage   | PhilHealth Claims   |
| admin/philhealth-eclaims3/page.tsx | PhilHealthEclaims3Page | eClaims v3          |
| admin/philhealth-setup/page.tsx    | PhilHealthSetupPage    | PhilHealth Setup    |
| admin/pilot/page.tsx               | PilotPage              | Pilot Mgmt          |
| admin/qa-dashboard/page.tsx        | QaDashboardPage        | QA Dashboard        |
| admin/queue/page.tsx               | QueuePage              | Queue Mgmt          |
| admin/rcm/page.tsx                 | RcmPage                | RCM Dashboard       |
| admin/reconciliation/page.tsx      | ReconciliationPage     | Reconciliation      |
| admin/remittance-intake/page.tsx   | RemittanceIntakePage   | Remittance Intake   |
| admin/reports/page.tsx             | ReportsPage            | Admin Reports       |
| admin/rpc-debug/page.tsx           | RpcDebugPage           | RPC Debug           |
| admin/service-lines/page.tsx       | ServiceLinesPage       | Service Lines       |
| admin/support/page.tsx             | SupportPage            | Support             |
| admin/templates/page.tsx           | TemplatesPage          | Note Templates      |
| admin/terminal/page.tsx            | TerminalPage           | MUMPS Console       |
| admin/workflows/page.tsx           | WorkflowsPage          | Workflows           |
| admin/layout.tsx                   | AdminLayout            | Admin Shell         |

### 4.6 Web App — CPRS Pages (16 files)

| File                               | Component         | API Fetch                    |
| ---------------------------------- | ----------------- | ---------------------------- |
| cprs/login/page.tsx                | LoginPage         | YES — POST /auth/login       |
| cprs/layout.tsx                    | CPRSLayout        | No                           |
| cprs/patient-search/page.tsx       | PatientSearchPage | YES — patient search/list    |
| cprs/chart/[dfn]/[tab]/page.tsx    | ChartPage         | YES — useDataCache.fetchAll  |
| cprs/inbox/page.tsx                | InboxPage         | YES — /vista/inbox           |
| cprs/messages/page.tsx             | MessagesPage      | YES — mailman endpoints      |
| cprs/nursing/page.tsx              | NursingPage       | YES — nursing endpoints      |
| cprs/emar/page.tsx                 | EmarPage          | YES — eMAR endpoints         |
| cprs/verify/page.tsx               | VerifyPage        | YES — 15+ clinical endpoints |
| cprs/scheduling/page.tsx           | SchedulingPage    | YES — scheduling endpoints   |
| cprs/handoff/page.tsx              | HandoffPage       | YES — handoff reports        |
| cprs/inpatient/page.tsx            | InpatientPage     | YES — ADT endpoints          |
| cprs/order-sets/page.tsx           | OrderSetsPage     | No                           |
| cprs/settings/preferences/page.tsx | PreferencesPage   | No                           |
| cprs/remote-data-viewer/page.tsx   | RemoteDataPage    | YES — remote data            |

### 4.7 Legacy Chart & Other Pages (13 files)

| File                              | Component         | Module           |
| --------------------------------- | ----------------- | ---------------- |
| chart/PatientHeader.tsx           | PatientHeader     | Chart Shell      |
| chart/TabStrip.tsx                | TabStrip          | Chart Shell      |
| chart/MenuBar.tsx                 | MenuBar           | Chart Shell      |
| chart/panels/CoverSheetPanel.tsx  | CoverSheetPanel   | Cover Sheet      |
| chart/panels/ProblemsPanel.tsx    | ProblemsPanel     | Problems         |
| chart/panels/MedsPanel.tsx        | MedsPanel         | Medications      |
| chart/panels/NotesPanel.tsx       | NotesPanel        | Notes            |
| chart/panels/PlaceholderPanel.tsx | PlaceholderPanel  | Placeholder      |
| patient-search/page.tsx           | PatientSearchPage | Legacy Search    |
| chart/[dfn]/[tab]/page.tsx        | ChartPage         | Legacy Chart     |
| inpatient/census/page.tsx         | CensusPage        | Inpatient Census |
| inpatient/bedboard/page.tsx       | BedBoardPage      | Bed Board        |
| encounter/note-builder/page.tsx   | NoteBuilderPage   | Note Builder     |

---

## 5. ENVIRONMENT VARIABLES

**Total: ~368 unique env vars | ~62 in .env.example | ~306 undocumented**

### Core / VistA (11 vars)

| Variable                | In .env.example? | File(s)                                             |
| ----------------------- | ---------------- | --------------------------------------------------- |
| VISTA_HOST              | YES              | vista/config.ts, tenant-config.ts, swap-boundary.ts |
| VISTA_PORT              | YES              | vista/config.ts, tenant-config.ts, swap-boundary.ts |
| VISTA_ACCESS_CODE       | YES              | vista/config.ts                                     |
| VISTA_VERIFY_CODE       | YES              | vista/config.ts                                     |
| VISTA_CONTEXT           | YES              | vista/config.ts, tenant-config.ts                   |
| VISTA_DEBUG             | NO               | rpcBrokerClient.ts                                  |
| VISTA_CAPABILITY_TTL_MS | NO               | rpcCapabilities.ts                                  |
| VISTA_INSTANCE_ID       | NO               | swap-boundary.ts                                    |
| VISTA_CONTRACT_MODE     | NO               | vista/contracts/modes.ts                            |
| VISTA_FACILITY_NAME     | NO               | tenant-config.ts                                    |
| VISTA_FACILITY_STATION  | NO               | tenant-config.ts                                    |

### Server & Runtime (10 vars)

| Variable              | In .env.example? | File(s)                      |
| --------------------- | ---------------- | ---------------------------- |
| PORT                  | YES              | server/start.ts              |
| HOST                  | YES              | server/start.ts              |
| NODE_ENV              | NO (std)         | 20+ files                    |
| PLATFORM_RUNTIME_MODE | YES              | runtime-mode.ts, 12+ files   |
| BUILD_SHA             | YES              | tracing.ts, inline-routes.ts |
| BUILD_TIME            | YES              | inline-routes.ts             |
| DEPLOY_SKU            | NO               | module-registry.ts           |
| STORE_BACKEND         | NO               | lifecycle.ts                 |
| APP_VERSION           | NO               | external services            |
| APP_URL               | NO               | auth/idp                     |

### Security & Auth (21 vars)

| Variable                                                      | In .env.example? |
| ------------------------------------------------------------- | ---------------- |
| ALLOWED_ORIGINS                                               | YES              |
| SESSION_COOKIE                                                | YES              |
| SESSION_ABSOLUTE_TTL_MS                                       | YES              |
| SESSION_IDLE_TTL_MS                                           | YES              |
| SESSION_CLEANUP_MS                                            | NO               |
| AUTH_MODE                                                     | YES              |
| OIDC_ENABLED                                                  | YES              |
| OIDC_ISSUER                                                   | YES              |
| OIDC_CLIENT_ID                                                | YES              |
| OIDC_AUDIENCE                                                 | YES              |
| OIDC_JWKS_URI                                                 | YES              |
| SCIM_ENABLED, SCIM_BEARER_TOKEN                               | NO               |
| PASSKEYS_ENABLED                                              | NO               |
| FACE_VERIFICATION_ENABLED/VENDOR                              | NO               |
| JWT_CLOCK_SKEW_SECONDS                                        | NO               |
| MAX_CONCURRENT_SESSIONS                                       | NO               |
| MFA_ENFORCEMENT_ENABLED                                       | NO               |
| MFA_GRACE_PERIOD_MS                                           | NO               |
| KEY_PROVIDER, VAULT_URL, VAULT_TOKEN, KMS_REGION, KMS_KEY_ARN | NO               |

### Database (16 vars)

| Variable                               | In .env.example? |
| -------------------------------------- | ---------------- |
| PLATFORM_PG_URL                        | YES              |
| PLATFORM_PG_HOST/PORT/USER/PASSWORD/DB | NO               |
| PLATFORM_PG_POOL_MIN/MAX               | YES              |
| PLATFORM_PG_SSL, SSL_CA/CERT/KEY       | NO               |
| PLATFORM_PG_RLS_ENABLED                | YES              |
| PLATFORM_PG_STATEMENT_TIMEOUT_MS       | NO               |
| PG_BACKUP_DIR, PG_BACKUP_RETAIN_COUNT  | NO               |

### Imaging (16 vars)

| Variable                                    | In .env.example? |
| ------------------------------------------- | ---------------- |
| ORTHANC_URL                                 | YES              |
| OHIF_URL                                    | YES              |
| ORTHANC_DICOMWEB_ROOT                       | YES              |
| IMAGING_PROXY_TIMEOUT_MS                    | YES              |
| IMAGING_QIDO_CACHE_TTL_MS                   | YES              |
| IMAGING_ENABLE_DEMO_UPLOAD                  | YES              |
| IMAGING_MAX_UPLOAD_BYTES                    | YES              |
| IMAGING_INGEST_WEBHOOK_SECRET               | YES              |
| DICOMWEB_RATE_LIMIT/WINDOW_MS               | YES              |
| ORTHANC_AE_TITLE, FACILITY_AE_ALLOWLIST     | NO               |
| DEFAULT_TENANT_ID, DEFAULT_FACILITY_ID/NAME | NO               |
| OHIF_VIEWER_URL                             | NO               |

### RCM & Billing Connectors (~60 vars, all NO except BILLING_PROVIDER)

Key groups: `CLAIM_SUBMISSION_ENABLED`, `RCM_SANDBOX_*`, `RCM_CH_SFTP_*`, `RCM_CH_API_*`, `CLEARINGHOUSE_*`, `STEDI_*`, `AVAILITY_*`, `PHILHEALTH_*`, `ACC_NZ_*`, `ECLIPSE_*`, `NPHC_*`

### Telehealth (11 vars, all NO)

`TELEHEALTH_PROVIDER`, `TELEHEALTH_ROOM_TTL_MS`, `TELEHEALTH_TURN_URL/USERNAME/CREDENTIAL`, `JITSI_BASE_URL/APP_ID/APP_SECRET`

### Observability (8 vars, all NO)

`OTEL_ENABLED`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`, `OTEL_SAMPLING_RATE`, `SLO_ERROR_BUDGET/WINDOW_MS`

### Analytics (18 vars, all NO)

`ANALYTICS_MAX_EVENTS`, `ANALYTICS_USER_SALT`, `ANALYTICS_AGGREGATION_INTERVAL_MS`, `ROCTO_HOST/PORT`, etc.

### Audit Shipping (9 vars, all YES)

`AUDIT_SHIP_ENABLED/ENDPOINT/BUCKET/ACCESS_KEY/SECRET_KEY/REGION/INTERVAL_MS/CHUNK_SIZE/PATH_STYLE`

### Other Groups (100+ additional vars)

SIEM (8), Portal IAM (11), IDP/SAML (14), Logging (2 YES), Cache (5 YES), Rate Limiting (6), Jobs (6), Feature Flags (5 YES), Reports (10), Routing (4), OpenCost (5), HL7 (4), Intake/Brain (6), Billing (4 YES), Frontend (1), Migration (2)

---

## 6. BROKEN IMPORTS

> **Note**: A full static import analysis requires `tsc --noEmit` or similar tooling. The following are known issues from the codebase's AGENTS.md and BUG-TRACKER.md:

| #   | Description                                                                | Status                            |
| --- | -------------------------------------------------------------------------- | --------------------------------- |
| 1   | No systematic broken import scan has been run yet                          | PENDING — requires `tsc --noEmit` |
| 2   | Dynamic imports via `import()` in adapter-loader.ts use try/catch fallback | By design                         |
| 3   | Some chart/ legacy components may reference old import paths               | Needs verification                |

**Action required**: Run `pnpm -C apps/api exec tsc --noEmit` and `pnpm -C apps/web exec tsc --noEmit` to produce a definitive broken import list.

---

## 7. DEAD CODE

> **Note**: Dead code analysis for a codebase this size requires tooling (ts-prune, knip, or similar). Known dead code candidates:

| #   | File/Module                                             | Reason                                                       | Status               |
| --- | ------------------------------------------------------- | ------------------------------------------------------------ | -------------------- |
| 1   | `apps/web/src/components/chart/` (8 files)              | Legacy chart view — superseded by `cprs/panels/`             | Likely dead          |
| 2   | `apps/web/src/app/patient-search/page.tsx`              | Legacy patient search — superseded by `cprs/patient-search/` | Likely dead          |
| 3   | `apps/web/src/app/chart/[dfn]/[tab]/page.tsx`           | Legacy chart page — superseded by `cprs/chart/`              | Likely dead          |
| 4   | Root-level JSON files (100+ test body files)            | curl/httpie test payloads scattered at repo root             | Should be in tests/  |
| 5   | Root-level cookies-_.txt, pw-_.txt files                | Manual test session files                                    | Should be gitignored |
| 6   | `apps/web/src/lib/vista-panel-wiring.ts`                | Auto-generated, not yet imported by any panel                | Not yet adopted      |
| 7   | `apps/web/src/components/cprs/VistaAlignmentBanner.tsx` | Dev-mode only, not yet imported by any panel                 | Not yet adopted      |

**Action required**: Run `npx knip` or `npx ts-prune` for a definitive dead code list.

---

## 8. SUMMARY STATISTICS

| Metric                             | Count                                |
| ---------------------------------- | ------------------------------------ |
| **Total .ts files**                | 1,086                                |
| **Total .tsx files**               | 162                                  |
| **Total source files**             | 1,248                                |
| **Total lines of code**            | ~300,348                             |
| **Total API endpoints**            | ~2,410                               |
| **Total API route files**          | ~150                                 |
| **Total PostgreSQL tables**        | ~80                                  |
| **Total TypeScript domain models** | ~480+                                |
| **Total Zod schemas**              | ~49                                  |
| **Total React components (.tsx)**  | 161                                  |
| — Portal components                | 28                                   |
| — Web/CPRS components              | 133                                  |
| **Total environment variables**    | ~368                                 |
| — Documented in .env.example       | ~62                                  |
| — Undocumented                     | ~306                                 |
| **Total broken imports**           | Unknown — tsc --noEmit needed        |
| **Total dead code files**          | ~7+ identified — full scan needed    |
| **Root-level test artifacts**      | 100+ JSON/txt files (cleanup needed) |

---

## Appendix: Storage Backend Summary

| Backend                  | Usage                             | Notes                                            |
| ------------------------ | --------------------------------- | ------------------------------------------------ |
| PostgreSQL (Drizzle ORM) | ~80 tables, primary durable store | RLS-enforced, tenant-scoped                      |
| In-memory Maps           | ~30 stores                        | Reset on API restart, documented migration paths |
| SQLite (platform.db)     | Dev/test fallback                 | Blocked in rc/prod mode (Phase 125)              |
| JSONL files              | Immutable audit chain             | Append-only, hash-chained                        |
| JSON seed files          | Payer data (data/payers/)         | Loaded at startup                                |
| VistA (M/MUMPS globals)  | Source of truth for clinical data | All interactions via RPC broker                  |
