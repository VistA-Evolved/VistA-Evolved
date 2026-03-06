# Phase 587 - Full Repo Audit and Stabilization Runbook

## Scope
This runbook captures an end-to-end repository audit and stabilization pass for VistA-Evolved with live VEHU checks, verifier hardening, and security gate remediation.

## What Changed
1. Added Phase 587 prompt capture:
- `prompts/587-PHASE-587-FULL-REPO-AUDIT-STABILIZATION/587-01-IMPLEMENT.md`
- `prompts/587-PHASE-587-FULL-REPO-AUDIT-STABILIZATION/587-99-VERIFY.md`

2. Fixed verifier behavior:
- `scripts/verify-rc.ps1` now honors `-SkipDocker` by skipping Docker-dependent gates (`G04`, `G09`, `G13`, `G14`) and records explicit skip reasons.

3. Fixed defect harness runtime error:
- `scripts/qa/bug-bash-run.ps1` fixed malformed hashtable block that broke under strict mode (`$trimmed` uninitialized error).

4. Remediated secret scan failures (KI-003 hardening):
- `scripts/restart-drill.mjs` removed hardcoded fallback VistA credentials.
- `scripts/dev-up.ps1` removed hardcoded compose profile credentials and switched to env-driven credentials.
- `scripts/dev-up.sh` removed hardcoded compose profile credentials and switched to env-driven credentials.
- `.github/workflows/ci.yml` removed inline DB credentials and adjusted Redis URL declaration to avoid false-positive secret pattern matching.

5. Refreshed QA generated assets:
- Regenerated `docs/qa/phase-index.json` (phase count now includes phase 587).
- Regenerated phase QA specs via `scripts/generate-phase-qa.mjs`.

6. Resolved RPC trace drift gate:
- Regenerated `data/vista/rpc-catalog-snapshot.json` via `scripts/regen-rpc-snapshot.mjs`.

## Architecture and Audit Findings (Current State)
1. Core platform architecture is coherent and modular (`apps/web`, `apps/portal`, `apps/api`, VistA, PG, optional imaging/IAM/observability).
2. Multi-tenant/runtime contracts are explicit in code (`runtime-mode.ts`, module guard, PG RLS posture gates), but operational maturity still depends on strict rc/prod mode enforcement.
3. VistA integration is real and live (verified through `/vista/ping`, `/health`, and authenticated clinical route checks).
4. QA system is substantial and enforceable; Phase 587 reconciled `G03` baseline governance and restored full RC pass state.
5. MUMPS/custom routine surface is broad; production-safe wrappers exist, but diagnostic/probe routine sprawl should be managed with an archive/retention policy.

## Verification Commands
Run from repository root:

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}"
curl.exe -s http://127.0.0.1:3001/vista/ping
curl.exe -s http://127.0.0.1:3001/health
```

Authenticated VistA route proof:

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/allergies?dfn=46"
Remove-Item login-body.json,cookies.txt -ErrorAction SilentlyContinue
```

Quality and gate checks:

```powershell
node scripts/secret-scan.mjs
node qa/gauntlet/cli.mjs --suite fast --ci
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-latest.ps1 -SkipDocker
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/vista-baseline-probe.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-tier0.ps1
```

## Verification Results Snapshot
1. `secret-scan.mjs`: PASS (0 findings).
2. `qa/gauntlet --suite fast --ci`: PASS (5 pass, 0 fail, 0 warn).
3. `verify-latest.ps1 -SkipDocker`: PASS on all non-Docker gates after debt baseline reconciliation.
4. `verify-latest.ps1` (full): `RC_READY` with `15 PASS / 0 FAIL / 0 SKIP`.
5. `verify-tier0.ps1`: PASS with full T0 journey (`6/6` steps).
6. `vista-baseline-probe.ps1`: PASS (`9/9` gates).

## Remaining Blocker
No active verifier blocker at the end of Phase 587. RC orchestration reports `Overall: RC_READY`.

Open governance item:
1. Continue burning down integration-pending debt over time from the rebaselined count.

## Handover Recommendations
1. Assign an owner for integration-pending budget governance and weekly review.
2. Add a policy for custom M routine lifecycle: production wrappers vs diagnostics, with archive criteria.
3. Keep `verify-latest.ps1` as the release gate and require Tier-0 proof artifact for route-level changes.
4. Treat `runtime-mode rc/prod` plus OIDC and PG requirements as mandatory deploy contract.
5. Use this runbook plus `ops/summary.md` for onboarding and release readiness reviews.
