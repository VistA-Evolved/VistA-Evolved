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
} from 'drizzle-orm/pg-core';

/* ================================================================
 *  CORE PLATFORM TABLES (new — Postgres-only)
 * ================================================================ */

/**
 * Platform Audit Event — append-only, hash-chained.
 * Replaces in-memory ring buffers for platform-level audit.
 */
export const platformAuditEvent = pgTable(
  'platform_audit_event',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    actor: text('actor').notNull(), // DUZ, 'system', or service name
    actorRole: text('actor_role'),
    action: text('action').notNull(), // e.g., 'payer.create', 'claim.submit'
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    detail: jsonb('detail'), // sanitized JSON payload
    prevHash: text('prev_hash'), // SHA-256 of previous entry (hash chain)
    entryHash: text('entry_hash'), // SHA-256 of this entry
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_audit_tenant_created').on(table.tenantId, table.createdAt),
    index('idx_audit_entity').on(table.entityType, table.entityId),
    index('idx_audit_action').on(table.action),
  ]
);

/**
 * Idempotency Key — prevents duplicate writes from retried requests.
 * Phase 101 creates the table. Phase 102 adds middleware.
 */
export const idempotencyKey = pgTable(
  'idempotency_key',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    key: text('key').notNull(), // client-supplied idempotency key
    method: text('method').notNull(), // HTTP method
    path: text('path').notNull(), // route path
    statusCode: integer('status_code'), // response status code
    responseBody: jsonb('response_body'), // cached response
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('idx_idempotency_tenant_key').on(table.tenantId, table.key),
    index('idx_idempotency_expires').on(table.expiresAt),
  ]
);

/**
 * Outbox Event — transactional outbox for reliable event publishing.
 * Phase 101 creates the table. Phase 102+ adds consumer polling.
 */
export const outboxEvent = pgTable(
  'outbox_event',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    eventType: text('event_type').notNull(), // e.g., 'claim.submitted', 'payer.updated'
    aggregateType: text('aggregate_type').notNull(),
    aggregateId: text('aggregate_id').notNull(),
    payload: jsonb('payload').notNull(), // event data
    published: boolean('published').notNull().default(false),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_outbox_unpublished').on(table.published, table.createdAt),
    index('idx_outbox_aggregate').on(table.aggregateType, table.aggregateId),
  ]
);

/* ================================================================
 *  PAYER DOMAIN TABLES (mirrors of SQLite — Phase 101 Wave 1)
 * ================================================================ */

export const payer = pgTable(
  'payer',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    canonicalName: text('canonical_name').notNull(),
    aliases: jsonb('aliases').notNull().default([]),
    countryCode: text('country_code').notNull().default('PH'),
    regulatorSource: text('regulator_source'),
    regulatorLicenseNo: text('regulator_license_no'),
    category: text('category'),
    payerType: text('payer_type'),
    integrationMode: text('integration_mode'),
    active: boolean('active').notNull().default(true),
    version: integer('version').notNull().default(1),
    updatedBy: text('updated_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_payer_tenant').on(table.tenantId),
    index('idx_payer_country').on(table.countryCode),
  ]
);

export const tenantPayer = pgTable(
  'tenant_payer',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    payerId: text('payer_id')
      .notNull()
      .references(() => payer.id),
    status: text('status').notNull().default('contracting_needed'),
    notes: text('notes'),
    vaultRef: text('vault_ref'),
    version: integer('version').notNull().default(1),
    updatedBy: text('updated_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_tenant_payer_tenant').on(table.tenantId)]
);

export const payerCapability = pgTable(
  'payer_capability',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id'),
    payerId: text('payer_id')
      .notNull()
      .references(() => payer.id),
    capabilityKey: text('capability_key').notNull(),
    value: text('value').notNull(),
    confidence: text('confidence').notNull().default('unknown'),
    evidenceSnapshotId: text('evidence_snapshot_id'),
    reason: text('reason'),
    version: integer('version').notNull().default(1),
    updatedBy: text('updated_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_capability_payer').on(table.payerId)]
);

export const payerTask = pgTable('payer_task', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id'),
  payerId: text('payer_id')
    .notNull()
    .references(() => payer.id),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('open'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  version: integer('version').notNull().default(1),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const payerEvidenceSnapshot = pgTable('payer_evidence_snapshot', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id'),
  sourceType: text('source_type').notNull(),
  sourceUrl: text('source_url'),
  asOfDate: timestamp('as_of_date', { withTimezone: true }).notNull(),
  sha256: text('sha256').notNull(),
  storedPath: text('stored_path'),
  parserVersion: text('parser_version').notNull().default('1.0.0'),
  status: text('status').notNull().default('pending'),
  payerCount: integer('payer_count'),
  ingestedAt: timestamp('ingested_at', { withTimezone: true }).notNull().defaultNow(),
});

export const payerAuditEvent = pgTable(
  'payer_audit_event',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id'),
    actorType: text('actor_type').notNull(),
    actorId: text('actor_id'),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    action: text('action').notNull(),
    beforeJson: jsonb('before_json'),
    afterJson: jsonb('after_json'),
    reason: text('reason'),
    evidenceSnapshotId: text('evidence_snapshot_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_payer_audit_entity').on(table.entityType, table.entityId)]
);

/* ================================================================
 *  DENIAL + RECONCILIATION TABLES (Wave 2 — mirror from SQLite)
 * ================================================================ */

export const denialCase = pgTable(
  'denial_case',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    claimRef: text('claim_ref').notNull(),
    vistaClaimIen: text('vista_claim_ien'),
    patientDfn: text('patient_dfn'),
    payerId: text('payer_id').notNull(),
    denialStatus: text('denial_status').notNull().default('NEW'),
    denialSource: text('denial_source').notNull().default('MANUAL'),
    denialCodesJson: jsonb('denial_codes_json').notNull().default([]),
    denialNarrative: text('denial_narrative'),
    receivedDate: timestamp('received_date', { withTimezone: true }).notNull(),
    deadlineDate: timestamp('deadline_date', { withTimezone: true }),
    assignedTo: text('assigned_to'),
    assignedTeam: text('assigned_team'),
    billedAmountCents: integer('billed_amount_cents').notNull().default(0),
    allowedAmountCents: integer('allowed_amount_cents'),
    paidAmountCents: integer('paid_amount_cents'),
    patientRespCents: integer('patient_resp_cents'),
    adjustmentAmountCents: integer('adjustment_amount_cents'),
    evidenceRefsJson: jsonb('evidence_refs_json').notNull().default([]),
    importFileHash: text('import_file_hash'),
    importTimestamp: timestamp('import_timestamp', { withTimezone: true }),
    importParserVersion: text('import_parser_version'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_denial_tenant').on(table.tenantId),
    index('idx_denial_payer').on(table.payerId),
    index('idx_denial_status').on(table.denialStatus),
  ]
);

export const denialAction = pgTable('denial_action', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('default'),
  denialId: text('denial_id').notNull(),
  actor: text('actor').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  actionType: text('action_type').notNull(),
  payloadJson: jsonb('payload_json').notNull().default({}),
  previousStatus: text('previous_status'),
  newStatus: text('new_status'),
});

export const denialAttachment = pgTable('denial_attachment', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('default'),
  denialId: text('denial_id').notNull(),
  label: text('label').notNull(),
  refType: text('ref_type').notNull(),
  storedPath: text('stored_path'),
  sha256: text('sha256'),
  addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  addedBy: text('added_by'),
});

export const resubmissionAttempt = pgTable('resubmission_attempt', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('default'),
  denialId: text('denial_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  method: text('method').notNull(),
  referenceNumber: text('reference_number'),
  followUpDate: timestamp('follow_up_date', { withTimezone: true }),
  notes: text('notes'),
  actor: text('actor').notNull(),
});

export const remittanceImport = pgTable('remittance_import', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('default'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  sourceType: text('source_type').notNull().default('MANUAL'),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
  fileHash: text('file_hash'),
  originalFilename: text('original_filename'),
  parserName: text('parser_name'),
  parserVersion: text('parser_version'),
  mappingVersion: text('mapping_version'),
  lineCount: integer('line_count').notNull().default(0),
  totalPaidCents: integer('total_paid_cents').notNull().default(0),
  totalBilledCents: integer('total_billed_cents').notNull().default(0),
  importedBy: text('imported_by').notNull(),
});

export const paymentRecord = pgTable(
  'payment_record',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    remittanceImportId: text('remittance_import_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    claimRef: text('claim_ref').notNull(),
    payerId: text('payer_id').notNull(),
    status: text('status').notNull().default('IMPORTED'),
    billedAmountCents: integer('billed_amount_cents').notNull().default(0),
    paidAmountCents: integer('paid_amount_cents').notNull().default(0),
    allowedAmountCents: integer('allowed_amount_cents'),
    patientRespCents: integer('patient_resp_cents'),
    adjustmentAmountCents: integer('adjustment_amount_cents'),
    traceNumber: text('trace_number'),
    checkNumber: text('check_number'),
    postedDate: timestamp('posted_date', { withTimezone: true }),
    serviceDate: timestamp('service_date', { withTimezone: true }),
    rawCodesJson: jsonb('raw_codes_json').notNull().default([]),
    patientDfn: text('patient_dfn'),
    lineIndex: integer('line_index').notNull().default(0),
  },
  (table) => [
    index('idx_payment_tenant').on(table.tenantId),
    index('idx_payment_claim').on(table.claimRef),
  ]
);

export const reconciliationMatch = pgTable('reconciliation_match', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default('default'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  paymentId: text('payment_id').notNull(),
  claimRef: text('claim_ref').notNull(),
  matchConfidence: integer('match_confidence').notNull().default(0),
  matchMethod: text('match_method').notNull(),
  matchStatus: text('match_status').notNull().default('REVIEW_REQUIRED'),
  matchNotes: text('match_notes'),
  confirmedBy: text('confirmed_by'),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
});

export const underpaymentCase = pgTable(
  'underpayment_case',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    claimRef: text('claim_ref').notNull(),
    paymentId: text('payment_id').notNull(),
    payerId: text('payer_id').notNull(),
    expectedAmountModel: text('expected_amount_model').notNull().default('BILLED_AMOUNT'),
    expectedAmountCents: integer('expected_amount_cents').notNull(),
    paidAmountCents: integer('paid_amount_cents').notNull(),
    deltaCents: integer('delta_cents').notNull(),
    status: text('status').notNull().default('NEW'),
    denialCaseId: text('denial_case_id'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: text('resolved_by'),
    resolutionNote: text('resolution_note'),
  },
  (table) => [index('idx_underpayment_tenant').on(table.tenantId)]
);

/* ================================================================
 *  ELIGIBILITY + CLAIM STATUS (Phase 100 — Wave 2)
 * ================================================================ */

export const eligibilityCheck = pgTable(
  'eligibility_check',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    patientDfn: text('patient_dfn').notNull(),
    payerId: text('payer_id').notNull(),
    subscriberId: text('subscriber_id'),
    memberId: text('member_id'),
    dateOfService: timestamp('date_of_service', { withTimezone: true }),
    provenance: text('provenance').notNull(),
    eligible: boolean('eligible'),
    status: text('status').notNull().default('pending'),
    responseJson: jsonb('response_json'),
    errorMessage: text('error_message'),
    responseMs: integer('response_ms'),
    checkedBy: text('checked_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_eligibility_tenant').on(table.tenantId),
    index('idx_eligibility_patient').on(table.patientDfn, table.payerId),
  ]
);

export const claimStatusCheck = pgTable(
  'claim_status_check',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    claimRef: text('claim_ref').notNull(),
    payerId: text('payer_id').notNull(),
    payerClaimId: text('payer_claim_id'),
    provenance: text('provenance').notNull(),
    claimStatus: text('claim_status'),
    adjudicationDate: timestamp('adjudication_date', { withTimezone: true }),
    paidAmountCents: integer('paid_amount_cents'),
    status: text('status').notNull().default('pending'),
    responseJson: jsonb('response_json'),
    errorMessage: text('error_message'),
    responseMs: integer('response_ms'),
    checkedBy: text('checked_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_claim_status_tenant').on(table.tenantId),
    index('idx_claim_status_claim').on(table.claimRef),
  ]
);

/* ================================================================
 *  CAPABILITY MATRIX (Phase 102 — new, Postgres-only)
 * ================================================================ */

/**
 * Capability matrix cell — one row per (payerId × capabilityType).
 * Tracks integration readiness per payer per capability.
 */
export const capabilityMatrixCell = pgTable(
  'capability_matrix_cell',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    payerId: text('payer_id').notNull(),
    payerName: text('payer_name').notNull(),
    capability: text('capability').notNull(), // eligibility | loa | claims_submit | claim_status | remittance
    mode: text('mode').notNull().default('manual'), // manual | portal | api | rpa_planned
    maturity: text('maturity').notNull().default('none'), // none | planned | in_progress | active
    operationalNotes: text('operational_notes'),
    updatedBy: text('updated_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_cap_matrix_payer_cap').on(table.payerId, table.capability),
    index('idx_cap_matrix_tenant').on(table.tenantId),
  ]
);

/**
 * Capability matrix evidence — one-to-many evidence links per cell.
 */
export const capabilityMatrixEvidence = pgTable(
  'capability_matrix_evidence',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    cellId: text('cell_id')
      .notNull()
      .references(() => capabilityMatrixCell.id),
    evidenceType: text('evidence_type').notNull(), // url | internal_note | runbook_ref
    value: text('value').notNull(),
    addedBy: text('added_by').notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_cap_evidence_cell').on(table.cellId)]
);

/* ================================================================
 *  SESSION + WORKQUEUE TABLES (Phase 117: Postgres-first prod posture)
 * ================================================================ */

/**
 * Auth Session — durable session storage for multi-instance deployments.
 * Mirrors SQLite auth_session. Token hashes stored, never raw tokens.
 */
export const pgAuthSession = pgTable(
  'auth_session',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    userId: text('user_id').notNull(),
    userName: text('user_name').notNull(),
    userRole: text('user_role').notNull(),
    facilityStation: text('facility_station').notNull(),
    facilityName: text('facility_name').notNull(),
    divisionIen: text('division_ien').notNull(),
    tokenHash: text('token_hash').notNull(),
    csrfSecret: text('csrf_secret'),
    ipHash: text('ip_hash'),
    userAgentHash: text('user_agent_hash'),
    createdAt: text('created_at').notNull(),
    lastSeenAt: text('last_seen_at').notNull(),
    expiresAt: text('expires_at').notNull(),
    revokedAt: text('revoked_at'),
    metadataJson: text('metadata_json'),
  },
  (table) => [
    index('idx_auth_session_tenant').on(table.tenantId),
    uniqueIndex('idx_auth_session_token_hash').on(table.tokenHash),
    index('idx_auth_session_expires').on(table.expiresAt),
    index('idx_auth_session_user').on(table.userId),
  ]
);

/**
 * RCM Work Item — durable work queue for multi-instance deployments.
 * Mirrors SQLite rcm_work_item.
 */
export const pgRcmWorkItem = pgTable(
  'rcm_work_item',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    type: text('type').notNull(),
    status: text('status').notNull().default('open'),
    claimId: text('claim_id').notNull(),
    payerId: text('payer_id'),
    payerName: text('payer_name'),
    patientDfn: text('patient_dfn'),
    reasonCode: text('reason_code').notNull(),
    reasonDescription: text('reason_description').notNull(),
    reasonCategory: text('reason_category'),
    recommendedAction: text('recommended_action').notNull(),
    fieldToFix: text('field_to_fix'),
    triggeringRule: text('triggering_rule'),
    sourceType: text('source_type').notNull(),
    sourceId: text('source_id'),
    sourceTimestamp: text('source_timestamp'),
    priority: text('priority').notNull().default('medium'),
    assignedTo: text('assigned_to'),
    dueDate: text('due_date'),
    resolvedAt: text('resolved_at'),
    resolvedBy: text('resolved_by'),
    resolutionNote: text('resolution_note'),
    lockedBy: text('locked_by'),
    lockedAt: text('locked_at'),
    lockExpiresAt: text('lock_expires_at'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_work_item_tenant').on(table.tenantId),
    index('idx_work_item_status_updated').on(table.status, table.updatedAt),
    index('idx_work_item_claim').on(table.claimId),
    index('idx_work_item_priority_created').on(table.priority, table.createdAt),
    index('idx_work_item_locked').on(table.lockedBy, table.lockExpiresAt),
  ]
);

/**
 * RCM Work Item Event — audit trail for work item status changes.
 * Mirrors SQLite rcm_work_item_event.
 */
export const pgRcmWorkItemEvent = pgTable(
  'rcm_work_item_event',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    workItemId: text('work_item_id').notNull(),
    action: text('action').notNull(),
    beforeStatus: text('before_status'),
    afterStatus: text('after_status'),
    actor: text('actor').notNull(),
    detail: text('detail'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_work_event_item').on(table.workItemId),
    index('idx_work_event_tenant').on(table.tenantId),
  ]
);

/* ================================================================
 *  RCM DURABILITY TABLES (Phase 126: Map stores → Postgres)
 * ================================================================ */

/**
 * RCM Claim — durable claim lifecycle store.
 * Mirrors SQLite rcm_claim (Phase 121).
 */
export const pgRcmClaim = pgTable(
  'rcm_claim',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    claimType: text('claim_type').notNull().default('professional'),
    status: text('status').notNull().default('draft'),
    patientDfn: text('patient_dfn').notNull(),
    patientName: text('patient_name'),
    patientDob: text('patient_dob'),
    patientFirstName: text('patient_first_name'),
    patientLastName: text('patient_last_name'),
    patientGender: text('patient_gender'),
    subscriberId: text('subscriber_id'),
    billingProviderNpi: text('billing_provider_npi'),
    renderingProviderNpi: text('rendering_provider_npi'),
    facilityNpi: text('facility_npi'),
    facilityName: text('facility_name'),
    facilityTaxId: text('facility_tax_id'),
    payerId: text('payer_id').notNull(),
    payerName: text('payer_name'),
    payerClaimId: text('payer_claim_id'),
    dateOfService: text('date_of_service').notNull(),
    diagnosesJson: text('diagnoses_json').notNull().default('[]'),
    linesJson: text('lines_json').notNull().default('[]'),
    totalCharge: integer('total_charge').notNull().default(0),
    ediTransactionId: text('edi_transaction_id'),
    connectorId: text('connector_id'),
    submittedAt: text('submitted_at'),
    responseReceivedAt: text('response_received_at'),
    paidAmount: integer('paid_amount'),
    adjustmentAmount: integer('adjustment_amount'),
    patientResponsibility: integer('patient_responsibility'),
    remitDate: text('remit_date'),
    vistaChargeIen: text('vista_charge_ien'),
    vistaArIen: text('vista_ar_ien'),
    validationResultJson: text('validation_result_json'),
    pipelineEntryId: text('pipeline_entry_id'),
    exportArtifactPath: text('export_artifact_path'),
    isDemo: boolean('is_demo').notNull().default(false),
    submissionSafetyMode: text('submission_safety_mode').notNull().default('export_only'),
    isMock: boolean('is_mock').notNull().default(false),
    auditTrailJson: text('audit_trail_json').notNull().default('[]'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_rcm_claim_tenant').on(table.tenantId),
    index('idx_rcm_claim_status').on(table.status),
    index('idx_rcm_claim_patient').on(table.patientDfn),
    index('idx_rcm_claim_payer').on(table.payerId),
    index('idx_rcm_claim_updated').on(table.updatedAt),
  ]
);

/**
 * RCM Remittance — durable remittance/ERA store.
 * Mirrors SQLite rcm_remittance (Phase 121).
 */
export const pgRcmRemittance = pgTable(
  'rcm_remittance',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    status: text('status').notNull().default('received'),
    ediTransactionId: text('edi_transaction_id'),
    checkNumber: text('check_number'),
    checkDate: text('check_date'),
    eftTraceNumber: text('eft_trace_number'),
    payerId: text('payer_id').notNull(),
    payerName: text('payer_name'),
    claimId: text('claim_id'),
    payerClaimId: text('payer_claim_id'),
    patientDfn: text('patient_dfn'),
    totalCharged: integer('total_charged').notNull(),
    totalPaid: integer('total_paid').notNull(),
    totalAdjusted: integer('total_adjusted').notNull(),
    totalPatientResponsibility: integer('total_patient_responsibility').notNull(),
    serviceLinesJson: text('service_lines_json').notNull().default('[]'),
    isMock: boolean('is_mock').notNull().default(false),
    importedAt: text('imported_at').notNull(),
    matchedAt: text('matched_at'),
    postedAt: text('posted_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_rcm_remit_tenant').on(table.tenantId),
    index('idx_rcm_remit_claim').on(table.claimId),
    index('idx_rcm_remit_payer').on(table.payerId),
  ]
);

/**
 * RCM Claim Case — durable claim lifecycle case store.
 * Mirrors SQLite rcm_claim_case (Phase 121).
 */
export const pgRcmClaimCase = pgTable(
  'rcm_claim_case',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    lifecycleStatus: text('lifecycle_status').notNull().default('intake'),
    baseClaimId: text('base_claim_id'),
    philhealthDraftId: text('philhealth_draft_id'),
    loaCaseId: text('loa_case_id'),
    patientDfn: text('patient_dfn').notNull(),
    patientName: text('patient_name'),
    payerId: text('payer_id'),
    payerName: text('payer_name'),
    providerDuz: text('provider_duz'),
    providerName: text('provider_name'),
    encounterDate: text('encounter_date'),
    diagnosesJson: text('diagnoses_json').notNull().default('[]'),
    proceduresJson: text('procedures_json').notNull().default('[]'),
    scrubResultJson: text('scrub_result_json'),
    scrubScore: integer('scrub_score'),
    eventsJson: text('events_json').notNull().default('[]'),
    attachmentsJson: text('attachments_json').notNull().default('[]'),
    denialsJson: text('denials_json').notNull().default('[]'),
    notesJson: text('notes_json').notNull().default('[]'),
    metadataJson: text('metadata_json').notNull().default('{}'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_rcm_case_tenant').on(table.tenantId),
    index('idx_rcm_case_status').on(table.lifecycleStatus),
    index('idx_rcm_case_patient').on(table.patientDfn),
    index('idx_rcm_case_base_claim').on(table.baseClaimId),
  ]
);

/**
 * EDI Acknowledgement — durable 999/277CA/TA1 ack store (Phase 126).
 * Replaces in-memory Map in ack-status-processor.ts.
 */
export const pgEdiAck = pgTable(
  'edi_acknowledgement',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    type: text('type').notNull(),
    disposition: text('disposition').notNull(),
    claimId: text('claim_id'),
    originalControlNumber: text('original_control_number').notNull(),
    ackControlNumber: text('ack_control_number').notNull(),
    payerId: text('payer_id'),
    payerName: text('payer_name'),
    errorsJson: text('errors_json').notNull().default('[]'),
    rawPayload: text('raw_payload'),
    idempotencyKey: text('idempotency_key').notNull(),
    receivedAt: text('received_at').notNull(),
    processedAt: text('processed_at').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_edi_ack_tenant').on(table.tenantId),
    index('idx_edi_ack_claim').on(table.claimId),
    uniqueIndex('idx_edi_ack_idempotency').on(table.tenantId, table.idempotencyKey),
    index('idx_edi_ack_received').on(table.receivedAt),
  ]
);

/**
 * EDI Claim Status — durable 276/277 status update store (Phase 126).
 * Replaces in-memory Map in ack-status-processor.ts.
 */
export const pgEdiClaimStatus = pgTable(
  'edi_claim_status',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    claimId: text('claim_id'),
    payerClaimId: text('payer_claim_id'),
    categoryCode: text('category_code').notNull(),
    statusCode: text('status_code').notNull(),
    statusDescription: text('status_description').notNull(),
    effectiveDate: text('effective_date'),
    checkDate: text('check_date'),
    totalCharged: integer('total_charged'),
    totalPaid: integer('total_paid'),
    payerId: text('payer_id'),
    payerName: text('payer_name'),
    rawPayload: text('raw_payload'),
    idempotencyKey: text('idempotency_key').notNull(),
    receivedAt: text('received_at').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_edi_status_tenant').on(table.tenantId),
    index('idx_edi_status_claim').on(table.claimId),
    uniqueIndex('idx_edi_status_idempotency').on(table.tenantId, table.idempotencyKey),
    index('idx_edi_status_received').on(table.receivedAt),
  ]
);

/**
 * EDI Pipeline Entry — durable EDI pipeline tracking (Phase 126).
 * Replaces in-memory Map in pipeline.ts.
 */
export const pgEdiPipelineEntry = pgTable(
  'edi_pipeline_entry',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    claimId: text('claim_id').notNull(),
    transactionSet: text('transaction_set').notNull(),
    stage: text('stage').notNull().default('build'),
    connectorId: text('connector_id').notNull(),
    payerId: text('payer_id').notNull(),
    outboundPayload: text('outbound_payload'),
    inboundPayload: text('inbound_payload'),
    errorsJson: text('errors_json').notNull().default('[]'),
    attempts: integer('attempts').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    completedAt: text('completed_at'),
  },
  (table) => [
    index('idx_edi_pipeline_tenant').on(table.tenantId),
    index('idx_edi_pipeline_claim').on(table.claimId),
    index('idx_edi_pipeline_stage').on(table.stage),
    index('idx_edi_pipeline_payer').on(table.payerId),
  ]
);

/* ================================================================== */
/* Phase 127: Portal + Telehealth Durability (Map stores -> Postgres) */
/* ================================================================== */

/**
 * Portal Message — durable portal messaging (Phase 127).
 * Mirrors SQLite portal_message from Phase 115.
 */
export const pgPortalMessage = pgTable(
  'portal_message',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    threadId: text('thread_id').notNull(),
    fromDfn: text('from_dfn').notNull(),
    fromName: text('from_name').notNull(),
    toDfn: text('to_dfn').notNull(),
    toName: text('to_name').notNull(),
    subject: text('subject').notNull(),
    category: text('category').notNull().default('general'),
    body: text('body').notNull(),
    status: text('status').notNull().default('draft'),
    attachmentsJson: text('attachments_json').default('[]'),
    replyToId: text('reply_to_id'),
    vistaSync: boolean('vista_sync').default(false),
    vistaRef: text('vista_ref'),
    readAt: text('read_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_portal_msg_tenant').on(table.tenantId),
    index('idx_portal_msg_thread').on(table.threadId),
    index('idx_portal_msg_from').on(table.fromDfn),
    index('idx_portal_msg_to').on(table.toDfn),
    index('idx_portal_msg_status').on(table.status),
    index('idx_portal_msg_created').on(table.createdAt),
  ]
);

/**
 * Portal Access Log — durable portal access audit (Phase 127).
 * Mirrors SQLite portal_access_log from Phase 121.
 */
export const pgPortalAccessLog = pgTable(
  'portal_access_log',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    userId: text('user_id').notNull(),
    actorName: text('actor_name').notNull(),
    isProxy: boolean('is_proxy').notNull().default(false),
    targetPatientDfn: text('target_patient_dfn'),
    eventType: text('event_type').notNull(),
    description: text('description').notNull(),
    metadataJson: text('metadata_json').notNull().default('{}'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_portal_alog_tenant').on(table.tenantId),
    index('idx_portal_alog_user').on(table.userId),
    index('idx_portal_alog_event').on(table.eventType),
    index('idx_portal_alog_created').on(table.createdAt),
  ]
);

/**
 * Portal Patient Setting — durable patient preferences (Phase 127).
 * NEW table (no SQLite predecessor). Persists portal-settings.ts Map.
 */
export const pgPortalPatientSetting = pgTable(
  'portal_patient_setting',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    patientDfn: text('patient_dfn').notNull(),
    language: text('language').notNull().default('en'),
    notificationsJson: text('notifications_json').notNull().default('{}'),
    displayJson: text('display_json').notNull().default('{}'),
    mfaJson: text('mfa_json').notNull().default('{}'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_portal_setting_tenant').on(table.tenantId),
    uniqueIndex('idx_portal_setting_patient').on(table.tenantId, table.patientDfn),
  ]
);

/**
 * Telehealth Room — durable telehealth room state (Phase 127).
 * Mirrors SQLite telehealth_room from Phase 115.
 */
export const pgTelehealthRoom = pgTable(
  'telehealth_room',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    appointmentId: text('appointment_id'),
    patientDfn: text('patient_dfn').notNull(),
    providerDuz: text('provider_duz').notNull(),
    providerName: text('provider_name'),
    roomStatus: text('room_status').notNull().default('scheduled'),
    meetingUrl: text('meeting_url'),
    accessToken: text('access_token'),
    participantsJson: text('participants_json').default('{}'),
    scheduledStart: text('scheduled_start'),
    actualStart: text('actual_start'),
    actualEnd: text('actual_end'),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_th_room_tenant').on(table.tenantId),
    index('idx_th_room_patient').on(table.patientDfn),
    index('idx_th_room_provider').on(table.providerDuz),
    index('idx_th_room_status').on(table.roomStatus),
    index('idx_th_room_expires').on(table.expiresAt),
  ]
);

/**
 * Telehealth Room Event — room lifecycle event log (Phase 127).
 * NEW table — tracks join/leave/start/end events for auditing.
 */
export const pgTelehealthRoomEvent = pgTable(
  'telehealth_room_event',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    roomId: text('room_id').notNull(),
    eventType: text('event_type').notNull(),
    actorId: text('actor_id'),
    actorRole: text('actor_role'),
    detail: text('detail'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_th_event_tenant').on(table.tenantId),
    index('idx_th_event_room').on(table.roomId),
    index('idx_th_event_type').on(table.eventType),
    index('idx_th_event_created').on(table.createdAt),
  ]
);

/**
 * Imaging Work Item — durable imaging worklist order (Phase 128).
 * Mirrors the in-memory WorklistItem from imaging-worklist.ts.
 */
export const pgImagingWorkItem = pgTable(
  'imaging_work_item',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    vistaOrderId: text('vista_order_id'),
    patientDfn: text('patient_dfn').notNull(),
    patientName: text('patient_name').notNull().default(''),
    accessionNumber: text('accession_number').notNull(),
    scheduledProcedure: text('scheduled_procedure').notNull().default(''),
    procedureCode: text('procedure_code'),
    modality: text('modality').notNull(),
    scheduledTime: text('scheduled_time').notNull().default(''),
    facility: text('facility').notNull().default('DEFAULT'),
    location: text('location').notNull().default('Radiology'),
    orderingProviderDuz: text('ordering_provider_duz').notNull().default(''),
    orderingProviderName: text('ordering_provider_name').notNull().default(''),
    clinicalIndication: text('clinical_indication').notNull().default(''),
    priority: text('priority').notNull().default('routine'),
    status: text('status').notNull().default('ordered'),
    linkedStudyUid: text('linked_study_uid'),
    linkedOrthancStudyId: text('linked_orthanc_study_id'),
    source: text('source').notNull().default('prototype-sidecar'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_img_wi_tenant').on(table.tenantId),
    index('idx_img_wi_patient').on(table.patientDfn),
    index('idx_img_wi_accession').on(table.accessionNumber),
    index('idx_img_wi_modality').on(table.modality),
    index('idx_img_wi_status').on(table.status),
    index('idx_img_wi_scheduled').on(table.scheduledTime),
  ]
);

/**
 * Imaging Ingest Event — study linkage + unmatched quarantine (Phase 128).
 * Unified table for both linkages and unmatched studies (event_type discriminator).
 */
export const pgImagingIngestEvent = pgTable(
  'imaging_ingest_event',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    eventType: text('event_type').notNull(), // 'linkage' | 'unmatched'
    orderId: text('order_id'),
    patientDfn: text('patient_dfn').notNull().default(''),
    studyInstanceUid: text('study_instance_uid').notNull(),
    orthancStudyId: text('orthanc_study_id').notNull(),
    accessionNumber: text('accession_number').notNull().default(''),
    modality: text('modality').notNull().default(''),
    studyDate: text('study_date').notNull().default(''),
    studyDescription: text('study_description').notNull().default(''),
    seriesCount: integer('series_count').notNull().default(0),
    instanceCount: integer('instance_count').notNull().default(0),
    reconciliationType: text('reconciliation_type'),
    source: text('source').notNull().default('prototype-sidecar'),
    reason: text('reason'),
    resolved: boolean('resolved').notNull().default(false),
    dicomPatientName: text('dicom_patient_name').notNull().default(''),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_img_ie_tenant').on(table.tenantId),
    index('idx_img_ie_type').on(table.eventType),
    index('idx_img_ie_patient').on(table.patientDfn),
    index('idx_img_ie_study_uid').on(table.studyInstanceUid),
    index('idx_img_ie_order').on(table.orderId),
    index('idx_img_ie_accession').on(table.accessionNumber),
  ]
);

/**
 * Scheduling Waitlist Request — operational tracking (Phase 128).
 * NOT appointment truth (VistA is source). Tracks waitlist requests,
 * scheduling intents, and operational state.
 */
export const pgSchedulingWaitlistRequest = pgTable(
  'scheduling_waitlist_request',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    patientDfn: text('patient_dfn').notNull(),
    clinicName: text('clinic_name').notNull(),
    preferredDate: text('preferred_date').notNull(),
    priority: text('priority').notNull().default('routine'),
    status: text('status').notNull().default('pending'),
    reason: text('reason'),
    requestType: text('request_type').notNull().default('new_appointment'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_sched_wr_tenant').on(table.tenantId),
    index('idx_sched_wr_patient').on(table.patientDfn),
    index('idx_sched_wr_clinic').on(table.clinicName),
    index('idx_sched_wr_status').on(table.status),
    index('idx_sched_wr_date').on(table.preferredDate),
  ]
);

/**
 * Scheduling Booking Lock — TTL-based concurrency locks (Phase 128).
 * Prevents double-booking. Lock key = "dfn:date:clinic".
 * expires_at enforces TTL; safe concurrency via unique constraint.
 */
export const pgSchedulingBookingLock = pgTable(
  'scheduling_booking_lock',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    lockKey: text('lock_key').notNull(),
    holderDuz: text('holder_duz').notNull(),
    expiresAt: text('expires_at').notNull(),
    acquiredAt: text('acquired_at').notNull(),
  },
  (table) => [
    index('idx_sched_bl_tenant').on(table.tenantId),
    uniqueIndex('idx_sched_bl_key').on(table.tenantId, table.lockKey),
    index('idx_sched_bl_expires').on(table.expiresAt),
  ]
);

/**
 * Scheduling Lifecycle — operational state machine (Phase 131).
 * Tracks appointment lifecycle transitions for audit and UI.
 * States: requested, waitlisted, booked, checked_in, completed, cancelled, no_show
 * VistA remains source of truth. This tracks operational transitions only.
 */
export const pgSchedulingLifecycle = pgTable(
  'scheduling_lifecycle',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    appointmentRef: text('appointment_ref').notNull(),
    patientDfn: text('patient_dfn').notNull(),
    clinicIen: text('clinic_ien'),
    clinicName: text('clinic_name').notNull(),
    state: text('state').notNull().default('requested'),
    previousState: text('previous_state'),
    vistaIen: text('vista_ien'),
    rpcUsed: text('rpc_used'),
    transitionNote: text('transition_note'),
    createdByDuz: text('created_by_duz'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_sched_lc_tenant').on(table.tenantId),
    index('idx_sched_lc_patient').on(table.patientDfn),
    index('idx_sched_lc_ref').on(table.appointmentRef),
    index('idx_sched_lc_state').on(table.state),
    index('idx_sched_lc_clinic').on(table.clinicName),
    index('idx_sched_lc_created').on(table.createdAt),
  ]
);

/**
 * Phase 159: Queue Ticket
 * Durable department queue state. Mirrors queue/types.ts QueueTicket.
 */
export const pgQueueTicket = pgTable(
  'queue_ticket',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    department: text('department').notNull(),
    ticketNumber: text('ticket_number').notNull(),
    patientDfn: text('patient_dfn').notNull(),
    patientName: text('patient_name').notNull(),
    priority: text('priority').notNull().default('normal'),
    status: text('status').notNull().default('waiting'),
    providerDuz: text('provider_duz'),
    windowNumber: text('window_number'),
    notes: text('notes'),
    appointmentIen: text('appointment_ien'),
    transferredFrom: text('transferred_from'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    calledAt: timestamp('called_at', { withTimezone: true }),
    servedAt: timestamp('served_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_pg_queue_ticket_tenant').on(table.tenantId),
    index('idx_pg_queue_ticket_department').on(table.tenantId, table.department, table.status),
    index('idx_pg_queue_ticket_created').on(table.tenantId, table.createdAt),
  ]
);

/**
 * Phase 159: Queue Event
 * Append-only queue lifecycle audit log.
 */
export const pgQueueEvent = pgTable(
  'queue_event',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    ticketId: text('ticket_id').notNull(),
    eventType: text('event_type').notNull(),
    actorDuz: text('actor_duz'),
    detail: text('detail'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_pg_queue_event_tenant').on(table.tenantId),
    index('idx_pg_queue_event_ticket').on(table.tenantId, table.ticketId),
    index('idx_pg_queue_event_created').on(table.tenantId, table.createdAt),
  ]
);

/**
 * Phase 160: Workflow Definition
 * Durable department workflow blueprints.
 */
export const pgWorkflowDefinition = pgTable(
  'workflow_definition',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    department: text('department').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    version: integer('version').notNull().default(1),
    status: text('status').notNull().default('draft'),
    stepsJson: jsonb('steps_json').notNull().default([]),
    tagsJson: jsonb('tags_json').notNull().default([]),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_pg_workflow_definition_tenant').on(table.tenantId),
    index('idx_pg_workflow_definition_department').on(table.tenantId, table.department),
    index('idx_pg_workflow_definition_status').on(table.tenantId, table.status),
  ]
);

/**
 * Phase 160: Workflow Instance
 * Durable runtime workflow execution state.
 */
export const pgWorkflowInstance = pgTable(
  'workflow_instance',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    definitionId: text('definition_id').notNull(),
    department: text('department').notNull(),
    patientDfn: text('patient_dfn').notNull(),
    encounterRef: text('encounter_ref'),
    queueTicketId: text('queue_ticket_id'),
    status: text('status').notNull().default('not_started'),
    stepsJson: jsonb('steps_json').notNull().default([]),
    startedBy: text('started_by'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_pg_workflow_instance_tenant').on(table.tenantId),
    index('idx_pg_workflow_instance_department').on(table.tenantId, table.department),
    index('idx_pg_workflow_instance_patient').on(table.tenantId, table.patientDfn),
    index('idx_pg_workflow_instance_status').on(table.tenantId, table.status),
  ]
);

/**
 * Phase 132: User Locale Preference
 * Clinician language preference, persisted per user per tenant.
 */
export const pgUserLocalePreference = pgTable(
  'user_locale_preference',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    userDuz: text('user_duz').notNull(),
    locale: text('locale').notNull().default('en'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_ulp_tenant_duz').on(table.tenantId, table.userDuz),
    index('idx_ulp_tenant').on(table.tenantId),
  ]
);

/**
 * Phase 132: Intake Question Schema
 * Locale-aware question definitions for intake forms.
 * Each question_key can have multiple locale variants.
 */
export const pgIntakeQuestionSchema = pgTable(
  'intake_question_schema',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    questionKey: text('question_key').notNull(),
    locale: text('locale').notNull().default('en'),
    category: text('category').notNull().default('general'),
    questionText: text('question_text').notNull(),
    questionType: text('question_type').notNull().default('text'),
    optionsJson: text('options_json'),
    displayOrder: integer('display_order').notNull().default(0),
    required: boolean('required').notNull().default(false),
    active: boolean('active').notNull().default(true),
    vistaFieldTarget: text('vista_field_target'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_iqs_key_locale').on(table.tenantId, table.questionKey, table.locale),
    index('idx_iqs_tenant').on(table.tenantId),
    index('idx_iqs_locale').on(table.locale),
    index('idx_iqs_category').on(table.category),
    index('idx_iqs_active').on(table.active),
  ]
);

/**
 * Phase 139: Clinic Preferences
 * Tenant-scoped scheduling display preferences per clinic.
 * VistA remains the master clinic record; preferences are overlay config.
 */
export const pgClinicPreferences = pgTable(
  'clinic_preferences',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    clinicIen: text('clinic_ien').notNull(),
    clinicName: text('clinic_name').notNull(),
    timezone: text('timezone').notNull().default('America/New_York'),
    slotDurationMinutes: integer('slot_duration_minutes').notNull().default(30),
    maxDailySlots: integer('max_daily_slots').notNull().default(20),
    displayConfig: text('display_config'),
    operatingHours: text('operating_hours'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_cp_tenant').on(table.tenantId),
    index('idx_cp_clinic').on(table.clinicIen),
    index('idx_cp_tenant_clinic').on(table.tenantId, table.clinicIen),
  ]
);

/**
 * Phase 140: Patient Consent
 * Tracks patient consent decisions (HIPAA, research, data sharing, etc.).
 * Tenant-scoped, patient-keyed by DFN.
 */
export const pgPatientConsent = pgTable(
  'patient_consent',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    patientDfn: text('patient_dfn').notNull(),
    consentType: text('consent_type').notNull(),
    status: text('status').notNull().default('pending'),
    signedAt: text('signed_at'),
    revokedAt: text('revoked_at'),
    locale: text('locale').notNull().default('en'),
    version: integer('version').notNull().default(1),
    metadata: text('metadata'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_pc_tenant').on(table.tenantId),
    index('idx_pc_patient').on(table.patientDfn),
    index('idx_pc_type').on(table.consentType),
    index('idx_pc_tenant_patient').on(table.tenantId, table.patientDfn),
  ]
);

/**
 * Phase 140: Patient Portal Preferences
 * User-level portal configuration (notifications, display, language).
 * Tenant-scoped, patient-keyed by DFN.
 */
export const pgPatientPortalPref = pgTable(
  'patient_portal_pref',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    patientDfn: text('patient_dfn').notNull(),
    notifications: text('notifications'),
    language: text('language').notNull().default('en'),
    displayPrefs: text('display_prefs'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_ppp_tenant').on(table.tenantId),
    index('idx_ppp_patient').on(table.patientDfn),
    index('idx_ppp_tenant_patient').on(table.tenantId, table.patientDfn),
  ]
);

/* ================================================================
 *  Phase 174: RCM Domain Tables — PG parity with SQLite
 *  Mirrors the 12 tables from db/schema.ts that previously only
 *  lived in SQLite.  Same export names for minimal import-path-only
 *  migration in consuming RCM modules.
 * ================================================================ */

/** Integration evidence — payer connectivity research artifacts. */
export const integrationEvidence = pgTable(
  'integration_evidence',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    payerId: text('payer_id').notNull(),
    method: text('method').notNull(),
    channel: text('channel'),
    source: text('source').notNull(),
    sourceType: text('source_type').notNull().default('url'),
    contactInfo: text('contact_info'),
    submissionRequirements: text('submission_requirements'),
    supportedChannelsJson: text('supported_channels_json').default('[]'),
    lastVerifiedAt: text('last_verified_at'),
    verifiedBy: text('verified_by'),
    status: text('status').notNull().default('unverified'),
    confidence: text('confidence').notNull().default('unknown'),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_ie_tenant').on(table.tenantId), index('idx_ie_payer').on(table.payerId)]
);

/** LOA (Letter of Authorization) request — prior auth / referral workflows. */
export const loaRequest = pgTable(
  'loa_request',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    patientDfn: text('patient_dfn').notNull(),
    patientName: text('patient_name'),
    payerId: text('payer_id').notNull(),
    payerName: text('payer_name'),
    encounterIen: text('encounter_ien'),
    orderIen: text('order_ien'),
    loaType: text('loa_type').notNull(),
    status: text('status').notNull().default('draft'),
    urgency: text('urgency').notNull().default('standard'),
    diagnosisCodesJson: text('diagnosis_codes_json').default('[]'),
    procedureCodesJson: text('procedure_codes_json').default('[]'),
    clinicalSummary: text('clinical_summary'),
    requestedServiceDesc: text('requested_service_desc'),
    requestedBy: text('requested_by').notNull(),
    requestedAt: text('requested_at').notNull(),
    authorizationNumber: text('authorization_number'),
    approvedUnits: integer('approved_units'),
    approvedFrom: text('approved_from'),
    approvedThrough: text('approved_through'),
    denialReason: text('denial_reason'),
    packetGeneratedAt: text('packet_generated_at'),
    submittedAt: text('submitted_at'),
    resolvedAt: text('resolved_at'),
    metadataJson: text('metadata_json').default('{}'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_loa_tenant').on(table.tenantId),
    index('idx_loa_patient').on(table.patientDfn),
    index('idx_loa_payer').on(table.payerId),
    index('idx_loa_status').on(table.status),
  ]
);

/** LOA attachment — supporting documents for LOA requests. */
export const loaAttachment = pgTable(
  'loa_attachment',
  {
    id: text('id').primaryKey(),
    loaRequestId: text('loa_request_id').notNull(),
    tenantId: text('tenant_id').notNull().default('default'),
    attachmentType: text('attachment_type').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    storagePath: text('storage_path'),
    inlineContent: text('inline_content'),
    description: text('description'),
    addedBy: text('added_by').notNull(),
    addedAt: text('added_at').notNull(),
  },
  (table) => [index('idx_la_tenant').on(table.tenantId), index('idx_la_loa').on(table.loaRequestId)]
);

/** Accreditation status — payer enrollment/credentialing status. */
export const accreditationStatus = pgTable(
  'accreditation_status',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    payerId: text('payer_id').notNull(),
    payerName: text('payer_name').notNull(),
    providerEntityId: text('provider_entity_id').notNull(),
    status: text('status').notNull().default('pending'),
    effectiveDate: text('effective_date'),
    expirationDate: text('expiration_date'),
    lastVerifiedAt: text('last_verified_at'),
    lastVerifiedBy: text('last_verified_by'),
    notesJson: text('notes_json').default('[]'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    createdBy: text('created_by').notNull(),
  },
  (table) => [
    index('idx_as_tenant').on(table.tenantId),
    index('idx_as_payer').on(table.payerId),
    index('idx_as_entity').on(table.providerEntityId),
  ]
);

/** Accreditation task — action items for credentialing workflows. */
export const accreditationTask = pgTable(
  'accreditation_task',
  {
    id: text('id').primaryKey(),
    accreditationId: text('accreditation_id').notNull(),
    tenantId: text('tenant_id').notNull().default('default'),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull().default('pending'),
    priority: text('priority').notNull().default('medium'),
    dueDate: text('due_date'),
    assignedTo: text('assigned_to'),
    completedAt: text('completed_at'),
    completedBy: text('completed_by'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_at_tenant').on(table.tenantId),
    index('idx_at_accred').on(table.accreditationId),
  ]
);

/** Credential artifact — provider/facility credentials (NPI, DEA, etc.). */
export const credentialArtifact = pgTable(
  'credential_artifact',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    entityName: text('entity_name').notNull(),
    credentialType: text('credential_type').notNull(),
    credentialValue: text('credential_value').notNull(),
    issuingAuthority: text('issuing_authority'),
    state: text('state'),
    status: text('status').notNull().default('active'),
    issuedAt: text('issued_at'),
    expiresAt: text('expires_at'),
    renewalReminderDays: integer('renewal_reminder_days').default(90),
    verifiedAt: text('verified_at'),
    verifiedBy: text('verified_by'),
    metadataJson: text('metadata_json').default('{}'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    createdBy: text('created_by').notNull(),
  },
  (table) => [
    index('idx_ca_tenant').on(table.tenantId),
    index('idx_ca_entity').on(table.entityType, table.entityId),
    index('idx_ca_type').on(table.credentialType),
  ]
);

/** Credential document — file attachments for credential artifacts. */
export const credentialDocument = pgTable(
  'credential_document',
  {
    id: text('id').primaryKey(),
    credentialId: text('credential_id').notNull(),
    tenantId: text('tenant_id').notNull().default('default'),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    storagePath: text('storage_path').notNull(),
    fileSizeBytes: integer('file_size_bytes'),
    sha256Hash: text('sha256_hash'),
    uploadedBy: text('uploaded_by').notNull(),
    uploadedAt: text('uploaded_at').notNull(),
  },
  (table) => [
    index('idx_cd_tenant').on(table.tenantId),
    index('idx_cd_cred').on(table.credentialId),
  ]
);

/** Claim draft — full claim lifecycle entity. */
export const claimDraft = pgTable(
  'claim_draft',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    idempotencyKey: text('idempotency_key'),
    status: text('status').notNull().default('draft'),
    claimType: text('claim_type').notNull().default('professional'),
    encounterId: text('encounter_id'),
    patientId: text('patient_id').notNull(),
    patientName: text('patient_name'),
    providerId: text('provider_id').notNull(),
    billingProviderId: text('billing_provider_id'),
    payerId: text('payer_id').notNull(),
    payerName: text('payer_name'),
    dateOfService: text('date_of_service').notNull(),
    diagnosesJson: text('diagnoses_json').default('[]'),
    linesJson: text('lines_json').default('[]'),
    attachmentsJson: text('attachments_json').default('[]'),
    totalChargeCents: integer('total_charge_cents').default(0),
    denialCode: text('denial_code'),
    denialReason: text('denial_reason'),
    appealPacketRef: text('appeal_packet_ref'),
    resubmissionOf: text('resubmission_of'),
    resubmissionCount: integer('resubmission_count').default(0),
    paidAmountCents: integer('paid_amount_cents'),
    adjustmentCents: integer('adjustment_cents'),
    patientRespCents: integer('patient_resp_cents'),
    scrubScore: integer('scrub_score'),
    lastScrubAt: text('last_scrub_at'),
    submittedAt: text('submitted_at'),
    paidAt: text('paid_at'),
    deniedAt: text('denied_at'),
    closedAt: text('closed_at'),
    vistaChargeIen: text('vista_charge_ien'),
    vistaArIen: text('vista_ar_ien'),
    metadataJson: text('metadata_json').default('{}'),
    auditJson: text('audit_json').default('[]'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    createdBy: text('created_by').notNull(),
  },
  (table) => [
    index('idx_cd2_tenant').on(table.tenantId),
    index('idx_cd2_patient').on(table.patientId),
    index('idx_cd2_payer').on(table.payerId),
    index('idx_cd2_status').on(table.status),
    index('idx_cd2_dos').on(table.dateOfService),
  ]
);

/** Claim lifecycle event — status transitions for claim drafts. */
export const claimLifecycleEvent = pgTable(
  'claim_lifecycle_event',
  {
    id: text('id').primaryKey(),
    claimDraftId: text('claim_draft_id').notNull(),
    tenantId: text('tenant_id').notNull().default('default'),
    fromStatus: text('from_status'),
    toStatus: text('to_status').notNull(),
    actor: text('actor').notNull(),
    reason: text('reason'),
    denialCode: text('denial_code'),
    resubmissionRef: text('resubmission_ref'),
    detailJson: text('detail_json').default('{}'),
    occurredAt: text('occurred_at').notNull(),
  },
  (table) => [
    index('idx_cle_tenant').on(table.tenantId),
    index('idx_cle_claim').on(table.claimDraftId),
  ]
);

/** Scrub rule — payer-specific and universal claim validation rules. */
export const scrubRule = pgTable(
  'scrub_rule',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    payerId: text('payer_id'),
    serviceType: text('service_type'),
    ruleCode: text('rule_code').notNull(),
    category: text('category').notNull(),
    severity: text('severity').notNull().default('error'),
    field: text('field').notNull(),
    description: text('description').notNull(),
    conditionJson: text('condition_json').notNull(),
    suggestedFix: text('suggested_fix'),
    evidenceSource: text('evidence_source'),
    evidenceDate: text('evidence_date'),
    blocksSubmission: integer('blocks_submission').notNull().default(1),
    isActive: integer('is_active').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    createdBy: text('created_by').notNull(),
  },
  (table) => [
    index('idx_sr_tenant').on(table.tenantId),
    index('idx_sr_payer').on(table.payerId),
    index('idx_sr_code').on(table.ruleCode),
  ]
);

/** Scrub result — individual scrub findings for a claim draft. */
export const scrubResult = pgTable(
  'scrub_result',
  {
    id: text('id').primaryKey(),
    claimDraftId: text('claim_draft_id').notNull(),
    tenantId: text('tenant_id').notNull().default('default'),
    ruleId: text('rule_id'),
    ruleCode: text('rule_code').notNull(),
    severity: text('severity').notNull(),
    category: text('category').notNull(),
    field: text('field').notNull(),
    message: text('message').notNull(),
    suggestedFix: text('suggested_fix'),
    blocksSubmission: integer('blocks_submission').notNull().default(1),
    score: integer('score').notNull().default(100),
    scrubbedAt: text('scrubbed_at').notNull(),
  },
  (table) => [
    index('idx_sres_tenant').on(table.tenantId),
    index('idx_sres_claim').on(table.claimDraftId),
  ]
);

/** RCM durable job — persistent job queue for RCM background tasks. */
export const rcmDurableJob = pgTable(
  'rcm_durable_job',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    type: text('type').notNull(),
    status: text('status').notNull().default('queued'),
    payloadJson: text('payload_json').notNull().default('{}'),
    resultJson: text('result_json'),
    error: text('error'),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    idempotencyKey: text('idempotency_key'),
    priority: integer('priority').notNull().default(5),
    scheduledAt: text('scheduled_at').notNull(),
    startedAt: text('started_at'),
    completedAt: text('completed_at'),
    nextRetryAt: text('next_retry_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_rdj_tenant').on(table.tenantId),
    index('idx_rdj_type').on(table.type),
    index('idx_rdj_status').on(table.status),
  ]
);

/* ================================================================
 *  Phase 174: Module Entitlement Tables — PG parity with SQLite
 * ================================================================ */

/** Module catalog — registered system modules. */
export const moduleCatalog = pgTable('module_catalog', {
  moduleId: text('module_id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  version: text('version').notNull().default('1.0.0'),
  alwaysEnabled: integer('always_enabled').notNull().default(0),
  dependenciesJson: text('dependencies_json').notNull().default('[]'),
  routePatternsJson: text('route_patterns_json').notNull().default('[]'),
  adaptersJson: text('adapters_json').notNull().default('[]'),
  permissionsJson: text('permissions_json').notNull().default('[]'),
  dataStoresJson: text('data_stores_json').notNull().default('[]'),
  healthCheckEndpoint: text('health_check_endpoint'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/** Tenant module — per-tenant module enablement. */
export const tenantModule = pgTable(
  'tenant_module',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    moduleId: text('module_id').notNull(),
    enabled: integer('enabled').notNull().default(0),
    planTier: text('plan_tier').notNull().default('base'),
    enabledAt: text('enabled_at'),
    disabledAt: text('disabled_at'),
    enabledBy: text('enabled_by'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_tm_tenant').on(table.tenantId),
    uniqueIndex('idx_tm_tenant_module').on(table.tenantId, table.moduleId),
  ]
);

/** Tenant feature flag — per-tenant configuration overrides. */
export const tenantFeatureFlag = pgTable(
  'tenant_feature_flag',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    flagKey: text('flag_key').notNull(),
    flagValue: text('flag_value').notNull().default('true'),
    moduleId: text('module_id'),
    description: text('description'),
    rolloutPercentage: integer('rollout_percentage').default(100),
    userTargeting: jsonb('user_targeting').default([]),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_tff_tenant2').on(table.tenantId),
    uniqueIndex('idx_tff_tenant_key').on(table.tenantId, table.flagKey),
  ]
);

/* ================================================================
 *  PAYER DOSSIER TABLES (Phase 514 — Wave 37 B2)
 * ================================================================ */

/** Payer dossier — comprehensive enrichment profile for a payer. */
export const payerDossier = pgTable(
  'payer_dossier',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    payerId: text('payer_id')
      .notNull()
      .references(() => payer.id),
    countryCode: text('country_code').notNull(),
    displayName: text('display_name').notNull(),
    enrichmentJson: jsonb('enrichment_json').notNull().default({}),
    contactJson: jsonb('contact_json').notNull().default({}),
    timingJson: jsonb('timing_json').notNull().default({}),
    complianceJson: jsonb('compliance_json').notNull().default({}),
    status: text('status').notNull().default('draft'),
    completenessScore: integer('completeness_score').notNull().default(0),
    version: integer('version').notNull().default(1),
    updatedBy: text('updated_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_dossier_tenant').on(table.tenantId),
    index('idx_dossier_payer').on(table.payerId),
    uniqueIndex('idx_dossier_tenant_payer').on(table.tenantId, table.payerId),
  ]
);

/** Payer onboarding task — workflow step to activate payer connectivity. */
export const payerOnboardingTask = pgTable(
  'payer_onboarding_task',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    dossierId: text('dossier_id')
      .notNull()
      .references(() => payerDossier.id),
    payerId: text('payer_id')
      .notNull()
      .references(() => payer.id),
    taskType: text('task_type').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull().default('pending'),
    assignee: text('assignee'),
    dueDate: timestamp('due_date', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    completedBy: text('completed_by'),
    evidenceJson: jsonb('evidence_json'),
    sortOrder: integer('sort_order').notNull().default(0),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_onboard_tenant').on(table.tenantId),
    index('idx_onboard_dossier').on(table.dossierId),
    index('idx_onboard_payer').on(table.payerId),
    index('idx_onboard_status').on(table.status),
  ]
);

/** Module audit log — append-only change history. */
export const moduleAuditLog = pgTable(
  'module_audit_log',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    actorId: text('actor_id').notNull(),
    actorType: text('actor_type').notNull().default('user'),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    action: text('action').notNull(),
    beforeJson: text('before_json'),
    afterJson: text('after_json'),
    reason: text('reason'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_mal_tenant_created2').on(table.tenantId, table.createdAt)]
);

/* ================================================================
 *  WAVE 38: SERVICE-LINE + DEVICE + RADIOLOGY DURABILITY TABLES
 * ================================================================ */

// ── Phase 523 (C2): Emergency Department ─────────────────────────

/** ED Visit — full lifecycle from arrival through disposition. */
export const pgEdVisit = pgTable(
  'ed_visit',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    patientDfn: text('patient_dfn').notNull(),
    status: text('status').notNull().default('waiting'),
    arrivalTime: timestamp('arrival_time', { withTimezone: true }).notNull(),
    arrivalMode: text('arrival_mode').notNull(),
    triageJson: jsonb('triage_json'),
    bedAssignmentJson: jsonb('bed_assignment_json'),
    attendingProvider: text('attending_provider'),
    disposition: text('disposition'),
    dispositionTime: timestamp('disposition_time', { withTimezone: true }),
    dispositionBy: text('disposition_by'),
    admitOrderIen: text('admit_order_ien'),
    createdBy: text('created_by'),
    totalMinutes: integer('total_minutes'),
    doorToProviderMinutes: integer('door_to_provider_minutes'),
    doorToDispositionMinutes: integer('door_to_disposition_minutes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_ed_visit_tenant').on(table.tenantId),
    index('idx_ed_visit_patient').on(table.patientDfn),
    index('idx_ed_visit_status').on(table.status),
    index('idx_ed_visit_arrival').on(table.arrivalTime),
  ]
);

/** ED Bed — bed inventory and occupancy status. */
export const pgEdBed = pgTable(
  'ed_bed',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    zone: text('zone').notNull(),
    bedNumber: text('bed_number').notNull(),
    status: text('status').notNull().default('available'),
    currentVisitId: text('current_visit_id'),
    lastCleanedAt: timestamp('last_cleaned_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_ed_bed_tenant').on(table.tenantId),
    index('idx_ed_bed_status').on(table.status),
  ]
);

// ── Phase 524 (C3): Operating Room / Anesthesia ──────────────────

/** OR Case — surgical case lifecycle with milestone tracking. */
export const pgOrCase = pgTable(
  'or_case',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    patientDfn: text('patient_dfn').notNull(),
    status: text('status').notNull().default('scheduled'),
    priority: text('priority').notNull().default('elective'),
    roomId: text('room_id'),
    scheduledDate: text('scheduled_date').notNull(),
    scheduledStartTime: text('scheduled_start_time'),
    estimatedDurationMin: integer('estimated_duration_min').notNull(),
    surgeon: text('surgeon').notNull(),
    assistants: jsonb('assistants').notNull().default([]),
    procedure: text('procedure').notNull(),
    procedureCpt: text('procedure_cpt'),
    laterality: text('laterality'),
    anesthesiaJson: jsonb('anesthesia_json'),
    milestonesJson: jsonb('milestones_json').notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_or_case_tenant').on(table.tenantId),
    index('idx_or_case_patient').on(table.patientDfn),
    index('idx_or_case_status').on(table.status),
    index('idx_or_case_date').on(table.scheduledDate),
  ]
);

/** OR Room — operating room inventory and status. */
export const pgOrRoom = pgTable(
  'or_room',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    name: text('name').notNull(),
    location: text('location').notNull(),
    status: text('status').notNull().default('available'),
    currentCaseId: text('current_case_id'),
    capabilities: jsonb('capabilities').notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_or_room_tenant').on(table.tenantId),
    index('idx_or_room_status').on(table.status),
  ]
);

/** OR Block — surgical block time allocations. */
export const pgOrBlock = pgTable(
  'or_block',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    roomId: text('room_id').notNull(),
    serviceId: text('service_id').notNull(),
    dayOfWeek: integer('day_of_week').notNull(),
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    surgeon: text('surgeon'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_or_block_tenant').on(table.tenantId),
    index('idx_or_block_room').on(table.roomId),
  ]
);

// ── Phase 525 (C4): ICU ─────────────────────────────────────────

/** ICU Admission — patient admission through discharge. */
export const pgIcuAdmission = pgTable(
  'icu_admission',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    patientDfn: text('patient_dfn').notNull(),
    bedId: text('bed_id').notNull(),
    unit: text('unit').notNull(),
    status: text('status').notNull().default('active'),
    admitTime: timestamp('admit_time', { withTimezone: true }).notNull(),
    admitSource: text('admit_source').notNull(),
    attendingProvider: text('attending_provider').notNull(),
    diagnosis: text('diagnosis').notNull(),
    codeStatus: text('code_status').notNull().default('full'),
    isolationPrecautions: jsonb('isolation_precautions'),
    dischargeTime: timestamp('discharge_time', { withTimezone: true }),
    dischargeDisposition: text('discharge_disposition'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_icu_adm_tenant').on(table.tenantId),
    index('idx_icu_adm_patient').on(table.patientDfn),
    index('idx_icu_adm_status').on(table.status),
    index('idx_icu_adm_unit').on(table.unit),
  ]
);

/** ICU Bed — bed inventory and status by unit. */
export const pgIcuBed = pgTable(
  'icu_bed',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    unit: text('unit').notNull(),
    bedNumber: text('bed_number').notNull(),
    status: text('status').notNull().default('available'),
    currentAdmissionId: text('current_admission_id'),
    monitors: jsonb('monitors').notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_icu_bed_tenant').on(table.tenantId),
    index('idx_icu_bed_unit').on(table.unit),
    index('idx_icu_bed_status').on(table.status),
  ]
);

/** ICU Flowsheet Entry — clinical observation charting. */
export const pgIcuFlowsheetEntry = pgTable(
  'icu_flowsheet_entry',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    admissionId: text('admission_id').notNull(),
    category: text('category').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    recordedBy: text('recorded_by').notNull(),
    valuesJson: jsonb('values_json').notNull().default({}),
    validated: boolean('validated').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_icu_fs_tenant').on(table.tenantId),
    index('idx_icu_fs_admission').on(table.admissionId),
    index('idx_icu_fs_category').on(table.category),
    index('idx_icu_fs_timestamp').on(table.timestamp),
  ]
);

/** ICU Ventilator Record — ventilator settings history. */
export const pgIcuVentRecord = pgTable(
  'icu_vent_record',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    admissionId: text('admission_id').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    mode: text('mode').notNull(),
    tidalVolume: integer('tidal_volume'),
    respiratoryRate: integer('respiratory_rate'),
    peep: integer('peep').notNull(),
    fio2: text('fio2').notNull(),
    pressureSupport: integer('pressure_support'),
    inspiratoryPressure: integer('inspiratory_pressure'),
    pip: integer('pip'),
    plateau: integer('plateau'),
    compliance: integer('compliance'),
    recordedBy: text('recorded_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_icu_vent_tenant').on(table.tenantId),
    index('idx_icu_vent_admission').on(table.admissionId),
    index('idx_icu_vent_timestamp').on(table.timestamp),
  ]
);

/** ICU Intake/Output Record — fluid balance tracking. */
export const pgIcuIoRecord = pgTable(
  'icu_io_record',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    admissionId: text('admission_id').notNull(),
    type: text('type').notNull(),
    source: text('source').notNull(),
    volumeMl: integer('volume_ml').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    recordedBy: text('recorded_by').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_icu_io_tenant').on(table.tenantId),
    index('idx_icu_io_admission').on(table.admissionId),
    index('idx_icu_io_type').on(table.type),
  ]
);

/** ICU Severity Score — APACHE-II, SOFA, GCS, etc. */
export const pgIcuScore = pgTable(
  'icu_score',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    admissionId: text('admission_id').notNull(),
    scoreType: text('score_type').notNull(),
    score: integer('score').notNull(),
    componentsJson: jsonb('components_json'),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    calculatedBy: text('calculated_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_icu_score_tenant').on(table.tenantId),
    index('idx_icu_score_admission').on(table.admissionId),
    index('idx_icu_score_type').on(table.scoreType),
  ]
);

// ── Phase 526 (C5): Device Registry ─────────────────────────────

/** Managed Device — physical medical device inventory. */
export const pgManagedDevice = pgTable(
  'managed_device',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    name: text('name').notNull(),
    manufacturer: text('manufacturer').notNull(),
    model: text('model').notNull(),
    serialNumber: text('serial_number').notNull(),
    deviceClass: text('device_class').notNull(),
    protocols: jsonb('protocols').notNull().default([]),
    gatewayId: text('gateway_id'),
    status: text('status').notNull().default('active'),
    firmwareVersion: text('firmware_version'),
    lastCalibration: timestamp('last_calibration', { withTimezone: true }),
    nextCalibration: timestamp('next_calibration', { withTimezone: true }),
    metadataJson: jsonb('metadata_json').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_mdev_tenant').on(table.tenantId),
    uniqueIndex('idx_mdev_tenant_serial').on(table.tenantId, table.serialNumber),
    index('idx_mdev_class').on(table.deviceClass),
    index('idx_mdev_status').on(table.status),
    index('idx_mdev_gateway').on(table.gatewayId),
  ]
);

/** Device Patient Association — device-to-patient binding. */
export const pgDevicePatientAssociation = pgTable(
  'device_patient_association',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    deviceId: text('device_id').notNull(),
    patientDfn: text('patient_dfn').notNull(),
    location: text('location'),
    facilityCode: text('facility_code'),
    status: text('status').notNull().default('active'),
    associatedBy: text('associated_by').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_dpa_tenant').on(table.tenantId),
    index('idx_dpa_device').on(table.deviceId),
    index('idx_dpa_patient').on(table.patientDfn),
    index('idx_dpa_status').on(table.status),
  ]
);

/** Device Location Mapping — device-to-ward/room/bed binding. */
export const pgDeviceLocationMapping = pgTable(
  'device_location_mapping',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    deviceId: text('device_id').notNull(),
    ward: text('ward').notNull(),
    room: text('room').notNull(),
    bed: text('bed').notNull(),
    facilityCode: text('facility_code').notNull(),
    active: boolean('active').notNull().default(true),
    mappedAt: timestamp('mapped_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_dlm_tenant').on(table.tenantId),
    index('idx_dlm_device').on(table.deviceId),
    index('idx_dlm_ward').on(table.ward),
  ]
);

/** Device Audit Log — append-only device lifecycle events. */
export const pgDeviceAuditLog = pgTable(
  'device_audit_log',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    deviceId: text('device_id').notNull(),
    action: text('action').notNull(),
    actor: text('actor').notNull(),
    detail: jsonb('detail').notNull().default({}),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_dal_tenant').on(table.tenantId),
    index('idx_dal_device').on(table.deviceId),
    index('idx_dal_timestamp').on(table.timestamp),
  ]
);

// ── Phase 528 (C7): Radiology ───────────────────────────────────

/** Radiology Order — order lifecycle with protocol assignment. */
export const pgRadiologyOrder = pgTable(
  'radiology_order',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    patientDfn: text('patient_dfn').notNull(),
    vistaOrderIen: text('vista_order_ien'),
    vistaRadProcIen: text('vista_rad_proc_ien'),
    status: text('status').notNull().default('ordered'),
    procedureName: text('procedure_name').notNull(),
    procedureCode: text('procedure_code'),
    cptCode: text('cpt_code'),
    modality: text('modality').notNull(),
    priority: text('priority').notNull().default('routine'),
    clinicalIndication: text('clinical_indication').notNull(),
    orderingProviderDuz: text('ordering_provider_duz').notNull(),
    orderingProviderName: text('ordering_provider_name').notNull(),
    protocolName: text('protocol_name'),
    protocolAssignedByDuz: text('protocol_assigned_by_duz'),
    protocolAssignedAt: timestamp('protocol_assigned_at', { withTimezone: true }),
    mwlWorklistItemId: text('mwl_worklist_item_id'),
    mppsRecordId: text('mpps_record_id'),
    studyInstanceUid: text('study_instance_uid'),
    accessionNumber: text('accession_number'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_rad_order_tenant').on(table.tenantId),
    index('idx_rad_order_patient').on(table.patientDfn),
    index('idx_rad_order_status').on(table.status),
    index('idx_rad_order_modality').on(table.modality),
    index('idx_rad_order_accession').on(table.accessionNumber),
  ]
);

/** Radiology Reading Worklist — study-to-radiologist assignment. */
export const pgReadingWorklistItem = pgTable(
  'reading_worklist_item',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    radOrderId: text('rad_order_id').notNull(),
    patientDfn: text('patient_dfn').notNull(),
    studyInstanceUid: text('study_instance_uid').notNull(),
    accessionNumber: text('accession_number').notNull(),
    modality: text('modality').notNull(),
    procedureName: text('procedure_name').notNull(),
    status: text('status').notNull().default('unread'),
    priority: text('priority').notNull().default('routine'),
    assignedRadiologistDuz: text('assigned_radiologist_duz'),
    assignedRadiologistName: text('assigned_radiologist_name'),
    assignedAt: timestamp('assigned_at', { withTimezone: true }),
    reportStartedAt: timestamp('report_started_at', { withTimezone: true }),
    reportFinalizedAt: timestamp('report_finalized_at', { withTimezone: true }),
    priorStudyCount: integer('prior_study_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_rwi_tenant').on(table.tenantId),
    index('idx_rwi_order').on(table.radOrderId),
    index('idx_rwi_status').on(table.status),
    index('idx_rwi_radiologist').on(table.assignedRadiologistDuz),
  ]
);

/** Radiology Report — report lifecycle (draft -> prelim -> final). */
export const pgRadReport = pgTable(
  'rad_report',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    radOrderId: text('rad_order_id').notNull(),
    readingWorklistItemId: text('reading_worklist_item_id').notNull(),
    patientDfn: text('patient_dfn').notNull(),
    studyInstanceUid: text('study_instance_uid').notNull(),
    accessionNumber: text('accession_number').notNull(),
    status: text('status').notNull().default('draft'),
    findings: text('findings').notNull().default(''),
    impression: text('impression').notNull().default(''),
    reportText: text('report_text').notNull().default(''),
    templateId: text('template_id'),
    dictatedByDuz: text('dictated_by_duz').notNull(),
    dictatedByName: text('dictated_by_name').notNull(),
    dictatedAt: timestamp('dictated_at', { withTimezone: true }).notNull(),
    prelimSignedByDuz: text('prelim_signed_by_duz'),
    prelimSignedByName: text('prelim_signed_by_name'),
    prelimSignedAt: timestamp('prelim_signed_at', { withTimezone: true }),
    verifiedByDuz: text('verified_by_duz'),
    verifiedByName: text('verified_by_name'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    vistaTiuNoteIen: text('vista_tiu_note_ien'),
    criticalFinding: boolean('critical_finding').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_rad_rpt_tenant').on(table.tenantId),
    index('idx_rad_rpt_order').on(table.radOrderId),
    index('idx_rad_rpt_status').on(table.status),
    index('idx_rad_rpt_patient').on(table.patientDfn),
  ]
);

/** Radiation Dose Registry — dose tracking with DRL comparison. */
export const pgDoseRegistryEntry = pgTable(
  'dose_registry_entry',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    patientDfn: text('patient_dfn').notNull(),
    radOrderId: text('rad_order_id').notNull(),
    studyInstanceUid: text('study_instance_uid').notNull(),
    accessionNumber: text('accession_number').notNull(),
    modality: text('modality').notNull(),
    procedureName: text('procedure_name').notNull(),
    ctdiVol: text('ctdi_vol'),
    dlp: text('dlp'),
    dap: text('dap'),
    fluoroTimeSec: integer('fluoro_time_sec'),
    exposureCount: integer('exposure_count'),
    effectiveDoseMSv: text('effective_dose_msv'),
    exceedsDrl: boolean('exceeds_drl').notNull().default(false),
    drlThreshold: text('drl_threshold'),
    drlMetric: text('drl_metric'),
    mppsRecordId: text('mpps_record_id'),
    performedAt: timestamp('performed_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_dose_tenant').on(table.tenantId),
    index('idx_dose_patient').on(table.patientDfn),
    index('idx_dose_modality').on(table.modality),
    index('idx_dose_exceeds').on(table.exceedsDrl),
  ]
);

/** Radiology Critical Alert — critical finding communication tracking. */
export const pgRadCriticalAlert = pgTable(
  'rad_critical_alert',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    radReportId: text('rad_report_id').notNull(),
    radOrderId: text('rad_order_id').notNull(),
    patientDfn: text('patient_dfn').notNull(),
    finding: text('finding').notNull(),
    category: text('category').notNull(),
    status: text('status').notNull().default('active'),
    notifyProviderDuz: text('notify_provider_duz').notNull(),
    notifyProviderName: text('notify_provider_name').notNull(),
    communicatedToDuz: text('communicated_to_duz'),
    communicatedToName: text('communicated_to_name'),
    communicatedAt: timestamp('communicated_at', { withTimezone: true }),
    communicationMethod: text('communication_method'),
    acknowledgedByDuz: text('acknowledged_by_duz'),
    acknowledgedByName: text('acknowledged_by_name'),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    communicationDeadlineMinutes: integer('communication_deadline_minutes').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_rca_tenant').on(table.tenantId),
    index('idx_rca_status').on(table.status),
    index('idx_rca_patient').on(table.patientDfn),
  ]
);

/** Radiology Peer Review — RADPEER quality scoring. */
export const pgPeerReview = pgTable(
  'peer_review',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull().default('default'),
    radReportId: text('rad_report_id').notNull(),
    radOrderId: text('rad_order_id').notNull(),
    patientDfn: text('patient_dfn').notNull(),
    reviewerDuz: text('reviewer_duz').notNull(),
    reviewerName: text('reviewer_name').notNull(),
    originalDictatorDuz: text('original_dictator_duz').notNull(),
    originalDictatorName: text('original_dictator_name').notNull(),
    score: integer('score').notNull(),
    comments: text('comments').notNull(),
    discrepancyCategory: text('discrepancy_category'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_pr_tenant').on(table.tenantId),
    index('idx_pr_report').on(table.radReportId),
    index('idx_pr_reviewer').on(table.reviewerDuz),
  ]
);
