/**
 * PG Repository Barrel Export
 *
 * Phase 102: Migrate Prototype Stores to PlatformStore
 * Phase 117: Session + Workqueue repos for multi-instance
 * Phase 126: RCM durability (claims, claim cases, EDI acks, EDI pipeline)
 * Phase 127: Portal + telehealth durability (messages, access logs, settings, rooms, events)
 */

export * as pgPayerRepo from './payer-repo.js';
export * as pgTenantPayerRepo from './tenant-payer-repo.js';
export * as pgCapabilityRepo from './capability-repo.js';
export * as pgTaskRepo from './task-repo.js';
export * as pgEvidenceRepo from './evidence-repo.js';
export * as pgAuditRepo from './audit-repo.js';
export * as pgCapabilityMatrixRepo from './capability-matrix-repo.js';
export * as pgIdempotencyRepo from './idempotency-repo.js';
export * as pgSessionRepo from './session-repo.js';
export * as pgWorkqueueRepo from './workqueue-repo.js';
export * as pgRcmClaimRepo from './rcm-claim-repo.js';
export * as pgRcmClaimCaseRepo from './rcm-claim-case-repo.js';
export * as pgEdiAckRepo from './edi-ack-repo.js';
export * as pgEdiPipelineRepo from './edi-pipeline-repo.js';
export * as pgPortalMessageRepo from './pg-portal-message-repo.js';
export * as pgPortalAccessLogRepo from './pg-portal-access-log-repo.js';
export * as pgPortalPatientSettingRepo from './pg-portal-patient-setting-repo.js';
export * as pgTelehealthRoomRepo from './pg-telehealth-room-repo.js';
export * as pgTelehealthRoomEventRepo from './pg-telehealth-room-event-repo.js';
export * as pgQueueRepo from './pg-queue-repo.js';
export * as pgWorkflowRepo from './pg-workflow-repo.js';
export * as pgImagingWorklistRepo from './pg-imaging-worklist-repo.js';
export * as pgImagingIngestRepo from './pg-imaging-ingest-repo.js';
export * as pgSchedulingRequestRepo from './pg-scheduling-request-repo.js';
export * as pgSchedulingLockRepo from './pg-scheduling-lock-repo.js';
export * as pgConsentRepo from './pg-consent-repo.js';

// Phase 523-528 (W38): Service Lines + Devices v2
export * as pgEdRepo from './pg-ed-repo.js';
export * as pgOrRepo from './pg-or-repo.js';
export * as pgIcuRepo from './pg-icu-repo.js';
export * as pgDeviceRegistryRepo from './pg-device-registry-repo.js';
export * as pgRadiologyRepo from './pg-radiology-repo.js';

// Wave 41: Durable Ops Stores
export * as w41DurableRepos from './w41-durable-repos.js';
