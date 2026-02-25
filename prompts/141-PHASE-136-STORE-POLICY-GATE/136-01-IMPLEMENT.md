# Phase 136 — IMPLEMENT: Store Policy Gate + Durability Sweep

## Goal
Stop drift back into Map stores. Enforce a hard policy: critical state must be
durable in Postgres in rc/prod. No new in-memory-only stores for domain data.

## Implementation Steps

### A) Store Inventory Infrastructure
1. Create `apps/api/src/platform/store-policy.ts`:
   - Machine-readable registry of ALL in-memory stores
   - Each store classified: `critical` | `cache` | `dev_only` | `rate_limiter` | `registry` | `audit`
   - Cache stores must declare TTL and max-size
   - `getStoreInventory()` export for posture endpoint + gate

2. Create `docs/audits/system-store-inventory.json`:
   - Generated artifact listing all ~170 Map stores
   - Classification, owner domain, file path, migration status

### B) Store Policy QA Gate
1. Create `scripts/qa-gates/store-policy-gate.mjs`:
   - FAIL if any `critical` Map store exists AND runtime mode is rc/prod
   - FAIL if any `cache` store lacks TTL or size cap annotation
   - PASS otherwise
   - Checks source files for `new Map` patterns + cross-references inventory

2. Wire into gauntlet:
   - Add `G17_store_policy` gate to `qa/gauntlet/gates/g17-store-policy.mjs`
   - Add to RC + FULL suites

### C) Runtime Enforcement
1. Extend `store-resolver.ts` or posture:
   - `/posture/store-policy` endpoint returning live store status
   - Blocks API startup in rc/prod if critical stores are Map-only (warning log)

### D) Regression Safety
1. Unit tests for store-policy module
2. Gauntlet FAST + RC must pass

## Files Touched
- `apps/api/src/platform/store-policy.ts` (NEW)
- `scripts/qa-gates/store-policy-gate.mjs` (NEW)
- `qa/gauntlet/gates/g17-store-policy.mjs` (NEW)
- `qa/gauntlet/cli.mjs` (MODIFIED — add G17)
- `apps/api/src/posture/index.ts` (MODIFIED — add /posture/store-policy)
- `apps/api/tests/store-policy.test.ts` (NEW)
- `docs/audits/system-store-inventory.json` (NEW — generated)
- `prompts/141-PHASE-136-STORE-POLICY-GATE/136-01-IMPLEMENT.md` (this file)
- `prompts/141-PHASE-136-STORE-POLICY-GATE/136-99-VERIFY.md`

## Verification
Run `scripts/qa-gates/store-policy-gate.mjs` — must PASS.
Run gauntlet FAST + RC — must be green.
