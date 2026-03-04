# Phase 338 — W16-P2 — Enterprise Identity Hardening — NOTES

## Key Decisions

- **Step-up auth** uses a 3-tier assurance model: standard, elevated, critical
- **MFA is opt-in** via `MFA_ENFORCEMENT_ENABLED=true` (off by default)
- **Device fingerprint** hashes user-agent + accept-language + IP /24 prefix
- **Concurrent session limit** defaults to 5, configurable via `MAX_CONCURRENT_SESSIONS`
- **Session security events** stored in-memory with DB backing when PG is available
- All new types are additive — no existing session-store signatures changed

## Existing Infra Reused

- `session-store.ts` — existing session lifecycle (createSession, getSession, etc.)
- `policy-engine.ts` — action strings referenced by step-up policy
- `server-config.ts` — new config sections follow established pattern
- `immutable-audit.ts` — security events logged to immutable audit trail
- `pg-migrate.ts` — v33 follows established DDL migration pattern
