# Reconciliation Engine Runbook

> Phase 460 (W30-P5) — Validating migration accuracy via record-level reconciliation.

## Overview

The recon engine compares data between VistA (source) and migration target,
detecting field-level discrepancies and tracking their resolution.

## Discrepancy Categories

| Category | Description |
|----------|-------------|
| `missing-in-target` | Record exists in VistA but not in target |
| `missing-in-source` | Record exists in target but not in VistA |
| `field-mismatch` | Record matched but field values differ |
| `data-quality` | Data quality issue detected during comparison |

## Resolution States

| State | Description |
|-------|-------------|
| `open` | New discrepancy, not yet reviewed |
| `auto-resolved` | System resolved (e.g., case-insensitive match) |
| `manual-review` | Flagged for manual review |
| `accepted` | Difference accepted as-is |
| `resolved` | Manually resolved |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/migration/recon/run` | Start a reconciliation job |
| GET | `/migration/recon/jobs` | List recon jobs |
| GET | `/migration/recon/jobs/:id` | Get single job |
| GET | `/migration/recon/discrepancies?jobId=&status=` | List discrepancies |
| POST | `/migration/recon/discrepancies/:id/resolve` | Resolve a discrepancy |
| GET | `/migration/recon/stats` | Aggregated recon stats |

## Auto-Resolve Rules

The engine automatically resolves certain discrepancies:

- **case-insensitive**: "SMITH" vs "Smith" -> auto-resolved
- **whitespace-trim**: "Diabetes " vs "Diabetes" -> auto-resolved  
- **date-format**: "2024-01-01" vs "01/01/2024" -> auto-resolved

## Notes

- In-memory stores (reset on API restart)
- No PHI in discrepancy IDs or logs
- Admin-only access via AUTH_RULES
