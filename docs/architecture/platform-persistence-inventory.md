# Platform Persistence Inventory

> **Phase 101 v2 — generated 2026-02-23**
>
> Comprehensive audit of every runtime persistence mechanism in VistA-Evolved.
> Used to plan migration to the Postgres-first platform data layer.

---

## 1. Durable Database — SQLite (better-sqlite3 + Drizzle ORM)

| #   | File                                             | Table(s)                                                                   | Data Domain                                          | Phase   | Risk                                  | Target Store     |
| --- | ------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------- | ------- | ------------------------------------- | ---------------- |
| 1   | `apps/api/src/platform/db/db.ts`                 | — (connection singleton)                                                   | Platform DB singleton                                | 95B     | Low                                   | **Postgres**     |
| 2   | `apps/api/src/platform/db/schema.ts`             | 16 tables (A–P)                                                            | Payer registry, denials, reconciliation, eligibility | 95B–100 | **High** — single-file DB on local FS | **Postgres**     |
| 3   | `apps/api/src/platform/db/migrate.ts`            | DDL migration runner                                                       | All platform tables                                  | 95B     | Med                                   | Postgres migrate |
| 4   | `apps/api/src/platform/db/seed.ts`               | seed payer table                                                           | Payer seed data                                      | 95B     | Low                                   | Postgres seed    |
| 5   | `apps/api/src/platform/db/repo/*.ts`             | payer, tenant-payer, task, evidence, capability, audit repos               | CRUD layer                                           | 95B     | Med                                   | Postgres repos   |
| 6   | `apps/api/src/rcm/denials/denial-store.ts`       | denial_case, denial_action, denial_attachment, resubmission_attempt        | RCM denials                                          | 98      | Med                                   | **Postgres**     |
| 7   | `apps/api/src/rcm/reconciliation/recon-store.ts` | remittance_import, payment_record, reconciliation_match, underpayment_case | RCM reconciliation                                   | 99      | Med                                   | **Postgres**     |
| 8   | `apps/api/src/rcm/eligibility/store.ts`          | eligibility_check, claim_status_check                                      | Eligibility + polling                                | 100     | Med                                   | **Postgres**     |

**DB Packages**: `better-sqlite3` ^12.6.2, `drizzle-orm` ^0.45.1, `drizzle-kit` ^0.31.9.
No Postgres client package yet.

---

## 2. JSONL Append-Only Audit Trails (Durable File)

| #   | File                                       | Output Path                   | Data Domain             | Hash-Chained  | Max Size     |
| --- | ------------------------------------------ | ----------------------------- | ----------------------- | ------------- | ------------ |
| 1   | `apps/api/src/lib/immutable-audit.ts`      | `logs/immutable-audit.jsonl`  | General immutable audit | Yes (SHA-256) | 10K ring     |
| 2   | `apps/api/src/lib/audit.ts`                | `logs/audit.jsonl`            | General audit events    | No            | Unbounded    |
| 3   | `apps/api/src/services/imaging-audit.ts`   | Configurable (default off)    | Imaging audit           | Yes (SHA-256) | 10K ring     |
| 4   | `apps/api/src/services/analytics-store.ts` | `data/analytics-events.jsonl` | Analytics events        | No            | Configurable |
| 5   | `apps/api/src/rcm/payers/payer-audit.ts`   | `logs/payer-audit.jsonl`      | Payer registry audit    | Yes (SHA-256) | 10K ring     |

**Recommendation**: Audit trails should dual-write to both JSONL (compliance
archive) AND the Postgres `platform_audit_event` table. The JSONL files serve
as tamper-evident backups; Postgres serves queryable, indexed access.

---

## 3. JSON File Read/Write (Runtime Filesystem)

| #   | File                                 | Path(s)                                                             | R/W | Data Domain                        | Risk                                | Target                                     |
| --- | ------------------------------------ | ------------------------------------------------------------------- | --- | ---------------------------------- | ----------------------------------- | ------------------------------------------ |
| 1   | `rcm/payers/payer-persistence.ts`    | `data/payers/registry-db.json`, `data/payers/tenant-overrides.json` | R+W | Payer registry persistence         | **High** — file corruption on crash | **Postgres** (payer + tenant_payer tables) |
| 2   | `rcm/payerOps/ingest.ts`             | `data/regulator-snapshots/*.json`                                   | R+W | Regulator snapshots                | Med                                 | **Object storage** (or Postgres JSONB)     |
| 3   | `rcm/edi/x12-serializer.ts`          | `data/rcm-exports/*.x12`                                            | W   | EDI claim exports                  | Low — write-only artifacts          | **Object storage** (keep as-is for now)    |
| 4   | `platform/payers/evidence-ingest.ts` | `data/evidence/*`                                                   | W   | Evidence file uploads              | Med                                 | **Object storage**                         |
| 5   | `rcm/payer-registry/registry.ts`     | `data/payers/us_core.json`, `ph_hmos.json`, etc.                    | R   | Payer seed data (read at startup)  | Low — fixture only                  | **Fixture** (keep as-is)                   |
| 6   | `rcm/payers/ph-hmo-registry.ts`      | `data/payers/ph-hmo-registry.json`                                  | R   | PH HMO registry (read at startup)  | Low — fixture only                  | **Fixture** (keep as-is)                   |
| 7   | `rcm/payers/payer-rulepacks.ts`      | `data/payers/ph-hmo-rulepacks.json`                                 | R   | Payer rule packs (read at startup) | Low — fixture only                  | **Fixture** (keep as-is)                   |
| 8   | `routes/vista-rcm.ts`                | `data/vista/capability-map-billing.json`                            | R   | VistA billing capability map       | Low — fixture only                  | **Fixture** (keep as-is)                   |

---

## 4. In-Memory Maps — Domain Stores (Volatile, Reset on Restart)

### 4a. Session / Auth (volatile is acceptable)

| #   | File                                  | Variable                          | Data Domain                     | Target                                    |
| --- | ------------------------------------- | --------------------------------- | ------------------------------- | ----------------------------------------- |
| 1   | `auth/session-store.ts`               | `sessions`                        | Clinician sessions              | **Postgres** (session table) or **Redis** |
| 2   | `routes/portal-auth.ts`               | `portalSessions`, `loginAttempts` | Portal sessions + rate-limit    | **Postgres** or Redis                     |
| 3   | `portal-iam/portal-iam-routes.ts`     | `iamSessions`, `authAttempts`     | Portal IAM sessions             | **Postgres** or Redis                     |
| 4   | `auth/biometric/passkeys-provider.ts` | `pendingChallenges`               | WebAuthn challenges (5-min TTL) | **In-memory** (keep — ephemeral)          |
| 5   | `auth/jwt-validator.ts`               | `jwksCache`                       | JWKS key cache (10-min TTL)     | **In-memory** (keep — cache)              |

### 4b. RCM Domain Stores (HIGH priority for Postgres)

| #   | File                                            | Variable                                 | Data Domain                              | Target                         |
| --- | ----------------------------------------------- | ---------------------------------------- | ---------------------------------------- | ------------------------------ |
| 6   | `rcm/domain/claim-store.ts`                     | `claims`, `remittances`                  | **RCM claims & remittances**             | **Postgres**                   |
| 7   | `rcm/loa/loa-store.ts`                          | `loaStore`, `tenantLoaIndex`             | **LOA requests**                         | **Postgres**                   |
| 8   | `rcm/edi/pipeline.ts`                           | `pipelineEntries`, `claimIndex`          | **EDI pipeline** (10-stage)              | **Postgres**                   |
| 9   | `rcm/transactions/envelope.ts`                  | `transactionStore` etc.                  | **EDI transactions**                     | **Postgres**                   |
| 10  | `rcm/workflows/claims-workflow.ts`              | `denialStore`                            | Claims workflow denials (legacy)         | **Postgres**                   |
| 11  | `rcm/workflows/remittance-intake.ts`            | `remitDocStore`                          | Remittance documents                     | **Postgres**                   |
| 12  | `rcm/payments/payment-store.ts`                 | 6 Maps + indexes                         | **Payment posting**                      | **Postgres**                   |
| 13  | `rcm/workqueues/workqueue-store.ts`             | `items`, `claimIndex`                    | **Work queue items**                     | **Postgres**                   |
| 14  | `rcm/rules/payer-rules.ts`                      | `rules`, `payerIndex`                    | Payer rules                              | **Postgres**                   |
| 15  | `rcm/connectors/sandbox-connector.ts`           | `this.submissions`                       | Sandbox submission state                 | **In-memory** (keep — sandbox) |
| 16  | `rcm/connectors/portal-batch-connector.ts`      | `this.batches`                           | Batch upload state                       | **Postgres**                   |
| 17  | `rcm/connectors/philhealth-connector.ts`        | `this.submissions`                       | PhilHealth submissions                   | **Postgres**                   |
| 18  | `rcm/connectors/connector-state.ts`             | `probeCache`                             | Health probe cache                       | **In-memory** (keep — cache)   |
| 19  | `rcm/connectors/connector-resilience.ts`        | `breakers`                               | Circuit breakers                         | **In-memory** (keep — runtime) |
| 20  | `rcm/payerOps/store.ts`                         | `enrollments`, `loaCases`, `credentials` | **Payer enrollments + credential vault** | **Postgres**                   |
| 21  | `rcm/payerOps/registry-store.ts`                | `sources`, `payers`, `relationships`     | Payer registry ops                       | **Postgres**                   |
| 22  | `rcm/payerOps/philhealth-store.ts`              | `claimDrafts`, `facilitySetups`          | **PhilHealth claim drafts**              | **Postgres**                   |
| 23  | `rcm/payerOps/capability-matrix.ts`             | `matrix`                                 | Payer capability matrix                  | **Postgres**                   |
| 24  | `rcm/hmo-portal/submission-tracker.ts`          | `submissions`                            | HMO submission tracking                  | **Postgres**                   |
| 25  | `rcm/philhealth-eclaims3/submission-tracker.ts` | 3 Maps                                   | eClaims3 submission tracking             | **Postgres**                   |

### 4c. Imaging / Clinical Support (medium priority)

| #   | File                           | Variable                          | Data Domain           | Target       |
| --- | ------------------------------ | --------------------------------- | --------------------- | ------------ |
| 26  | `services/imaging-worklist.ts` | `worklistStore`                   | Imaging worklist      | **Postgres** |
| 27  | `services/imaging-ingest.ts`   | `linkageStore`, `unmatchedStore`  | Imaging ingest        | **Postgres** |
| 28  | `services/imaging-devices.ts`  | `deviceStore`, `aeTitleIndex`     | DICOM device registry | **Postgres** |
| 29  | `services/imaging-authz.ts`    | `breakGlassStore`, `expiryTimers` | Break-glass sessions  | **Postgres** |

### 4d. Portal / Patient-Facing (medium priority)

| #   | File                              | Variable                    | Data Domain            | Target       |
| --- | --------------------------------- | --------------------------- | ---------------------- | ------------ |
| 30  | `portal-iam/portal-user-store.ts` | `users`, `usersByUsername`  | Portal users           | **Postgres** |
| 31  | `portal-iam/proxy-store.ts`       | `invitations`               | Proxy invitations      | **Postgres** |
| 32  | `portal-iam/access-log-store.ts`  | `accessLogs`                | Portal access logs     | **Postgres** |
| 33  | `services/portal-messaging.ts`    | `messageStore`              | Portal messages        | **Postgres** |
| 34  | `services/portal-appointments.ts` | `appointmentStore`          | Portal appointments    | **Postgres** |
| 35  | `services/portal-refills.ts`      | `refillStore`               | Portal refill requests | **Postgres** |
| 36  | `services/portal-tasks.ts`        | `taskStore`                 | Portal tasks           | **Postgres** |
| 37  | `services/portal-settings.ts`     | `settingsStore`             | Portal user settings   | **Postgres** |
| 38  | `services/portal-sensitivity.ts`  | `proxyStore`, `policyStore` | Proxy + sensitivity    | **Postgres** |
| 39  | `services/portal-sharing.ts`      | `shareStore`, `tokenIndex`  | Share links            | **Postgres** |

### 4e. Other Platform Stores

| #   | File                                   | Variable                       | Data Domain               | Target                       |
| --- | -------------------------------------- | ------------------------------ | ------------------------- | ---------------------------- |
| 40  | `telehealth/room-store.ts`             | `rooms`                        | Telehealth rooms (4h TTL) | **Postgres** or Redis        |
| 41  | `services/record-portability-store.ts` | `exportStore`, `shareStore`    | Record exports + shares   | **Postgres**                 |
| 42  | `routes/write-backs.ts`                | `drafts`                       | Note drafts               | **Postgres**                 |
| 43  | `routes/handoff/handoff-store.ts`      | `handoffStore`                 | Shift handoff reports     | **Postgres**                 |
| 44  | `migration/migration-store.ts`         | `jobStore`, `templateStore`    | Migration jobs            | **Postgres**                 |
| 45  | `adapters/scheduling/vista-adapter.ts` | `requestStore`, `bookingLocks` | Scheduling wait-list      | **Postgres**                 |
| 46  | `services/ui-prefs-store.ts`           | `store`                        | UI preferences            | **Postgres**                 |
| 47  | `services/secure-messaging.ts`         | `fallbackCache`                | Secure messaging fallback | **In-memory** (keep — cache) |

### 4f. Registries / Caches (keep in-memory)

| #   | File                                  | Variable             | Data Domain                | Target                             |
| --- | ------------------------------------- | -------------------- | -------------------------- | ---------------------------------- |
| 48  | `rcm/connectors/types.ts`             | `connectors`         | Connector registry         | **In-memory** (keep — code config) |
| 49  | `rcm/transactions/translator.ts`      | `translators`        | Translator registry        | **In-memory** (keep — code config) |
| 50  | `rcm/reconciliation/edi835-parser.ts` | `parsers`            | Parser registry            | **In-memory** (keep — code config) |
| 51  | `rcm/payments/export-bridge.ts`       | `bridges`            | Export format bridges      | **In-memory** (keep — code config) |
| 52  | `adapters/adapter-loader.ts`          | `adapters`           | Adapter registry           | **In-memory** (keep — code config) |
| 53  | `modules/module-registry.ts`          | `compiledPatterns`   | Module route patterns      | **In-memory** (keep — code config) |
| 54  | `config/tenant-config.ts`             | `tenants`            | Tenant configs             | **Postgres** (in Phase 101+)       |
| 55  | `config/marketplace-tenant.ts`        | `tenantConfigs`      | Marketplace tenant configs | **Postgres** (in Phase 101+)       |
| 56  | `config/imaging-tenant.ts`            | `tenantConfigs`      | Imaging tenant configs     | **Postgres** (in Phase 101+)       |
| 57  | `config/integration-registry.ts`      | `registryStore`      | Integration registry       | **Postgres** (in Phase 101+)       |
| 58  | `qa/flow-catalog.ts`                  | `catalog`, `results` | QA flow catalog            | **Postgres** (if QA persisted)     |

---

## 5. In-Memory Audit Ring Buffers (Volatile, File-Backed)

| #   | File                               | Variable            | Domain                  | In-Memory Max | File Backup                   |
| --- | ---------------------------------- | ------------------- | ----------------------- | ------------- | ----------------------------- |
| 1   | `lib/immutable-audit.ts`           | `auditRing`         | General immutable audit | 10K           | `logs/immutable-audit.jsonl`  |
| 2   | `lib/audit.ts`                     | `auditStore`        | General audit events    | Unbounded     | `logs/audit.jsonl`            |
| 3   | `services/imaging-audit.ts`        | `auditChain`        | Imaging audit           | 10K           | Configurable                  |
| 4   | `rcm/audit/rcm-audit.ts`           | `entries`           | RCM audit               | 20K           | None (in-memory only)         |
| 5   | `rcm/payers/payer-audit.ts`        | `auditRing`         | Payer registry audit    | 10K           | `logs/payer-audit.jsonl`      |
| 6   | `services/analytics-store.ts`      | `eventBuffer`       | Analytics events        | Configurable  | `data/analytics-events.jsonl` |
| 7   | `services/analytics-aggregator.ts` | `hourlyBuckets` etc | Analytics aggregation   | Unbounded     | None                          |
| 8   | `services/portal-audit.ts`         | `store`             | Portal audit            | Unbounded     | None                          |

**Recommendation**: All audit buffers should be backed by the Postgres
`platform_audit_event` table as the primary store. Keep in-memory ring
buffers as a fast read cache, and JSONL as compliance archive.

---

## 6. Summary Statistics

| Category                                 | Count        | Current            | Target                              |
| ---------------------------------------- | ------------ | ------------------ | ----------------------------------- |
| SQLite tables                            | 16           | `data/platform.db` | **Postgres**                        |
| In-memory Map stores (domain data)       | ~47 writable | Volatile           | **Postgres** (phased migration)     |
| In-memory Map stores (caches/registries) | ~11          | Volatile           | Keep in-memory                      |
| JSONL audit sinks                        | 5            | File system        | Dual-write to Postgres + keep files |
| JSON file persistence (R+W)              | 2            | File system        | **Postgres**                        |
| JSON fixture files (read-only)           | 6            | File system        | Keep as fixtures                    |
| Filesystem write dirs                    | ~10          | `data/` + `logs/`  | Object storage (future)             |

---

## 7. Migration Priority

### Wave 1 (Phase 101 — this phase)

- Platform DB singleton (SQLite → Postgres driver swap)
- Existing 16 Drizzle tables → Postgres DDL
- Core platform tables: `platform_audit_event`, `idempotency_key`, `outbox_event`
- Tenant safety guardrails (`tenant_id` + RLS)

### Wave 2 (Phase 102 — next)

- Session store → Postgres (or Redis)
- Portal user store → Postgres
- RCM claim store → Postgres

### Wave 3 (Phase 103+)

- Remaining in-memory domain stores → Postgres
- Audit dual-write (JSONL + Postgres)
- Object storage for evidence / EDI exports
