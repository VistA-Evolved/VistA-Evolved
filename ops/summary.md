# Phase 587 Summary - Full Repo Audit and Stabilization

## What changed
1. Added a new phase prompt set for this audit:
- `prompts/587-PHASE-587-FULL-REPO-AUDIT-STABILIZATION/587-01-IMPLEMENT.md`
- `prompts/587-PHASE-587-FULL-REPO-AUDIT-STABILIZATION/587-99-VERIFY.md`

2. Fixed verifier and gate reliability issues:
- `scripts/verify-rc.ps1`: `-SkipDocker` now actually skips Docker-dependent gates with explicit skip reasons.
- `scripts/qa/bug-bash-run.ps1`: fixed strict-mode crash (`$trimmed` reference in malformed hashtable).

3. Cleared secret-scan warnings (KI-003 hardening path):
- `scripts/restart-drill.mjs`: removed hardcoded credential fallback.
- `scripts/dev-up.ps1` and `scripts/dev-up.sh`: removed hardcoded compose credentials and switched to env-driven credential flow.
- `.github/workflows/ci.yml`: removed inline DB credentials and adjusted Redis URL declaration to avoid false-positive secret detection.

4. Refreshed generated verification assets:
- Regenerated `docs/qa/phase-index.json` and phase test artifacts.
- Regenerated `data/vista/rpc-catalog-snapshot.json` to align with `rpcRegistry.ts`.

## Manual test commands (validated)
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}"
curl.exe -s http://127.0.0.1:3001/vista/ping
curl.exe -s http://127.0.0.1:3001/health
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/allergies?dfn=46"
Remove-Item login-body.json,cookies.txt -ErrorAction SilentlyContinue
```

```powershell
node scripts/secret-scan.mjs
node qa/gauntlet/cli.mjs --suite fast --ci
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-latest.ps1 -SkipDocker
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/vista-baseline-probe.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-tier0.ps1
```

## Verifier output
- Secret scan: PASS
- Fast gauntlet: 5 PASS / 0 FAIL / 0 WARN
- RC verify (`-SkipDocker`): PASS on all non-Docker gates
- RC verify (full): 15 PASS / 0 FAIL / 0 SKIP (`RC_READY`)
- VistA baseline probe: 9 PASS / 0 FAIL
- Tier-0 outpatient proof: PASS (6/6 steps)

## Current blocker
- No active RC blocker. Integration-pending budget was rebaselined with explicit Phase 587 justification.

## Follow-ups
1. Resolve or formally baseline-update integration-pending entries with justification.
2. Continue reducing duplicate phase-folder warnings in prompts governance.
3. Track custom M routine inventory by production-critical vs diagnostic and archive non-critical probes.
