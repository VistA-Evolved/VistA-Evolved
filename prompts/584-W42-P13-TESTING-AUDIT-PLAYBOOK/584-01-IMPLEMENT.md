# Phase 584 — W42-P13: Testing and Audit Playbook (Phase 10)

> Wave 42: Production Remediation | Position 13 of 15
> Depends on: Phases 572-583 (all prior remediation work)

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

Implement integration tests, auth flow verification, dead-click audit, security scan, performance budget, and contract alignment. Produce evidence artifacts for certification readiness.

---

## 10A: Integration Tests Against VistA Docker (VEHU)

**Location:** `apps/api/tests/integration/`

**Tests:**

1. Start VistA Docker (VEHU)
2. Login via XWB RPC with DUZ-per-request (verify different users get different DUZs)
3. Search for patients
4. Read allergies, vitals, meds, problems, labs, notes for a known patient
5. Add an allergy, verify it appears
6. Add a vital, verify it appears
7. Create a TIU note, verify it appears and is attributed to correct DUZ
8. Save an order, verify LOCK/UNLOCK cycle
9. Verify 362 formerly-stub routes return real data (or empty array, not "Not implemented")

---

## 10B: Store Durability Tests

For every store migrated to PG:

1. Write data
2. Restart the API
3. Verify data persists
4. Verify no data in in-memory Maps after restart

---

## 10C: Multi-Instance Tests

1. Start 2 API instances behind a load balancer
2. Write data on instance 1
3. Read data on instance 2
4. Verify consistency (Redis + PG)
5. Verify rate limiting works across instances

---

## 10D: Tenant Isolation Tests

1. Create 2 tenants
2. Write data for tenant A
3. Verify tenant B cannot see tenant A's data
4. Verify RLS on ALL tables in CANONICAL_RLS_TABLES
5. Attempt SQL injection of tenant context — verify blocked

---

## 10E: Auth Flow Verification (All 4 Paths)

1. VistA RPC auth: Login -> session -> DUZ -> RPC -> attribution
2. OIDC/Keycloak: OIDC flow -> callback -> session -> DUZ mapping
3. Portal auth: Patient login -> portal session -> DFN -> scoped access
4. Admin auth: Admin login -> role=admin -> admin routes
5. Service auth: X-Service-Key -> service routes

---

## 10F: Dead-Click Audit (UI Crawl)

**Playwright test:**

1. Log in as each role (provider, nurse, pharmacist, admin)
2. Navigate to every route (74 routes)
3. Click every button, open every dialog, submit every form
4. Capture integration-pending modals, console errors, 500 responses
5. Produce `evidence/dead-click-audit.json`

---

## 10G: Contract Alignment

**Produce:** `evidence/contract-alignment.json`

Cross-reference:

- `design/contracts/cprs/v1/rpc_catalog.json` (975 RPCs)
- `rpcRegistry.ts` (168+ RPCs)
- Working route call sites
- CPRS panel RPC usage vs Delphi extraction

---

## 10H: Security Scan Automation

**Produce:** `evidence/security-scan.json`

1. PHI leak audit (gauntlet G22)
2. Credential scan (pre-commit hook)
3. SQL injection on tenant context
4. XSS on user-supplied fields
5. Cookie secure flag in rc/prod
6. CSRF protection on mutation endpoints

---

## 10I: Performance Budget Verification

**Produce:** `evidence/performance-budget.json`

1. Read `config/performance-budgets.json`
2. Run k6 smoke tests
3. Verify p95 latency per endpoint
4. Flag any exceedances

---

## 10J: Route-to-RPC-to-VistA Mapping

**Produce:** `docs/vista-alignment/route-rpc-map.json`

- Every API route -> RPC(s) -> VistA globals
- Status: `live`, `wired`, `integration-pending`

---

## 10K: Update Gauntlet Gates

- G5 (API Smoke): Verify 362 formerly-stub routes return real responses
- G6 (VistA Probe): Probe all RPCs used by newly-wired routes
- G8 (UI Dead Click): Wire 10F audit results
- G17 (Store Policy): Verify no critical stores remain in_memory_only
- G20 (No New Stub Growth): Verify stub count is 0
- Wire full gauntlet to run on every PR via GitHub Actions

---

## Files to Create/Modify

- `apps/api/tests/integration/` — Integration test suites
- `tests/e2e/dead-click-audit.spec.ts` — Playwright dead-click audit
- `scripts/` — Security scan, contract alignment, performance scripts
- `evidence/` — All artifacts (gitignored)
- `.github/workflows/` — CI/CD wiring

---

## Acceptance Criteria

- [ ] Integration tests run against VEHU Docker
- [ ] Store durability tests pass for all migrated stores
- [ ] Dead-click audit produces evidence.json
- [ ] Security scan produces evidence.json
- [ ] Gauntlet gates updated and wired to CI
