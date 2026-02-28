# Clinical Writeback Scope Matrix

> Wave 12 -- VistA-Evolved departmental writeback coverage map.
> Each domain lists read paths present today, writeback targets, safety gating, and fallback paths.

## Legend

| Symbol | Meaning |
|--------|---------|
| :white_check_mark: | Implemented and tested |
| :construction: | Partially implemented / integration-pending |
| :x: | Not yet implemented |

---

## 1. Notes (TIU)

| Capability | Status | Route | RPC(s) | Notes |
|------------|--------|-------|--------|-------|
| **Read: list documents** | :white_check_mark: | `GET /vista/cprs/notes` | `TIU DOCUMENTS BY CONTEXT` | Merges signed+unsigned |
| **Read: document text** | :white_check_mark: | `GET /vista/cprs/notes/text` | `TIU GET RECORD TEXT` | |
| **Read: title list** | :white_check_mark: | `GET /vista/cprs/notes/titles` | `TIU PERSONAL TITLE LIST` | |
| **Write: create draft** | :white_check_mark: | `POST /vista/cprs/notes/create` | `TIU CREATE RECORD` + `TIU SET DOCUMENT TEXT` | wave2-routes.ts |
| **Write: sign note** | :white_check_mark: | `POST /vista/cprs/notes/sign` | `TIU LOCK/SIGN/UNLOCK RECORD` | tiu-notes.ts |
| **Write: addendum** | :white_check_mark: | `POST /vista/cprs/notes/addendum` | `TIU CREATE ADDENDUM RECORD` | tiu-notes.ts |
| **Write: edit text** | :construction: | -- | `TIU SET DOCUMENT TEXT` | RPC registered; no dedicated edit endpoint |

### Wave 12 Target (P301)
- Route all writes through command bus
- Add dedicated edit-text endpoint
- Contract tests for create/edit/sign lifecycle
- Dry-run mode for all TIU writes

### Safety Gating
- **Feature flag:** `writeback.notes.enabled` (default: false)
- **Permissions:** Clinician role required for create/edit; provider role for sign
- **Audit:** Every TIU command logs to immutable audit trail
- **Dry-run:** Records "would call TIU CREATE RECORD with params..." without executing

### Fallback Path
- If TIU SIGN RECORD fails: note stays in unsigned state, user prompted to retry
- If VistA unreachable: command queued with status PENDING, circuit breaker triggers

---

## 2. Orders (OR)

| Capability | Status | Route | RPC(s) | Notes |
|------------|--------|-------|--------|-------|
| **Read: active orders** | :white_check_mark: | `GET /vista/cprs/orders` | `ORWORR AGET` | |
| **Read: order checks** | :white_check_mark: | `POST /vista/cprs/order-checks` | `ORWDXC ACCEPT/DISPLAY` | |
| **Write: draft order** | :white_check_mark: | `POST /vista/cprs/orders/draft` | `ORWDX SAVE` | wave2-routes.ts |
| **Write: lab quick-order** | :white_check_mark: | `POST /vista/cprs/orders/lab` | `ORWDXM AUTOACK` | orders-cpoe.ts |
| **Write: verify** | :white_check_mark: | `POST /vista/cprs/orders/verify` | `ORWDXA VERIFY` | wave2-routes.ts |
| **Write: discontinue** | :white_check_mark: | `POST /vista/cprs/orders/dc` | `ORWDXA DC` | wave2-routes.ts |
| **Write: flag** | :white_check_mark: | `POST /vista/cprs/orders/flag` | `ORWDXA FLAG` | wave2-routes.ts |
| **Write: e-sign** | :white_check_mark: | `POST /vista/cprs/orders/sign` | `ORWOR1 SIG` | orders-cpoe.ts, PG event audit |
| **Write: imaging order** | :construction: | `POST /vista/cprs/orders/imaging` | -- | Integration-pending (no QOs in sandbox) |
| **Write: consult order** | :construction: | `POST /vista/cprs/orders/consult` | -- | Integration-pending (needs ORDIALOG) |

### Wave 12 Target (P302)
- Route all writes through command bus
- Implement safe dialog whitelist for order categories
- Contract tests for place/discontinue/sign lifecycle
- Dry-run mode for all order writes

### Safety Gating
- **Feature flag:** `writeback.orders.enabled` (default: false)
- **LOCK/UNLOCK:** Mandatory `ORWDX LOCK` before, `ORWDX UNLOCK` after
- **Permissions:** Provider role required for ordering
- **Audit:** Sign events logged to `cpoe_order_sign_event` PG table
- **Dry-run:** Records intended ORWDX SAVE params without executing

### Fallback Path
- If ORWDX SAVE fails: order stays in draft status
- If VistA unreachable: command queued, circuit breaker triggers

---

## 3. Pharmacy (PS/ORWPS)

| Capability | Status | Route | RPC(s) | Notes |
|------------|--------|-------|--------|-------|
| **Read: active meds** | :white_check_mark: | `GET /vista/medications` | `ORWPS ACTIVE` | Multi-line grouped records |
| **Write: quick-order med** | :white_check_mark: | `POST /vista/cprs/meds/quick-order` | `ORWDXM AUTOACK` | wave2-routes.ts |
| **Write: discontinue med** | :white_check_mark: | via `/vista/cprs/orders/dc` | `ORWDXA DC` | Generic order DC |
| **Write: eMAR administer** | :white_check_mark: | `POST /emar/administer` | In-memory store | emar/index.ts |
| **Write: eMAR barcode** | :white_check_mark: | `POST /emar/barcode-scan` | In-memory store | emar/index.ts |
| **Read: MAR log** | :construction: | -- | `PSB MED LOG` (exception) | RPC known but not wired |

### Wave 12 Target (P303)
- Route med orders through command bus
- Lifecycle visibility: pending -> active -> discontinued
- MAR hooks: stage administration events for later writeback
- Break-glass for high-risk operations

### Safety Gating
- **Feature flag:** `writeback.pharmacy.enabled` (default: false)
- **Permissions:** Provider for orders; nurse for MAR administration
- **Audit:** Med order + admin events logged
- **Dry-run:** Records intended ORWDXM AUTOACK params

### Fallback Path
- eMAR administration staged in platform, synced to VistA when available
- If med order RPC fails: retry with circuit breaker

---

## 4. Labs (LR/ORWLR)

| Capability | Status | Route | RPC(s) | Notes |
|------------|--------|-------|--------|-------|
| **Read: interim results** | :white_check_mark: | `GET /vista/labs` | `ORWLRR INTERIM` | |
| **Read: chart data** | :white_check_mark: | -- | `ORWLRR CHART` | Registered |
| **Write: lab order** | :white_check_mark: | `POST /vista/cprs/orders/lab` | `ORWDXM AUTOACK` | Quick-order path |
| **Write: ack result** | :white_check_mark: | `POST /vista/cprs/labs/ack` | `ORWLRR ACK` | wave2-routes.ts |

### Wave 12 Target (P304)
- Route lab orders through command bus
- Results acknowledgement via command bus with audit
- LOINC mapping table placeholder (terminology posture)
- Results ingest via VistA read RPCs or HL7 ORU bridge

### Safety Gating
- **Feature flag:** `writeback.labs.enabled` (default: false)
- **Permissions:** Provider for orders; clinician for ack
- **Audit:** Lab order + ack events logged
- **Dry-run:** Records intended params

### Fallback Path
- Lab results readable via existing RPCs; ack staged if RPC unavailable
- HL7 ORU bridge available for results ingest

---

## 5. Inpatient / ADT (DGPM)

| Capability | Status | Route | RPC(s) | Notes |
|------------|--------|-------|--------|-------|
| **Read: wards** | :white_check_mark: | `GET /vista/adt/wards` | `ZVEADT WARDS` / `ORQPT WARDS` | Custom + standard |
| **Read: beds** | :white_check_mark: | `GET /vista/adt/beds` | `ZVEADT BEDS` | Custom routine |
| **Read: movement history** | :white_check_mark: | -- | `ZVEADT MVHIST` | Custom routine |
| **Read: ward patients** | :white_check_mark: | -- | `ORQPT WARD PATIENTS` | |
| **Write: admit** | :white_check_mark: | `POST /vista/adt/admit` | In-memory + audit | adt/index.ts |
| **Write: transfer** | :white_check_mark: | `POST /vista/adt/transfer` | In-memory + audit | adt/index.ts |
| **Write: discharge** | :white_check_mark: | `POST /vista/adt/discharge` | In-memory + audit | adt/index.ts |

### Wave 12 Target (P305)
- Route ADT writes through command bus
- Bedboard visualization with ward census
- Movement timeline view
- HL7 ADT bridge as writeback fallback

### Safety Gating
- **Feature flag:** `writeback.adt.enabled` (default: false)
- **Permissions:** Admit/discharge: provider; transfer: nursing supervisor
- **Audit:** Every ADT event logged with before/after ward state
- **Dry-run:** Records intended admit/transfer/discharge params
- **Concurrency:** Idempotency keys prevent double transfers

### Fallback Path
- If DGPM RPCs unavailable: HL7 ADT outbound to interface engine
- Staged ADT events queued for later writeback

---

## 6. Imaging (RA/ORWRA)

| Capability | Status | Route | RPC(s) | Notes |
|------------|--------|-------|--------|-------|
| **Read: study list** | :white_check_mark: | `GET /imaging/studies` | DICOMweb QIDO-RS | Orthanc proxy |
| **Read: viewer** | :white_check_mark: | OHIF integration | DICOMweb WADO-RS | Phase 24 |
| **Write: imaging order** | :construction: | `POST /vista/cprs/orders/imaging` | -- | Integration-pending |
| **Write: ingest study** | :white_check_mark: | `POST /imaging/ingest/callback` | Service-to-service | Orthanc OnStableStudy |
| **Write: manual link** | :white_check_mark: | `POST /imaging/ingest/unmatched/:id/link` | Admin-only | Phase 23 |

### Wave 12 Target (P306)
- Validate Orthanc/DICOMweb production readiness
- Tenant isolation for imaging studies
- FHIR ImagingStudy posture
- Link imaging orders to received studies

### Safety Gating
- **Feature flag:** `writeback.imaging.enabled` (default: false)
- **Permissions:** `imaging_admin` for STOW-RS; `imaging_view` for reads
- **Audit:** Hash-chained imaging audit trail
- **Rate limiting:** DICOMweb rate limiter (120 req/60s)

### Fallback Path
- Imaging orders staged until Orthanc confirms study receipt
- Unmatched studies quarantined for manual linking

---

## Cross-Domain Safety Switches

| Switch | Scope | Default | Env Var |
|--------|-------|---------|---------|
| `writeback.enabled` | Global kill-switch | `false` | `WRITEBACK_ENABLED` |
| `writeback.notes.enabled` | TIU domain | `false` | `WRITEBACK_NOTES_ENABLED` |
| `writeback.orders.enabled` | OR domain | `false` | `WRITEBACK_ORDERS_ENABLED` |
| `writeback.pharmacy.enabled` | PS domain | `false` | `WRITEBACK_PHARMACY_ENABLED` |
| `writeback.labs.enabled` | LR domain | `false` | `WRITEBACK_LABS_ENABLED` |
| `writeback.adt.enabled` | DGPM domain | `false` | `WRITEBACK_ADT_ENABLED` |
| `writeback.imaging.enabled` | RA domain | `false` | `WRITEBACK_IMAGING_ENABLED` |
| `writeback.dryrun` | All domains | `true` | `WRITEBACK_DRYRUN` |
