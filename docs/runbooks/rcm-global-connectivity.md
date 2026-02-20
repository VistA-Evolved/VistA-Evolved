# RCM Global Connectivity -- Runbook

> Phase 40 (Superseding) -- Global Claims / RCM Connectivity Foundation

## Overview

The RCM Gateway supports multi-country, multi-payer claims processing with:

- **10 registered connectors** (sandbox, clearinghouse, PhilHealth, portal-batch, OfficeAlly, Availity, Stedi, ECLIPSE AU, ACC NZ, NPHC SG)
- **45+ payers** across US (12), PH (28), AU (7), SG (6), NZ (4)
- **23+ validation rules** including country-specific edits
- **Job queue** for async claim processing with dead-letter and retry
- **VistA binding points** for encounter-to-claim, ERA posting, and charge capture
- **Hash-chained audit trail** for full claim lifecycle

## Architecture

```
┌─────────────────────────────────────────────────┐
│ RCM Routes (/rcm/*)                             │
│  Claims | Payers | Connectors | Jobs | VistA    │
├─────────────┬───────────────┬───────────────────┤
│ Validation  │ Job Queue     │ VistA Bindings    │
│ Engine      │ (In-Memory)   │ encounter-to-claim│
│ 23+ rules   │ 5 job types   │ era-to-vista      │
│ 6 categories│ dead-letter   │ charge-capture    │
├─────────────┼───────────────┼───────────────────┤
│ Connector Registry                              │
│ sandbox | clearinghouse | philhealth | portal-   │
│ batch | officeally | availity | stedi | eclipse  │
│ | acc-nz | nphc-sg                              │
├─────────────────────────────────────────────────┤
│ Payer Registry (data/payers/*.json seed files)  │
│ us_core | ph_hmos | au_core | sg_core | nz_core │
├─────────────────────────────────────────────────┤
│ EDI Pipeline | X12 Serializer | Audit (SHA-256) │
└─────────────────────────────────────────────────┘
```

## Connectors

### US Clearinghouses
| Connector | Target | Auth | Status |
|-----------|--------|------|--------|
| clearinghouse | Generic EDI clearinghouse | API key | Integration-ready |
| officeally | OfficeAlly | SFTP + API key | Integration-ready |
| availity | Availity Health Info Network | OAuth2 client_credentials | Integration-ready |
| stedi | Stedi API-first EDI | API key (STEDI_ENABLED flag) | Feature-flagged |

### Asia-Pacific
| Connector | Target | Auth | Status |
|-----------|--------|------|--------|
| philhealth | PhilHealth eClaims | API token | Integration-ready |
| portal-batch | HMO portal/batch | varies | Integration-ready |
| nphc-sg | NPHC Singapore | CorpPass | Integration-ready |

### Oceania
| Connector | Target | Auth | Status |
|-----------|--------|------|--------|
| eclipse-au | ECLIPSE (AU Medicare/DVA) | PRODA + PKI | Integration-ready |
| acc-nz | ACC New Zealand | OAuth2 | Integration-ready |

## Env Vars

### US Connectors
```
OFFICEALLY_SFTP_HOST, OFFICEALLY_SFTP_USER, OFFICEALLY_SFTP_KEY_PATH
OFFICEALLY_API_ENDPOINT, OFFICEALLY_API_KEY, OFFICEALLY_SENDER_ID
AVAILITY_API_ENDPOINT, AVAILITY_CLIENT_ID, AVAILITY_CLIENT_SECRET, AVAILITY_CUSTOMER_ID
STEDI_ENABLED, STEDI_API_KEY, STEDI_PARTNER_ID, STEDI_API_ENDPOINT
```

### APAC / Oceania
```
PHILHEALTH_API_ENDPOINT, PHILHEALTH_API_TOKEN, PHILHEALTH_FACILITY_CODE
NPHC_API_ENDPOINT, NPHC_CORPPASS_CLIENT_ID, NPHC_CORPPASS_SECRET, NPHC_FACILITY_LICENSE
ECLIPSE_API_ENDPOINT, ECLIPSE_PRODA_ORG_ID, ECLIPSE_DEVICE_NAME, ECLIPSE_CERT_PATH
ACC_NZ_API_ENDPOINT, ACC_NZ_CLIENT_ID, ACC_NZ_CLIENT_SECRET, ACC_NZ_PROVIDER_ID
```

### Submission Safety
```
CLAIM_SUBMISSION_ENABLED=false  # default -- export-only mode
```

## VistA Binding Points

### 1. Encounter to Claim
- **Route**: POST `/rcm/vista/encounter-to-claim`
- **VistA Files**: ^AUPNVSIT, ^AUPNVCPT, ^AUPNVPOV, ^IB(350), ^DGCR(399)
- **RPCs**: ORWPCE PCE4NOTE, ORWPCE GETVSIT, IB CHARGE DATA
- **Status**: Integration-pending in sandbox (PCE has data, IB is empty)

### 2. ERA to VistA AR
- **Route**: POST `/rcm/vista/era-post`
- **VistA Files**: ^PRCA(430), ^PRCA(433), ^RC(344)
- **RPCs**: RCDPE PAYMENT POST, PRCA POST PAYMENT
- **Status**: Integration-pending (AR is empty in sandbox)

### 3. Charge Capture Candidates
- **Route**: GET `/rcm/vista/charge-candidates?patientDfn=3`
- **VistA Files**: ^AUPNVSIT, ^AUPNVCPT, ^IB(350)
- **RPCs**: ORWCV VST, ORWPCE PCE4NOTE, IBD FIND CHARGES
- **Status**: Integration-pending (IB is empty in sandbox)

## Job Queue

The in-memory job queue supports 5 job types:
- `CLAIM_SUBMIT` -- submit claim to payer
- `ELIGIBILITY_CHECK` -- 270/271 eligibility inquiry
- `STATUS_POLL` -- 276/277 claim status
- `ERA_INGEST` -- 835 remittance processing
- `ACK_PROCESS` -- 999/TA1 acknowledgement handling

Routes:
- GET `/rcm/jobs` -- list jobs
- GET `/rcm/jobs/stats` -- queue statistics
- GET `/rcm/jobs/:id` -- get single job
- POST `/rcm/jobs/enqueue` -- enqueue a job
- POST `/rcm/jobs/:id/cancel` -- cancel a job

## Validation Rules (23 total)

| Category | Count | Rule IDs |
|----------|-------|----------|
| Syntax | 8 | SYN-001 through SYN-008 |
| Code Set | 3 | CS-001 through CS-003 |
| Business Rule | 4 | BUS-001 through BUS-004 |
| Timely Filing | 1 | TF-001 |
| Payer Specific | 3 | PAY-001 through PAY-003 |
| Authorization | 3 | AUTH-001 through AUTH-003 |
| Country Specific | 5 | CTY-001 through CTY-005 |

## Verification

```powershell
# Run Phase 40 Global RCM verifier
.\scripts\verify-phase40-global-rcm.ps1

# Regression: Phase 38 + Phase 39
.\scripts\verify-phase38-rcm.ps1
.\scripts\verify-phase39-billing-grounding.ps1
```

## Adding a New Country/Market

1. Create `data/payers/<country>_core.json` with payer seed records
2. Add the country code to `PayerCountry` type in `domain/payer.ts`
3. Add the seed file to `registry.ts` loader
4. If needed, create a connector in `connectors/` implementing `RcmConnector`
5. Register the connector in `rcm-routes.ts` `ensureInitialized()`
6. Add country-specific validation rules to `validation/engine.ts`
7. Update the UI country filter in `page.tsx`
8. Update the verifier script
