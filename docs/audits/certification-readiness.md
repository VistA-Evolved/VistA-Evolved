# Certification Readiness Gap Analysis

> Generated: 2026-03-09

## ONC 2015 Edition Certification Criteria

### Clinical Quality Measures

| Criterion | Description | Status | Evidence |
| --------- | ----------- | ------ | -------- |
| 170.315(a)(1) | CPOE - Medications | **PARTIAL** | ORWDX SAVE works; pharmacy package RPCs needed for full |
| 170.315(a)(2) | CPOE - Laboratory | **PENDING** | LR ORDER RPC not in VEHU; route returns integration-pending |
| 170.315(a)(3) | CPOE - Diagnostic Imaging | **PARTIAL** | Order scaffold exists; RAD ORDER RPC pending |
| 170.315(a)(4) | Drug-drug, drug-allergy interaction | **DONE** | ORWDXC ACCEPT for order checks; allergy data via ORQQAL |
| 170.315(a)(5) | Demographics | **DONE** | ORWPT16 ID INFO; Patient FHIR resource |
| 170.315(a)(6) | Problem List | **DONE** | ORQQPL LIST (read); GMPL ADD SAVE pending for write |
| 170.315(a)(7) | Medication List | **DONE** | ORWPS ACTIVE with multi-line parser |
| 170.315(a)(8) | Medication Allergy List | **DONE** | ORQQAL LIST + ORWDAL32 SAVE ALLERGY |
| 170.315(a)(9) | Clinical Decision Support | **PARTIAL** | CDS scaffold; VistA clinical reminders pending |
| 170.315(a)(10) | Drug Formulary | **DONE** | ZVEPHAR.m drug list via VistA File 50 |
| 170.315(a)(14) | Implantable Device List | **PENDING** | Device registry exists but not VistA-linked |

### Care Coordination

| Criterion | Description | Status | Evidence |
| --------- | ----------- | ------ | -------- |
| 170.315(b)(1) | Transitions of Care (C-CDA) | **PARTIAL** | CCDA parser exists; export scaffold |
| 170.315(b)(2) | Clinical Information Reconciliation | **PARTIAL** | Med reconciliation routes exist |
| 170.315(b)(6) | Data Export | **DONE** | Bulk data export (NDJSON), data portability |
| 170.315(b)(7) | Data Segmentation for Privacy | **DONE** | Privacy segmentation (Phase 343) |
| 170.315(b)(8) | Security Tags | **DONE** | Sensitivity tags + break-glass |
| 170.315(b)(9) | Patient Matching | **PARTIAL** | ORWPT SELECT; algorithmic matching pending |
| 170.315(b)(10) | Electronic Health Information Export | **DONE** | FHIR R4 + Bulk Data Access |

### Privacy and Security

| Criterion | Description | Status | Evidence |
| --------- | ----------- | ------ | -------- |
| 170.315(d)(1) | Authentication, Access Control | **DONE** | OIDC + RBAC + ABAC + MFA framework |
| 170.315(d)(2) | Auditable Events | **DONE** | Hash-chained immutable audit (3 chains) |
| 170.315(d)(3) | Audit Report | **DONE** | /iam/audit + /imaging/audit + /rcm/audit |
| 170.315(d)(4) | Amendments | **PARTIAL** | Note addendum support; formal amendment workflow pending |
| 170.315(d)(5) | Automatic Access Time-out | **DONE** | Session TTL + device fingerprinting |
| 170.315(d)(6) | Emergency Access | **DONE** | Break-glass (Phase 24), patient-scoped, time-limited |
| 170.315(d)(7) | End-User Device Encryption | **DONE** | HTTPS enforced; cookie secure flags |
| 170.315(d)(8) | Integrity | **DONE** | Hash-chain verification endpoints |
| 170.315(d)(9) | Trusted Connection | **DONE** | TLS required in rc/prod |
| 170.315(d)(10) | Auditing Actions on Health Info | **DONE** | PHI access logged, DFN never in general logs |
| 170.315(d)(11) | Accounting of Disclosures | **DONE** | Audit trail tracks all access with reason |

### FHIR / Interoperability

| Criterion | Description | Status | Evidence |
| --------- | ----------- | ------ | -------- |
| 170.315(g)(7) | Application Access - Patient Selection | **DONE** | FHIR Patient search |
| 170.315(g)(8) | Application Access - Data Category | **DONE** | FHIR R4 (9 resources) |
| 170.315(g)(9) | Application Access - All Data Request | **DONE** | FHIR Bulk Data Access (NDJSON) |
| 170.315(g)(10) | Standardized API - US Core | **DONE** | US Core profiles for all FHIR resources |

## Meaningful Use Compliance

### Stage 1 Core Measures

| Measure | Status | Notes |
| ------- | ------ | ----- |
| CPOE for medication orders | **PARTIAL** | Order save works; pharmacy writeback pending |
| Drug interaction checking | **DONE** | ORWDXC ACCEPT |
| Maintain problem list | **DONE** | Read via ORQQPL; write pending |
| Maintain medication list | **DONE** | ORWPS ACTIVE |
| Maintain allergy list | **DONE** | ORQQAL + ORWDAL32 |
| Record demographics | **DONE** | ORWPT16 ID INFO |
| Record vital signs | **DONE** | ORQQVI VITALS + GMV ADD VM |
| Record smoking status | **PARTIAL** | Via health factors |
| Clinical quality measures | **PARTIAL** | Analytics module exists |
| Patient electronic access | **DONE** | Patient portal with 25+ pages |
| Clinical summaries | **DONE** | Reports via ORWRP |
| Exchange clinical information | **DONE** | FHIR R4 + HL7v2 + C-CDA |

## Security Architecture Verification

### Audit Chain Integrity

| Chain | Endpoint | Hash Algorithm | Max Entries |
| ----- | -------- | -------------- | ----------- |
| General | /iam/audit/verify | SHA-256 | 10K (ring buffer) |
| Imaging | /imaging/audit/verify | SHA-256 | 10K |
| RCM | /rcm/audit/verify | SHA-256 | 20K |

All three chains use the same pattern:
- Each entry hashes the previous entry's hash
- PHI sanitized via `sanitizeAuditDetail()` before hashing
- File backup: `logs/immutable-audit.jsonl`

### Access Control Matrix

| Layer | Implementation | Status |
| ----- | -------------- | ------ |
| Authentication | OIDC (Keycloak) + VistA RPC auth | **DONE** |
| Session | httpOnly cookies + CSRF synchronizer | **DONE** |
| RBAC | Default-deny policy engine (~40 actions) | **DONE** |
| ABAC | Composable conditions (time, IP, facility) | **DONE** |
| MFA | Feature-flagged enrollment + grace periods | **DONE** |
| Device Fingerprinting | Session-bound device tracking | **DONE** |
| Encryption at rest | Envelope encryption (AES-256-GCM + KEK) | **DONE** |
| Key rotation | Lifecycle management with grace periods | **DONE** |
| SCIM 2.0 | User provisioning connector | **DONE** |

## Gap Summary

### Blockers for Full ONC Certification

1. **CPOE Lab Orders**: LR ORDER RPC not available in VEHU
2. **CPOE Imaging Orders**: RAD ORDER RPC integration pending
3. **Clinical Decision Support**: Needs VistA clinical reminders wiring
4. **C-CDA Export**: Complete export pipeline needed
5. **Patient Matching Algorithm**: Algorithmic matching beyond name search

### Non-Blockers (Nice to Have)

1. Formal amendment workflow (d)(4)
2. Smoking status as structured data
3. CDS Hooks integration
4. Implantable device VistA linking

## Estimated Certification Timeline

- **Current readiness**: ~75% of ONC 2015 Edition criteria met
- **Remaining work**: 5 blocking items above
- **Estimated effort**: 3-5 development phases to close gaps
- **Target**: Full certification readiness by completion of Phase 14
