# Phase 40 VERIFY Report -- RCM/Claims Connectivity Audit

> Generated: 2026-02-20
> Commit: Phase 40 VERIFY: RCM connectivity gates

---

## Summary

| Verifier | Gates | Result |
|----------|------:|--------|
| Phase 40 Live API (verify-phase40-live.ps1) | 52/52 | **PASS** |
| Phase 40 Global RCM (verify-phase40-global-rcm.ps1) | 71/71 | **PASS** |
| Phase 38 Regression (verify-phase38-rcm.ps1) | 158/158 | **PASS** |
| Phase 39 Regression (verify-phase39-billing-grounding.ps1) | 74/74 | **PASS** |
| TypeScript compile (tsc --noEmit) | clean | **PASS** |
| **Total** | **355** | **ALL PASS** |

---

## 1. Repo Regression (verify-latest.ps1)

verify-latest.ps1 delegates to verify-phase40-live.ps1 which runs 52 live
API gates plus delegates to the source-level verifier (53 source gates
embedded within G40-6h). All pass.

**Result: PASS (0 FAIL)**

---

## 2. Payer Registry Completeness

### Philippines (28 payers)

Machine-checkable list at: `apps/api/src/rcm/payers/generated/payers.ph.json`

| # | Payer ID | Name | Mode |
|--:|----------|------|------|
| 1 | PH-PHIC | Philippine Health Insurance Corporation (PhilHealth) | government_portal |
| 2 | PH-ASIANLIFE | AsianLife and General Assurance Corporation | portal_batch |
| 3 | PH-AVEGA | Avega Managed Care, Inc. | portal_batch |
| 4 | PH-CAREHEALTH | CareHealth Plus Systems International, Inc. | portal_batch |
| 5 | PH-CAREWELL | Carewell Health Systems, Inc. | portal_batch |
| 6 | PH-CARITAS | Caritas Health Shield, Inc. | portal_batch |
| 7 | PH-COCOLIFE | Cocolife Health Care, Inc. | portal_batch |
| 8 | PH-EASTWEST | EastWest Healthcare, Inc. | portal_batch |
| 9 | PH-FORTICARE | Forticare Health Systems International, Inc. | portal_batch |
| 10 | PH-HEALTHMAINT | Health Maintenance, Inc. | portal_batch |
| 11 | PH-HEALTHPLAN | Health Plan Philippines, Inc. | portal_batch |
| 12 | PH-HEALTHFIRST | HealthFirst Healthcare, Inc. | portal_batch |
| 13 | PH-ICARE | i-Care Health Solutions, Inc. | portal_batch |
| 14 | PH-INSULAR | Insular Health Care, Inc. | portal_batch |
| 15 | PH-INTELLICARE | Intellicare Asia Corporation | portal_batch |
| 16 | PH-KAISER-INTL | Kaiser International Healthgroup, Inc. | portal_batch |
| 17 | PH-LIFEHEALTH | Life and Health HMP, Inc. | portal_batch |
| 18 | PH-MAXICARE | MaxiCare Healthcare Corp. | portal_batch |
| 19 | PH-MEDICARD | MediCard Philippines, Inc. | portal_batch |
| 20 | PH-MEDILINK | MediLink Network, Inc. | portal_batch |
| 21 | PH-METROCARE | Metrocare Health Systems, Inc. | portal_batch |
| 22 | PH-PACIFIC-CROSS | Pacific Cross Health Care, Inc. | portal_batch |
| 23 | PH-PHILCARE | PhilCare, Inc. | portal_batch |
| 24 | PH-PHILBRITISH | Philippine British Assurance Company, Inc. | portal_batch |
| 25 | PH-PHCP | Philippine Health Care Providers, Inc. | portal_batch |
| 26 | PH-PHP | Philippine Health Plan, Inc. | portal_batch |
| 27 | PH-STARCARE | Starcare Health Systems, Inc. | portal_batch |
| 28 | PH-VALUCARE | Value Care Health Systems, Inc. | portal_batch |

### Other Countries

| Country | File | Count |
|---------|------|------:|
| US | data/payers/us_core.json | 12 |
| AU | data/payers/au_core.json | 7 |
| SG | data/payers/sg_core.json | 6 |
| NZ | data/payers/nz_core.json | 4 |

**Total payers: 57 across 5 countries.**

**Result: PASS**

---

## 3. Connector Framework

### /rcm/connectors/health endpoint

Exists and returns health status for all 10 registered connectors.
Each connector calls `healthCheck()`.

### Connector Health Matrix

| Connector | healthCheck() | Returns | Notes |
|-----------|:------------:|---------|-------|
| SandboxConnector | Yes | healthy=true | Active in dev |
| ClearinghouseConnector | Yes | healthy=conditional | Needs CLEARINGHOUSE_ENDPOINT |
| PhilHealthConnector | Yes | healthy=conditional | Needs PHILHEALTH_API_TOKEN or test_mode |
| PortalBatchConnector | Yes | healthy=true | Always active |
| OfficeAllyConnector | Yes | healthy=false | Needs OFFICEALLY_SFTP_HOST |
| AvailityConnector | Yes | healthy=false | Needs AVAILITY_CLIENT_ID + OAuth2 |
| StediConnector | Yes | healthy=false | Needs STEDI_ENABLED + API key |
| EclipseAuConnector | Yes | healthy=false | Needs ECLIPSE_PRODA_CLIENT_ID |
| AccNzConnector | Yes | healthy=false | Needs ACC_NZ_CLIENT_ID + OAuth2 |
| NphcSgConnector | Yes | healthy=false | Needs NPHC_CORPPASS_CLIENT_ID |

All 10 connectors implement `healthCheck()` and return typed `{ healthy: boolean; details?: string }`.

### Connector Timeouts

Added `CONNECTOR_DEFAULT_TIMEOUT_MS` (30s default, env override via
`RCM_CONNECTOR_TIMEOUT_MS`) and `CONNECTOR_HEALTH_TIMEOUT_MS` (10s)
in `connectors/types.ts`.

**Result: PASS**

---

## 4. Transaction Surface

### Modeled Transaction Sets

| Transaction | Type | Purpose | File |
|:-----------:|------|---------|------|
| 837P | EdiClaim837 | Professional claim | edi/types.ts |
| 837I | EdiClaim837 | Institutional claim | edi/types.ts |
| 835 | EdiRemittance835 | Remittance/ERA | edi/types.ts |
| 270 | EdiEligibilityInquiry270 | Eligibility inquiry | edi/types.ts |
| 271 | EdiEligibilityResponse271 | Eligibility response | edi/types.ts |
| 276 | EdiClaimStatusInquiry276 | Claim status inquiry | edi/types.ts |
| 277 | EdiClaimStatusResponse277 | Claim status response | edi/types.ts |
| 278 | EdiPriorAuth278 | Prior authorization | edi/types.ts |
| 275 | EdiAttachment275 | Clinical attachment | edi/types.ts |
| 999 | EdiAcknowledgment | Implementation ack | edi/types.ts |
| 997 | EdiAcknowledgment | Functional ack (legacy) | edi/types.ts |
| TA1 | EdiAcknowledgment | Interchange ack | edi/types.ts |

### Ack Tracking

- `EdiAcknowledgment` type models 999/997/TA1 with `accepted: boolean` and `errors[]`
- `PipelineEntry.acknowledgment` stores parsed ack
- `PipelineStage` includes `ack_pending` and `ack_received` stages
- 10-stage pipeline: build -> validate -> enqueue -> transmit -> ack_pending -> ack_received -> response -> reconciled -> error -> cancelled

### Claim Lifecycle (10-state FSM)

```
draft -> validated -> ready_to_submit -> submitted -> accepted -> rejected
  -> paid -> denied -> appealed -> closed
```

### Remittance Store

- `Remittance` type in `domain/remit.ts` with 5-state FSM: received -> matched -> posted -> disputed -> voided
- `claim-store.ts` exports `storeRemittance()`, `listRemittances()`, `matchRemittanceToClaim()`
- `POST /rcm/remittances/import` endpoint for 835 processing

**Result: PASS**

---

## 5. No Fake Success

### VistA Binding Points (integration-pending)

| Binding | Returns | Target System | Target Files | Next Step |
|---------|---------|---------------|--------------|-----------|
| buildClaimFromVistaEncounter | `{ok:false, integrationPending:true}` | VistA PCE/IB | ^AUPNVSIT, ^AUPNVCPT, ^AUPNVPOV, ^IB(350), ^DGCR(399) | Wire ORWPCE PCE4NOTE/GETVSIT RPCs with safeCallRpc |
| postEraToVista | `{ok:false, posted:false, integrationPending:true}` | VistA AR | ^PRCA(430), ^PRCA(433), ^RC(344) | Wire PRCA POST PAYMENT RPCs |
| getChargeCaptureCandidates | `{ok:false, candidates:[], integrationPending:true}` | VistA PCE/IB | ^AUPNVSIT, ^AUPNVCPT, ^IB(350) | Wire IBD CHARGE DATA/ORWPCE GETVSIT RPCs |

### Connector Stubs (6 international connectors)

All return `healthy: false` with descriptive `details` string naming
the missing configuration. None will return `success: true` on submit
without live credentials.

### Submission Safety Gate

- `CLAIM_SUBMISSION_ENABLED=false` by default (export-only mode)
- Demo claims (`isDemo: true`) permanently blocked from submission (403)
- Export-only mode generates X12 artifact to `data/rcm-exports/` and
  returns `submitted: false, safetyMode: 'export_only'`

**Result: PASS**

---

## 6. Security/PHI Hardening

### SSN/DOB Redaction

| Layer | Mechanism | Pattern |
|-------|-----------|---------|
| Field-level | `PHI_CONFIG.neverLogFields` | `ssn`, `socialSecurityNumber`, `dob`, `dateOfBirth` |
| Inline SSN | `INLINE_REDACT_PATTERNS` | `/\b\d{3}-\d{2}-\d{4}\b/g` |
| Inline DOB | `INLINE_REDACT_PATTERNS` (added this VERIFY) | `/\b(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g` + MM/DD/YYYY |
| Bearer tokens | `INLINE_REDACT_PATTERNS` | `/Bearer\s+[A-Za-z0-9+/=_-]{20,}/g` |
| Session tokens | `INLINE_REDACT_PATTERNS` | `/[0-9a-f]{64}/gi` |

### Secret Scan

Codebase scan for `PROV123` outside login page, e2e, tests, and config
comments: **0 violations**.

### Console.log Cap

API `src/` total `console.log` count: **<= 6** (verified by G40-071).

### Audit Chain

RCM audit chain integrity verified via `GET /rcm/audit/verify` (G40-5h).

**Result: PASS**

---

## 7. Performance/Reliability

### Idempotency Keys

| Endpoint | Idempotency |
|----------|-------------|
| POST /rcm/claims/:id/submit | `X-Idempotency-Key` header supported; FSM status guard prevents double-submit |
| POST /rcm/jobs/enqueue | `idempotencyKey` body param; dedup via internal index |

### Timeouts

| Constant | Default | Env Override |
|----------|--------:|-------------|
| `CONNECTOR_DEFAULT_TIMEOUT_MS` | 30,000ms | `RCM_CONNECTOR_TIMEOUT_MS` |
| `CONNECTOR_HEALTH_TIMEOUT_MS` | 10,000ms | `RCM_HEALTH_TIMEOUT_MS` |

### Retry/Backoff (Job Queue)

| Parameter | Value |
|-----------|-------|
| Default max attempts | 3 |
| Backoff formula | 5000ms * 2^(attempts-1) |
| Sequence | 5s -> 10s -> 20s |
| Dead-letter | After max attempts exceeded |
| Priority | 0 (highest) to 9 (lowest), FIFO within priority |
| Idempotency | Deduplicated via idempotencyKey |

**Result: PASS**

---

## 8. Docs/Runbooks

| Runbook | Exists | Key Content Check |
|---------|:------:|-------------------|
| rcm-payer-connectivity.md | Yes | Phase 38 main RCM runbook |
| rcm-philhealth-eclaims.md | Yes | **eClaims 3.0 mandatory Apr 1, 2026** (added this VERIFY) |
| rcm-us-edi-clearinghouse.md | Yes | All X12 families: 837P/I, 835, 270, 271, 276, 277, 278, 999, TA1 |
| rcm-global-connectivity.md | Yes | Phase 40 global RCM (5 countries, 10 connectors) |
| rcm-payer-connectivity-phase40.md | Yes | Phase 40 original submission safety docs |
| rcm-billing-grounding.md | Yes | Phase 39 VistA billing grounding |
| payer-registry.md | Yes | Payer registry reference |

**Result: PASS**

---

## 9. Prompts Folder Integrity

- **45 entries** (00-ARCHIVE through 44-PHASE-40-PAYER-CONNECTIVITY)
- Sequential two-digit prefix per phase, no gaps, no duplicates
- Latest entry: `44-PHASE-40-PAYER-CONNECTIVITY/`
- Follows `00-ORDERING-RULES.md` convention

**Result: PASS**

---

## Integration-Pending Items (Concrete Next Steps)

| Item | Target | Next Step |
|------|--------|-----------|
| VistA encounter-to-claim | ORWPCE PCE4NOTE, ORWPCE GETVSIT RPCs | Wire RPCs via safeCallRpc, map ^AUPNVSIT/^AUPNVCPT to Claim fields |
| VistA ERA posting | PRCA POST PAYMENT RPC | Wire ^PRCA(430) AR transaction creation via safeCallRpc |
| VistA charge capture | IBD CHARGE DATA, IB CHARGE DATA RPCs | Wire ^IB(350) charge lookup via safeCallRpc |
| OfficeAlly SFTP | OfficeAlly claim portal | Configure SFTP credentials, implement file-based 837 upload |
| Availity API | Availity 270/837 REST API | Register OAuth2 app, implement token exchange |
| Stedi EDI | Stedi Transaction Service | Enable STEDI_ENABLED, configure API key, map to Stedi SDK |
| Eclipse AU | ECLIPSE/PRODA gateway | Register with Services Australia, implement PRODA token exchange |
| ACC NZ | ACC Claim API v2 | Register OAuth2 app with ACC, implement REST claim submission |
| NPHC Singapore | NPHC CorpPass gateway | Register CorpPass client, implement JSON claim schema mapping |
| Eligibility persistence | N/A | Add eligibility result store (in-memory, keyed by patient+payer+date) |
| PhilHealth eClaims 3.0 live | PhilHealth eClaims 3.0 API | Register credentials, test in staging, cut over before Apr 1, 2026 |

---

## Fixes Applied During This Verify

| Fix | File | Description |
|-----|------|-------------|
| eClaims 3.0 deadline | rcm-philhealth-eclaims.md | Added mandatory deadline (Apr 1, 2026), migration checklist |
| PH payer table update | rcm-philhealth-eclaims.md | Updated from 15 stale IDs to 28 current payers |
| DOB inline redaction | lib/logger.ts | Added YYYY-MM-DD and MM/DD/YYYY DOB patterns to inline scrubber |
| Connector timeouts | connectors/types.ts | Added CONNECTOR_DEFAULT_TIMEOUT_MS (30s) and HEALTH_TIMEOUT_MS (10s) |
| Idempotency key | rcm-routes.ts | Added X-Idempotency-Key header support on /rcm/claims/:id/submit |
| Generated PH list | payers/generated/payers.ph.json | Machine-checkable 28-payer PH registry extract |
