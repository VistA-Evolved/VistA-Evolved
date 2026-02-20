# Runbook: Payer Directory Refresh

> How to refresh the payer directory from authoritative sources

## Prerequisites

- API running on port 3001
- Session cookie (authenticated)

## Full Directory Refresh

Refreshes all importers and applies changes:

```bash
curl -s http://localhost:3001/rcm/directory/refresh \
  -X POST -H "Content-Type: application/json" \
  -d "{}" | jq .
```

Expected response:
```json
{
  "ok": true,
  "normalized": 63,
  "applied": 63,
  "diffs": [
    { "importerId": "ph-insurance-commission", "added": [...], "removed": [], "modified": [] },
    { "importerId": "au-apra", "added": [...], "removed": [], "modified": [] },
    ...
  ]
}
```

## Country-Specific Refresh

Refresh only PH importers:

```bash
curl -s http://localhost:3001/rcm/directory/refresh \
  -X POST -H "Content-Type: application/json" \
  -d "{\"country\":\"PH\"}" | jq .
```

## Single Importer Run

Run a specific importer:

```bash
curl -s http://localhost:3001/rcm/directory/import/ph-insurance-commission \
  -X POST -H "Content-Type: application/json" \
  -d "{}" | jq .
```

## File-Based Import (US Clearinghouse Roster)

```bash
curl -s http://localhost:3001/rcm/directory/import/us-clearinghouse \
  -X POST -H "Content-Type: application/json" \
  -d "{\"fileData\":\"payerId,name,country\\nBC-001,Blue Cross,US\",\"format\":\"csv\"}" | jq .
```

## Check Directory Stats

```bash
curl -s http://localhost:3001/rcm/directory/stats | jq .
```

## List Directory Payers

```bash
# All payers
curl -s http://localhost:3001/rcm/directory/payers | jq .

# Filter by country
curl -s "http://localhost:3001/rcm/directory/payers?country=PH" | jq .

# Filter by type
curl -s "http://localhost:3001/rcm/directory/payers?payerType=NATIONAL" | jq .
```

## View Refresh History

```bash
curl -s http://localhost:3001/rcm/directory/history | jq .
```

## Verify Route Resolution

```bash
curl -s "http://localhost:3001/rcm/routing/resolve?payerId=PH-PHILHEALTH&jurisdiction=PH" | jq .
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| 0 payers in directory | Importers not run | POST /rcm/directory/refresh |
| ROUTE_NOT_FOUND | Payer has no channels | Check directory payer channels |
| File import errors | Bad CSV format | Ensure payerId,name columns exist |
| Stale directory | Refresh not run recently | POST /rcm/directory/refresh |
