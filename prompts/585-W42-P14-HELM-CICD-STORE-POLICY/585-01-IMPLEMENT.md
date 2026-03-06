# Phase 585 — W42-P14: Helm, CI/CD, and Store Policy (Phase 11 + 12)

> Wave 42: Production Remediation | Position 14 of 15
> Depends on: Phases 576-577 (store migration), Phase 574 (Redis), Phase 584 (gauntlet)

---

## Context

Wave 42 production-remediation prompt. Use this section to capture execution context, dependencies, and prerequisites before changing code.

## Implementation Steps

1. Execute the objective and task sections below in order.
2. Keep changes deterministic and minimal.
3. Record any deviations from the stated approach in Decisions.

## Files Changed

List the source files, configs, scripts, docs, and tests changed while executing this prompt.

## Decisions

Record design choices, trade-offs, or scope trims made during execution.

## Evidence Captured

List the commands, runtime checks, artifacts, and logs that prove the work is complete.

---

## Objective

Update store-policy.ts so all migrated stores are pg_backed; fix Helm charts; wire gauntlet to CI/CD; add Redis to production compose.

---

## Part A: Store Policy Enforcement (Phase 11)

**File:** `apps/api/src/platform/store-policy.ts`

**Actions:**

1. Change durability from `in_memory_only` to `pg_backed` for all migrated stores (Phases 576, 577)
2. Add new stores to inventory
3. `getCriticalInMemoryStores()` must return 0 in rc/prod mode
4. Add Redis-backed stores as `redis_cached` (sessions, rate limiters, locks)

**Stores to update:**

- portal-access-logs, imaging-break-glass, telehealth-rooms
- scheduling-booking-locks, scheduling-waitlist, intake-sessions
- clinical-drafts, webhook-subscriptions, fhir-subscriptions
- All 17 Phase 577 stores (intake-brain-state, mha-administration, etc.)
- Sessions, rate limiters -> redis_cached when Redis wired

---

## Part B: Helm Fixes (Phase 12A)

**Files:**

- `infra/gitops/argocd/` — Replace YOUR-ORG placeholder with actual org
- `infra/helm/ve-tenant/` — Add Redis to chart (currently only in ve-shared)
- `ve-tenant/templates/api.yaml` — Pass `REDIS_URL`, `VISTA_POOL_SIZE`, `VISTA_MAX_POOL_TOTAL`
- Verify `docker-compose.prod.yml` includes Redis
- Update `.env.example` with all new env vars

---

## Part C: Wire Gauntlet to CI/CD (Phase 12B)

**Files:** `.github/workflows/`

**Actions:**

1. Update `ci-pr-gates.yml` — Run `node qa/gauntlet/cli.mjs --suite fast` on every PR
2. Update `ci.yml` — Run `--suite rc` on push to main
3. Add `ci-gauntlet-full.yml` — Run `--suite full` nightly or on release branches
4. Post gauntlet results as PR comments (pass/fail per gate)
5. Block PR merge if any gate in fast suite fails

---

## Part D: Redis in docker-compose.prod.yml (Phase 12C)

**Actions:**

1. Add Redis service with persistence (AOF)
2. Wire `REDIS_URL` to API service
3. Add health check for Redis

---

## Files to Create/Modify

- `apps/api/src/platform/store-policy.ts`
- `infra/helm/ve-tenant/` — Chart updates
- `infra/gitops/argocd/` — Org placeholder fix
- `docker-compose.prod.yml` — Redis service
- `.github/workflows/ci-pr-gates.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/ci-gauntlet-full.yml` (new)
- `apps/api/.env.example`

---

## Key Patterns to Follow

1. **Store policy**: `getCriticalInMemoryStores()` filters by runtime mode; rc/prod returns [].
2. **Gauntlet exit code**: Non-zero on any gate failure so CI fails.
3. **Redis URL**: Format `redis://host:6379`; support password via `redis://:pass@host:6379`.

---

## Acceptance Criteria

- [ ] `getCriticalInMemoryStores()` returns 0 in rc/prod
- [ ] All migrated stores marked pg_backed or redis_cached
- [ ] Helm chart passes REDIS_URL and VistA pool vars
- [ ] docker-compose.prod.yml has Redis
- [ ] Gauntlet runs on every PR; blocks merge on failure
