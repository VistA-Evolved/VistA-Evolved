# US EDI Clearinghouse Integration Guide

> Phase 38 — RCM + Payer Connectivity (US Market)

## Overview

US healthcare claims are submitted electronically via HIPAA-mandated
X12 EDI transaction sets through clearinghouses (Change Healthcare,
Availity, WayStar, Trizetto, etc.).

## Supported X12 Transaction Sets

| Set  | Direction | Purpose                              | Status              |
| ---- | --------- | ------------------------------------ | ------------------- |
| 837P | Outbound  | Professional claim                   | Implemented (typed) |
| 837I | Outbound  | Institutional claim                  | Implemented (typed) |
| 835  | Inbound   | Electronic Remittance Advice         | Implemented (typed) |
| 270  | Outbound  | Eligibility inquiry                  | Implemented (typed) |
| 271  | Inbound   | Eligibility response                 | Implemented (typed) |
| 276  | Outbound  | Claim status inquiry                 | Implemented (typed) |
| 277  | Inbound   | Claim status response                | Implemented (typed) |
| 275  | Outbound  | Additional information (attachments) | Typed               |
| 278  | Both      | Prior authorization                  | Typed               |
| 999  | Inbound   | Implementation acknowledgment        | Typed               |
| 997  | Inbound   | Functional acknowledgment (legacy)   | Typed               |
| TA1  | Inbound   | Interchange acknowledgment           | Typed               |

## EDI Pipeline Architecture

```
Internal Claim
  ↓ buildClaim837FromDomain()
EdiClaim837 (typed internal representation)
  ↓ serialize (future: X12 wire format)
X12 payload string
  ↓ createPipelineEntry() → build → validate → enqueue
Pipeline tracking
  ↓ connector.submit()
Clearinghouse (SFTP or REST API)
  ↓ response
999/TA1 acknowledgment → ack_received
  ↓ later
835/271/277 substantive response → response → reconciled
```

## Pipeline Stages

| Stage          | Description                       |
| -------------- | --------------------------------- |
| `build`        | Internal → EDI representation     |
| `validate`     | Syntax + business rule validation |
| `enqueue`      | Placed in outbound queue          |
| `transmit`     | Sent to clearinghouse             |
| `ack_pending`  | Awaiting 999/TA1                  |
| `ack_received` | Got acknowledgment                |
| `response`     | Got substantive response          |
| `reconciled`   | Matched back to source claim      |
| `error`        | Pipeline error                    |
| `cancelled`    | Cancelled before transmission     |

## Clearinghouse Configuration

```env
# SFTP-based submission
RCM_CH_SFTP_HOST=sftp.clearinghouse.com
RCM_CH_SFTP_PORT=22
RCM_CH_SFTP_USER=vistaevolved

# REST API submission (alternative)
RCM_CH_API_ENDPOINT=https://api.clearinghouse.com/v1
RCM_CH_API_KEY=<api-key>

# X12 envelope identifiers
RCM_CH_SENDER_ID=VISTAEVOLVED
RCM_CH_RECEIVER_ID=CLEARINGHOUSE
```

## US Payer Seed Data

The US payer seed (`data/payers/us_core.json`) includes:

| Payer ID      | Name                   | Mode                | CH Payer ID |
| ------------- | ---------------------- | ------------------- | ----------- |
| US-MEDICARE-A | Medicare Part A        | `clearinghouse_edi` | 00301       |
| US-MEDICARE-B | Medicare Part B        | `clearinghouse_edi` | 00302       |
| US-MEDICAID   | Medicaid               | `clearinghouse_edi` | 00400       |
| US-TRICARE    | TRICARE                | `clearinghouse_edi` | 99726       |
| US-CHAMPVA    | CHAMPVA                | `clearinghouse_edi` | 84146       |
| US-BCBS       | Blue Cross Blue Shield | `clearinghouse_edi` | BCBS0       |
| US-UHC        | UnitedHealthcare       | `clearinghouse_edi` | 87726       |
| US-AETNA      | Aetna                  | `clearinghouse_edi` | 60054       |
| US-CIGNA      | Cigna                  | `clearinghouse_edi` | 62308       |
| US-HUMANA     | Humana                 | `clearinghouse_edi` | 61101       |
| US-KAISER     | Kaiser Permanente      | `direct_api`        | -           |
| US-WC-GENERIC | Workers Compensation   | `portal_batch`      | -           |

## Validation Rules (US-specific)

The validation engine checks:

- ICD-10 format (A00-T98, V00-Y99 with optional decimal)
- CPT/HCPCS format (5-digit or alpha+4digit)
- Modifier format (2 alphanumeric chars)
- NPI requirement for electronic claims
- Timely filing (365-day Medicare default)
- Service line charge sum vs total
- Duplicate procedure codes on same date

## VistA-First Principle

The claim domain model includes VistA grounding fields:

- `vistaChargeIen` — IEN in VistA IB Charge file (#350)
- `vistaArIen` — IEN in VistA AR Account file (#430)

When VistA Integrated Billing (IB) is available, claim data should
be pulled from VistA rather than manually entered. The billing adapter
interface (`adapters/billing/`) provides the VistA integration point.

## Future Enhancements

- [ ] X12 wire format serializer/parser (ISA/GS/ST envelope generation)
- [ ] Real SFTP transmission to clearinghouse
- [ ] 835 auto-import and remittance posting
- [ ] ERA auto-reconciliation with claim store
- [ ] Real-time eligibility (270/271) with clearinghouse API
- [ ] Prior auth workflow (278 request/response)
- [ ] Attachment support (275) for clinical documentation
