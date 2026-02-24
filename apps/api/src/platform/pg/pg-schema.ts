/**
 * Platform DB — PostgreSQL Schema (Drizzle ORM)
 *
 * Phase 101: Platform Data Architecture Convergence
 *
 * Parallel to ../db/schema.ts (SQLite). This defines the same tables
 * using drizzle-orm/pg-core types for first-class Postgres support.
 *
 * Core platform tables (audit, idempotency, outbox) are NEW and
 * only exist in Postgres. Domain tables (payer, denial, etc.) are
 * mirrored from SQLite and will eventually replace them.
 *
 * CONVENTION: Every table has tenant_id + created_at + updated_at.
 * See docs/architecture/platform-data-architecture.md for full spec.
 */

import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ================================================================
 *  CORE PLATFORM TABLES (new — Postgres-only)
 * ================================================================ */

/**
 * Platform Audit Event — append-only, hash-chained.
 * Replaces in-memory ring buffers for platform-level audit.
 */
export const platformAuditEvent = pgTable("platform_audit_event", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  actor: text("actor").notNull(),           // DUZ, 'system', or service name
  actorRole: text("actor_role"),
  action: text("action").notNull(),         // e.g., 'payer.create', 'claim.submit'
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  detail: jsonb("detail"),                  // sanitized JSON payload
  prevHash: text("prev_hash"),              // SHA-256 of previous entry (hash chain)
  entryHash: text("entry_hash"),            // SHA-256 of this entry
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_audit_tenant_created").on(table.tenantId, table.createdAt),
  index("idx_audit_entity").on(table.entityType, table.entityId),
  index("idx_audit_action").on(table.action),
]);

/**
 * Idempotency Key — prevents duplicate writes from retried requests.
 * Phase 101 creates the table. Phase 102 adds middleware.
 */
export const idempotencyKey = pgTable("idempotency_key", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  key: text("key").notNull(),               // client-supplied idempotency key
  method: text("method").notNull(),         // HTTP method
  path: text("path").notNull(),             // route path
  statusCode: integer("status_code"),       // response status code
  responseBody: jsonb("response_body"),     // cached response
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => [
  uniqueIndex("idx_idempotency_tenant_key").on(table.tenantId, table.key),
  index("idx_idempotency_expires").on(table.expiresAt),
]);

/**
 * Outbox Event — transactional outbox for reliable event publishing.
 * Phase 101 creates the table. Phase 102+ adds consumer polling.
 */
export const outboxEvent = pgTable("outbox_event", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  eventType: text("event_type").notNull(),   // e.g., 'claim.submitted', 'payer.updated'
  aggregateType: text("aggregate_type").notNull(),
  aggregateId: text("aggregate_id").notNull(),
  payload: jsonb("payload").notNull(),       // event data
  published: boolean("published").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_outbox_unpublished").on(table.published, table.createdAt),
  index("idx_outbox_aggregate").on(table.aggregateType, table.aggregateId),
]);

/* ================================================================
 *  PAYER DOMAIN TABLES (mirrors of SQLite — Phase 101 Wave 1)
 * ================================================================ */

export const payer = pgTable("payer", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  canonicalName: text("canonical_name").notNull(),
  aliases: jsonb("aliases").notNull().default([]),
  countryCode: text("country_code").notNull().default("PH"),
  regulatorSource: text("regulator_source"),
  regulatorLicenseNo: text("regulator_license_no"),
  category: text("category"),
  payerType: text("payer_type"),
  integrationMode: text("integration_mode"),
  active: boolean("active").notNull().default(true),
  version: integer("version").notNull().default(1),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_payer_tenant").on(table.tenantId),
  index("idx_payer_country").on(table.countryCode),
]);

export const tenantPayer = pgTable("tenant_payer", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  payerId: text("payer_id").notNull().references(() => payer.id),
  status: text("status").notNull().default("contracting_needed"),
  notes: text("notes"),
  vaultRef: text("vault_ref"),
  version: integer("version").notNull().default(1),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_tenant_payer_tenant").on(table.tenantId),
]);

export const payerCapability = pgTable("payer_capability", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id"),
  payerId: text("payer_id").notNull().references(() => payer.id),
  capabilityKey: text("capability_key").notNull(),
  value: text("value").notNull(),
  confidence: text("confidence").notNull().default("unknown"),
  evidenceSnapshotId: text("evidence_snapshot_id"),
  reason: text("reason"),
  version: integer("version").notNull().default(1),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_capability_payer").on(table.payerId),
]);

export const payerTask = pgTable("payer_task", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id"),
  payerId: text("payer_id").notNull().references(() => payer.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("open"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  version: integer("version").notNull().default(1),
  updatedBy: text("updated_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payerEvidenceSnapshot = pgTable("payer_evidence_snapshot", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id"),
  sourceType: text("source_type").notNull(),
  sourceUrl: text("source_url"),
  asOfDate: timestamp("as_of_date", { withTimezone: true }).notNull(),
  sha256: text("sha256").notNull(),
  storedPath: text("stored_path"),
  parserVersion: text("parser_version").notNull().default("1.0.0"),
  status: text("status").notNull().default("pending"),
  payerCount: integer("payer_count"),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payerAuditEvent = pgTable("payer_audit_event", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id"),
  actorType: text("actor_type").notNull(),
  actorId: text("actor_id"),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  beforeJson: jsonb("before_json"),
  afterJson: jsonb("after_json"),
  reason: text("reason"),
  evidenceSnapshotId: text("evidence_snapshot_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_payer_audit_entity").on(table.entityType, table.entityId),
]);

/* ================================================================
 *  DENIAL + RECONCILIATION TABLES (Wave 2 — mirror from SQLite)
 * ================================================================ */

export const denialCase = pgTable("denial_case", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  claimRef: text("claim_ref").notNull(),
  vistaClaimIen: text("vista_claim_ien"),
  patientDfn: text("patient_dfn"),
  payerId: text("payer_id").notNull(),
  denialStatus: text("denial_status").notNull().default("NEW"),
  denialSource: text("denial_source").notNull().default("MANUAL"),
  denialCodesJson: jsonb("denial_codes_json").notNull().default([]),
  denialNarrative: text("denial_narrative"),
  receivedDate: timestamp("received_date", { withTimezone: true }).notNull(),
  deadlineDate: timestamp("deadline_date", { withTimezone: true }),
  assignedTo: text("assigned_to"),
  assignedTeam: text("assigned_team"),
  billedAmountCents: integer("billed_amount_cents").notNull().default(0),
  allowedAmountCents: integer("allowed_amount_cents"),
  paidAmountCents: integer("paid_amount_cents"),
  patientRespCents: integer("patient_resp_cents"),
  adjustmentAmountCents: integer("adjustment_amount_cents"),
  evidenceRefsJson: jsonb("evidence_refs_json").notNull().default([]),
  importFileHash: text("import_file_hash"),
  importTimestamp: timestamp("import_timestamp", { withTimezone: true }),
  importParserVersion: text("import_parser_version"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_denial_tenant").on(table.tenantId),
  index("idx_denial_payer").on(table.payerId),
  index("idx_denial_status").on(table.denialStatus),
]);

export const denialAction = pgTable("denial_action", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  denialId: text("denial_id").notNull(),
  actor: text("actor").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  actionType: text("action_type").notNull(),
  payloadJson: jsonb("payload_json").notNull().default({}),
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
});

export const denialAttachment = pgTable("denial_attachment", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  denialId: text("denial_id").notNull(),
  label: text("label").notNull(),
  refType: text("ref_type").notNull(),
  storedPath: text("stored_path"),
  sha256: text("sha256"),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  addedBy: text("added_by"),
});

export const resubmissionAttempt = pgTable("resubmission_attempt", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  denialId: text("denial_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  method: text("method").notNull(),
  referenceNumber: text("reference_number"),
  followUpDate: timestamp("follow_up_date", { withTimezone: true }),
  notes: text("notes"),
  actor: text("actor").notNull(),
});

export const remittanceImport = pgTable("remittance_import", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sourceType: text("source_type").notNull().default("MANUAL"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  fileHash: text("file_hash"),
  originalFilename: text("original_filename"),
  parserName: text("parser_name"),
  parserVersion: text("parser_version"),
  mappingVersion: text("mapping_version"),
  lineCount: integer("line_count").notNull().default(0),
  totalPaidCents: integer("total_paid_cents").notNull().default(0),
  totalBilledCents: integer("total_billed_cents").notNull().default(0),
  importedBy: text("imported_by").notNull(),
});

export const paymentRecord = pgTable("payment_record", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  remittanceImportId: text("remittance_import_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  claimRef: text("claim_ref").notNull(),
  payerId: text("payer_id").notNull(),
  status: text("status").notNull().default("IMPORTED"),
  billedAmountCents: integer("billed_amount_cents").notNull().default(0),
  paidAmountCents: integer("paid_amount_cents").notNull().default(0),
  allowedAmountCents: integer("allowed_amount_cents"),
  patientRespCents: integer("patient_resp_cents"),
  adjustmentAmountCents: integer("adjustment_amount_cents"),
  traceNumber: text("trace_number"),
  checkNumber: text("check_number"),
  postedDate: timestamp("posted_date", { withTimezone: true }),
  serviceDate: timestamp("service_date", { withTimezone: true }),
  rawCodesJson: jsonb("raw_codes_json").notNull().default([]),
  patientDfn: text("patient_dfn"),
  lineIndex: integer("line_index").notNull().default(0),
}, (table) => [
  index("idx_payment_tenant").on(table.tenantId),
  index("idx_payment_claim").on(table.claimRef),
]);

export const reconciliationMatch = pgTable("reconciliation_match", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  paymentId: text("payment_id").notNull(),
  claimRef: text("claim_ref").notNull(),
  matchConfidence: integer("match_confidence").notNull().default(0),
  matchMethod: text("match_method").notNull(),
  matchStatus: text("match_status").notNull().default("REVIEW_REQUIRED"),
  matchNotes: text("match_notes"),
  confirmedBy: text("confirmed_by"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
});

export const underpaymentCase = pgTable("underpayment_case", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  claimRef: text("claim_ref").notNull(),
  paymentId: text("payment_id").notNull(),
  payerId: text("payer_id").notNull(),
  expectedAmountModel: text("expected_amount_model").notNull().default("BILLED_AMOUNT"),
  expectedAmountCents: integer("expected_amount_cents").notNull(),
  paidAmountCents: integer("paid_amount_cents").notNull(),
  deltaCents: integer("delta_cents").notNull(),
  status: text("status").notNull().default("NEW"),
  denialCaseId: text("denial_case_id"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: text("resolved_by"),
  resolutionNote: text("resolution_note"),
}, (table) => [
  index("idx_underpayment_tenant").on(table.tenantId),
]);

/* ================================================================
 *  ELIGIBILITY + CLAIM STATUS (Phase 100 — Wave 2)
 * ================================================================ */

export const eligibilityCheck = pgTable("eligibility_check", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  patientDfn: text("patient_dfn").notNull(),
  payerId: text("payer_id").notNull(),
  subscriberId: text("subscriber_id"),
  memberId: text("member_id"),
  dateOfService: timestamp("date_of_service", { withTimezone: true }),
  provenance: text("provenance").notNull(),
  eligible: boolean("eligible"),
  status: text("status").notNull().default("pending"),
  responseJson: jsonb("response_json"),
  errorMessage: text("error_message"),
  responseMs: integer("response_ms"),
  checkedBy: text("checked_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_eligibility_tenant").on(table.tenantId),
  index("idx_eligibility_patient").on(table.patientDfn, table.payerId),
]);

export const claimStatusCheck = pgTable("claim_status_check", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  claimRef: text("claim_ref").notNull(),
  payerId: text("payer_id").notNull(),
  payerClaimId: text("payer_claim_id"),
  provenance: text("provenance").notNull(),
  claimStatus: text("claim_status"),
  adjudicationDate: timestamp("adjudication_date", { withTimezone: true }),
  paidAmountCents: integer("paid_amount_cents"),
  status: text("status").notNull().default("pending"),
  responseJson: jsonb("response_json"),
  errorMessage: text("error_message"),
  responseMs: integer("response_ms"),
  checkedBy: text("checked_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_claim_status_tenant").on(table.tenantId),
  index("idx_claim_status_claim").on(table.claimRef),
]);

/* ================================================================
 *  CAPABILITY MATRIX (Phase 102 — new, Postgres-only)
 * ================================================================ */

/**
 * Capability matrix cell — one row per (payerId × capabilityType).
 * Tracks integration readiness per payer per capability.
 */
export const capabilityMatrixCell = pgTable("capability_matrix_cell", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  payerId: text("payer_id").notNull(),
  payerName: text("payer_name").notNull(),
  capability: text("capability").notNull(),         // eligibility | loa | claims_submit | claim_status | remittance
  mode: text("mode").notNull().default("manual"),   // manual | portal | api | rpa_planned
  maturity: text("maturity").notNull().default("none"), // none | planned | in_progress | active
  operationalNotes: text("operational_notes"),
  updatedBy: text("updated_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_cap_matrix_payer_cap").on(table.payerId, table.capability),
  index("idx_cap_matrix_tenant").on(table.tenantId),
]);

/**
 * Capability matrix evidence — one-to-many evidence links per cell.
 */
export const capabilityMatrixEvidence = pgTable("capability_matrix_evidence", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  cellId: text("cell_id").notNull().references(() => capabilityMatrixCell.id),
  evidenceType: text("evidence_type").notNull(),     // url | internal_note | runbook_ref
  value: text("value").notNull(),
  addedBy: text("added_by").notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_cap_evidence_cell").on(table.cellId),
]);

/* ================================================================
 *  SESSION + WORKQUEUE TABLES (Phase 117: Postgres-first prod posture)
 * ================================================================ */

/**
 * Auth Session — durable session storage for multi-instance deployments.
 * Mirrors SQLite auth_session. Token hashes stored, never raw tokens.
 */
export const pgAuthSession = pgTable("auth_session", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  facilityStation: text("facility_station").notNull(),
  facilityName: text("facility_name").notNull(),
  divisionIen: text("division_ien").notNull(),
  tokenHash: text("token_hash").notNull(),
  csrfSecret: text("csrf_secret"),
  ipHash: text("ip_hash"),
  userAgentHash: text("user_agent_hash"),
  createdAt: text("created_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  expiresAt: text("expires_at").notNull(),
  revokedAt: text("revoked_at"),
  metadataJson: text("metadata_json"),
}, (table) => [
  index("idx_auth_session_tenant").on(table.tenantId),
  uniqueIndex("idx_auth_session_token_hash").on(table.tokenHash),
  index("idx_auth_session_expires").on(table.expiresAt),
  index("idx_auth_session_user").on(table.userId),
]);

/**
 * RCM Work Item — durable work queue for multi-instance deployments.
 * Mirrors SQLite rcm_work_item.
 */
export const pgRcmWorkItem = pgTable("rcm_work_item", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  type: text("type").notNull(),
  status: text("status").notNull().default("open"),
  claimId: text("claim_id").notNull(),
  payerId: text("payer_id"),
  payerName: text("payer_name"),
  patientDfn: text("patient_dfn"),
  reasonCode: text("reason_code").notNull(),
  reasonDescription: text("reason_description").notNull(),
  reasonCategory: text("reason_category"),
  recommendedAction: text("recommended_action").notNull(),
  fieldToFix: text("field_to_fix"),
  triggeringRule: text("triggering_rule"),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id"),
  sourceTimestamp: text("source_timestamp"),
  priority: text("priority").notNull().default("medium"),
  assignedTo: text("assigned_to"),
  dueDate: text("due_date"),
  resolvedAt: text("resolved_at"),
  resolvedBy: text("resolved_by"),
  resolutionNote: text("resolution_note"),
  lockedBy: text("locked_by"),
  lockedAt: text("locked_at"),
  lockExpiresAt: text("lock_expires_at"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_work_item_tenant").on(table.tenantId),
  index("idx_work_item_status_updated").on(table.status, table.updatedAt),
  index("idx_work_item_claim").on(table.claimId),
  index("idx_work_item_priority_created").on(table.priority, table.createdAt),
  index("idx_work_item_locked").on(table.lockedBy, table.lockExpiresAt),
]);

/**
 * RCM Work Item Event — audit trail for work item status changes.
 * Mirrors SQLite rcm_work_item_event.
 */
export const pgRcmWorkItemEvent = pgTable("rcm_work_item_event", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  workItemId: text("work_item_id").notNull(),
  action: text("action").notNull(),
  beforeStatus: text("before_status"),
  afterStatus: text("after_status"),
  actor: text("actor").notNull(),
  detail: text("detail"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_work_event_item").on(table.workItemId),
  index("idx_work_event_tenant").on(table.tenantId),
]);
