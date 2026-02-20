# RCM Gateway Architecture

> Phase 38 — VistA-First RCM + Payer Connectivity Platform

## Design Principles

1. **VistA-First** — Don't re-implement billing logic VistA already has.
   Use VistA IB/AR files as source of truth when available.
2. **All payers by architecture** — Payer registry + connector pattern,
   not hardcoded payer-specific logic.
3. **Global market readiness** — US EDI (X12 5010) and Philippines
   (PhilHealth eClaims + HMO portals) from day one.
4. **Modular connectors** — Each payer integration mode is a separate
   connector implementing `RcmConnector` interface.
5. **In-memory stores** — Same pattern as imaging worklist (Phase 23).
   Designed for VistA migration when IB/AR RPCs are available.

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      RCM API Routes                         │
│  /rcm/payers  /rcm/claims  /rcm/edi  /rcm/audit           │
└────────┬────────────┬────────────┬────────────┬────────────┘
         │            │            │            │
    ┌────▼────┐  ┌────▼────┐  ┌───▼────┐  ┌───▼────┐
    │  Payer  │  │  Claim  │  │  EDI   │  │  RCM   │
    │Registry │  │  Store  │  │Pipeline│  │ Audit  │
    └────┬────┘  └────┬────┘  └───┬────┘  └────────┘
         │            │           │
         │       ┌────▼────┐     │
         │       │Validation│    │
         │       │ Engine   │    │
         │       └────┬────┘    │
         │            │          │
    ┌────▼────────────▼──────────▼────┐
    │       Connector Registry        │
    ├─────────┬──────────┬────────────┤
    │Clearing-│PhilHealth│  Portal/   │
    │ house   │ eClaims  │  Batch     │
    │  EDI    │          │            │
    ├─────────┴──────────┴────────────┤
    │        Sandbox Connector        │
    │    (simulated for dev/test)     │
    └─────────────────────────────────┘
```

## Domain Model

### Claim Lifecycle States

```
draft → validated → submitted → accepted → paid → closed
                                         → denied → appealed → ...
                              → rejected → (fix) → validated
```

9 states with explicit transition rules enforced by `isValidTransition()`.
Each transition is audit-logged.

### Claim Entity Fields

| Field | Purpose | VistA Source |
|-------|---------|-------------|
| `patientDfn` | Patient identifier | DPT file |
| `payerId` | Payer from registry | IB Insurance file |
| `claimType` | professional/institutional | IB Claim type |
| `totalCharge` | Sum of service lines | IB Charge total |
| `diagnosisCodes` | ICD-10 codes | Problem List |
| `serviceLines` | CPT/HCPCS + charges | IB Service lines |
| `vistaChargeIen` | VistA IB Charge IEN | File #350 |
| `vistaArIen` | VistA AR Account IEN | File #430 |
| `subscriberMemberId` | Insurance member ID | IB Insurance |
| `billingProviderNpi` | Provider NPI | New Person file |

### Payer Entity

Payers are loaded from seed files (`data/payers/*.json`) at startup
and can be added/updated via API. Each payer has:

- `integrationMode` — determines which connector handles it
- `endpoints` — payer-specific API/portal URLs
- `enrollmentRequired` — flag for provider enrollment check
- `country` — US, PH, or future markets

## EDI Pipeline

Tracks every outbound/inbound EDI transaction through stages:
build → validate → enqueue → transmit → ack → response → reconciled.

Pipeline entries reference the source claim and connector. The pipeline
store is separate from the claim store to support non-claim transactions
(eligibility, status inquiries).

## Connector Interface

```typescript
interface RcmConnector {
  id: string;
  name: string;
  supportedModes: string[];
  supportedTransactions: X12TransactionSet[];
  initialize(): Promise<void>;
  submit(txSet, payload, metadata): Promise<ConnectorResult>;
  checkStatus(txId): Promise<ConnectorResult>;
  fetchResponses(since?): Promise<Response[]>;
  healthCheck(): Promise<HealthResult>;
  shutdown(): Promise<void>;
}
```

Connector selection: `payer.integrationMode` → `getConnectorForMode()`.

## Audit Trail

Hash-chained (SHA-256) append-only log. Every claim lifecycle event,
EDI transaction, and remittance posting is recorded. PHI is sanitized
(SSN, DOB, patient names redacted). Chain integrity verifiable via
`GET /rcm/audit/verify`.

## Module Integration

- **Module**: `rcm` in `config/modules.json`
- **SKUs**: `RCM_ONLY`, `FULL_SUITE`
- **Adapter**: `billing` (Phase 37C)
- **Auth**: Session-based (`/rcm/` in AUTH_RULES)
- **Capabilities**: 8 capabilities in `config/capabilities.json`

## Migration Plan (VistA-native)

When VistA IB/AR RPCs become available:

1. Replace in-memory claim store with VistA IB file reads/writes
2. Map claim -> IB Charge (file #350) and AR Account (file #430)
3. Use VistA claim scrubber RPCs if available
4. Keep connector layer unchanged -- it's transport-only
5. Keep audit layer unchanged -- it's append-only

## Phase 42: VistA Claim Draft Pipeline

Phase 42 adds a real VistA-to-claim-draft pipeline that reads live
PCE encounter data and produces claim draft candidates.

```
┌───────────────── VistA Instance ─────────────────┐
│  ORWPCE VISIT ──> Encounter List                 │
│  ORWPCE DIAG  ──> Diagnoses (ICD-10)             │
│  ORWPCE PROC  ──> Procedures (CPT)               │
│  IBCN INSURANCE QUERY ──> Coverage/Policy         │
│  VE RCM PROVIDER INFO ──> Provider NPI/Facility  │
└──────────────────────┬───────────────────────────┘
                       │
                       v
            buildClaimDraftFromVista()
                       │
                       v
            ClaimDraftCandidate[]
              - claim (draft)
              - missingFields[]
              - sourceMissing[]
                       │
                       v
           ┌───────────┴───────────┐
           │   Validation Engine   │
           └───────────┬───────────┘
                       │
              ┌────────┴────────┐
              v                 v
         Export (X12)     Submit (Connector)
```

### Endpoints Added

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/rcm/vista/encounters` | PCE encounters for patient |
| POST | `/rcm/vista/claim-drafts` | Generate claim draft candidates |
| GET | `/rcm/vista/coverage` | Patient insurance coverage |

### Data Flow

1. UI selects patient + optional date range
2. API calls ORWPCE VISIT for encounter list
3. For each encounter: ORWPCE DIAG + ORWPCE PROC
4. IBCN INSURANCE QUERY for payer info
5. `buildClaimDraftFromVista()` assembles Claim objects
6. Missing fields annotated with exact VistA source
7. Drafts stored in claim store for validation/export
