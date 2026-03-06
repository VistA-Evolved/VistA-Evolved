# Phase 587 Execution Pack - Team + AI Prompt Operations

## Objective
Provide a turnkey execution package that covers the recommended team workstreams and AI prompt sequence, with completion status and command evidence.

## Completion Status (This Pass)
1. Docker-first runtime verification: COMPLETED.
2. Live VistA route verification: COMPLETED.
3. Security warning remediation (KI-003): COMPLETED.
4. Verifier reliability fixes: COMPLETED.
5. Phase governance sync (index/specs): COMPLETED.
6. RC gate recovery to full pass: COMPLETED (`RC_READY`).

## Commands Executed (Evidence)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}"
curl.exe -s http://127.0.0.1:3001/vista/ping
curl.exe -s http://127.0.0.1:3001/health
node scripts/secret-scan.mjs
node qa/gauntlet/cli.mjs --suite fast --ci
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-latest.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-tier0.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/vista-baseline-probe.ps1
```

## AI Prompt Sequence (Executed/Ready)

### Prompt A - Runtime Truth Check (Executed)
Goal: ensure infrastructure and live VistA connectivity before any coding.
Acceptance: `/vista/ping` and `/health` both return `ok:true`; live clinical route returns real VistA data.

### Prompt B - Gate Hardening (Executed)
Goal: fix verifier scripts that can pass/fail incorrectly due to tooling bugs.
Acceptance: verifier runs cleanly with deterministic skip semantics and no script crashes.

### Prompt C - Security Debt Burn-down (Executed)
Goal: remove hardcoded credential patterns and clear secret scan.
Acceptance: `node scripts/secret-scan.mjs` returns clean pass.

### Prompt D - Prompt Tree Integrity (Executed)
Goal: sync phase index and generated QA specs.
Acceptance: phase-index gate pass with matching folder/phase counts.

### Prompt E - RPC Drift Gate Recovery (Executed)
Goal: eliminate registry/snapshot drift gate failures.
Acceptance: rpc trace compare shows delta <= threshold.

### Prompt F - Integration Pending Budget Decision (Executed)
Goal: either reduce debt or rebaseline with explicit justification.
Acceptance: G03 passes with traceable baseline metadata.

### Prompt G - Full RC Verification (Executed)
Goal: run complete verifier with Docker-dependent checks active.
Acceptance: `Overall: RC_READY`.

### Prompt H - Documentation and Ops Artifact Sync (Executed)
Goal: update runbook, summary, notion metadata, known issues, readiness matrix.
Acceptance: artifacts reflect latest verification state and closures.

## Recommended Team Workstreams (Now Pre-Built)

1. Platform Owner Workstream
- Input files: `scripts/verify-rc.ps1`, `docs/qa/integration-pending-baseline.json`, `docs/qa/integration-pending-backlog.md`
- Deliverable: weekly budget governance review + baseline change protocol.

2. Security Owner Workstream
- Input files: `scripts/secret-scan.mjs`, `.github/workflows/ci.yml`, `scripts/dev-up.ps1`, `scripts/dev-up.sh`, `scripts/restart-drill.mjs`
- Deliverable: credential hygiene policy and periodic scan report.

3. VistA Integration Owner Workstream
- Input files: `apps/api/src/vista/*`, `services/vista/*.m`, `data/vista/rpc-catalog-snapshot.json`
- Deliverable: production-vs-diagnostic M routine lifecycle policy and quarterly RPC drift audits.

4. QA Lead Workstream
- Input files: `qa/gauntlet/*`, `scripts/qa-gates/*`, `scripts/verify-latest.ps1`
- Deliverable: strict CI gate profile and release sign-off checklist.

5. Product/Engineering Manager Workstream
- Input files: `docs/ENTERPRISE_READINESS_MATRIX.md`, `docs/KNOWN_ISSUES.md`, `ops/summary.md`
- Deliverable: readiness scorecard per release with explicit go/no-go criteria.

## Go-Forward Cadence
1. Before merge: run fast gauntlet and secret scan.
2. Before release candidate: run full `verify-latest.ps1` without `-SkipDocker`.
3. Weekly: refresh readiness matrix and known issues.
4. Monthly: refresh RPC snapshot and lane baseline probe evidence.
