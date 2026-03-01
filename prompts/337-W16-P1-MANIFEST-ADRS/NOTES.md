# Phase 337 -- W16-P1 NOTES

## Key Decisions

- BASE_PHASE computed dynamically: max(folders=327, manifests=336, reservations=0) + 1 = 337
- W15 reserved 327-336 (10 phases) but only folder 327 exists; code phases 328-336
  were implemented without prompt folders (this is OK -- prompt folders are optional
  for mid-wave phases per established convention)
- Range reservation infrastructure is new: `scripts/prompts-reserve-range.mjs` +
  `/docs/qa/prompt-phase-range-reservations.json`
- All 4 ADRs chose "extend existing" or "hybrid" approaches over pure external tools,
  consistent with the project's zero-external-dependency pattern for core security

## Existing Infrastructure Inventory

### Auth/Policy (extends in W16-P2, P3, P4)
- `auth/policy-engine.ts` -- RBAC with ~40 action mappings, admin superuser bypass
- `auth/session-store.ts` -- DB-backed sessions, CSRF synchronizer tokens
- `auth/scim-connector.ts` -- PLACEHOLDER interfaces + StubScimConnector
- `auth/oidc-provider.ts` -- OIDC validation, JWKS caching
- `auth/jwt-validator.ts` -- Zero-dep JWT validation
- `auth/enterprise-break-glass.ts` -- Break-glass sessions
- `auth/rbac.ts` -- Role definitions

### Audit (extends in W16-P8)
- `lib/immutable-audit.ts` -- SHA-256 hash-chained audit, JSONL file + ring buffer
- `audit-shipping/` -- S3/MinIO audit shipper (Phase 157)
- `services/imaging-audit.ts` -- Separate imaging audit chain
- `rcm/audit/rcm-audit.ts` -- Separate RCM audit chain

### Security Middleware (extends in W16-P6)
- `middleware/security.ts` -- AUTH_RULES, rate limiting, CORS, CSRF
- `auth/auth-mode-policy.ts` -- rc/prod mode enforcement
