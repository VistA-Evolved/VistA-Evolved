# Phase 18 VERIFY — Ops Summary

## What Changed (during verification)

### 1. RBAC Role Mapping Fix (CRITICAL)
- **File**: `apps/api/src/auth/session-store.ts`
- **Bug**: `mapUserRole()` mapped PROV123 (PROVIDER,CLYDE WV) to "provider" role,
  but all Phase 17+18 admin endpoints require `requireRole(session, ["admin"])`.
  This meant NO Docker sandbox user could access ANY admin endpoint.
- **Fix**: PROV123 now maps to "admin" role since it's the primary admin user
  in the WorldVistA Docker sandbox.
- **Impact**: Pre-existing since Phase 17; affects all `/admin/*` routes.

### 2. Prompt File Rename
- **From**: `20-02-Phase18-Interop-Imaging-VERIFY.md`
- **To**: `20-99-Phase18-Interop-Imaging-VERIFY.md`
- **Reason**: VERIFY prompts must use 99 suffix per `00-ORDERING-RULES.md`.

### 3. Verifier Script Update
- **File**: `scripts/verify-phase18-interop-imaging.ps1`
- **Change**: Updated Section I docs check from `20-02` to `20-99`.

### 4. Runbooks README Updated
- **File**: `docs/runbooks/README.md`
- **Change**: Added Phase 17 and Phase 18 runbook links.

## How to Test Manually

```powershell
# Start Docker + API
cd services\vista; docker compose --profile dev up -d; cd ..\..
pnpm -C apps/api dev

# Run regression
.\scripts\verify-latest.ps1 -SkipDocker

# Live RBAC test
$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-RestMethod -Uri 'http://127.0.0.1:3001/auth/login' -Method POST -Body '{"accessCode":"PROV123","verifyCode":"PROV123!!"}' -ContentType 'application/json' -WebSession $s
Invoke-RestMethod -Uri 'http://127.0.0.1:3001/admin/registry/default' -Method GET -WebSession $s
# Should return array with vista-primary + vista-imaging
```

## Verifier Output

```
=== RESULTS ===
  PASS: 164
  FAIL: 0
  WARN: 0
```

## Live Endpoint Test Results

| Section | Tests | PASS | FAIL | Notes |
|---------|-------|------|------|-------|
| 0: Prompts ordering | 5 | 5 | 0 | Fixed 20-02 to 20-99 |
| 1: Full regression | 164 | 164 | 0 | All phases 10-18 |
| 2: RBAC + security | 14 | 14 | 0 | After role fix |
| 3: Registry schema | 8 | 8 | 0 | All fields validated |
| 4: Integration monitor | 10 | 10 | 0 | Health, probe, toggle |
| 5: Observability/metrics | 9 | 9 | 0 | Audit events found |
| 6: Imaging hooks | 11 | 11 | 0 | VistA-first, OHIF viewer |
| 7: Remote data viewer | 1 | 1 | 0 | Clean sandbox |
| 8: Device onboarding | 10 | 10 | 0 | CRUD + validation |
| 9: Documentation | 3 | 3 | 0 | Runbooks updated |
| **Total** | **235** | **235** | **0** | |

## Follow-ups
- 16 pre-existing VERIFY files in phases 5-12 use wrong numbering (02/04/06/08 instead of 90-98)
- Consider adding non-admin role test (NURSE123 should get 403 on admin endpoints)
- C0FHIR integration untested (requires C0FHIR_HOST env var + running C0FHIR)
