# Phase 254 — Resilience Certification (Wave 7 P7)

## Objective
Certify that VistA-Evolved has production-ready resilience patterns covering
failure injection, circuit breaker behavior, graceful degradation, health/readiness
split, posture observability, and recovery automation.

## Implementation Steps

### 1. Resilience Drill Infrastructure (`ops/drills/`)
- Create `resilience-drills.ts` — typed drill registry (5 scenarios)
  - VistA Connection Loss: stop VistA, verify API degrades, restart, verify recovery
  - Circuit Breaker Activation: induce failures, verify CB opens, verify half-open recovery
  - Graceful Shutdown Drain: SIGTERM during operation, verify clean exit
  - Session Store Pressure: concurrent session load, verify no crash
  - Rate Limiter Enforcement: burst traffic, verify 429, verify recovery
- Create 4 runnable drill scripts (PowerShell):
  - `run-vista-down-drill.ps1` — live VistA down/up cycle
  - `run-circuit-breaker-drill.ps1` — CB state machine validation
  - `run-health-readiness-drill.ps1` — /health vs /ready contract checks
  - `run-posture-audit-drill.ps1` — all /posture/* endpoints reachable

### 2. Static Resilience Certification Test Suite
- Create `apps/api/tests/resilience-certification.test.ts` (Vitest)
  - Circuit Breaker: module exists, exports safeCallRpc, state machine, configurable
  - RPC Broker Reconnection: health check, idle timeout, keepalive, mutex
  - Graceful Shutdown: SIGINT/SIGTERM, drain timeout, RPC disconnect
  - Health vs Readiness: /health always ok, /ready gates on VistA/CB
  - Retry & Timeout: configurable timeouts, exponential backoff
  - Posture Endpoints: all 6+ domains present
  - Backup & Recovery: scripts + DR workflow exist
  - Drill Infrastructure: all drill scripts exist, 5+ scenarios defined
  - Security Resilience: rate limiting, CORS, CSRF, auth rules

### 3. CI Workflow
- Create `.github/workflows/resilience-certification.yml`
  - Triggers: push (resilience files), nightly, manual
  - Runs Vitest resilience suite + file existence checks

### 4. Verification Script
- Create `scripts/verify-phase254-resilience.ps1` (27+ gates)

## Files Created
- `ops/drills/resilience-drills.ts`
- `ops/drills/run-vista-down-drill.ps1`
- `ops/drills/run-circuit-breaker-drill.ps1`
- `ops/drills/run-health-readiness-drill.ps1`
- `ops/drills/run-posture-audit-drill.ps1`
- `apps/api/tests/resilience-certification.test.ts`
- `.github/workflows/resilience-certification.yml`
- `scripts/verify-phase254-resilience.ps1`

## Files Inspected (Inventory-First)
- `apps/api/src/lib/rpc-resilience.ts` — circuit breaker, retry, timeout, cache
- `apps/api/src/vista/rpcBrokerClient.ts` — socket health, reconnection, mutex
- `apps/api/src/middleware/security.ts` — SIGTERM, drain, rate limit, CSRF
- `apps/api/src/server/inline-routes.ts` — /health, /ready endpoints
- `apps/api/src/config/server-config.ts` — CB thresholds, timeouts
- `apps/api/src/posture/*.ts` — 7 posture domains
- `scripts/backup-restore.mjs` — backup/restore script
- `.github/workflows/dr-nightly.yml` — DR nightly workflow

## Existing Patterns Reused
- Verifier pattern: `$MyInvocation.MyCommand.Definition` root resolution, Gate() helper
- Drill scripts: same Invoke-WebRequest + Gate pattern as existing verifiers
- Vitest: same `describe/it/expect` pattern as P3/P4 certification tests
- CI workflow: same pnpm + vitest pattern as other workflows
