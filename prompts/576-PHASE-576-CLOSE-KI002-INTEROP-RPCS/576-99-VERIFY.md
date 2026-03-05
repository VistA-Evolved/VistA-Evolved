# Phase 576 — VERIFY: Close KI-002 Interop RPCs

## Verification Steps

1. Run `install-vista-routines.ps1 -ContainerName vehu -VistaUser vehu`
   — all steps PASS, including expanded interop verification.

2. Run `node scripts/qa/verify-interop-rpcs.mjs`
   — all 6 RPCs return PASS (structured response or "0^NOT_AVAILABLE").

3. Confirm `docs/KNOWN_ISSUES.md` shows KI-002 Closed.

4. Confirm `docs/VISTA_CONNECTIVITY_RESULTS.md` no longer lists the 3
   RPCs under "True Missing".

5. `pnpm -w lint:ci` — no new errors.

## Acceptance Criteria

- [ ] Verifier script exists and runs without error
- [ ] All 6 VE INTEROP RPCs return PASS from verifier
- [ ] Installer verification covers all 6 entry points (not just LINKS)
- [ ] KI-002 marked Closed in KNOWN_ISSUES.md
- [ ] VISTA_CONNECTIVITY_RESULTS.md updated with new evidence
- [ ] No new lint errors
