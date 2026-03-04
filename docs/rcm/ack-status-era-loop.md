# Ack / Status / ERA Loop

> Phase 45 -- VistA-Evolved RCM

## Overview

The Ack/Status/ERA loop tracks the complete lifecycle of an EDI
transaction from submission through final reconciliation. This document
describes how acknowledgements (999, TA1), status responses (277),
and remittance advice (835) are processed and linked back to claims.

## Transaction Lifecycle

```
Claim Draft -> Validated Claim -> X12 Envelope Built
  -> Pre-transmit Gates Pass -> Transmitted to Payer
  -> Ack Pending (999) -> Ack Accepted / Rejected
  -> Status Response (277CA) -> Claim Status Updated
  -> ERA (835) Received -> Remittance Matched -> Reconciled
```

## 999 Acknowledgement

- **Required for**: 837P, 837I, 270, 276
- **Expected within**: 24 hours (CAQH CORE)
- **Disposition codes**:
  - `A` -- Accepted
  - `R` -- Rejected (with error segments)
  - `E` -- Accepted with errors
  - `P` -- Partially accepted

When a 999 is received:

1. It is ingested via `ingestAck()` (idempotent by ICN)
2. The linked transaction transitions to `ack_accepted` or `ack_rejected`
3. For rejections: errors are extracted from AK9/IK5 segments
4. Workqueue items are created for rejections

## 277CA Status Response

- **Expected within**: 48 hours
- **Contains**: Claim status category codes (A0-A8+)
  - A0: Forwarded
  - A1: Received, not in adjudication
  - A2: In adjudication
  - A3: Adjudicated, awaiting payment
  - A4: Paid (partial or full)
  - A5: Denied/Rejected

## 835 Remittance Advice (ERA)

ERA processing:

1. Receive 835 file (from payer or clearinghouse)
2. Parse BPR segment (payment total)
3. Parse CLP segments (claim-level details)
4. Parse SVC segments (service-line adjustments)
5. Match to claims via:
   - Patient Control Number (CLM01)
   - Payer Claim Control Number
   - Accession number
6. Apply CARC/RARC codes for adjustments/denials
7. Post adjustment amounts to claim records
8. Transition matched claims to appropriate status

## Reconciliation Summary

The reconciliation engine (`buildReconciliationSummary`) aggregates:

- All transactions for a claim (by sourceId)
- All acknowledgements from the audit trail
- All status updates from the audit trail
- Remittance line items with CARC descriptions
- Denial summary with recommended actions

Payment status determination:

- **full_payment**: Paid >= Billed
- **partial_payment**: 0 < Paid < Billed
- **denied**: All lines denied (CARC present, zero payment)
- **pending**: No remittance data yet

## Batch Reconciliation

`buildReconciliationStats` processes multiple claim IDs and returns:

- Counts per payment status
- Total billed/paid/adjusted amounts
- Average days to reconciliation

## API Endpoints

| Endpoint                                | Description                 |
| --------------------------------------- | --------------------------- |
| `GET /rcm/claims/:id/reconciliation`    | Full reconciliation summary |
| `POST /rcm/claims/batch-reconciliation` | Batch stats for claim list  |
| `GET /rcm/acks`                         | List all acknowledgements   |
| `GET /rcm/acks/claim/:claimId`          | Acks for a specific claim   |
| `GET /rcm/statuses`                     | List all status updates     |
| `GET /rcm/remittances`                  | List all remittances        |

## Audit Trail Integration

Every ack/status/ERA event is logged to the RCM hash-chained audit:

- `ack.ingested`
- `status.ingested`
- `remit.received` / `remit.matched` / `remit.posted`
- `transaction.ack_received`
- `transaction.reconciled`
