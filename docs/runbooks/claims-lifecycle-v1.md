# Claims Lifecycle v1 + Scrubber + Denial Workbench — Runbook

> Phase 91 — VistA-Evolved

## Overview

This phase introduces a unified claims lifecycle engine with deterministic
scrubber and denial management workbench. Philippines-first, payer-agnostic,
VistA-aligned.

## Architecture

```
apps/api/src/rcm/claims/
  claim-types.ts     — Enhanced domain types (ClaimCase, ScrubResult, etc.)
  claim-store.ts     — In-memory lifecycle store with state machine
  scrubber.ts        — Deterministic scrubber engine (core + payer packs)
  claim-routes.ts    — API routes (/rcm/claims/lifecycle/*)

apps/web/src/app/cprs/admin/
  claims-queue/page.tsx   — Claims queue UI (list, filter, scrub, transition)
  denials/page.tsx        — Denials workbench UI (list, resolve, track)
```

## State Machine

```
draft
  → ready_for_scrub → scrub_passed → ready_for_submission
                     → scrub_failed → draft (fix and retry)
  ready_for_submission
    → submitted_electronic / submitted_portal / submitted_manual / exported
  submitted_*
    → payer_acknowledged → paid_full / paid_partial / denied
  denied → appeal_in_progress → paid_full / paid_partial / closed
  Any open state → cancelled
  paid_full / paid_partial → closed
```

### Transition Gates

| Gate | Rule |
|------|------|
| → ready_for_submission | Last scrub must be PASS or WARN |
| → payer_acknowledged/paid/denied | Must include evidenceRef or payerClaimNumber |
| PATCH (edit) | Only in draft, scrub_failed, or returned_to_provider |

## Scrubber Engine

Deterministic: same input → same output. No randomness, no external calls.

### Rule Packs

| Pack | Rules | Auto-Select When |
|------|-------|------------------|
| core | 8 rules | Always applied |
| philhealth | 5 rules | payerType=government or memberPin present |
| us_core | 3 rules | billingProviderNpi present or 5-digit payerId |

### Core Rules

| Rule ID | Severity | Check |
|---------|----------|-------|
| core.patient_id | error | Patient DFN present |
| core.payer_id | error | Payer ID present |
| core.date_of_service | error | DOS present + not future |
| core.diagnosis_present | error | At least 1 diagnosis |
| core.primary_diagnosis | warning | One diagnosis marked primary |
| core.procedure_present | error | At least 1 procedure |
| core.charge_positive | error | totalCharge > 0 |
| core.subscriber_id | warning | subscriberId or memberPin present |

### PhilHealth Rules

| Rule ID | Severity | Check |
|---------|----------|-------|
| ph.member_pin | error | PhilHealth member PIN |
| ph.esoa_required | error | eSOA attachment for DOS >= 2026-04-01 |
| ph.facility_code | error | PhilHealth facility code |
| ph.icd10_required | error | All diagnoses are ICD-10 |
| ph.rvs_code | warning | Professional claims use RVS codes |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /rcm/claims/lifecycle | List claim cases (queue) |
| POST | /rcm/claims/lifecycle | Create claim case |
| GET | /rcm/claims/lifecycle/:id | Get claim detail |
| PATCH | /rcm/claims/lifecycle/:id | Update editable fields |
| PUT | /rcm/claims/lifecycle/:id/transition | Transition state |
| POST | /rcm/claims/lifecycle/:id/scrub | Run scrubber |
| POST | /rcm/claims/lifecycle/:id/attachments | Add attachment |
| POST | /rcm/claims/lifecycle/:id/denials | Record denial |
| PUT | /rcm/claims/lifecycle/denials/:id/resolve | Resolve denial |
| GET | /rcm/claims/lifecycle/denials | List denials (workbench) |
| GET | /rcm/claims/lifecycle/stats | Statistics |
| GET | /rcm/claims/lifecycle/scrubber/packs | Available rule packs |

## Storage

In-memory (Map). Resets on API restart. Matches Phase 23 imaging-worklist
pattern. Migration path: VistA IB/PRCA files when available.

## Testing

```bash
# Create a claim case
curl -s -X POST http://localhost:3001/rcm/claims/lifecycle \
  -H 'Content-Type: application/json' \
  -d '{"patientDfn":"3","payerId":"philhealth","dateOfService":"2025-01-15","claimType":"professional","isDemo":true}' \
  --cookie "session=..."

# Run scrubber
curl -s -X POST http://localhost:3001/rcm/claims/lifecycle/{id}/scrub \
  -H 'Content-Type: application/json' \
  -d '{}' \
  --cookie "session=..."

# List denials
curl -s http://localhost:3001/rcm/claims/lifecycle/denials?resolved=false \
  --cookie "session=..."
```

## UI Access

- Claims Queue: `/cprs/admin/claims-queue`
- Denials Workbench: `/cprs/admin/denials`

Both pages appear in the admin sidebar under the RCM module gate.

## Integration Points

- **LOA approval → claim draft**: When an LOA case is approved (Phase 89),
  create a ClaimCase with `loaCaseId` set.
- **PhilHealth draft → claim case**: Import from PH posture (Phase 90) by
  setting `philhealthDraftId`.
- **Workqueue store**: Existing denial workqueue items (Phase 43) can feed
  the denial record system.

## Non-Negotiables

- VistA-first: all clinical data sourced from VistA RPCs
- Deterministic scrubber: no randomness, no external calls
- No PHI in audit logs (detail redaction applied)
- Feature-flagged behind RCM module
- Demo claims blocked from real submission
