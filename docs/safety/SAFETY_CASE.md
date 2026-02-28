# VistA-Evolved — Safety Case

> **Document Version**: 1.0 — Phase 266
> **Classification**: Safety-Critical Documentation
> **Last Updated**: 2026-02-28
> **Owner**: Engineering Lead
> **Review Cadence**: Every release candidate

---

## 1. Purpose

This document is the **living safety case** for VistA-Evolved. It enumerates
clinical hazards, maps each to one or more controls, and traces controls to
automated tests, monitors, and runbooks. A deployment may only proceed when
**all referenced controls are verified**.

---

## 2. Scope

| Boundary | In Scope | Out of Scope |
|----------|----------|--------------|
| Clinical data | Patient demographics, allergies, meds, notes, vitals, orders, problems | Raw DICOM pixel data (handled by Orthanc) |
| Write operations | Add allergy, add vitals, add note, sign order, TIU sign, CPOE | Direct MUMPS global writes |
| Identity | Patient DFN, provider DUZ, session auth, RBAC | Physical badge access |
| Connectivity | XWB RPC Broker, FHIR R4, HL7v2 pipeline | External payer real-time submission |

---

## 3. Hazard Register

### H-001: Wrong-Patient Data Display

| Attribute | Value |
|-----------|-------|
| **Severity** | Critical |
| **Likelihood** | Low (with controls) |
| **Description** | Clinician views data for Patient A while intending Patient B |
| **Root Causes** | Stale cache, DFN mismatch in URL params, session race |
| **Controls** | C-001, C-002, C-010 |
| **Tests** | T-001, T-002, T-014 |
| **Monitors** | M-001 |
| **Runbooks** | RB-001 |

### H-002: Data Corruption — Partial Write

| Attribute | Value |
|-----------|-------|
| **Severity** | Critical |
| **Likelihood** | Low |
| **Description** | An order or note is partially written to VistA (e.g., lock acquired but write fails) |
| **Root Causes** | Network timeout mid-RPC, socket half-open, VistA crash during write |
| **Controls** | C-003, C-004, C-005 |
| **Tests** | T-003, T-004 |
| **Monitors** | M-002 |
| **Runbooks** | RB-002 |

### H-003: Stale Clinical Cache

| Attribute | Value |
|-----------|-------|
| **Severity** | High |
| **Likelihood** | Medium |
| **Description** | Cached RPC response shows outdated allergies, meds, or vitals |
| **Root Causes** | TTL too long, cache not invalidated after write, multi-instance cache divergence |
| **Controls** | C-006, C-007 |
| **Tests** | T-005, T-006 |
| **Monitors** | M-003 |
| **Runbooks** | RB-003 |

### H-004: Audit Gap — Unlogged Clinical Action

| Attribute | Value |
|-----------|-------|
| **Severity** | High |
| **Likelihood** | Low |
| **Description** | A clinical write or break-glass event is not recorded in the audit trail |
| **Root Causes** | Audit middleware bypass, hash-chain break, log file rotation gap |
| **Controls** | C-008, C-009 |
| **Tests** | T-007, T-008 |
| **Monitors** | M-004 |
| **Runbooks** | RB-004 |

### H-005: Privilege Escalation

| Attribute | Value |
|-----------|-------|
| **Severity** | Critical |
| **Likelihood** | Low |
| **Description** | Non-admin user accesses admin routes or impersonates another provider |
| **Root Causes** | Missing RBAC check, session fixation, CSRF bypass, WebSocket RPC injection |
| **Controls** | C-010, C-011, C-012 |
| **Tests** | T-009, T-010 |
| **Monitors** | M-005 |
| **Runbooks** | RB-005 |

### H-006: PHI Leak in Logs / Analytics

| Attribute | Value |
|-----------|-------|
| **Severity** | Critical |
| **Likelihood** | Medium (without controls) |
| **Description** | Patient SSN, name, DOB, or DFN appears in application logs, analytics events, or error responses |
| **Root Causes** | Unredacted log payload, raw error stack in response, DFN in analytics tag |
| **Controls** | C-013, C-014, C-015 |
| **Tests** | T-011, T-012, T-013 |
| **Monitors** | M-006 |
| **Runbooks** | RB-006 |

### H-007: RPC Protocol Regression

| Attribute | Value |
|-----------|-------|
| **Severity** | High |
| **Likelihood** | Medium |
| **Description** | Change to XWB byte framing, cipher pads, or parameter encoding breaks VistA communication |
| **Root Causes** | Refactoring rpcBrokerClient.ts, dependency update, encoding changes |
| **Controls** | C-016, C-017 |
| **Tests** | T-014, T-015 |
| **Monitors** | M-007 |
| **Runbooks** | RB-007 |

### H-008: Order Sign Without Electronic Signature

| Attribute | Value |
|-----------|-------|
| **Severity** | Critical |
| **Likelihood** | Low |
| **Description** | An order transitions to "signed" state without valid esCode verification |
| **Root Causes** | Missing esCode validation, RPC call skipped, fake success response |
| **Controls** | C-018, C-019 |
| **Tests** | T-016 |
| **Monitors** | M-008 |
| **Runbooks** | RB-008 |

### H-009: Tenant Data Cross-Contamination

| Attribute | Value |
|-----------|-------|
| **Severity** | Critical |
| **Likelihood** | Low |
| **Description** | Tenant A's data visible to Tenant B due to missing RLS or cache key collision |
| **Root Causes** | RLS not enforced, SET LOCAL not called, shared cache without tenant prefix |
| **Controls** | C-020, C-021 |
| **Tests** | T-017, T-018 |
| **Monitors** | M-009 |
| **Runbooks** | RB-009 |

### H-010: Backup / Restore Failure

| Attribute | Value |
|-----------|-------|
| **Severity** | High |
| **Likelihood** | Medium |
| **Description** | Backup is corrupt, incomplete, or restore fails silently |
| **Root Causes** | WAL not flushed, Docker volume not backed up, pg_dump interrupted |
| **Controls** | C-022, C-023 |
| **Tests** | T-019, T-020 |
| **Monitors** | M-010 |
| **Runbooks** | RB-010 |

---

## 4. Controls Register

| ID | Control | Type | Implementation |
|----|---------|------|----------------|
| C-001 | Patient identity in every API response | Technical | All clinical endpoints include `dfn` in response; UI verifies DFN match |
| C-002 | Session-scoped patient context | Technical | Session store tracks active patient DFN; validated on each request |
| C-003 | ORWDX LOCK/UNLOCK gating | Technical | All order writes acquire LOCK before, UNLOCK after (BUG-029) |
| C-004 | Circuit breaker on RPC broker | Technical | `safeCallRpc` with 5-failure threshold, 30s half-open (rpc-resilience.ts) |
| C-005 | Idempotency keys on all writes | Technical | DB-backed idempotency middleware (Phase 154) with 24h TTL |
| C-006 | Short TTL on clinical caches | Technical | Clinical report cache 30s TTL (CLINICAL_REPORT_CACHE_TTL_MS) |
| C-007 | Cache invalidation after write | Technical | Write endpoints clear relevant cache keys before returning |
| C-008 | Hash-chained immutable audit | Technical | SHA-256 chain in immutable-audit.ts, imaging-audit.ts, rcm-audit.ts |
| C-009 | Audit chain verification endpoint | Technical | `GET /iam/audit/verify` + `GET /imaging/audit/verify` + `GET /rcm/audit/verify` |
| C-010 | RBAC policy engine | Technical | `evaluatePolicy()` in policy-engine.ts, default-deny, ~40 actions |
| C-011 | CSRF synchronizer token | Technical | Session-bound CSRF secret (Phase 132), validated on mutations |
| C-012 | WebSocket RPC blocklist | Technical | `/ws/console` blocks XUS AV CODE, XUS SET VISITOR |
| C-013 | PHI field redaction in logs | Technical | `redactPhi()` in phi-redaction.ts, 24 PHI fields, 7 inline patterns |
| C-014 | Audit detail sanitization | Technical | `sanitizeAuditDetail()` strips PHI before hash-chain storage |
| C-015 | Analytics PHI-free design | Technical | AnalyticsEvent schema structurally lacks DFN; userId is SHA-256 hashed |
| C-016 | RPC contract replay tests | Technical | `rpc-contract-replay.test.ts` validates fixtures against schema |
| C-017 | Golden trace validation | Technical | `rpc-trace-replay.test.ts` validates workflow sequences |
| C-018 | esCode hash-only storage | Technical | `hashEsCode()` SHA-256 truncated to 16 hex chars (Phase 154) |
| C-019 | Sign endpoint blockers | Technical | Missing esCode returns `sign-blocked` status, never fake success |
| C-020 | Row-Level Security (RLS) | Technical | `applyRlsPolicies()` covers 21+ tables with ENABLE + FORCE RLS |
| C-021 | Tenant-scoped SET LOCAL | Technical | `SET LOCAL app.current_tenant_id` per transaction |
| C-022 | Automated backup script | Technical | `scripts/backup-restore.mjs` — SQLite + PG + audit JSONL |
| C-023 | DR restore verification | Technical | `scripts/dr/restore-verify.mjs` — 5 durability probes |

---

## 5. Test Mapping

| ID | Test | Validates Controls | Type | Location |
|----|------|--------------------|------|----------|
| T-001 | Patient identity consistency | C-001, C-002 | Unit | `apps/api/tests/invariants/` |
| T-002 | DFN mismatch detection | C-001 | Unit | `apps/api/tests/invariants/` |
| T-003 | LOCK/UNLOCK ordering | C-003 | Contract | `apps/api/tests/rpc-contract-replay.test.ts` |
| T-004 | Circuit breaker trip/recovery | C-004 | Unit | `apps/api/tests/resilience-certification.test.ts` |
| T-005 | Cache TTL expiry | C-006 | Unit | `apps/api/tests/clinical-cache.test.ts` |
| T-006 | Write-through invalidation | C-007 | Integration | Manual / E2E |
| T-007 | Audit chain integrity | C-008 | Unit | `apps/api/tests/audit-chain.test.ts` |
| T-008 | Audit chain verification API | C-009 | Integration | `GET /iam/audit/verify` |
| T-009 | RBAC deny unauthorized | C-010 | Unit | `apps/api/tests/policy-engine.test.ts` |
| T-010 | CSRF rejection on missing token | C-011 | Unit | `apps/api/tests/csrf.test.ts` |
| T-011 | PHI redaction coverage | C-013 | Unit | `apps/api/tests/phi-redaction.test.ts` |
| T-012 | Audit sanitization | C-014 | Unit | `apps/api/tests/phi-redaction.test.ts` |
| T-013 | Analytics PHI-free | C-015 | Unit | `apps/api/tests/analytics-phi.test.ts` |
| T-014 | RPC contract replay | C-016, C-001 | Contract | `apps/api/tests/rpc-contract-replay.test.ts` |
| T-015 | Golden trace stability | C-017 | Contract | `apps/api/tests/rpc-trace-replay.test.ts` |
| T-016 | Sign with/without esCode | C-018, C-019 | Unit | `apps/api/tests/cpoe-sign.test.ts` |
| T-017 | RLS enforcement | C-020 | Unit | `apps/api/tests/rls-cross-reference.test.ts` |
| T-018 | Tenant isolation | C-021 | Unit | `apps/api/tests/tenant-isolation.test.ts` |
| T-019 | Backup integrity | C-022 | Script | `scripts/backup-restore.mjs status` |
| T-020 | Restore verification | C-023 | Script | `scripts/dr/restore-verify.mjs` |

---

## 6. Monitor Mapping

| ID | Monitor | Hazard | Implementation |
|----|---------|--------|----------------|
| M-001 | Patient context mismatch alert | H-001 | Structured log + Prometheus counter `vista_patient_mismatch_total` |
| M-002 | Write failure rate | H-002 | Circuit breaker metrics + `vista_rpc_errors_total{operation="write"}` |
| M-003 | Cache hit/miss ratio | H-003 | `vista_cache_hit_ratio` gauge |
| M-004 | Audit chain break alert | H-004 | `GET /iam/audit/verify` periodic probe |
| M-005 | Unauthorized access attempts | H-005 | `http_requests_total{status="403"}` counter |
| M-006 | PHI leak scan CI gate | H-006 | `scripts/phi-leak-scan.mjs` in CI |
| M-007 | RPC timeout/disconnect rate | H-007 | `vista_rpc_duration_seconds` histogram, circuit breaker state |
| M-008 | Unsigned order detection | H-008 | Periodic query for orders in `unsigned` state >1h |
| M-009 | Cross-tenant query probe | H-009 | `/posture/tenant` RLS verification |
| M-010 | Backup age alert | H-010 | `backup_last_success_timestamp` gauge |

---

## 7. Runbook Mapping

| ID | Runbook | Hazard | Location |
|----|---------|--------|----------|
| RB-001 | Wrong patient incident | H-001 | `docs/runbooks/incident-response.md` |
| RB-002 | Partial write recovery | H-002 | `docs/runbooks/vista-connectivity.md` |
| RB-003 | Cache invalidation | H-003 | `docs/runbooks/performance-tuning.md` |
| RB-004 | Audit chain repair | H-004 | `docs/runbooks/audit-integrity.md` |
| RB-005 | Privilege escalation response | H-005 | `docs/runbooks/incident-response.md` §4 |
| RB-006 | PHI leak response | H-006 | `docs/runbooks/log-redaction-policy.md` |
| RB-007 | RPC protocol regression | H-007 | `docs/runbooks/vista-connectivity.md` |
| RB-008 | Unsigned order escalation | H-008 | `docs/runbooks/phase154-cpoe-signing.md` (implied) |
| RB-009 | Tenant data breach response | H-009 | `docs/runbooks/phase122-tenant-isolation.md` |
| RB-010 | Backup/restore failure | H-010 | `docs/runbooks/disaster-recovery.md` |

---

## 8. Evidence Artifacts

Each deployment must produce evidence that controls are active:

| Artifact | Frequency | Source |
|----------|-----------|--------|
| RPC contract report JSON | Every CI run | `pnpm qa:api` → rpc-contract-replay |
| Audit chain verification | Every CI run | `GET /iam/audit/verify` |
| PHI leak scan | Every CI run | `scripts/phi-leak-scan.mjs` |
| DR restore proof | Nightly / pre-release | `scripts/dr/restore-verify.mjs` |
| SAT suite results | Pre-release | `pnpm qa:gauntlet:rc` |
| Security dependency scan | Every CI run | `pnpm audit` |
| Release smoke test | Pre-deploy | `pnpm qa:smoke` |
| Tenant isolation proof | Every CI run | `rls-cross-reference.test.ts` |

---

## 9. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-28 | Phase 266 | Initial safety case |
