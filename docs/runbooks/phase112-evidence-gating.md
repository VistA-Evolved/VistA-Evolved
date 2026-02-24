# Phase 112 -- Evidence Pipeline + No-Fake-Integrations Gate

## Overview

Phase 112 enforces that every payer integration claim in the codebase is
backed by verifiable evidence. No fabricated API endpoints. No fake portal
references. No ungrounded doc claims.

## Components

| Component | Location | Purpose |
|-----------|----------|---------|
| DB table | `integration_evidence` (table AE) | Per-payer evidence entries |
| Repo | `apps/api/src/rcm/evidence/evidence-registry-repo.ts` | CRUD + analytics |
| Routes | `apps/api/src/rcm/evidence/evidence-routes.ts` | REST API (9 endpoints) |
| CI Gate | `scripts/qa-gates/evidence-gate.mjs` | 5-gate enforcement |
| Template | `docs/templates/payer-evidence-template.md` | Research helper |
| UI | RCM admin page -- "Evidence Registry" tab | Admin dashboard |

## Evidence Model

Each entry ties a specific payer + method combination to a verifiable source:

```
payerId:  "US-CMS-MEDICARE-A"
method:   "edi"          (api | portal | manual | edi | fhir)
source:   "https://..."  (URL or document reference)
status:   "verified"     (unverified | verified | stale | archived)
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/rcm/evidence` | List all evidence (optional `?status=`, `?method=`, `?tenantId=`) |
| GET | `/rcm/evidence/:id` | Single evidence entry |
| GET | `/rcm/evidence/by-payer/:payerId` | Evidence for a specific payer |
| POST | `/rcm/evidence` | Create evidence entry |
| PUT | `/rcm/evidence/:id` | Update evidence entry |
| DELETE | `/rcm/evidence/:id` | Soft-delete (archive) |
| GET | `/rcm/evidence/coverage` | Cross-reference payers vs evidence |
| GET | `/rcm/evidence/gaps` | Payers needing evidence but missing it |
| GET | `/rcm/evidence/stats` | Evidence counts by status/method |

## CI Gate

```bash
# Standard mode (warnings for missing evidence)
node scripts/qa-gates/evidence-gate.mjs

# Strict mode (fails on missing evidence)
node scripts/qa-gates/evidence-gate.mjs --strict

# JSON output for CI pipelines
node scripts/qa-gates/evidence-gate.mjs --json
```

### Gates

| Gate | Check | Strict Behavior |
|------|-------|----------------|
| 1. Payer Seeds | Payers with api/fhir/gov_portal modes have evidence in `data/evidence/` | FAIL if missing |
| 2. Connector Endpoints | No undeclared external URLs in connector code | FAIL if found |
| 3. Docs Grounding | No ungrounded "live API" claims in runbooks | FAIL if found |
| 4. Template | Evidence template file exists | FAIL if missing |
| 5. Route Code | Evidence routes + repo files exist | FAIL if missing |

## Adding Evidence

### Via API

```bash
curl -X POST http://localhost:3001/rcm/evidence \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "payerId": "US-CMS-MEDICARE-A",
    "method": "edi",
    "source": "https://www.cms.gov/electronic-billing",
    "channel": "sftp",
    "sourceType": "url",
    "submissionRequirements": "Via clearinghouse. Payer ID 00882.",
    "lastVerifiedAt": "2026-02-24T00:00:00Z",
    "verifiedBy": "admin",
    "status": "verified",
    "confidence": "confirmed"
  }'
```

### Via Seed Files

Place JSON in `data/evidence/`:

```json
{
  "evidence": [
    {
      "payerId": "US-CMS-MEDICARE-A",
      "method": "edi",
      "source": "https://www.cms.gov/electronic-billing",
      "channel": "sftp"
    }
  ]
}
```

### Via UI

Navigate to RCM Admin > Evidence Registry tab. Use the "Add Evidence"
form to create entries with all fields.

## Workflow

1. Run `node scripts/qa-gates/evidence-gate.mjs` to identify gaps
2. Use `docs/templates/payer-evidence-template.md` as research guide
3. Research each gap: find official payer docs, portals, or contacts
4. Submit evidence via API or seed file
5. Re-run gate to confirm coverage

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Gate fails in strict mode | Add evidence entries for all api/fhir/gov_portal payers |
| "Missing required fields" on POST | Ensure payerId, method, source are all provided |
| Evidence shows as "stale" | Re-verify and update `lastVerifiedAt` + `status` |
| Seed payer not in evidence | Add a `data/evidence/` JSON file OR use the API |

## Future Enhancements

- **Live scraping module** (requires explicit approval)
- **Automatic stale detection** (flag entries > 12 months old)
- **Evidence chain linking** (connect evidence to specific adapter code)
- **Clearinghouse directory import** (bulk evidence from payer lists)
