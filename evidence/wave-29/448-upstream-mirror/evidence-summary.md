# Phase 448 — Evidence Summary

## Deliverables

| # | File | Purpose |
|---|------|---------|
| 1 | `scripts/upstream/worldvista-sync.ps1` | Clones/fetches WorldVistA repos, pins SHAs to LOCK.json |
| 2 | `scripts/upstream/snapshot-licenses.mjs` | Reads LOCK.json, produces license inventory with hashes |
| 3 | `vendor/worldvista/LOCK.json` | Initial lock file (repos not yet synced) |

## .gitignore Update

- Added `vendor/worldvista/*/` to exclude cloned repos
- Kept `vendor/worldvista/LOCK.json` committed
- Vendor sync.log excluded

## Design Decisions

- Shallow clones (`--depth 1`) to minimize disk usage
- BOM-free JSON output (PowerShell 5.1 compat, see BUG-064)
- License type detection via regex on LICENSE text
- SHA-256 truncated hashes for license change detection
- 5 repos tracked: worldvista-ehr, VistA-M, FHIR-Data-Service, popHealth, Blue-Button

## Verification

- Sync script syntax: `pwsh -NoProfile -Command "Get-Command scripts/upstream/worldvista-sync.ps1"`
- License script: `node scripts/upstream/snapshot-licenses.mjs` (requires LOCK.json)
- LOCK.json: valid JSON with 5 repo entries
