# Phase 65 — Verification (OS v3)

## Gates

### Gate 1 — Sanity
- API typecheck clean (0 new errors)
- Web typecheck no new errors
- Portal typecheck no new errors
- verify-latest.ps1 passes

### Gate 2 — Feature Integrity
- GET /vista/immunizations?dfn=3 returns { ok: true, rpcUsed, source }
- Response includes immunization records or empty array with pendingTargets
- POST /vista/immunizations?dfn=3 returns structured response (if supported) or pendingTargets
- ImmunizationsPanel renders in CPRS patient chart
- Portal /dashboard/immunizations renders history or pending banner

### Gate 3 — Security
- No PHI in logs
- No hardcoded credentials
- Session auth enforced on all endpoints

### Gate 4 — Negative Tests
- GET /vista/immunizations (no dfn) → structured error
- GET /vista/immunizations?dfn=abc → structured error
- POST /vista/immunizations without body → structured error

### Gate 5 — Registry
- rpcRegistry.ts has immunization RPCs
- actionRegistry.ts has immunization actions
- capabilities.json has immunization capabilities
