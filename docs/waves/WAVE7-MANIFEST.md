# Wave 7 Manifest -- Verification, Resilience & Go-Live Certification

**Created:** 2026-02-28
**Status:** In Progress

## Overview

Wave 7 establishes production certification gates: supply chain security,
deterministic VistA RPC contract testing, API/FHIR schema conformance,
end-to-end clinical journey tests, performance SLO enforcement, resilience
drills, disaster recovery validation, and a pilot go-live kit.

## Build-vs-Buy Decisions

See [/docs/build-vs-buy.md](../build-vs-buy.md) for the full ledger.

## Phase Tracker

| # | Phase | Folder | Status |
|---|-------|--------|--------|
| P1 | 248 -- Wave 7 Manifest + Build-vs-Buy Ledger | 245-PHASE-248-WAVE7-MANIFEST | Planned |
| P2 | 249 -- Supply Chain Security Baseline | 246-PHASE-249-SUPPLY-CHAIN-SECURITY | Planned |
| P3 | 250 -- VistA RPC Contract Harness | 247-PHASE-250-RPC-CONTRACT-HARNESS | Planned |
| P4 | 251 -- API + FHIR Contract Verification | 248-PHASE-251-API-FHIR-CONTRACTS | Planned |
| P5 | 252 -- E2E Clinical Journeys (Playwright) | 249-PHASE-252-E2E-CLINICAL-JOURNEYS | Planned |
| P6 | 253 -- Performance Acceptance Gates (k6) | 250-PHASE-253-PERF-ACCEPTANCE-GATES | Planned |
| P7 | 254 -- Resilience Certification | 251-PHASE-254-RESILIENCE-CERTIFICATION | Planned |
| P8 | 255 -- DR Certification Drill | 252-PHASE-255-DR-CERTIFICATION | Planned |
| P9 | 256 -- Pilot Hospital Go-Live Kit | 253-PHASE-256-PILOT-GO-LIVE-KIT | Planned |

## Dependencies

```
P1 (manifest) --> P2 (supply chain)
P1 (manifest) --> P3 (RPC harness)
P3 (RPC harness) --> P4 (API/FHIR contracts)
P4 (contracts) --> P5 (E2E journeys)
P5 (E2E) --> P6 (perf gates)
P6 (perf) --> P7 (resilience)
P7 (resilience) --> P8 (DR drill)
P2..P8 --> P9 (go-live kit)
```

## Existing Foundations (inherited from prior waves)

| Capability | Status | Location |
|-----------|--------|----------|
| Supply chain attestation (Syft SBOM + cosign) | CI workflow exists | .github/workflows/supply-chain-attest.yml |
| SBOM generation (CycloneDX) | Script exists | scripts/ops/generate-sbom.ps1 |
| DR nightly drill (PG backup/restore) | CI workflow exists | .github/workflows/dr-nightly.yml |
| DR scripts (backup + restore-verify) | Scripts exist | scripts/dr/backup.mjs, restore-verify.mjs |
| k6 smoke tests (10 scripts) | Tests exist | tests/k6/*.js |
| Playwright E2E (41+ specs) | Tests exist | apps/web/e2e/*.spec.ts |
| FHIR R4 gateway (9 endpoints) | Implemented | apps/api/src/fhir/ |
| RPC Registry (137 RPCs + 59 exceptions) | Implemented | apps/api/src/vista/rpcRegistry.ts |
| Security scanning (CodeQL + ci-security) | CI workflows | .github/workflows/codeql.yml, ci-security.yml |
| Pilot hardening (site config + preflight) | Phase 246 | apps/api/src/pilot/ |

## Conventions

- Prompt folders: `<prefix>-PHASE-<phaseNum>-<SLUG>`
- Each folder: `<phaseNum>-01-IMPLEMENT.md`, `<phaseNum>-99-VERIFY.md`, `<phaseNum>-NOTES.md`
- Evidence: `/evidence/wave-7/P<n>/`
- One commit per phase: `phase(<id>): <title>`
- No PHI in evidence/fixtures/logs
