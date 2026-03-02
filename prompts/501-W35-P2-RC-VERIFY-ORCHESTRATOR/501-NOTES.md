# Phase 501 — Notes

- verify-rc.ps1 is the single source of truth for RC readiness
- Gates are run in the order listed in RC_SCOPE.md
- Missing binaries produce SKIP, not FAIL (env-portability)
- Report format is machine-readable JSON for CI integration
