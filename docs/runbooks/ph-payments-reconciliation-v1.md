# Payment Tracking & Reconciliation — Phase 92 Runbook

## Overview

Phase 92 adds end-to-end payment tracking, remittance reconciliation, AR aging,
and payer intelligence analytics. All data is in-memory and tenant-scoped.

## Architecture

```
RemittanceBatch → RemittanceLine[] → MatchingEngine → PaymentPostingEvent
                                                    → UnderpaymentCase (if shortfall > 10%)
AgingIntelligence: ClaimCase[] → AgingBuckets + PayerKPI[]
ExportBridge: RemittanceBatch → CSV / JSON (ERPNext-compatible)
```

## Workflow

### 1. Create a Remittance Batch

```bash
curl -X POST http://localhost:3001/payerops/payments/batches \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"payerId":"BCBS","payerName":"Blue Cross","facilityId":"default","sourceMode":"manual_upload"}'
```

### 2. Upload CSV Content

```bash
curl -X POST http://localhost:3001/payerops/payments/batches/{BATCH_ID}/upload \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"content":"claim_id,amount_billed,amount_paid,amount_adjusted,patient_ref,service_date\nCLM-001,50000,45000,5000,PAT-1,2025-01-15","fileName":"remit.csv"}'
```

### 3. Import (Parse CSV into Lines)

```bash
curl -X POST http://localhost:3001/payerops/payments/batches/{BATCH_ID}/import \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### 4. Run Matching Engine

```bash
curl -X POST http://localhost:3001/payerops/payments/batches/{BATCH_ID}/match \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

The matching engine tries 3 strategies in order:

1. **Exact ID** — `line.claimId` matches a `ClaimCase.id`
2. **External Ref** — `line.externalClaimRef` matches `ClaimCase.externalClaimId`
3. **Fuzzy** — Patient + amount + date proximity matching
4. **Needs Review** — No match found, sent to reconciliation worklist

### 5. Manual Reconciliation

```bash
curl -X POST http://localhost:3001/payerops/payments/reconciliation/{LINE_ID}/link-claim \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"claimCaseId":"CASE-ID-HERE"}'
```

## CSV Format

### Required Columns (camelCase or snake_case)

| Column                               | Description              |
| ------------------------------------ | ------------------------ |
| `claim_id` / `claimId`               | Our internal claim ID    |
| `amount_billed` / `amountBilled`     | Billed amount in cents   |
| `amount_paid` / `amountPaid`         | Paid amount in cents     |
| `amount_adjusted` / `amountAdjusted` | Adjusted amount in cents |

### Optional Columns

| Column                                    | Description             |
| ----------------------------------------- | ----------------------- |
| `external_claim_ref` / `externalClaimRef` | Payer's claim reference |
| `patient_ref` / `patientRef`              | Patient identifier      |
| `service_date` / `serviceDate`            | Date of service         |
| `reason_code` / `reasonCode`              | Adjustment reason       |
| `reason_text` / `reasonText`              | Human-readable reason   |

## Analytics Endpoints

### AR Aging

```bash
curl http://localhost:3001/payerops/analytics/aging -b cookies.txt
```

Returns 5 buckets: 0-30, 31-60, 61-90, 91-120, >120 days.

### Payer Intelligence

```bash
curl http://localhost:3001/payerops/analytics/payer-intelligence -b cookies.txt
```

Optionally filter by period: `?periodStart=2025-01-01T00:00:00Z&periodEnd=2025-12-31T23:59:59Z`

Returns per-payer KPIs:

- Average days to payment
- Median days to payment
- Denial rate
- Return rate
- Underpayment rate

## Export

```bash
# CSV export
curl "http://localhost:3001/payerops/exports/payments/{BATCH_ID}?format=csv" -b cookies.txt

# JSON export (ERPNext/Odoo compatible)
curl "http://localhost:3001/payerops/exports/payments/{BATCH_ID}?format=json" -b cookies.txt
```

## Underpayment Detection

When matching detects a paid amount is less than 90% of the billed amount,
an `UnderpaymentCase` is automatically created. View all underpayments:

```bash
curl http://localhost:3001/payerops/payments/underpayments -b cookies.txt
```

## Evidence-First Rule

Claims are **never** transitioned to `paid_full` or `paid_partial` without
a matched remittance line. The matching engine records a `PaymentPostingEvent`
(audit-grade ledger entry) for every successful match.

## Data Model

- **RemittanceBatch** — Container for a payer's payment file
- **RemittanceLine** — Individual line item within a batch
- **PaymentPostingEvent** — Immutable ledger entry linking line → claim
- **UnderpaymentCase** — Flagged shortfall (>10% below billed)
- **AgingBucket** — Time-based outstanding AR grouping
- **PayerKPI** — Aggregated performance metrics per payer

## Store Info

```bash
curl http://localhost:3001/payerops/payments/store-info -b cookies.txt
```

Returns counts of batches, lines, postings, and underpayments.

## Limitations

- All data is in-memory — resets on API restart
- Matching uses heuristic thresholds (tolerance: $1.00, underpayment: 10%)
- No EDI 835 parser — CSV only in v1
- Export bridge has CSV and JSON; no X12 835 output yet
- Aging computation relies on ClaimCase `submittedAt` timestamps
