# Module Catalog -- VistA-Evolved

> Phase 109: Modular Packaging + Feature Flags
> Generated from config/modules.json (Phase 37C/51 manifests)

## Overview

VistA-Evolved is composed of 13 system-level modules. Each module encapsulates
a distinct capability domain: UI routes, API routes, data stores, adapters,
and VistA RPC dependencies. Modules can be enabled/disabled per tenant via
the Module Registry (Phase 109) and packaged into SKU profiles for deployment.

---

## Module Definitions

### 1. kernel (Always Enabled)

| Field              | Value                                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **Description**    | Core platform services: auth, session, health, config, audit                                                               |
| **Always Enabled** | Yes                                                                                                                        |
| **Dependencies**   | None                                                                                                                       |
| **Adapters**       | None                                                                                                                       |
| **UI Routes**      | `/cprs` (shell), `/cprs/admin` (admin console)                                                                             |
| **API Routes**     | `/health`, `/ready`, `/version`, `/auth/*`, `/admin/my-tenant`, `/api/modules/*`, `/api/capabilities/*`, `/api/adapters/*` |
| **Data Stores**    | session-store (in-memory), immutable-audit (in-memory + JSONL), tenant-config (in-memory)                                  |
| **VistA RPCs**     | `XUS AV CODE` (auth), `XUS INTRO MSG`, `XWB CREATE CONTEXT`                                                                |
| **Feature Flags**  | None (always on)                                                                                                           |

### 2. clinical

| Field              | Value                                                                                                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**    | Patient search, demographics, allergies, vitals, meds, problems, notes, consults, surgery, D/C summaries, labs, reports, orders, cover sheet                                              |
| **Always Enabled** | No                                                                                                                                                                                        |
| **Dependencies**   | kernel                                                                                                                                                                                    |
| **Adapters**       | clinical-engine (VistA or stub)                                                                                                                                                           |
| **UI Routes**      | `/cprs/patient-search`, `/cprs/[tabs]` (cover, problems, meds, orders, notes, consults, surgery, dcsumm, labs, reports, vitals, allergies)                                                |
| **API Routes**     | `/vista/patient-search`, `/vista/patient/*`, `/vista/allergies`, `/vista/vitals`, `/vista/meds`, `/vista/problems`, `/vista/notes`, `/vista/orders/*`, `/vista/labs`, `/vista/reports`    |
| **Data Stores**    | vista-globals (VistA FileMan), rpc-capability-cache (in-memory, 5m TTL)                                                                                                                   |
| **VistA RPCs**     | `ORWPT LIST ALL`, `ORWPT SELECT`, `ORQQAL LIST`, `ORWDAL32 SAVE ALLERGY`, `GMV MANAGER`, `ORQQPL LIST`, `TIU CREATE RECORD`, `ORWDX SAVE`, `ORWPS ACTIVE`, `ORWRP REPORT TEXT`, ~55 total |
| **Feature Flags**  | `notes.templates`, `orders.sign`, `orders.release`, `write-backs.enabled`                                                                                                                 |

### 3. portal

| Field              | Value                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------- |
| **Description**    | Patient-facing portal: self-service demographics, appointments, messages, lab results |
| **Always Enabled** | No                                                                                    |
| **Dependencies**   | kernel                                                                                |
| **Adapters**       | clinical-engine (for patient data reads)                                              |
| **UI Routes**      | `/portal/*` (patient dashboard, appointments, messages, lab results)                  |
| **API Routes**     | `/portal/auth/*`, `/portal/patient/*`, `/portal/appointments`, `/portal/messages`     |
| **Data Stores**    | portal-sessions (in-memory), portal-audit (in-memory)                                 |
| **VistA RPCs**     | Delegates to clinical-engine adapter                                                  |
| **Feature Flags**  | `remote-data.enabled`                                                                 |

### 4. telehealth

| Field              | Value                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------- |
| **Description**    | Video visit rooms, device checks, waiting rooms, provider-patient telehealth sessions |
| **Always Enabled** | No                                                                                    |
| **Dependencies**   | kernel                                                                                |
| **Adapters**       | telehealth (Jitsi or stub)                                                            |
| **UI Routes**      | `/cprs/telehealth/*`, `/portal/dashboard/telehealth`                                  |
| **API Routes**     | `/telehealth/*`                                                                       |
| **Data Stores**    | room-store (in-memory, 4h TTL)                                                        |
| **VistA RPCs**     | None (standalone video infrastructure)                                                |
| **Feature Flags**  | None                                                                                  |

### 5. imaging

| Field              | Value                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **Description**    | DICOM viewer, imaging worklist, radiology orders, device registry, imaging audit, DICOMweb proxy                               |
| **Always Enabled** | No                                                                                                                             |
| **Dependencies**   | kernel                                                                                                                         |
| **Adapters**       | imaging (VistA or stub)                                                                                                        |
| **UI Routes**      | `/cprs` imaging tab (ImagingPanel: Studies, Worklist, Orders, Devices, Audit)                                                  |
| **API Routes**     | `/imaging/*`, `/imaging/ingest/*`                                                                                              |
| **Data Stores**    | imaging-worklist (in-memory), imaging-ingest (in-memory), imaging-devices (in-memory), imaging-audit (in-memory, hash-chained) |
| **VistA RPCs**     | Target: `RAD/NUC MED REGISTER`, `RA ASSIGN ACC#` (not available in sandbox)                                                    |
| **Feature Flags**  | `imaging.viewer`                                                                                                               |

### 6. analytics

| Field              | Value                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| **Description**    | PHI-safe analytics events, hourly/daily aggregation, BI SQL access via ROcto, clinical reports |
| **Always Enabled** | No                                                                                             |
| **Dependencies**   | kernel                                                                                         |
| **Adapters**       | None                                                                                           |
| **UI Routes**      | `/cprs/admin/analytics`                                                                        |
| **API Routes**     | `/analytics/*`                                                                                 |
| **Data Stores**    | events (in-memory ring buffer), aggregations (in-memory), rocto-sql (external YottaDB/Octo)    |
| **VistA RPCs**     | `ORWRP REPORT TEXT` (clinical reports)                                                         |
| **Feature Flags**  | None                                                                                           |

### 7. interop

| Field              | Value                                                                          |
| ------------------ | ------------------------------------------------------------------------------ |
| **Description**    | VistA HL7/HLO interop telemetry, M routine management, integration registry    |
| **Always Enabled** | No                                                                             |
| **Dependencies**   | kernel                                                                         |
| **Adapters**       | messaging (VistA or stub)                                                      |
| **UI Routes**      | `/cprs/admin/integrations`                                                     |
| **API Routes**     | `/vista/interop/*`                                                             |
| **Data Stores**    | integration-registry (in-memory)                                               |
| **VistA RPCs**     | `ZVEMIOP QUEUE STATUS`, `ZVEMIOP CONFIG`, `ZVEMIOP TEST SEND`, `ZVEMIOP STATS` |
| **Feature Flags**  | None                                                                           |

### 8. intake

| Field              | Value                                                               |
| ------------------ | ------------------------------------------------------------------- |
| **Description**    | Patient intake forms, registration packets, insurance card scanning |
| **Always Enabled** | No                                                                  |
| **Dependencies**   | kernel                                                              |
| **Adapters**       | None                                                                |
| **UI Routes**      | `/portal/intake/*`                                                  |
| **API Routes**     | `/intake/*`                                                         |
| **Data Stores**    | intake-store (in-memory), pack-registry (in-memory)                 |
| **VistA RPCs**     | None                                                                |
| **Feature Flags**  | None                                                                |

### 9. ai

| Field              | Value                                                               |
| ------------------ | ------------------------------------------------------------------- |
| **Description**    | AI-assisted clinical documentation, prompt registry, AI audit trail |
| **Always Enabled** | No                                                                  |
| **Dependencies**   | kernel                                                              |
| **Adapters**       | None                                                                |
| **UI Routes**      | `/cprs/admin/ai-gateway`                                            |
| **API Routes**     | `/ai/*`                                                             |
| **Data Stores**    | ai-audit (in-memory), prompt-registry (in-memory)                   |
| **VistA RPCs**     | None                                                                |
| **Feature Flags**  | None                                                                |

### 10. iam

| Field              | Value                                                                   |
| ------------------ | ----------------------------------------------------------------------- |
| **Description**    | OIDC/SAML SSO, passkeys/WebAuthn, policy engine, immutable audit viewer |
| **Always Enabled** | No                                                                      |
| **Dependencies**   | kernel                                                                  |
| **Adapters**       | None                                                                    |
| **UI Routes**      | `/cprs/admin/audit-viewer`                                              |
| **API Routes**     | `/iam/*`                                                                |
| **Data Stores**    | oidc-cache (in-memory, 10m TTL), passkey-challenges (in-memory, 5m TTL) |
| **VistA RPCs**     | None                                                                    |
| **Feature Flags**  | None                                                                    |

### 11. rcm

| Field              | Value                                                                                                                                                                                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**    | Revenue cycle management: claims, eligibility, payer registry, EDI pipeline, denials, appeals, payments, reconciliation, PhilHealth integration                                                                                                                               |
| **Always Enabled** | No                                                                                                                                                                                                                                                                            |
| **Dependencies**   | kernel, clinical                                                                                                                                                                                                                                                              |
| **Adapters**       | billing (VistA or stub)                                                                                                                                                                                                                                                       |
| **UI Routes**      | `/cprs/admin/rcm`, `/cprs/admin/payer-*`, `/cprs/admin/claims-*`, `/cprs/admin/denial*`, `/cprs/admin/payments`, `/cprs/admin/reconciliation`, `/cprs/admin/remittance-intake`, `/cprs/admin/philhealth-*`, `/cprs/admin/ph-*`, `/cprs/admin/hmo-portal`, `/cprs/admin/loa-*` |
| **API Routes**     | `/rcm/*`, `/vista/rcm/*`, `/admin/payer-db/*`                                                                                                                                                                                                                                 |
| **Data Stores**    | claim-store (in-memory), payer-registry (JSON seed + SQLite), edi-pipeline (in-memory), rcm-audit (in-memory, hash-chained), plus 16 SQLite tables (payer, tenant_payer, denial_case, etc.)                                                                                   |
| **VistA RPCs**     | `ORWPCE PCE4NOTE`, `IBD SELECT BILLING`, `IBCN INSURANCE LIST`, ~85 billing RPCs                                                                                                                                                                                              |
| **Feature Flags**  | `rcm.enabled`                                                                                                                                                                                                                                                                 |

### 12. scheduling

| Field              | Value                                                              |
| ------------------ | ------------------------------------------------------------------ |
| **Description**    | Appointment scheduling, provider availability, resource management |
| **Always Enabled** | No                                                                 |
| **Dependencies**   | kernel                                                             |
| **Adapters**       | scheduling (VistA or stub)                                         |
| **UI Routes**      | `/cprs/scheduling`                                                 |
| **API Routes**     | `/scheduling/*`                                                    |
| **Data Stores**    | None (delegates to VistA)                                          |
| **VistA RPCs**     | `SD W/L WAITLIST` and ~14 scheduling RPCs                          |
| **Feature Flags**  | None                                                               |

### 13. migration

| Field              | Value                                                                 |
| ------------------ | --------------------------------------------------------------------- |
| **Description**    | Data migration toolkit for VistA-to-VistA and external system imports |
| **Always Enabled** | No                                                                    |
| **Dependencies**   | kernel, clinical                                                      |
| **Adapters**       | None                                                                  |
| **UI Routes**      | `/cprs/admin/migration`                                               |
| **API Routes**     | `/migration/*`                                                        |
| **Data Stores**    | migration-store (in-memory)                                           |
| **VistA RPCs**     | Various data import RPCs                                              |
| **Feature Flags**  | None                                                                  |

---

## SKU Profiles

| SKU                 | Modules Included                 |
| ------------------- | -------------------------------- |
| **FULL_SUITE**      | All 13 modules                   |
| **CLINICIAN_ONLY**  | kernel, clinical, analytics      |
| **PORTAL_ONLY**     | kernel, portal, intake           |
| **TELEHEALTH_ONLY** | kernel, telehealth, portal       |
| **RCM_ONLY**        | kernel, clinical, rcm, analytics |
| **IMAGING_ONLY**    | kernel, clinical, imaging        |
| **INTEROP_ONLY**    | kernel, interop, analytics       |

---

## Feature Flag Reference

| Flag ID                   | Module   | Description                             | Default |
| ------------------------- | -------- | --------------------------------------- | ------- |
| `notes.templates`         | clinical | Enable note template selection          | true    |
| `orders.sign`             | clinical | Enable electronic order signing         | true    |
| `orders.release`          | clinical | Enable order release to VistA           | false   |
| `imaging.viewer`          | imaging  | Enable OHIF/DICOMweb viewer integration | true    |
| `rpc.console`             | kernel   | Enable RPC debug console                | true    |
| `write-backs.enabled`     | clinical | Enable VistA write-back operations      | false   |
| `drag-reorder.coversheet` | clinical | Enable drag-to-reorder on cover sheet   | true    |
| `remote-data.enabled`     | portal   | Enable remote patient data access       | false   |
| `rcm.enabled`             | rcm      | Enable RCM module features              | true    |

---

## Entitlement Model (Phase 109)

Module entitlements are persisted in the platform SQLite database:

- **module_catalog**: System-level module definitions (seeded from config/modules.json)
- **tenant_module**: Per-tenant module enablement (enabled/disabled + plan tier)
- **tenant_feature_flag**: Per-tenant feature flag overrides
- **module_audit_log**: Append-only change history for all entitlement mutations

The runtime module guard checks DB-backed entitlements (with in-memory cache)
to enforce access control at both API and UI layers.
