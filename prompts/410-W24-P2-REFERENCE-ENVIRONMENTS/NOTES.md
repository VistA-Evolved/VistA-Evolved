# Phase 410 (W24-P2): NOTES

- Three environment overlays: staging (existing), pilot (new), dr-validate (new).
- All envs enforce: postgres, TLS, network policies, Keycloak, observability.
- Pilot uses `runtimeMode: rc` which enforces PG + RLS + OIDC.
- DR-validate includes `restoreFromBackup` config for automated restore testing.
- Parity script checks structural consistency across all three envs.
