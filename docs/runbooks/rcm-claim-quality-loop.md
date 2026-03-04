# RCM Claim Quality Loop -- Acks, Remits, Denials, Workqueues

Phase 43 operational loop that reduces claim rejections and denials.

## Architecture

```
Outbound:  Claim -> Validate (rules) -> Submit -> Pipeline
Inbound:   999/277CA -> ack-status-processor -> claim lifecycle + workqueue
           277       -> status-processor -> claim lifecycle + workqueue
           835       -> remit-processor -> remittance + denial workqueue
```

## Processing Flow

### 1. Ack Ingestion (999 / 277CA)

POST `/rcm/acks/ingest`

- Idempotency: Required `idempotencyKey` prevents duplicate processing
- Accepted acks transition claim to `accepted`
- Rejected acks transition claim to `rejected` and create rejection workqueue items
- Each error in the ack creates a separate workqueue item with CARC lookup

### 2. Status Ingestion (276/277)

POST `/rcm/status/ingest`

- Category codes drive claim lifecycle transitions:
  - `F1` = Finalized with payment -> `paid`
  - `F2`/`D0` = Denial -> `denied` + denial workqueue item
  - `P1`/`R0`/`R1` = Pending info -> missing_info workqueue item
- Status updates are stored with full history per claim

### 3. Remittance Processing (835)

POST `/rcm/remittances/process`

- Normalizes service lines with CARC/RARC code enrichment
- Zero payment + charges = denial -> creates critical workqueue items
- Partial payment = paid with adjustment workqueue items
- Auto-matches to claim by ID

### 4. Workqueues

Three workqueue types:

- **Rejections**: From 999/277CA errors. Usually syntax / format issues.
- **Denials**: From 835 CARC codes or 277 denial categories. Clinical / coverage issues.
- **Missing Info**: From 277 P1/R0/R1 categories. Payer needs more documentation.

Each item includes:

- Reason code + description (CARC/RARC enriched)
- Recommended action (auto-generated from CARC reference tables)
- Field to fix (e.g., `billingProviderNpi`, `subscriberId`)
- Triggering rule
- Priority (critical/high/medium/low)
- Assignment + resolution tracking

### 5. Payer Rules

Configuration-driven pre-submission validation:

- Global rules (payerId = `*`) apply to all claims
- Per-payer rules override/extend globals
- Categories: required_field, code_restriction, timely_filing, prior_auth, bundling, modifier, demographics, eligibility, custom
- Seed rules loaded at startup (9 default rules)
- Admin CRUD via API

POST `/rcm/rules/evaluate` runs all applicable rules against a claim.

## API Endpoints (Phase 43)

| Method | Path                             | Description                                            |
| ------ | -------------------------------- | ------------------------------------------------------ |
| POST   | /rcm/acks/ingest                 | Ingest 999/277CA ack                                   |
| GET    | /rcm/acks                        | List acks                                              |
| GET    | /rcm/acks/:id                    | Get single ack                                         |
| GET    | /rcm/acks/stats                  | Ack statistics                                         |
| POST   | /rcm/status/ingest               | Ingest 276/277 status                                  |
| GET    | /rcm/status                      | List status updates                                    |
| GET    | /rcm/status/stats                | Status statistics                                      |
| GET    | /rcm/claims/:id/history          | Combined claim history (acks+status+remits+workqueue)  |
| POST   | /rcm/remittances/process         | Enhanced 835 processing with workqueue generation      |
| GET    | /rcm/remittances/processor-stats | Remit processor stats                                  |
| GET    | /rcm/workqueues                  | List workqueue items (filter by type/status/priority)  |
| GET    | /rcm/workqueues/stats            | Workqueue statistics                                   |
| GET    | /rcm/workqueues/:id              | Get single workqueue item                              |
| PATCH  | /rcm/workqueues/:id              | Update workqueue item (status, assignment, resolution) |
| GET    | /rcm/claims/:id/workqueue        | Workqueue items for a specific claim                   |
| GET    | /rcm/rules                       | List payer rules                                       |
| GET    | /rcm/rules/stats                 | Rule statistics                                        |
| GET    | /rcm/rules/:id                   | Get single rule                                        |
| POST   | /rcm/rules                       | Create payer rule                                      |
| PATCH  | /rcm/rules/:id                   | Update payer rule                                      |
| DELETE | /rcm/rules/:id                   | Delete payer rule                                      |
| POST   | /rcm/rules/evaluate              | Evaluate rules against claim                           |
| GET    | /rcm/reference/carc              | CARC code lookup                                       |
| GET    | /rcm/reference/rarc              | RARC code lookup                                       |

## Testing

```bash
# Ingest an ack
curl -X POST http://localhost:3001/rcm/acks/ingest \
  -H "Content-Type: application/json" \
  -d '{"type":"999","disposition":"rejected","originalControlNumber":"000001","ackControlNumber":"ACK001","idempotencyKey":"ack-test-1","errors":[{"errorCode":"4","description":"Procedure code inconsistent with modifier"}]}'

# Ingest a status update
curl -X POST http://localhost:3001/rcm/status/ingest \
  -H "Content-Type: application/json" \
  -d '{"categoryCode":"F2","statusCode":"denied","statusDescription":"Not covered","idempotencyKey":"status-test-1"}'

# Process a remittance
curl -X POST http://localhost:3001/rcm/remittances/process \
  -H "Content-Type: application/json" \
  -d '{"payerId":"BCBS","totalCharged":15000,"totalPaid":12000,"idempotencyKey":"remit-test-1","serviceLines":[{"lineNumber":1,"procedureCode":"99213","chargedAmount":15000,"paidAmount":12000,"adjustments":[{"groupCode":"CO","reasonCode":"45","amount":3000}]}]}'

# View workqueues
curl http://localhost:3001/rcm/workqueues?type=denial

# List payer rules
curl http://localhost:3001/rcm/rules

# Evaluate rules
curl -X POST http://localhost:3001/rcm/rules/evaluate \
  -H "Content-Type: application/json" \
  -d '{"payerId":"AETNA","claim":{"subscriberId":"ABC123","billingProviderNpi":"1234567890","diagnoses":["J06.9"],"totalCharge":15000,"dateOfService":"2025-01-15","lines":[]}}'

# CARC lookup
curl http://localhost:3001/rcm/reference/carc?code=45
```

## CARC/RARC Reference

The system includes 30+ common CARC codes and 15 RARC codes with:

- Description
- Category (denial/adjustment/info)
- Recommended action
- Field hint for auto-remediation

Full code lists at https://x12.org/codes
