# Enterprise Readiness Matrix

**Generated:** 2026-03-05T12:30:35.909Z  
**Commit:** `e8b335b0`  
**Generator:** `scripts/qa/generate-enterprise-readiness-matrix.mjs`

> This matrix is the single source of truth for what VistA-Evolved can
> demonstrably do today, what is partially wired, and what remains pending.
> Every claim is linked to evidence -- scripts, docs, or gate outputs that
> prove the status. If a claim says PROVEN, you can follow the evidence links
> and reproduce the result yourself.

## How to Regenerate

```powershell
node scripts/qa/generate-enterprise-readiness-matrix.mjs
```

The generator reads live doc state from `docs/KNOWN_ISSUES.md`,
`docs/VISTA_CONNECTIVITY_RESULTS.md`, `docs/TIER0_PROOF.md`, and
`docs/QA_GAUNTLET_FAST_RESULTS.md`. Re-run after any verification
pass to refresh the matrix.

## SDLC Alignment

| SDLC Stage | Gate / Mechanism | Evidence |
|------------|-----------------|----------|
| **Build** | QA Gauntlet (5 gates: 4P/1W/0F) | [QA Gauntlet Results](docs/QA_GAUNTLET_FAST_RESULTS.md) |
| **Verify** | Tier-0 proof + `pnpm verify:vista` | [Tier-0 Proof](docs/TIER0_PROOF.md), [Connectivity Results](docs/VISTA_CONNECTIVITY_RESULTS.md) |
| **Release** | RC suite (`scripts/verify-rc.ps1`) + CI smoke | [CI VEHU Smoke](.github/workflows/ci-vehu-smoke.yml) |
| **Operate** | Observability posture (OTel, Prometheus, Jaeger) | `apps/api/src/posture/observability-posture.ts`, `/posture/observability` |

## Known Issues Summary

| Metric | Count |
|--------|-------|
| Total tracked | 4 |
| Closed | 2 |
| Open (blocking) | 0 |
| Open (non-blocking) | 1 |
| Expected (sandbox limits) | 1 |

Source: [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md)

## Readiness Matrix

| # | Capability | Status | Evidence | Blockers | Next Proof to Upgrade |
|---|-----------|--------|----------|----------|----------------------|
| 1 | Platform health + API startup | **PROVEN** | `scripts/qa/gauntlet-fast.mjs` G1 Build+TypeCheck: PASS; [QA Gauntlet Results](docs/QA_GAUNTLET_FAST_RESULTS.md) | None | Promote to CI required gate |
| 2 | VistA RPC connectivity (core) | **PROVEN** | Core: 6/6 PASS; Probe: 87/87 RPCs available; [Connectivity Results](docs/VISTA_CONNECTIVITY_RESULTS.md) | None | Run against production VistA instance |
| 3 | Outpatient clinical read flow (Tier-0) | **PROVEN** | 6-step journey defined; RPCs: ORQPT DEFAULT LIST SOURCE, ORWPT LIST ALL, ORQQVI VITALS, ORQQAL LIST, ORQQPL PROBLEM LIST; [Tier-0 Proof](docs/TIER0_PROOF.md); Runner: `scripts/verify-tier0.ps1` | None | Automated nightly CI run (G14 in verify-rc) |
| 4 | Notes (TIU) write/read | **PROVEN** | TIU CREATE RECORD, TIU SET RECORD TEXT, TIU GET RECORD TEXT: available; [Connectivity Results](docs/VISTA_CONNECTIVITY_RESULTS.md) | Unsigned notes require clinician signature workflow (sandbox limitation) | End-to-end TIU create+read journey test |
| 5 | Orders (CPOE) read + writeback guard | **PROVEN** | ORWDX SAVE, ORWOR1 SIG, ORWDXA DC/FLAG/VERIFY: available; Sign endpoint returns structured blockers; [Connectivity Results](docs/VISTA_CONNECTIVITY_RESULTS.md) | esCode required for sign (Phase 154); sandbox lacks order dialog data | CPOE sign round-trip with esCode in staging |
| 6 | Labs read | **PROVEN** | ORWLRR INTERIM, ORWLRR ACK, ORWLRR CHART: available; [Connectivity Results](docs/VISTA_CONNECTIVITY_RESULTS.md) | None | Labs display journey test with real lab data |
| 7 | Meds read | **PROVEN** | ORWPS ACTIVE: available; Multi-line grouped record parser implemented; [Connectivity Results](docs/VISTA_CONNECTIVITY_RESULTS.md) | None | Meds display journey test |
| 8 | ADT / Inpatient movements | PARTIAL | ZVEADT WARDS/BEDS/MVHIST + DGPM NEW ADMISSION/TRANSFER/DISCHARGE: available (KI-001 closed); [Connectivity Results](docs/VISTA_CONNECTIVITY_RESULTS.md) | PG-backed ADT store pending; inpatient workflow not end-to-end tested | ADT admit-transfer-discharge journey against VEHU with PG persistence |
| 9 | Interop HL7/HLO | **PROVEN** | 6 VE INTEROP RPCs: available; KI-002: Closed -- Phase 576 verified all 6 RPCs callable (IENs 4690-4695), installer expanded to smoke all 6 entry points; [Connectivity Results](docs/VISTA_CONNECTIVITY_RESULTS.md) | None | HL7 message round-trip integration test |
| 10 | Billing safety (no silent mock) | PARTIAL | IBD/IBCN/IBARXM RPCs: available; IB/PRCA globals empty in sandbox (KI-004); CLAIM_SUBMISSION_ENABLED=false by default; [Connectivity Results](docs/VISTA_CONNECTIVITY_RESULTS.md) | IB/PRCA subsystem data empty in WorldVistA sandbox (KI-004); no real payer submission | Billing probe against VistA with populated IB files |
| 11 | Security posture (gauntlet scan) | PARTIAL | G3 Secret scan: WARN; PHI leak scan: PASS; Dep audit: PASS; [Gauntlet Results](docs/QA_GAUNTLET_FAST_RESULTS.md) | KI-003: hardcoded creds in CI/scripts (WARN, non-blocking) | Resolve KI-003 secret scan warnings |
| 12 | Multi-tenancy / RLS posture | PARTIAL | PG RLS policies cover 21+ tables; `PLATFORM_PG_RLS_ENABLED` gate; `/posture/tenant` endpoint; `data-plane-posture.ts` (9 gates) | RLS not enforced in dev mode by default; requires rc/prod runtime mode | Run full posture check in rc mode with RLS enabled |
| 13 | Imaging + Scheduling PG durability | PARTIAL | Imaging worklist + ingest in-memory (Phase 23); Scheduling PG repo exists (Phase 152); Orthanc profile optional; `/imaging/health` live probe | Imaging worklist not yet PG-backed; scheduling seed data requires ZVESDSEED.m | Migrate imaging worklist to PG; run scheduling truth gate with seed data |

## Status Distribution

| Status | Count | Percentage |
|--------|-------|------------|
| PROVEN | 8 | 62% |
| PARTIAL | 5 | 38% |
| PENDING | 0 | 0% |
| **Total** | **13** | **100%** |

## VistA RPC Capability Snapshot

| Metric | Value |
|--------|-------|
| Core connectivity tests | 6/6 PASS |
| Total RPCs probed | 87 |
| Available | 87 |
| Missing | 0 |
| TIU (notes) RPCs | Available |
| CPOE (orders) RPCs | Available |
| Lab RPCs | Available |
| Meds RPCs | Available |
| ADT RPCs | Available |
| Interop RPCs | Available |
| Billing RPCs | Available |

Source: [docs/VISTA_CONNECTIVITY_RESULTS.md](docs/VISTA_CONNECTIVITY_RESULTS.md)

---

*This file is auto-generated. Do not edit manually.*
*Re-generate: `node scripts/qa/generate-enterprise-readiness-matrix.mjs`*
