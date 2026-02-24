# Phase 111 — Claim Scrubbing + Claim Lifecycle Runbook

## Overview

Phase 111 adds a full claim lifecycle pipeline: draft creation from
encounters, payer-specific scrub rules, denial tracking, resubmission
loops, and KPI dashboards (first-pass rate, denial rates, net collection
rate). All rules are evidence-backed — unknown scenarios route to
`contracting_needed` workflow.

## New Tables (SQLite)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `claim_draft` | id, tenant_id, status, patient_id, payer_id, scrub_score | Claim drafts with FSM lifecycle |
| `scrub_rule` | id, payer_id, category, severity, condition_json | Evidence-backed validation rules |
| `scrub_result` | id, claim_draft_id, rule_id, passed, message | Per-rule scrub outcomes |
| `claim_lifecycle_event` | id, claim_draft_id, from_status, to_status | Audit trail for state transitions |

Indexes: 19 total across all 4 tables (status, payer, patient, encounter, date range, composite).

## Claim Draft FSM

```
draft → scrubbed → ready → submitted → accepted → paid → closed
                                     → rejected → appealed → resubmitted
                                     → denied   → appealed → resubmitted
```

Valid transitions enforced in `claim-draft-repo.ts` `VALID_TRANSITIONS` map.

## API Endpoints

### Claim Drafts
| Method | Path | Description |
|--------|------|-------------|
| POST | `/rcm/claim-lifecycle/drafts` | Create draft (idempotency key supported) |
| GET | `/rcm/claim-lifecycle/drafts` | List drafts (filters: status, payerId, patientId, encounterId, fromDate, toDate) |
| GET | `/rcm/claim-lifecycle/drafts/stats` | Aggregate stats (total, byStatus, denied, avgScore, charges, paid) |
| GET | `/rcm/claim-lifecycle/drafts/aging` | Aging denials (olderThanDays param) |
| GET | `/rcm/claim-lifecycle/drafts/:id` | Get single draft |
| PATCH | `/rcm/claim-lifecycle/drafts/:id` | Update draft fields (only in draft/scrubbed status) |
| POST | `/rcm/claim-lifecycle/drafts/:id/transition` | Transition status (FSM-enforced) |
| POST | `/rcm/claim-lifecycle/drafts/:id/scrub` | Run scrub rules against draft |
| POST | `/rcm/claim-lifecycle/drafts/:id/denial` | Record denial (code, reason, deniedAt) |
| POST | `/rcm/claim-lifecycle/drafts/:id/resubmit` | Create resubmission from denied/rejected draft |
| POST | `/rcm/claim-lifecycle/drafts/:id/appeal-packet` | Attach appeal packet (supports attachments) |
| GET | `/rcm/claim-lifecycle/drafts/:id/events` | Lifecycle event history |
| GET | `/rcm/claim-lifecycle/drafts/:id/scrub-results` | Scrub results for draft |

### Scrub Rules
| Method | Path | Description |
|--------|------|-------------|
| POST | `/rcm/claim-lifecycle/rules` | Create rule (evidenceSource required) |
| GET | `/rcm/claim-lifecycle/rules` | List rules (filters: payerId, category, isActive) |
| GET | `/rcm/claim-lifecycle/rules/:id` | Get single rule |
| PATCH | `/rcm/claim-lifecycle/rules/:id` | Update rule |
| DELETE | `/rcm/claim-lifecycle/rules/:id` | Soft-delete rule (sets isActive=0) |

### Metrics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/rcm/claim-lifecycle/metrics` | KPI dashboard: first-pass rate, denial rate, net collection rate |
| GET | `/rcm/claim-lifecycle/metrics/scrub` | Scrub-specific metrics: totalScrubbed, passRate, avgScore, topFailingRules |

## Scrub Rule Format

```json
{
  "ruleCode": "CMS1500-DX-REQUIRED",
  "payerId": "payer_001",
  "category": "coding",
  "severity": "error",
  "field": "lineItems",
  "conditionOperator": "min_items",
  "conditionValue": "1",
  "description": "At least one diagnosis code required",
  "suggestion": "Add primary diagnosis code",
  "evidenceSource": "cms_1500_spec_v02_12",
  "blocksSubmission": true
}
```

### Condition Operators
| Operator | Value Format | Description |
|----------|-------------|-------------|
| `missing_field` | n/a | Checks if field is null/empty |
| `min_items` | number | Array field must have ≥ N items |
| `max_charge` | number (cents) | totalChargeCents must be ≤ value |
| `required_attachment_type` | string | Attachment type must exist in attachments array |
| `regex` | regex pattern | Field value must match pattern |
| `date_within_days` | number | Field date must be within N days of now |
| `always` | n/a | Always fires (for warnings/suggestions) |

### Evidence Sources
- Specific payer documentation: `aetna_provider_manual_2024`, `uhc_claim_guide_v8`
- CMS specifications: `cms_1500_spec_v02_12`, `ub04_spec`
- Industry standards: `hipaa_5010_guide`, `nucc_taxonomy_v24`
- Unknown/pending: `contracting_needed` — flags for payer contracting team

## Denial Loop

1. **Record denial**: POST `drafts/:id/denial` with `denialCode`, `denialReason`, `deniedAt`
2. **Review aging**: GET `drafts/aging?olderThanDays=30` to surface stale denials
3. **Prepare appeal**: POST `drafts/:id/appeal-packet` with supporting documentation
4. **Resubmit**: POST `drafts/:id/resubmit` — creates a new draft linked to the original, original transitions to `appealed`

## KPI Definitions

| KPI | Formula |
|-----|---------|
| First-Pass Rate | (accepted + paid) / (submitted + accepted + paid + denied + rejected) × 100 |
| Denial Rate | denied / total × 100 |
| Net Collection Rate | totalPaidCents / totalChargeCents × 100 |

## UI Dashboard

The "Claim Lifecycle" tab in the RCM admin panel has 4 sub-tabs:
1. **Claim Drafts** — CRUD list with status badges, scrub/ready/submit/appeal actions
2. **Metrics & KPIs** — Cards for first-pass rate, denial count, net collection rate, status distribution, scrub metrics
3. **Scrub Rules** — Rule table with severity badges, evidence source, blocking indicator
4. **Denial Aging** — Configurable aging filter (7/14/30/60/90 days), denial code/reason display

## Testing (Manual)

```bash
# 1. Start API
cd apps/api
npx tsx --env-file=.env.local src/index.ts

# 2. Login
curl -c cookies.txt http://127.0.0.1:3001/csrf-token
CSRF=$(curl -s http://127.0.0.1:3001/csrf-token -c cookies.txt -b cookies.txt | jq -r .token)
curl -b cookies.txt -c cookies.txt -X POST http://127.0.0.1:3001/login \
  -H "Content-Type: application/json" -H "x-csrf-token: $CSRF" \
  -d '{"accessCode":"CPRS1234","verifyCode":"CPRS4321$"}'

# 3. Create draft
curl -b cookies.txt -X POST http://127.0.0.1:3001/rcm/claim-lifecycle/drafts \
  -H "Content-Type: application/json" -H "x-csrf-token: $CSRF" \
  -d '{"patientId":"PAT1","providerId":"PROV1","payerId":"PAYER1","dateOfService":"2025-01-15"}'

# 4. Scrub
curl -b cookies.txt -X POST http://127.0.0.1:3001/rcm/claim-lifecycle/drafts/<ID>/scrub \
  -H "Content-Type: application/json" -H "x-csrf-token: $CSRF" -d '{}'

# 5. Check metrics
curl -b cookies.txt http://127.0.0.1:3001/rcm/claim-lifecycle/metrics
curl -b cookies.txt http://127.0.0.1:3001/rcm/claim-lifecycle/metrics/scrub
```

## Files Changed

### New Files
- `apps/api/src/rcm/claim-lifecycle/claim-draft-repo.ts`
- `apps/api/src/rcm/claim-lifecycle/scrub-rule-repo.ts`
- `apps/api/src/rcm/claim-lifecycle/scrubber.ts`
- `apps/api/src/rcm/claim-lifecycle/claim-lifecycle-routes.ts`
- `docs/runbooks/phase111-claim-lifecycle.md`
- `prompts/111-01-IMPLEMENT.md`

### Modified Files
- `apps/api/src/platform/db/schema.ts` — 4 new table definitions
- `apps/api/src/platform/db/migrate.ts` — 4 CREATE TABLE + 19 indexes
- `apps/api/src/index.ts` — import + registration of claimLifecycleRoutes
- `apps/web/src/app/cprs/admin/rcm/page.tsx` — ClaimLifecycleTab (19th tab)

## Follow-ups
- Phase 111-VERIFY: endpoint verification script
- Seed initial CMS/UB-04 rules from official documentation
- Wire encounter-to-draft auto-creation from VistA PCE visit data
- Connect to Phase 40 X12 serializer for submitted claims
- Add auto-reminders for aging denials (email/notification integration)
