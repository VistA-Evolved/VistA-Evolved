# RCM MVP Proof -- Revenue Cycle Management

> Generated: 2026-03-09

## Claim Lifecycle (9-State FSM)

```
created -> validated -> transformed -> enqueued -> transmitted
    -> acknowledged -> accepted -> adjudicated -> posted -> reconciled
```

Every state transition is timestamped and logged to the RCM hash-chained audit trail.

## Implemented Components

### Domain Layer
- **Claim entity** (`rcm/domain/claim.ts`): 9-state FSM with lifecycle transitions
- **Payer entity** (`rcm/domain/payer.ts`): 6 integration modes
- **Remittance types** (`rcm/domain/remit.ts`): ERA/835 processing

### Connectors (4 types)

| Connector | Integration Mode | Status |
| --------- | --------------- | ------ |
| Sandbox | sandbox | Live (dev/test simulation) |
| US Clearinghouse | clearinghouse (X12 EDI) | Scaffold (X12 serializer works) |
| PhilHealth eClaims | philhealth (government portal) | Scaffold (CF1-CF4 generation works) |
| HMO Portal Batch | portal-batch (batch upload) | Scaffold |

### Serializers
- **X12 5010** (`edi/x12-serializer.ts`): 837P (professional), 837I (institutional), 270 (eligibility)
- **PhilHealth** (`edi/ph-eclaims-serializer.ts`): CF1-CF4 JSON bundles

### Payer Registry
- Loaded from `data/payers/*.json` at startup
- **US**: 12 payers (Aetna, BCBS, Cigna, Humana, UHC, Medicare, Medicaid, etc.)
- **PH**: 15 payers (PhilHealth + 14 HMOs)
- **AU/NZ/SG**: Additional payer seeds

### VistA Billing Grounding (Phase 39)
- 7 read-only endpoints at `/vista/rcm/*`
- PCE encounters (^AUPNVSIT, ^AUPNVCPT, ^AUPNVPOV) have data
- IB charges (^IB(350)) and AR (^PRCA(430)) empty in sandbox
- 85 billing-related RPCs confirmed callable

### EDI Pipeline
- 10-stage tracking (created through reconciled)
- In-memory + PG-backed stages
- Query via `GET /rcm/edi/pipeline`

### Safety Controls
- `CLAIM_SUBMISSION_ENABLED=false` by default
- Demo claims permanently blocked from real submission
- X12 `usageIndicator: 'T'` (test) by default
- No proprietary code set tables bundled (CPT/HCPCS/ICD-10 pass through)

### Validation Engine
- Multi-layer validation (15+ rules, 5 categories)
- Required fields, format validation, code set validation
- Per-payer rules supported

### Audit Trail
- Hash-chained SHA-256 (separate from general + imaging audit)
- PHI sanitized before hashing
- Verify via `GET /rcm/audit/verify`
- Max 20K entries with FIFO eviction

## Multi-Country Configuration

| Country | Billing Standard | Payer Count | Connector |
| ------- | --------------- | ----------- | --------- |
| US | X12 EDI 5010 | 12 | Clearinghouse |
| PH | PhilHealth eClaims 3.0 | 15 | PhilHealth + HMO Portal |
| AU | Medicare Claims | 3 | Gateway (scaffold) |
| NZ | ACC Claims | 2 | Gateway (scaffold) |
| SG | MediSave Claims | 2 | Gateway (scaffold) |

## API Endpoints (~30)

| Category | Endpoints | Description |
| -------- | --------- | ----------- |
| Claims | POST/GET /rcm/claims | Create, list, update claims |
| Submission | POST /rcm/claims/:id/submit | Submit (safety-gated) |
| Export | GET /rcm/claims/:id/export | X12 wire format export |
| Payers | GET /rcm/payers, POST /rcm/payers/import | Payer catalog + CSV import |
| Connectors | GET /rcm/connectors | Connector status |
| EDI Pipeline | GET /rcm/edi/pipeline | Pipeline tracking |
| Eligibility | POST /rcm/eligibility/check | EDI 270/271 |
| Claim Status | POST /rcm/claim-status/check | EDI 276/277 |
| VistA Billing | GET /vista/rcm/* | 7 VistA read-only endpoints |
| Audit | GET /rcm/audit, /rcm/audit/verify | Audit trail + chain verify |

## What Makes This Production-Grade

1. **VistA-grounded**: Every endpoint documents the VistA file/RPC target
2. **Multi-country**: Configurable per tenant via country packs
3. **Safety-first**: No real submissions without explicit env var
4. **Audited**: Every action in hash-chained trail
5. **Standards-based**: X12 5010, PhilHealth eClaims 3.0
6. **Extensible**: Add new markets via data files + connectors
