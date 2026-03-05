# Phase 586 — W42-P15: Competitive Scaffolding + SaaS (Phase 13 + 14)

> Wave 42: Production Remediation | Position 15 of 15
> Depends on: Phases 572-585 (all prior remediation work)

---

## Objective

Build competitive feature frameworks (e-Prescribing, charge capture, bed management, ED track board) and SaaS readiness (tenant provisioning, Lago billing, load testing). These are integration scaffolds — plug in credentials/partners to go live.

---

## Part A: e-Prescribing Framework (Phase 13A)

**Location:** `apps/api/src/pharmacy/erx/`

**What to build:**

- NCPDP SCRIPT message builder/parser (wire format, not Surescripts connection)
- Message types: NewRx, RxRenewal, CancelRx, RxFill
- Adapter interface for Surescripts/WENO/DoseSpot
- Stub adapter that validates message structure without sending

**Files:**

- `apps/api/src/pharmacy/erx/message-builder.ts`
- `apps/api/src/pharmacy/erx/message-parser.ts`
- `apps/api/src/pharmacy/erx/adapter.ts` (interface)
- `apps/api/src/pharmacy/erx/stub-adapter.ts`

---

## Part B: Charge Capture Framework (Phase 13B)

**Location:** `apps/api/src/rcm/charge-capture/`

**What to build:**

- CPT/ICD-10 code entry linked to VistA encounter (ORWPCE)
- Charge rules engine (E&M level evaluation)
- Integration with existing claim creation pipeline

---

## Part C: Payment Posting Framework (Phase 13C)

**Location:** `apps/api/src/rcm/payments/`

**What to build:**

- ERA (835) auto-posting to VistA AR (when AR available)
- Manual payment entry
- A/R aging calculations

---

## Part D: Bed Management (Phase 13D)

**Location:** `apps/api/src/inpatient/bed-management.ts`

**What to build:**

- Uses ZVEADT.m ward/bed data (already working)
- Visual bed board with occupancy status
- Assign/transfer/discharge from bed view

---

## Part E: ED Track Board Framework (Phase 13E)

**Location:** `apps/api/src/service-lines/ed/track-board.ts`

**What to build:**

- Patient queue with triage level, arrival time, provider assignment
- Uses ORQPT WARD PATIENTS for ED location
- Uses ORQQVI VITALS for triage vitals

---

## Part F: Tenant Provisioning Pipeline (Phase 14A)

**API:** `POST /admin/tenants/provision`

**What to build:**

1. Create tenant record in PG (`tenant_config` table)
2. Run PG migrations for tenant-scoped tables (RLS auto-applies)
3. Seed module entitlements from chosen SKU
4. Seed default feature flags
5. Configure VistA connection (host/port)
6. Return tenant credentials and API endpoint
7. For Kubernetes: trigger Helm release for ve-tenant

---

## Part G: SaaS Billing (Lago Wiring) (Phase 14B)

**What to build:**

1. Create Lago customer on tenant provisioning
2. Emit metering events: API calls, active users, RPC calls, storage bytes
3. Wire `GET /admin/billing/usage` — current usage for tenant
4. Wire `GET /admin/billing/invoices` — invoice history
5. Support mock provider for dev; Lago for prod

---

## Part H: Load Testing (Phase 14C)

**Location:** `tests/k6/`

**Scenarios:**

1. `load-concurrent-users.js` — 50 concurrent users, mixed workflows
2. `load-rpc-throughput.js` — max RPC calls/second through pool
3. `load-multi-tenant.js` — 5 tenants, 10 users each, isolation under load
4. `load-write-heavy.js` — concurrent order saves, note creates, allergy adds
5. Pass/fail thresholds from `config/performance-budgets.json`

---

## Part I: OIDC End-to-End Test (Phase 14D)

1. Start Keycloak Docker
2. Create test user with DUZ mapping
3. Perform OIDC authorization code flow
4. Verify session with correct DUZ
5. Call VistA RPC with OIDC-derived session
6. Verify RPC executes under correct DUZ (not system DUZ)

---

## Files to Create/Modify

- `apps/api/src/pharmacy/erx/` — e-Prescribing module
- `apps/api/src/rcm/charge-capture/` — Charge capture
- `apps/api/src/rcm/payments/` — Payment posting expansion
- `apps/api/src/inpatient/bed-management.ts`
- `apps/api/src/service-lines/ed/track-board.ts`
- `apps/api/src/routes/tenant-provisioning.ts`
- `apps/api/src/billing/` — Lago wiring
- `tests/k6/load-*.js` — Load scenarios

---

## Key Patterns to Follow

1. **Scaffold, not production**: e-Rx framework ready for Surescripts cert; no actual transmission.
2. **Adapter pattern**: Each external system (Surescripts, Lago) has adapter interface + stub.
3. **Tenant provisioning**: Idempotent; support both API and GitOps-triggered flows.

---

## Acceptance Criteria

- [ ] e-Prescribing NCPDP message builder/parser exists
- [ ] Charge capture linked to ORWPCE
- [ ] Bed management uses ZVEADT/ORQPT data
- [ ] ED track board scaffold exists
- [ ] POST /admin/tenants/provision works
- [ ] Lago metering events emitted (or mock)
- [ ] 4+ k6 load scenarios exist
- [ ] OIDC e2e test exists (optional)
