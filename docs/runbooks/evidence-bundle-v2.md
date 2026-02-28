# Certification Evidence Bundle v2 — Runbook

> Phase 272: Unified evidence generator for certification-ready audits.

## Overview

The v2 evidence bundle orchestrates all Wave 8 scan outputs into a single
timestamped bundle with machine-readable (JSON) and human-readable (Markdown)
outputs. It runs 10 evidence sections in sequence.

## Quick Start

```bash
# Run full bundle
node scripts/generate-certification-evidence-v2.mjs

# With custom build ID
node scripts/generate-certification-evidence-v2.mjs --build-id cert-v2-2025-Q1

# Skip live API probes (for offline CI)
node scripts/generate-certification-evidence-v2.mjs --skip-live
```

## Output Structure

```
artifacts/evidence/certification-v2/<build-id>/
  metadata.json             — Git SHA, branch, node/pnpm versions
  typecheck.json            — TSC results for api/web/portal
  rpc-contract-report.json  — RPC contract replay results
  invariants-report.json    — Clinical invariant test results
  security-gauntlet.json    — Security scan findings
  phi-audit-report.json     — PHI leak audit results
  gameday-results.json      — GameDay drill results
  audit-chain.json          — Immutable audit chain verification
  safety-case-xref.json     — Safety case cross-reference
  manifest.json             — SHA-256 hashes of all files
  bundle-index.json         — Master index with all sections
  summary.md                — Human-readable summary
```

## Sections

| # | Section | Source Phase | Script |
|---|---------|-------------|--------|
| 1 | Git & Version Metadata | — | Inline |
| 2 | TypeScript Compilation | — | `pnpm exec tsc --noEmit` |
| 3 | RPC Contract Replay | Phase 267 | `scripts/rpc-contract-ci.mjs` |
| 4 | Clinical Invariants | Phase 268 | `scripts/clinical-invariants-ci.mjs` |
| 5 | Security Gauntlet | Phase 269 | `scripts/security/gauntlet.mjs` |
| 6 | PHI Audit | Phase 270 | `scripts/privacy/phi-audit.mjs` |
| 7 | GameDay Drills | Phase 271 | `scripts/dr/gameday-drill.mjs` |
| 8 | Audit Chain | Phase 35 | Inline JSONL verification |
| 9 | Safety Case | Phase 266 | Inline cross-reference |
| 10 | SHA-256 Manifest | — | Inline |

## CI Integration

The script returns exit code 0 if all sections pass, 1 if any section fails.
Use in CI:

```yaml
- name: Generate Evidence Bundle
  run: node scripts/generate-certification-evidence-v2.mjs --build-id ci-${{ github.run_number }}
```

## Dependencies on Earlier Phases

This script delegates to Phase 267-271 scripts. If a script is missing
(e.g., not yet committed), that section reports "script not found" and
does not fail the overall bundle — it's treated as informational.

## Relationship to Phase 34 / Phase 172

- **Phase 34** `generate-evidence-bundle.mjs`: Original 8-gate quality bundle
- **Phase 172** `generate-certification-evidence.mjs`: SOC2/HIPAA-focused 10-section pack
- **Phase 272** `generate-certification-evidence-v2.mjs`: Adds Wave 8 safety/clinical scans

All three can coexist. Phase 272 is the recommended bundle for go-live audits.
