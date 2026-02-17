# Phase 19 VERIFY — Reporting + Export Governance — Ops Summary

## What Changed (VERIFY pass)

### Prompts Ordering Fixes
- Renamed VERIFY files from `-02-` to `-99-` in folders 13-PHASE-11, 16-PHASE-14, 19-PHASE-17
- Moved `prompts/21-AUDIT-PHASES-15-18-VISTA-ALIGNMENT.md` → `prompts/00-PLAYBOOKS/00-02-AUDIT-*.md`
- Renumbered Phase 19 folder: `22-PHASE-19-*` → `21-PHASE-19-*` (contiguous numbering)
- Updated internal file prefixes from `22-` to `21-`
- Codified sub-phase interleaving pattern in `00-ORDERING-RULES.md`

### Documentation
- Added Phase 19 section to `docs/runbooks/README.md`

### Reference Updates
- `scripts/verify-phase19-reporting-governance.ps1` — updated path references from `22-` to `21-`
- `ops/notion-update.json` — updated prompt_ref_path
- `prompts/21-PHASE-19-*/21-01-*.md` — updated self-references

## How to Test Manually

```powershell
# Start Docker + API
cd services\vista; docker compose --profile dev up -d; cd ..\..
pnpm -C apps/api start

# Login (captures cookie)
$body = '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'
$wc = New-Object Net.WebClient
$wc.Headers["Content-Type"] = "application/json"
$wc.UploadString("http://127.0.0.1:3001/auth/login","POST",$body)
# Copy ehr_session cookie value from Set-Cookie header

# Test reports (with cookie)
$wc.Headers["Cookie"] = "ehr_session=<TOKEN>"
$wc.DownloadString("http://127.0.0.1:3001/reports/operations")
$wc.DownloadString("http://127.0.0.1:3001/reports/clinical")

# Test export
$wc.Headers["Content-Type"] = "application/json"
$wc.UploadString("http://127.0.0.1:3001/reports/export","POST",'{"reportType":"audit","format":"csv"}')

# Run verifier
.\scripts\verify-latest.ps1
```

## Verifier Output

```
=== RESULTS ===
  PASS: 130
  FAIL: 0
  WARN: 0
```

## Live Endpoint Test Results

| Section | Tests | PASS | FAIL | Notes |
|---------|-------|------|------|-------|
| 0: Prompts ordering | 4 | 4 | 0 | 3 renames, 1 move, 1 renumber, ordering rules updated |
| 1: Full regression | 130 | 130 | 0 | verify-phase19-reporting-governance.ps1 |
| 2: RBAC gating | 7 | 7 | 0 | 5 endpoints return 401 without auth, admin gets 200 |
| 3: Data minimization | 4 | 4 | 0 | Clinical = counts only; audit export = DFN only; clinical export blocked |
| 4: Export governance | 5 | 5 | 0 | Job create, policy check, listing, download, concurrent limit |
| 5: Pagination/limits | 5 | 5 | 0 | Page clamping, max audit range, export row cap, cache TTLs |
| 6: Ops analytics | 3 | 3 | 0 | Circuit breaker, RPC metrics, integration health |
| 7: Documentation | 2 | 2 | 0 | Runbook exists, linked in README |
| **Total** | **160** | **160** | **0** | |

## Follow-ups
- 16 pre-existing VERIFY files in phases 5-10 use sub-phase interleaving (02/04/06/08) — now codified as accepted variant in ordering rules
- Consider adding non-admin role test (NURSE123 should get 403 on all `/reports/*`)
- C0FHIR integration untested (requires C0FHIR_HOST env var + running C0FHIR)
