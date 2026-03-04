# Phase 172 — Certification Evidence Export

## Overview

Zero-PHI evidence bundle generator for SOC2/HIPAA-style tech certifications.
Collects posture snapshots, audit chain verification, compliance docs,
config snapshots, gap matrix, and gauntlet results into a single bundle
with SHA-256 tamper-detection manifest.

## Architecture

```
scripts/generate-certification-evidence.mjs
  -> artifacts/evidence/certification/<build-id>/
     manifest.json           -- SHA-256 hashed artifact inventory
     summary.md              -- Human-readable executive summary
     gate-results.json       -- TypeScript + secret + PHI scan
     posture-snapshot.json   -- All posture domain readiness
     audit-chain-status.json -- 3 hash-chained audit trails
     system-gap-matrix.json  -- Compliance gap analysis
     compliance-docs.json    -- Framework doc inventory
     config-snapshot.json    -- Sanitized config hashes
     runbook-index.json      -- Runbook coverage
     gauntlet-results.json   -- Fast suite output (sanitized)
     store-inventory.json    -- In-memory store tracking
     arch-docs.json          -- Architecture doc inventory
     phi-scan.json           -- Bundle PHI verification
     env-template-sanitized.txt -- Redacted env template
```

## API Endpoints

| Method | Path                              | Auth  | Description                 |
| ------ | --------------------------------- | ----- | --------------------------- |
| GET    | `/admin/certification/status`     | admin | Certification readiness     |
| POST   | `/admin/certification/generate`   | admin | Trigger evidence generation |
| GET    | `/admin/certification/bundles`    | admin | List generated bundles      |
| GET    | `/admin/certification/bundle/:id` | admin | Get bundle manifest         |

## Usage

### CLI (full evidence generation)

```powershell
# Full run with quality gates
node scripts/generate-certification-evidence.mjs

# With custom build ID
node scripts/generate-certification-evidence.mjs --build-id cert-2025-q1

# Skip quality gates (faster, posture-only)
node scripts/generate-certification-evidence.mjs --skip-gates

# Generate + ZIP
node scripts/generate-certification-evidence.mjs --zip
```

### API (admin endpoints)

```powershell
# Login
$r = Invoke-WebRequest -Uri http://127.0.0.1:3001/auth/login -Method POST `
  -ContentType "application/json" `
  -Body '{"accessCode":"PROV123","verifyCode":"PROV123!!"}' `
  -SessionVariable s -UseBasicParsing

# Check readiness
Invoke-WebRequest -Uri http://127.0.0.1:3001/admin/certification/status `
  -WebSession $s -UseBasicParsing

# Trigger generation
Invoke-WebRequest -Uri http://127.0.0.1:3001/admin/certification/generate `
  -Method POST -ContentType "application/json" `
  -Body '{"buildId":"cert-manual-test"}' `
  -WebSession $s -UseBasicParsing

# List bundles
Invoke-WebRequest -Uri http://127.0.0.1:3001/admin/certification/bundles `
  -WebSession $s -UseBasicParsing
```

## Evidence Sections

| Section            | What It Collects                              | PHI Risk          |
| ------------------ | --------------------------------------------- | ----------------- |
| Quality Gates      | TypeScript, secret scan, PHI leak scan        | None              |
| Posture Snapshots  | 7 posture module readiness                    | None              |
| Audit Chain Status | 3 audit trail integrity (source + hash chain) | None (no entries) |
| System Gap Matrix  | Domain compliance gaps + evidence refs        | None              |
| Compliance Docs    | Doc inventory (not content)                   | None              |
| Config Snapshots   | Module/SKU/capability hashes                  | None              |
| Runbook Coverage   | Runbook file index                            | None              |
| Gauntlet Fast      | Sanitized gate results                        | None              |
| Store Inventory    | Store count/classification breakdown          | None              |
| Architecture Docs  | Doc presence inventory                        | None              |
| PHI Scan           | Final bundle verification                     | None              |

## Manifest Format

The `manifest.json` provides tamper detection:

```json
{
  "buildId": "cert-2025-01-15T10-30-00",
  "generatedAt": "2025-01-15T10:30:45.123Z",
  "generator": "generate-certification-evidence.mjs",
  "phase": "Phase 172",
  "artifacts": {
    "gate-results.json": {
      "sha256": "a1b2c3...",
      "sizeBytes": 1234
    }
  }
}
```

## Gauntlet Gate

G29 checks: generator script (10 sections), API routes (4 endpoints),
audit trail sources (3), compliance docs (>= 4), gap matrix, posture
modules (>= 7), store policy, no PHI, index.ts wiring, runbook.
