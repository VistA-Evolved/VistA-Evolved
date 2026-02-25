/**
 * Repository Barrel Export
 *
 * Phase 95B: Platform Persistence Unification
 * Phase 109: Module Entitlements
 * Phase 114: Durability Wave 1 (sessions + workqueues)
 * Phase 115: Durability Wave 2 (portal/telehealth/imaging/idempotency)
 * Phase 121: Durability Wave 3 (claims/access-log/scheduling)
 * Phase 122: Tenant isolation guards
 */

export * as payerRepo from "./payer-repo.js";
export * as tenantPayerRepo from "./tenant-payer-repo.js";
export * as capabilityRepo from "./capability-repo.js";
export * as taskRepo from "./task-repo.js";
export * as evidenceRepo from "./evidence-repo.js";
export * as auditRepo from "./audit-repo.js";
export * as moduleRepo from "./module-repo.js";
export * as sessionRepo from "./session-repo.js";
export * as workqueueRepo from "./workqueue-repo.js";
export * as portalMessageRepo from "./portal-message-repo.js";
export * as portalAppointmentRepo from "./portal-appointment-repo.js";
export * as telehealthRoomRepo from "./telehealth-room-repo.js";
export * as imagingWorklistRepo from "./imaging-worklist-repo.js";
export * as imagingIngestRepo from "./imaging-ingest-repo.js";
export * as idempotencyRepo from "./idempotency-repo.js";
export * as rcmClaimRepo from "./rcm-claim-repo.js";
export * as rcmClaimCaseRepo from "./rcm-claim-case-repo.js";
export * as accessLogRepo from "./access-log-repo.js";
export * as schedulingRequestRepo from "./scheduling-request-repo.js";
export * as tenantScopedQueries from "./tenant-scoped-queries.js";
export { requireTenantId, assertTenantMatch, TenantIsolationError, TENANT_SCOPED_TABLES, GLOBAL_TABLES, PENDING_TENANT_ID_TABLES } from "./tenant-guard.js";
