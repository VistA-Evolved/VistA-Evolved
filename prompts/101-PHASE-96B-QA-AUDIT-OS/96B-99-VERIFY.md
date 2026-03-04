# Phase 96B -- QA/Audit OS v1.1 -- VERIFY

## Verification Scope

### 1. TypeScript Compile

- `npx tsc --noEmit` in apps/api must pass clean

### 2. Static Verification

- Run `scripts/verify-phase96b-qa-audit.ps1`
- All gates must PASS (currently ~60+ gates)

### 3. Runtime Proof: RPC Trace

- Start API with `QA_ROUTES_ENABLED=true`
- Hit any VistA endpoint (e.g. `/vista/default-patient-list`)
- GET `/qa/traces` must return non-empty array with entries containing:
  - `rpcName`, `durationMs`, `success`, `duzHash`, `timestamp`
- GET `/__test__/rpc-traces?limit=5` must return same data
- GET `/qa/traces/stats` must show `totalCalls > 0`

### 4. Runtime Proof: Flow Catalog

- POST `/qa/flows/reload` must return `loaded >= 15`
- GET `/qa/flows` must list all flows with `expectedRpcs` and `uiRoute`
- POST `/qa/flows/smoke-health/run` must return `status: "passed"`

### 5. Runtime Proof: Dead-Click Endpoint

- POST `/qa/dead-clicks` with `{"entries": [{"page":"/test", "selector":"button"}]}`
- GET `/qa/dead-clicks` must return the entry

### 6. Schema Validation

- `config/qa-flows/schema.json` exists with JSON Schema for flows
- All 15 flow files have `expectedRpcs` and `uiRoute` fields

### 7. Regression

- `scripts/verify-latest.ps1` must pass
- `scripts/verify-phase95b-persistence.ps1` must pass

### 8. Security

- `/__test__/rpc-traces` returns 403 when `QA_ROUTES_ENABLED` is not set
- No PHI in trace entries (duz is hashed, params are empty/redacted)

### 9. Output

- Generate `docs/reports/_generated/phase96b-qa-report.md`
