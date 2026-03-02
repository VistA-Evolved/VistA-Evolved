# Phase 477 — W32-P5: Verify — VEHU Credentials + Test Harness

## Verification Steps

1. `.env.vehu.example` exists with VISTA_HOST, VISTA_PORT, VISTA_ACCESS_CODE, VISTA_VERIFY_CODE
2. `scripts/dev/use-vehu-env.ps1` sets env vars in current shell
3. No PHI or real credentials in committed files
4. VEHU port (9431) documented correctly

## Acceptance Criteria

- [ ] VEHU env example created
- [ ] Helper script works in PowerShell
- [ ] No secrets in committed files
- [ ] Evidence captured
