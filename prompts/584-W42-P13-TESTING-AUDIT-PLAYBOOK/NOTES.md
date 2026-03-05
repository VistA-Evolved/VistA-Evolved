# Phase 584 — Notes

> Wave 42: Production Remediation | Phase 584

## Why This Phase Exists

Phase 10 of the remediation plan: comprehensive testing and audit playbook produces evidence for certification and ensures no regressions. Integration tests validate VistA wiring; dead-click audit ensures no silent no-ops; security scan catches PHI/credential leaks.

## Key Decisions

- **Evidence gitignored**: All artifacts in `evidence/` are gitignored; CI produces them fresh.
- **Gauntlet on PR**: Fast suite on every PR; full suite nightly or on release.

## Deferred Items

- Full multi-instance test setup — requires Docker Compose with 2 API instances.
- OIDC e2e — requires Keycloak Docker; can be optional.
