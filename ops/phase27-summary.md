# Phase 27 VERIFY Summary

## What changed

- Created Phase 27 verification script (`scripts/verify-phase1-to-phase27-portal-core.ps1`) with 10 sections and 98 gates
- Created Playwright E2E test suite (`apps/portal/e2e/portal-phase27.spec.ts`) covering 12 test areas
- Updated `scripts/verify-latest.ps1` to delegate to Phase 27
- Created prompt file `prompts/29-PHASE-27-PORTAL-CORE/29-99-portal-core-VERIFY.md`

## Verifier sections

1. **Regression** - Delegates to Phase 26 verifier (76 gates)
2. **Backend Services** - 6 service files, portal-core.ts, audit action types, API TypeScript compile
3. **Route Coverage** - 23 routes verified in portal-core.ts
4. **Portal UI Pages** - Share viewer, 5 live pages, API client 30+ functions, portal build
5. **Security** - Cookie settings, secret scan, VA terminology, credentials, audit hashing, sharing security, sensitivity rules, messaging limits
6. **Contract Drift** - 8 YAML modules, auth routes, VistA RPCs, known-gaps doc, Phase 27 coverage
7. **License Guard**
8. **Playwright E2E** - Spec existence + 11 static coverage checks + runtime tests when API available
9. **Documentation** - Runbook, known-gaps, prompt files
10. **Web App Regression** - Clinician web app builds clean

## E2E test coverage

- Auth lifecycle (login, session, logout, denied)
- Health record sections (5 live + 5 pending)
- PDF export (section, full, invalid)
- Share lifecycle (create, preview, verify, revoke, denied)
- Secure messaging (draft/send, draft/delete, inbox/SLA)
- Appointments (list, request/cancel, validation)
- Settings (read, update, invalid)
- Proxy/sensitivity (grant/list/revoke, evaluate blocks flagged)
- Audit trail (events, hashed IDs)
- Rate limiting
- PHI safety (no leak in 401, no stack traces)

## How to test manually

```powershell
# Static gates only (no Docker/Playwright needed)
powershell -ExecutionPolicy Bypass -File scripts\verify-phase1-to-phase27-portal-core.ps1 -SkipPlaywright

# Full E2E (needs Docker + API server)
cd services\vista && docker compose --profile dev up -d
cd apps\api && npx tsx --env-file=.env.local src/index.ts  # in separate terminal
powershell -ExecutionPolicy Bypass -File scripts\verify-phase1-to-phase27-portal-core.ps1
```

## Verifier output

```
PASS: 98
FAIL: 0
WARN: 1 (Playwright runtime skipped with -SkipPlaywright)
RESULT: ALL GATES PASSED
```

## Bugs found & fixed

- **BUG-055**: Em-dash characters (U+2014) in PowerShell scripts cause parse errors on PS 5.1. UTF-8 byte 0x94 maps to right double-quote in Windows-1252 codepage. Fix: use ASCII hyphens only in .ps1 files.
- **BUG-056**: `Test-Path` with `[token]` directory treats brackets as wildcard characters. Fix: use `Test-Path -LiteralPath`.

## Follow-ups

- Run full Playwright E2E against live API server
- Phase 28 planning (telehealth WebRTC integration per contract)
