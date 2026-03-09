# Phase 600 - Problem Edit Truthfulness Recovery - Verify

## Verification Steps

1. Check Docker runtime:
   - `docker ps --format "table {{.Names}}\t{{.Status}}"`
2. Check API and VistA connectivity:
   - `curl.exe -s http://127.0.0.1:3001/vista/ping`
   - `curl.exe -s http://127.0.0.1:3001/health`
3. Log in:
   - write `login-body.json` with `{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}`
   - `curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"`
4. Discover a live problem for DFN `46`:
   - `curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/problems?dfn=46"`
5. Exercise edit route with a real problem IEN:
   - `curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/cprs/problems/edit -H "Content-Type: application/json" -d "{...}"`
6. Verify truthful behavior:
   - no fake `mode: 'real'` when VistA returns runtime-error output
   - draft fallback returns `status: 'sync-pending'`
7. Run repo verification:
   - `powershell -ExecutionPolicy Bypass -File scripts/verify-latest.ps1`
8. Clean up temporary auth files.

## Acceptance Criteria

- `POST /vista/cprs/problems/edit` normalizes UI status values before RPC submission.
- VistA runtime-error output does not produce a false live success.
- Edit fallback in the web dialog does not append a duplicate local problem entry.
- VEHU/API health remains green.
- Repository verification passes after the patch.

## Evidence

- Docker status output
- `/vista/ping` response
- `/health` response
- live problem list response for DFN `46`
- live problem edit response
- `scripts/verify-latest.ps1` result