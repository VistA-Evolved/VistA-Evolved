# RCM Payer Connectivity Platform — Runbook

> Phase 38 — VistA-First RCM + Payer Connectivity

## Overview

The RCM Gateway provides claim lifecycle management, EDI pipeline,
multi-payer connectivity, validation engine, and remittance posting.

## Architecture

```
Claim Draft → Validate → Submit → EDI Pipeline → Connector → Payer
                                                             ↓
                                     Remittance ← 835/271/277 ← Response
```

### Components

| Component | File | Purpose |
|-----------|------|---------|
| Domain model | `apps/api/src/rcm/domain/claim.ts` | Claim entity, lifecycle states, transitions |
| Claim store | `apps/api/src/rcm/domain/claim-store.ts` | In-memory claim + remittance storage |
| Payer registry | `apps/api/src/rcm/payer-registry/registry.ts` | Payer catalog with seed data |
| EDI types | `apps/api/src/rcm/edi/types.ts` | X12 transaction set definitions |
| EDI pipeline | `apps/api/src/rcm/edi/pipeline.ts` | Build → validate → send → track |
| Validation engine | `apps/api/src/rcm/validation/engine.ts` | Multi-layer claim validation |
| Connectors | `apps/api/src/rcm/connectors/*.ts` | Pluggable transport layer |
| RCM audit | `apps/api/src/rcm/audit/rcm-audit.ts` | Hash-chained audit trail |
| API routes | `apps/api/src/rcm/rcm-routes.ts` | REST endpoints |
| UI | `apps/web/src/app/cprs/admin/rcm/page.tsx` | Tabbed admin interface |

### Seed Data

| File | Payers | Notes |
|------|--------|-------|
| `data/payers/us_core.json` | 12 | Medicare A/B, Medicaid, TRICARE, CHAMPVA, BCBS, UHC, Aetna, Cigna, Humana, Kaiser, Workers Comp |
| `data/payers/ph_hmos.json` | 15 | PhilHealth + 14 licensed HMOs |

## Prerequisites

- API running (`npx tsx --env-file=.env.local src/index.ts`)
- Authenticated session (POST `/auth/login`)

## API Endpoints

### Payers
```bash
# List payers
curl -b cookies.txt http://localhost:3001/rcm/payers

# Filter by country
curl -b cookies.txt "http://localhost:3001/rcm/payers?country=PH"

# Get single payer
curl -b cookies.txt http://localhost:3001/rcm/payers/US-MEDICARE-A

# Payer statistics
curl -b cookies.txt http://localhost:3001/rcm/payers/stats
```

### Claims
```bash
# Create draft claim
curl -b cookies.txt -X POST http://localhost:3001/rcm/claims/draft \
  -H "Content-Type: application/json" \
  -d '{"patientDfn":"3","payerId":"US-MEDICARE-A","claimType":"professional","totalCharge":250.00,"serviceDate":"2026-01-15","diagnosisCodes":["J06.9"],"serviceLines":[{"procedureCode":"99213","chargeAmount":250.00,"units":1,"serviceDate":"20260115"}],"subscriberMemberId":"1EG4-TE5-MK72","billingProviderNpi":"1234567890"}'

# Validate claim
curl -b cookies.txt -X POST http://localhost:3001/rcm/claims/{id}/validate

# Submit claim
curl -b cookies.txt -X POST http://localhost:3001/rcm/claims/{id}/submit

# List claims by status
curl -b cookies.txt "http://localhost:3001/rcm/claims?status=draft"

# Claim timeline
curl -b cookies.txt http://localhost:3001/rcm/claims/{id}/timeline
```

### Eligibility
```bash
curl -b cookies.txt -X POST http://localhost:3001/rcm/eligibility/check \
  -H "Content-Type: application/json" \
  -d '{"memberId":"1EG4-TE5-MK72","payerId":"US-MEDICARE-A","patientFirstName":"John","patientLastName":"Doe"}'
```

### EDI Pipeline & Connectors
```bash
# Pipeline entries
curl -b cookies.txt http://localhost:3001/rcm/edi/pipeline

# Pipeline statistics
curl -b cookies.txt http://localhost:3001/rcm/edi/pipeline/stats

# Connector list
curl -b cookies.txt http://localhost:3001/rcm/connectors

# Connector health
curl -b cookies.txt http://localhost:3001/rcm/connectors/health
```

### Audit
```bash
# Audit entries
curl -b cookies.txt "http://localhost:3001/rcm/audit?limit=50"

# Verify chain integrity
curl -b cookies.txt http://localhost:3001/rcm/audit/verify

# Audit statistics
curl -b cookies.txt http://localhost:3001/rcm/audit/stats
```

## Claim Lifecycle

```
draft → validated → submitted → accepted → paid → closed
                                         → denied → appealed → closed
                              → rejected (can resubmit after fix)
```

Valid transitions:
- `draft` → `validated`
- `validated` → `submitted`
- `submitted` → `accepted` | `rejected`
- `accepted` → `paid` | `denied`
- `rejected` → `validated` (after fix)
- `denied` → `appealed`
- `appealed` → `accepted` | `denied` | `closed`
- `paid` → `closed`

## Validation Rules

Run `GET /rcm/validation/rules` to see all active rules. Categories:

- **SYN-xxx**: Syntax (required fields)
- **CS-xxx**: Code sets (ICD-10, CPT/HCPCS, modifiers)
- **BUS-xxx**: Business rules (charge totals, future dates, NPI)
- **TF-xxx**: Timely filing
- **PAY-xxx**: Payer-specific (registry presence, enrollment)

## Connectors

| ID | Name | Modes | Notes |
|----|------|-------|-------|
| `sandbox` | Sandbox | All modes | Simulated responses, configurable rejection rate |
| `clearinghouse-edi` | EDI Clearinghouse | `clearinghouse_edi` | SFTP/API (config via env vars) |
| `philhealth-eclaims` | PhilHealth eClaims | `government_portal` | REST API (config via env vars) |
| `portal-batch` | Portal/Batch | `portal_batch` | Manual upload queue |

## Environment Variables

| Var | Default | Purpose |
|-----|---------|---------|
| `RCM_SANDBOX_REJECTION_RATE` | `0.1` | Sandbox rejection rate (0.0-1.0) |
| `RCM_CH_SFTP_HOST` | - | Clearinghouse SFTP host |
| `RCM_CH_SFTP_PORT` | `22` | Clearinghouse SFTP port |
| `RCM_CH_SFTP_USER` | - | Clearinghouse SFTP user |
| `RCM_CH_API_ENDPOINT` | - | Clearinghouse REST API |
| `RCM_CH_API_KEY` | - | Clearinghouse API key |
| `RCM_CH_SENDER_ID` | `VISTAEVOLVED` | ISA sender ID |
| `RCM_CH_RECEIVER_ID` | `CLEARINGHOUSE` | ISA receiver ID |
| `PHILHEALTH_API_ENDPOINT` | eClaims URL | PhilHealth API |
| `PHILHEALTH_FACILITY_CODE` | - | PhilHealth facility code |
| `PHILHEALTH_API_TOKEN` | - | PhilHealth API token |
| `PHILHEALTH_TEST_MODE` | `true` | PhilHealth test mode |

## Troubleshooting

1. **"Payer not found"** — Check payer ID matches seed data or add via POST `/rcm/payers`
2. **Validation fails** — Run validate endpoint, review edits, fix blocking issues
3. **Connector unhealthy** — Check env vars for the connector type
4. **Audit chain broken** — Data corruption; check for manual store manipulation
