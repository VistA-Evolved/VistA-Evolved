# Phase 522 — C1: Reality Scan Matrix (Durability + VistA Alignment)

## Goal
Create an automated readiness scanner that inventories all in-memory stores
across service-lines, devices, and radiology, reports their durability status,
and checks VistA alignment for each domain entity.

## Implementation
- `scripts/clinical/clinical-readiness-scan.mjs` — Node.js script
- Scans store-policy.ts for all clinical/device stores
- Reports: store ID, classification, durability, migration target
- Checks VistA RPC registry alignment per domain
- Outputs JSON evidence + markdown summary

## Verification
- Script runs without error
- Output includes all 41 stores
- Durability gap count matches known state
