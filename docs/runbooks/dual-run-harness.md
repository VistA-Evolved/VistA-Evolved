# Dual-Run Harness Runbook

> Phase 459 (W30-P4) — Running operations against VistA and target simultaneously.

## Overview

The dual-run harness enables migration validation by executing operations against
both VistA (primary/source of truth) and the migration target (secondary)
simultaneously, capturing field-level discrepancies.

## Modes

| Mode | Behavior |
|------|----------|
| `off` | Default. VistA only, no secondary execution |
| `shadow` | VistA response returned, secondary runs silently; discrepancies logged |
| `compare` | Both results returned side-by-side for manual review |

## Configuration

Set via environment variable or runtime API:

```bash
# Environment variable
DUAL_RUN_MODE=shadow

# Runtime API
curl -X POST http://localhost:3001/migration/dual-run/mode \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"mode": "shadow"}'
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/migration/dual-run/status` | Current mode + comparison stats |
| POST | `/migration/dual-run/mode` | Set dual-run mode |
| GET | `/migration/dual-run/comparisons?limit=50` | Recent comparison log |

## How It Works

1. Primary function (VistA) always executes first
2. In shadow/compare mode, secondary function executes in parallel
3. Results are compared field-by-field
4. Discrepancies logged with field name, primary value, secondary value
5. Stats tracked: total comparisons, match rate, avg latency

## Comparison Output Structure

```json
{
  "id": "dr-1",
  "operation": "patient-lookup",
  "match": false,
  "discrepancies": [
    { "field": "lastName", "primary": "SMITH", "secondary": "Smith" }
  ],
  "primaryDurationMs": 45,
  "secondaryDurationMs": 12
}
```

## Notes

- In-memory store (max 1000 comparisons, FIFO rotation)
- Shadow mode never affects the primary response
- Secondary errors suppressed in shadow mode
- Admin-only access via AUTH_RULES
