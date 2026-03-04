# Payer Registry Reference

> Phase 38 — RCM + Payer Connectivity

## Overview

The payer registry is a catalog of all known insurance payers with
their integration modes, endpoints, enrollment requirements, and
operational metadata. It is loaded from seed files at API startup
and can be extended via API at runtime.

## Seed File Format

Seed files are JSON arrays in `data/payers/`:

```json
{
  "_meta": { "description": "...", "lastUpdated": "..." },
  "payers": [
    {
      "payerId": "US-MEDICARE-A",
      "name": "Medicare Part A (Hospital Insurance)",
      "country": "US",
      "integrationMode": "clearinghouse_edi",
      "status": "active",
      "category": "government",
      "clearinghousePayerId": "00301",
      "enrollmentRequired": true,
      "enrollmentNotes": "...",
      "endpoints": [{ "purpose": "claims", "protocol": "sftp", "url": "..." }],
      "aliases": ["Medicare A"],
      "createdAt": "2026-02-20T00:00:00Z",
      "updatedAt": "2026-02-20T00:00:00Z"
    }
  ]
}
```

## Integration Modes

| Mode                | Connector            | Description                          |
| ------------------- | -------------------- | ------------------------------------ |
| `clearinghouse_edi` | `clearinghouse-edi`  | X12 EDI via clearinghouse (SFTP/API) |
| `direct_api`        | `clearinghouse-edi`  | Direct payer REST API                |
| `portal_batch`      | `portal-batch`       | Web portal batch upload              |
| `government_portal` | `philhealth-eclaims` | Government portal (PhilHealth, etc.) |
| `fhir_payer`        | (future)             | FHIR-based payer API                 |
| `not_classified`    | `sandbox`            | Unknown/unclassified                 |

## Adding a New Payer

### Via API

```bash
curl -b cookies.txt -X POST http://localhost:3001/rcm/payers \
  -H "Content-Type: application/json" \
  -d '{
    "payerId": "US-ANTHEM",
    "name": "Anthem Blue Cross",
    "country": "US",
    "integrationMode": "clearinghouse_edi",
    "status": "active",
    "category": "commercial",
    "clearinghousePayerId": "47198"
  }'
```

### Via Seed File

Add to `data/payers/us_core.json` (or create a new seed file).
All `.json` files in `data/payers/` are loaded at startup.

## Adding a New Market

1. Create `data/payers/{market}_payers.json` with local payers
2. Implement a connector if the market has a unique integration mode
3. Register the connector in `rcm-routes.ts` → `ensureInitialized()`
4. Add market-specific validation rules if needed

## Payer Statistics

`GET /rcm/payers/stats` returns:

- Total payer count
- Count by country
- Count by integration mode
- Count by status

## Querying

```
GET /rcm/payers?country=US&integrationMode=clearinghouse_edi&search=medicare&limit=50&offset=0
```

Supported filters:

- `country` — ISO 2-letter code
- `integrationMode` — one of the 6 modes
- `status` — active, inactive, testing, decommissioned
- `search` — case-insensitive substring match on name/aliases
