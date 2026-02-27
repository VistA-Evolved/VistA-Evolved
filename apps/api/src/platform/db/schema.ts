/**
 * Platform DB — Schema Definition (Drizzle ORM)
 *
 * Phase 95B: Platform Persistence Unification
 *
 * All payer registry tables defined here. Drizzle infers TS types
 * from these definitions — no manual interface duplication needed.
 *
 * SQLite is the default backend. Postgres support is possible by
 * swapping drizzle-orm/better-sqlite3 → drizzle-orm/node-postgres
 * and adjusting column types. That migration is intentionally deferred.
 */

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/* ── A) payer — global reference ─────────────────────────────── */

export const payer = sqliteTable("payer", {
  id: text("id").primaryKey(),                    // UUID
  canonicalName: text("canonical_name").notNull(),
  aliases: text("aliases").notNull().default("[]"),  // JSON array of strings
  countryCode: text("country_code").notNull().default("PH"),
  regulatorSource: text("regulator_source"),       // e.g. "IC_PH"
  regulatorLicenseNo: text("regulator_license_no"),
  category: text("category"),                      // government | hmo | private_insurance
  payerType: text("payer_type"),                   // hmo_l1 | hmo_l3 | tpa | government | private_insurance | other (Phase 97B)
  integrationMode: text("integration_mode"),       // manual | portal | api | clearinghouse_edi
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/* ── B) tenant_payer — tenant-scoped operational config ───────── */

export const tenantPayer = sqliteTable("tenant_payer", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  payerId: text("payer_id").notNull().references(() => payer.id),
  status: text("status").notNull().default("contracting_needed"), // enabled | contracting_needed | disabled
  notes: text("notes"),
  vaultRef: text("vault_ref"),               // credential vault reference (NEVER store secrets)
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/* ── C) payer_capability — tenant-scoped overrides + baseline ── */

export const payerCapability = sqliteTable("payer_capability", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id"),                    // null = global baseline
  payerId: text("payer_id").notNull().references(() => payer.id),
  capabilityKey: text("capability_key").notNull(), // e.g. "provider_portal", "loa_portal"
  value: text("value").notNull(),                  // "available" | "portal" | "manual" | "unknown_publicly" | "unavailable"
  confidence: text("confidence").notNull().default("unknown"), // confirmed | inferred | unknown
  evidenceSnapshotId: text("evidence_snapshot_id"),
  reason: text("reason"),                          // why this value was set
  updatedAt: text("updated_at").notNull(),
});

/* ── D) payer_task — contracting + implementation tasks ──────── */

export const payerTask = sqliteTable("payer_task", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id"),
  payerId: text("payer_id").notNull().references(() => payer.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("open"), // open | in_progress | blocked | done
  dueDate: text("due_date"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/* ── E) payer_evidence_snapshot — provenance + hash ──────────── */

export const payerEvidenceSnapshot = sqliteTable("payer_evidence_snapshot", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id"),                    // null = global evidence
  sourceType: text("source_type").notNull(),       // pdf_upload | json_snapshot | url_fetch
  sourceUrl: text("source_url"),
  asOfDate: text("as_of_date").notNull(),
  sha256: text("sha256").notNull(),
  storedPath: text("stored_path"),                 // file path if stored locally
  parserVersion: text("parser_version").notNull().default("1.0.0"),
  status: text("status").notNull().default("pending"), // pending | promoted | superseded
  payerCount: integer("payer_count"),
  ingestedAt: text("ingested_at").notNull(),
});

/* ── F) payer_audit_event — append-only immutable ────────────── */

export const payerAuditEvent = sqliteTable("payer_audit_event", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id"),
  actorType: text("actor_type").notNull(),         // user | system
  actorId: text("actor_id"),
  entityType: text("entity_type").notNull(),       // payer | tenant_payer | payer_capability | payer_task | evidence_snapshot
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),                // create | update | deactivate | ingest | promote
  beforeJson: text("before_json"),                 // JSON snapshot before change
  afterJson: text("after_json"),                   // JSON snapshot after change
  reason: text("reason"),
  evidenceSnapshotId: text("evidence_snapshot_id"),
  createdAt: text("created_at").notNull(),
});

/* ── G) denial_case — Phase 98: Denials & Appeals ────────────── */

export const denialCase = sqliteTable("denial_case", {
  id: text("id").primaryKey(),
  claimRef: text("claim_ref").notNull(),
  vistaClaimIen: text("vista_claim_ien"),
  patientDfn: text("patient_dfn"),
  payerId: text("payer_id").notNull(),
  denialStatus: text("denial_status").notNull().default("NEW"),
  denialSource: text("denial_source").notNull().default("MANUAL"),
  denialCodesJson: text("denial_codes_json").notNull().default("[]"),
  denialNarrative: text("denial_narrative"),
  receivedDate: text("received_date").notNull(),
  deadlineDate: text("deadline_date"),
  assignedTo: text("assigned_to"),
  assignedTeam: text("assigned_team"),
  billedAmountCents: integer("billed_amount_cents").notNull().default(0),
  allowedAmountCents: integer("allowed_amount_cents"),
  paidAmountCents: integer("paid_amount_cents"),
  patientRespCents: integer("patient_resp_cents"),
  adjustmentAmountCents: integer("adjustment_amount_cents"),
  evidenceRefsJson: text("evidence_refs_json").notNull().default("[]"),
  importFileHash: text("import_file_hash"),
  importTimestamp: text("import_timestamp"),
  importParserVersion: text("import_parser_version"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/* ── H) denial_action — Phase 98: append-only action log ─────── */

export const denialAction = sqliteTable("denial_action", {
  id: text("id").primaryKey(),
  denialId: text("denial_id").notNull(),
  actor: text("actor").notNull(),
  timestamp: text("timestamp").notNull(),
  actionType: text("action_type").notNull(),
  payloadJson: text("payload_json").notNull().default("{}"),
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
});

/* ── I) denial_attachment — Phase 98: reference-only ─────────── */

export const denialAttachment = sqliteTable("denial_attachment", {
  id: text("id").primaryKey(),
  denialId: text("denial_id").notNull(),
  label: text("label").notNull(),
  refType: text("ref_type").notNull(),
  storedPath: text("stored_path"),
  sha256: text("sha256"),
  addedAt: text("added_at").notNull(),
  addedBy: text("added_by"),
});

/* ── J) resubmission_attempt — Phase 98: appeal/correction ───── */

export const resubmissionAttempt = sqliteTable("resubmission_attempt", {
  id: text("id").primaryKey(),
  denialId: text("denial_id").notNull(),
  createdAt: text("created_at").notNull(),
  method: text("method").notNull(),
  referenceNumber: text("reference_number"),
  followUpDate: text("follow_up_date"),
  notes: text("notes"),
  actor: text("actor").notNull(),
});

/* ── K) remittance_import — Phase 99: Reconciliation ─────────── */

export const remittanceImport = sqliteTable("remittance_import", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  sourceType: text("source_type").notNull().default("MANUAL"),
  receivedAt: text("received_at").notNull(),
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

/* ── L) payment_record — Phase 99: Individual payment lines ──── */

export const paymentRecord = sqliteTable("payment_record", {
  id: text("id").primaryKey(),
  remittanceImportId: text("remittance_import_id").notNull(),
  createdAt: text("created_at").notNull(),
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
  postedDate: text("posted_date"),
  serviceDate: text("service_date"),
  rawCodesJson: text("raw_codes_json").notNull().default("[]"),
  patientDfn: text("patient_dfn"),
  lineIndex: integer("line_index").notNull().default(0),
});

/* ── M) reconciliation_match — Phase 99: Payment-to-claim match ─ */

export const reconciliationMatch = sqliteTable("reconciliation_match", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  paymentId: text("payment_id").notNull(),
  claimRef: text("claim_ref").notNull(),
  matchConfidence: integer("match_confidence").notNull().default(0),
  matchMethod: text("match_method").notNull(),
  matchStatus: text("match_status").notNull().default("REVIEW_REQUIRED"),
  matchNotes: text("match_notes"),
  confirmedBy: text("confirmed_by"),
  confirmedAt: text("confirmed_at"),
});

/* ── N) underpayment_case — Phase 99: Shortfall tracking ────── */

export const underpaymentCase = sqliteTable("underpayment_case", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  claimRef: text("claim_ref").notNull(),
  paymentId: text("payment_id").notNull(),
  payerId: text("payer_id").notNull(),
  expectedAmountModel: text("expected_amount_model").notNull().default("BILLED_AMOUNT"),
  expectedAmountCents: integer("expected_amount_cents").notNull(),
  paidAmountCents: integer("paid_amount_cents").notNull(),
  deltaCents: integer("delta_cents").notNull(),
  status: text("status").notNull().default("NEW"),
  denialCaseId: text("denial_case_id"),
  resolvedAt: text("resolved_at"),
  resolvedBy: text("resolved_by"),
  resolutionNote: text("resolution_note"),
});

/* ── O) eligibility_check — Phase 100: Durable eligibility results ── */

export const eligibilityCheck = sqliteTable("eligibility_check", {
  id: text("id").primaryKey(),
  patientDfn: text("patient_dfn").notNull(),
  payerId: text("payer_id").notNull(),
  subscriberId: text("subscriber_id"),
  memberId: text("member_id"),
  dateOfService: text("date_of_service"),
  provenance: text("provenance").notNull(),           // MANUAL | SANDBOX | EDI_270_271 | CLEARINGHOUSE | PORTAL
  eligible: integer("eligible", { mode: "boolean" }), // null = unknown
  status: text("status").notNull().default("pending"), // completed | failed | pending | integration_pending
  responseJson: text("response_json"),                 // Full adapter response
  errorMessage: text("error_message"),
  responseMs: integer("response_ms"),
  checkedBy: text("checked_by"),                       // DUZ or 'system'
  tenantId: text("tenant_id").notNull().default("default"),
  createdAt: text("created_at").notNull(),
});

/* ── P) claim_status_check — Phase 100: Durable claim status results ─ */

export const claimStatusCheck = sqliteTable("claim_status_check", {
  id: text("id").primaryKey(),
  claimRef: text("claim_ref").notNull(),
  payerId: text("payer_id").notNull(),
  payerClaimId: text("payer_claim_id"),
  provenance: text("provenance").notNull(),             // MANUAL | SANDBOX | EDI_276_277 | CLEARINGHOUSE | PORTAL
  claimStatus: text("claim_status"),                    // payer-reported status string
  adjudicationDate: text("adjudication_date"),
  paidAmountCents: integer("paid_amount_cents"),
  status: text("status").notNull().default("pending"),  // completed | failed | pending | integration_pending
  responseJson: text("response_json"),
  errorMessage: text("error_message"),
  responseMs: integer("response_ms"),
  checkedBy: text("checked_by"),
  tenantId: text("tenant_id").notNull().default("default"),
  createdAt: text("created_at").notNull(),
});

/* ── Q) module_catalog — Phase 109: Module definitions (seeded) ─ */

export const moduleCatalog = sqliteTable("module_catalog", {
  moduleId: text("module_id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  version: text("version").notNull().default("1.0.0"),
  alwaysEnabled: integer("always_enabled", { mode: "boolean" }).notNull().default(false),
  dependenciesJson: text("dependencies_json").notNull().default("[]"),   // JSON array of moduleId strings
  routePatternsJson: text("route_patterns_json").notNull().default("[]"), // JSON array of regex strings
  adaptersJson: text("adapters_json").notNull().default("[]"),
  permissionsJson: text("permissions_json").notNull().default("[]"),
  dataStoresJson: text("data_stores_json").notNull().default("[]"),
  healthCheckEndpoint: text("health_check_endpoint"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/* ── R) tenant_module — Phase 109: Per-tenant enablement ─────── */

export const tenantModule = sqliteTable("tenant_module", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  moduleId: text("module_id").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  planTier: text("plan_tier").notNull().default("base"),    // base | professional | enterprise
  enabledAt: text("enabled_at"),
  disabledAt: text("disabled_at"),
  enabledBy: text("enabled_by"),                             // actor who toggled
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/* ── S) tenant_feature_flag — Phase 109: Per-tenant flag overrides ─ */

export const tenantFeatureFlag = sqliteTable("tenant_feature_flag", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  flagKey: text("flag_key").notNull(),                     // e.g. "notes.templates"
  flagValue: text("flag_value").notNull().default("true"), // string value (parsed by consumer)
  moduleId: text("module_id"),                             // optional: which module owns this flag
  description: text("description"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/* ── T) module_audit_log — Phase 109: Append-only change history ─ */

export const moduleAuditLog = sqliteTable("module_audit_log", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  actorId: text("actor_id").notNull(),                    // DUZ or system identifier
  actorType: text("actor_type").notNull().default("user"), // user | system | api
  entityType: text("entity_type").notNull(),               // module | feature_flag | entitlement
  entityId: text("entity_id").notNull(),                   // moduleId or flagKey
  action: text("action").notNull(),                        // enable | disable | update | create | delete
  beforeJson: text("before_json"),                         // JSON snapshot before change
  afterJson: text("after_json"),                           // JSON snapshot after change
  reason: text("reason"),
  createdAt: text("created_at").notNull(),
});

/* ── U) credential_artifact — Phase 110: Provider/facility credential metadata ─ */

export const credentialArtifact = sqliteTable("credential_artifact", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  entityType: text("entity_type").notNull(),               // provider | facility | group
  entityId: text("entity_id").notNull(),                   // NPI or facility ID
  entityName: text("entity_name").notNull(),
  credentialType: text("credential_type").notNull(),       // npi | state_license | dea | board_cert | clia | facility_license | malpractice | caqh | tax_id
  credentialValue: text("credential_value").notNull(),     // The actual credential number/ID
  issuingAuthority: text("issuing_authority"),              // e.g. "State of California", "DEA"
  state: text("state"),                                    // US state code if applicable
  status: text("status").notNull().default("active"),      // active | expiring | expired | revoked | pending_verification
  issuedAt: text("issued_at"),
  expiresAt: text("expires_at"),
  renewalReminderDays: integer("renewal_reminder_days").default(90),
  verifiedAt: text("verified_at"),
  verifiedBy: text("verified_by"),
  metadataJson: text("metadata_json").default("{}"),       // Extra KV pairs
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  createdBy: text("created_by").notNull(),
});

/* ── V) credential_document — Phase 110: Object storage pointers ─────── */

export const credentialDocument = sqliteTable("credential_document", {
  id: text("id").primaryKey(),
  credentialId: text("credential_id").notNull(),           // FK to credential_artifact.id
  tenantId: text("tenant_id").notNull().default("default"),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  storagePath: text("storage_path").notNull(),             // Object storage URI or relative path
  fileSizeBytes: integer("file_size_bytes"),
  sha256Hash: text("sha256_hash"),                         // Integrity check
  uploadedBy: text("uploaded_by").notNull(),
  uploadedAt: text("uploaded_at").notNull(),
});

/* ── W) accreditation_status — Phase 110: Per-payer accreditation state ── */

export const accreditationStatus = sqliteTable("accreditation_status", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  payerId: text("payer_id").notNull(),
  payerName: text("payer_name").notNull(),
  providerEntityId: text("provider_entity_id").notNull(),  // NPI or facility ID
  status: text("status").notNull().default("pending"),     // active | pending | expiring | denied | contracting_needed | suspended
  effectiveDate: text("effective_date"),
  expirationDate: text("expiration_date"),
  lastVerifiedAt: text("last_verified_at"),
  lastVerifiedBy: text("last_verified_by"),
  notesJson: text("notes_json").default("[]"),             // JSON array of notes
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  createdBy: text("created_by").notNull(),
});

/* ── X) accreditation_task — Phase 110: Actionable next-steps per payer ── */

export const accreditationTask = sqliteTable("accreditation_task", {
  id: text("id").primaryKey(),
  accreditationId: text("accreditation_id").notNull(),     // FK to accreditation_status.id
  tenantId: text("tenant_id").notNull().default("default"),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),     // pending | in_progress | completed | blocked | cancelled
  priority: text("priority").notNull().default("medium"),  // low | medium | high | urgent
  dueDate: text("due_date"),
  assignedTo: text("assigned_to"),
  completedAt: text("completed_at"),
  completedBy: text("completed_by"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/* ── Y) loa_request — Phase 110: LOA request tied to encounter/order ─── */

export const loaRequest = sqliteTable("loa_request", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  patientDfn: text("patient_dfn").notNull(),               // VistA DFN (not stored as PHI in logs)
  patientName: text("patient_name"),                       // Display only, not shown in audit
  payerId: text("payer_id").notNull(),
  payerName: text("payer_name"),
  encounterIen: text("encounter_ien"),                     // VistA encounter IEN if available
  orderIen: text("order_ien"),                             // VistA order IEN if available
  loaType: text("loa_type").notNull(),                     // prior_auth | referral | precert | concurrent_review | retrospective
  status: text("status").notNull().default("draft"),       // draft | pending_review | submitted | approved | denied | appealed | expired | closed
  urgency: text("urgency").notNull().default("standard"),  // standard | urgent | emergency
  diagnosisCodesJson: text("diagnosis_codes_json").default("[]"),   // JSON array of ICD-10 codes
  procedureCodesJson: text("procedure_codes_json").default("[]"),   // JSON array of CPT/HCPCS codes
  clinicalSummary: text("clinical_summary"),               // Brief clinical justification
  requestedServiceDesc: text("requested_service_desc"),    // What is being requested
  requestedBy: text("requested_by").notNull(),             // DUZ of requesting provider
  requestedAt: text("requested_at").notNull(),
  authorizationNumber: text("authorization_number"),       // Payer-assigned auth number
  approvedUnits: integer("approved_units"),                 // Approved qty if applicable
  approvedFrom: text("approved_from"),                     // Auth valid from date
  approvedThrough: text("approved_through"),               // Auth valid through date
  denialReason: text("denial_reason"),
  packetGeneratedAt: text("packet_generated_at"),
  submittedAt: text("submitted_at"),
  resolvedAt: text("resolved_at"),
  metadataJson: text("metadata_json").default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/* ── Z) loa_attachment — Phase 110: Attachments linked to LOA packets ── */

export const loaAttachment = sqliteTable("loa_attachment", {
  id: text("id").primaryKey(),
  loaRequestId: text("loa_request_id").notNull(),          // FK to loa_request.id
  tenantId: text("tenant_id").notNull().default("default"),
  attachmentType: text("attachment_type").notNull(),        // clinical_note | lab_result | imaging_report | referral_letter | custom
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  storagePath: text("storage_path"),                       // Object storage URI (null if inline)
  inlineContent: text("inline_content"),                   // For small text-based attachments
  description: text("description"),
  addedBy: text("added_by").notNull(),
  addedAt: text("added_at").notNull(),
});

/* ── AA) claim_draft — Phase 111: DB-backed claim drafts with lifecycle ── */

export const claimDraft = sqliteTable("claim_draft", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  idempotencyKey: text("idempotency_key"),                     // unique per tenant for dedup
  status: text("status").notNull().default("draft"),            // draft|scrubbed|ready|submitted|accepted|rejected|paid|denied|appealed|closed
  claimType: text("claim_type").notNull().default("professional"), // professional|institutional|dental|pharmacy
  encounterId: text("encounter_id"),                           // VistA encounter IEN or external ref
  patientId: text("patient_id").notNull(),                     // pseudonymous internal id (not DFN in logs)
  patientName: text("patient_name"),                           // display only, redacted in audit
  providerId: text("provider_id").notNull(),                   // rendering provider NPI or DUZ
  billingProviderId: text("billing_provider_id"),              // billing provider NPI
  payerId: text("payer_id").notNull(),
  payerName: text("payer_name"),
  dateOfService: text("date_of_service").notNull(),
  diagnosesJson: text("diagnoses_json").default("[]"),         // DiagnosisCode[]
  linesJson: text("lines_json").default("[]"),                 // ClaimLine[]
  attachmentsJson: text("attachments_json").default("[]"),     // {fileName, path, type}[]
  totalChargeCents: integer("total_charge_cents").default(0),
  denialCode: text("denial_code"),                             // CARC/RARC from payer
  denialReason: text("denial_reason"),
  appealPacketRef: text("appeal_packet_ref"),                  // storage path for appeal artifact
  resubmissionOf: text("resubmission_of"),                     // claim_draft.id of original
  resubmissionCount: integer("resubmission_count").default(0),
  paidAmountCents: integer("paid_amount_cents"),
  adjustmentCents: integer("adjustment_cents"),
  patientRespCents: integer("patient_resp_cents"),
  scrubScore: integer("scrub_score"),                          // 0-100 from last scrub
  lastScrubAt: text("last_scrub_at"),
  submittedAt: text("submitted_at"),
  paidAt: text("paid_at"),
  deniedAt: text("denied_at"),
  closedAt: text("closed_at"),
  vistaChargeIen: text("vista_charge_ien"),                    // ^IB(350,IEN)
  vistaArIen: text("vista_ar_ien"),                            // ^PRCA(430,IEN)
  metadataJson: text("metadata_json").default("{}"),
  auditJson: text("audit_json").default("[]"),                 // ClaimAuditEntry[]
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  createdBy: text("created_by").notNull(),
});

/* ── AB) scrub_rule — Phase 111: Payer-specific validation rules ── */

export const scrubRule = sqliteTable("scrub_rule", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  payerId: text("payer_id"),                                   // null = applies to all payers
  serviceType: text("service_type"),                           // null = applies to all services
  ruleCode: text("rule_code").notNull(),                       // unique identifier e.g. "BCBS-MOD-25"
  category: text("category").notNull(),                        // syntax|code_set|business_rule|payer_specific|timely_filing|authorization
  severity: text("severity").notNull().default("error"),       // error|warning|suggestion
  field: text("field").notNull(),                              // which claim field this checks
  description: text("description").notNull(),
  conditionJson: text("condition_json").notNull(),             // machine-readable rule condition
  suggestedFix: text("suggested_fix"),
  evidenceSource: text("evidence_source"),                     // URL/doc ref backing this rule
  evidenceDate: text("evidence_date"),                         // when evidence was captured
  blocksSubmission: integer("blocks_submission").notNull().default(1),
  isActive: integer("is_active").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  createdBy: text("created_by").notNull(),
});

/* ── AC) scrub_result — Phase 111: Scrubbing outcomes per claim draft ── */

export const scrubResult = sqliteTable("scrub_result", {
  id: text("id").primaryKey(),
  claimDraftId: text("claim_draft_id").notNull(),              // FK to claim_draft.id
  tenantId: text("tenant_id").notNull().default("default"),
  ruleId: text("rule_id"),                                     // FK to scrub_rule.id (null for built-in rules)
  ruleCode: text("rule_code").notNull(),
  severity: text("severity").notNull(),                        // error|warning|suggestion
  category: text("category").notNull(),
  field: text("field").notNull(),
  message: text("message").notNull(),
  suggestedFix: text("suggested_fix"),
  blocksSubmission: integer("blocks_submission").notNull().default(1),
  score: integer("score").notNull().default(100),              // 0-100 readiness contribution
  scrubbedAt: text("scrubbed_at").notNull(),
});

/* ── AD) claim_lifecycle_event — Phase 111: Temporal claim status tracking ── */

export const claimLifecycleEvent = sqliteTable("claim_lifecycle_event", {
  id: text("id").primaryKey(),
  claimDraftId: text("claim_draft_id").notNull(),              // FK to claim_draft.id
  tenantId: text("tenant_id").notNull().default("default"),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  actor: text("actor").notNull(),                              // DUZ or 'system'
  reason: text("reason"),                                      // denial reason, appeal justification, etc.
  denialCode: text("denial_code"),                             // CARC/RARC code if denial
  resubmissionRef: text("resubmission_ref"),                   // new claim_draft.id if resubmitted
  detailJson: text("detail_json").default("{}"),
  occurredAt: text("occurred_at").notNull(),
});

/* ── AE) integration_evidence — Phase 112: Per-payer integration evidence ── */

export const integrationEvidence = sqliteTable("integration_evidence", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  payerId: text("payer_id").notNull(),                          // FK to payer seed or DB payer
  method: text("method").notNull(),                             // api | portal | manual | edi | fhir
  channel: text("channel"),                                     // sftp | https | soap | rest | portal_upload | manual_mail
  source: text("source").notNull(),                             // URL or document reference backing this claim
  sourceType: text("source_type").notNull().default("url"),     // url | document | screenshot | contact | manual
  contactInfo: text("contact_info"),                            // payer contact for integration support
  submissionRequirements: text("submission_requirements"),       // free-text: what the payer requires
  supportedChannelsJson: text("supported_channels_json").default("[]"),  // JSON array of channels
  lastVerifiedAt: text("last_verified_at"),                     // ISO 8601
  verifiedBy: text("verified_by"),                              // DUZ or name of researcher
  status: text("status").notNull().default("unverified"),       // unverified | verified | stale | archived
  confidence: text("confidence").notNull().default("unknown"),  // confirmed | inferred | unknown
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/* ── AF) auth_session — Phase 114: Durable sessions ─────────────────────── */

export const authSession = sqliteTable("auth_session", {
  id: text("id").primaryKey(),                                   // UUID
  tenantId: text("tenant_id").notNull().default("default"),
  userId: text("user_id").notNull(),                             // DUZ
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),                         // provider | nurse | admin | ...
  facilityStation: text("facility_station").notNull(),
  facilityName: text("facility_name").notNull(),
  divisionIen: text("division_ien").notNull(),
  tokenHash: text("token_hash").notNull(),                       // SHA-256 of raw token (NEVER store raw)
  csrfSecret: text("csrf_secret"),                               // CSRF secret for this session
  ipHash: text("ip_hash"),                                       // hashed client IP
  userAgentHash: text("user_agent_hash"),                        // hashed UA
  createdAt: text("created_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  expiresAt: text("expires_at").notNull(),
  revokedAt: text("revoked_at"),                                 // null = active
  metadataJson: text("metadata_json").default("{}"),             // strictly non-PHI
});

/* ── AG) rcm_work_item — Phase 114: Durable work queue items ────────────── */

export const rcmWorkItem = sqliteTable("rcm_work_item", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  type: text("type").notNull(),                                  // rejection | denial | missing_info
  status: text("status").notNull().default("open"),              // open | in_progress | resolved | escalated | dismissed
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
  sourceType: text("source_type").notNull(),                     // ack_999 | ack_277ca | status_277 | remit_835 | validation | manual
  sourceId: text("source_id"),
  sourceTimestamp: text("source_timestamp"),
  priority: text("priority").notNull().default("medium"),        // critical | high | medium | low
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
});

/* ── AH) rcm_work_item_event — Phase 114: Append-only work item audit ───── */

export const rcmWorkItemEvent = sqliteTable("rcm_work_item_event", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  workItemId: text("work_item_id").notNull(),
  action: text("action").notNull(),                              // created | status_changed | assigned | locked | unlocked | resolved | escalated
  beforeStatus: text("before_status"),
  afterStatus: text("after_status"),
  actor: text("actor").notNull(),                                // DUZ or 'system'
  detail: text("detail"),                                        // JSON — no PHI
  createdAt: text("created_at").notNull(),
});

/* ── AI) portal_message — Phase 115: Durable portal secure messaging ────── */

export const portalMessage = sqliteTable("portal_message", {
  id: text("id").primaryKey(),
  threadId: text("thread_id").notNull(),
  fromDfn: text("from_dfn").notNull(),                           // patient or provider DFN
  fromName: text("from_name").notNull(),
  toDfn: text("to_dfn").notNull(),
  toName: text("to_name").notNull(),
  subject: text("subject").notNull(),
  category: text("category").notNull().default("general"),       // general | prescription | appointment | lab_results | billing
  body: text("body").notNull(),
  status: text("status").notNull().default("draft"),             // draft | sent | read | archived | deleted
  attachmentsJson: text("attachments_json").default("[]"),       // MessageAttachment[] as JSON
  replyToId: text("reply_to_id"),
  vistaSync: integer("vista_sync", { mode: "boolean" }).default(false),
  vistaRef: text("vista_ref"),
  readAt: text("read_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/* ── AJ) portal_appointment — Phase 115: Durable portal appointment requests ── */

export const portalAppointment = sqliteTable("portal_appointment", {
  id: text("id").primaryKey(),
  patientDfn: text("patient_dfn").notNull(),
  patientName: text("patient_name").notNull(),
  clinicId: text("clinic_id").notNull(),
  clinicName: text("clinic_name").notNull(),
  providerName: text("provider_name"),
  appointmentType: text("appointment_type").notNull().default("in-person"), // in-person | telehealth | phone
  scheduledAt: text("scheduled_at").notNull(),
  duration: integer("duration").notNull().default(30),           // minutes
  status: text("status").notNull().default("requested"),         // requested | confirmed | checked-in | in-progress | completed | cancelled | no-show
  reason: text("reason"),
  notes: text("notes"),
  vistaSync: integer("vista_sync", { mode: "boolean" }).default(false),
  vistaRef: text("vista_ref"),
  cancelReason: text("cancel_reason"),
  reschedulePreference: text("reschedule_preference"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/* ── AK) telehealth_room — Phase 115: Durable telehealth room state ──────── */

export const telehealthRoom = sqliteTable("telehealth_room", {
  id: text("id").primaryKey(),                                   // room ID (e.g. "ve-abc123")
  appointmentId: text("appointment_id"),
  patientDfn: text("patient_dfn").notNull(),
  providerDuz: text("provider_duz").notNull(),
  providerName: text("provider_name"),
  roomStatus: text("room_status").notNull().default("scheduled"),  // scheduled | waiting | active | ended | expired
  meetingUrl: text("meeting_url"),
  accessToken: text("access_token"),                             // opaque join token (no PHI)
  participantsJson: text("participants_json").default("{}"),     // { participantId: { role, joinedAt } }
  scheduledStart: text("scheduled_start"),
  actualStart: text("actual_start"),
  actualEnd: text("actual_end"),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/* ── AL) imaging_work_order — Phase 115: Durable imaging worklist items ───── */

export const imagingWorkOrder = sqliteTable("imaging_work_order", {
  id: text("id").primaryKey(),
  vistaOrderId: text("vista_order_id"),
  patientDfn: text("patient_dfn").notNull(),
  patientName: text("patient_name").notNull(),
  accessionNumber: text("accession_number").notNull(),
  scheduledProcedure: text("scheduled_procedure").notNull(),
  procedureCode: text("procedure_code"),
  modality: text("modality").notNull(),
  scheduledTime: text("scheduled_time").notNull(),
  facility: text("facility").notNull().default("DEFAULT"),
  location: text("location").notNull().default("Radiology"),
  orderingProviderDuz: text("ordering_provider_duz").notNull(),
  orderingProviderName: text("ordering_provider_name").notNull(),
  clinicalIndication: text("clinical_indication"),
  priority: text("priority").notNull().default("routine"),       // routine | stat | urgent
  status: text("status").notNull().default("ordered"),           // ordered | scheduled | in-progress | completed | cancelled | discontinued
  linkedStudyUid: text("linked_study_uid"),
  linkedOrthancStudyId: text("linked_orthanc_study_id"),
  source: text("source").notNull().default("prototype-sidecar"), // prototype-sidecar | vista-radiology
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/* ── AM) imaging_study_link — Phase 115: Durable study-to-order linkages ──── */

export const imagingStudyLink = sqliteTable("imaging_study_link", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  patientDfn: text("patient_dfn").notNull(),
  studyInstanceUid: text("study_instance_uid").notNull(),
  orthancStudyId: text("orthanc_study_id").notNull(),
  accessionNumber: text("accession_number").notNull(),
  modality: text("modality").notNull(),
  studyDate: text("study_date"),
  studyDescription: text("study_description"),
  seriesCount: integer("series_count").default(0),
  instanceCount: integer("instance_count").default(0),
  reconciliationType: text("reconciliation_type").notNull(),     // automatic-accession | automatic-patient-modality | manual
  source: text("source").notNull().default("prototype-sidecar"), // prototype-sidecar | vista-mag-2005
  linkedAt: text("linked_at").notNull(),
});

/* ── AN) imaging_unmatched — Phase 115: Quarantined unmatched studies ──────── */

export const imagingUnmatched = sqliteTable("imaging_unmatched", {
  id: text("id").primaryKey(),
  orthancStudyId: text("orthanc_study_id").notNull(),
  studyInstanceUid: text("study_instance_uid").notNull(),
  dicomPatientId: text("dicom_patient_id").notNull(),
  dicomPatientName: text("dicom_patient_name"),
  accessionNumber: text("accession_number"),
  modality: text("modality"),
  studyDate: text("study_date"),
  studyDescription: text("study_description"),
  seriesCount: integer("series_count").default(0),
  instanceCount: integer("instance_count").default(0),
  reason: text("reason").notNull(),
  resolved: integer("resolved", { mode: "boolean" }).notNull().default(false),
  quarantinedAt: text("quarantined_at").notNull(),
});

/* ── AO) idempotency_key — Phase 115: Durable request deduplication ────────── */

export const idempotencyKey = sqliteTable("idempotency_key", {
  compositeKey: text("composite_key").primaryKey(),              // "tenantId::key"
  statusCode: integer("status_code").notNull().default(0),
  responseBody: text("response_body"),                           // JSON-serialized response
  createdAt: integer("created_at").notNull(),                    // epoch ms
  expiresAt: integer("expires_at").notNull(),                    // epoch ms
});

/* ── AP) rcm_claim — Phase 121: Durable RCM claims ────────────────────────── */

export const rcmClaim = sqliteTable("rcm_claim", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  claimType: text("claim_type").notNull().default("professional"), // professional | institutional | dental | pharmacy
  status: text("status").notNull().default("draft"),             // draft | validated | ready_to_submit | submitted | accepted | rejected | paid | denied | appealed | closed
  patientDfn: text("patient_dfn").notNull(),
  patientName: text("patient_name"),
  patientDob: text("patient_dob"),
  patientFirstName: text("patient_first_name"),
  patientLastName: text("patient_last_name"),
  patientGender: text("patient_gender"),
  subscriberId: text("subscriber_id"),
  billingProviderNpi: text("billing_provider_npi"),
  renderingProviderNpi: text("rendering_provider_npi"),
  facilityNpi: text("facility_npi"),
  facilityName: text("facility_name"),
  facilityTaxId: text("facility_tax_id"),
  payerId: text("payer_id").notNull(),
  payerName: text("payer_name"),
  payerClaimId: text("payer_claim_id"),
  dateOfService: text("date_of_service").notNull(),
  diagnosesJson: text("diagnoses_json").notNull().default("[]"), // DiagnosisCode[] as JSON
  linesJson: text("lines_json").notNull().default("[]"),         // ClaimLine[] as JSON
  totalCharge: integer("total_charge").notNull().default(0),     // in cents
  ediTransactionId: text("edi_transaction_id"),
  connectorId: text("connector_id"),
  submittedAt: text("submitted_at"),
  responseReceivedAt: text("response_received_at"),
  paidAmount: integer("paid_amount"),
  adjustmentAmount: integer("adjustment_amount"),
  patientResponsibility: integer("patient_responsibility"),
  remitDate: text("remit_date"),
  vistaChargeIen: text("vista_charge_ien"),
  vistaArIen: text("vista_ar_ien"),
  validationResultJson: text("validation_result_json"),
  pipelineEntryId: text("pipeline_entry_id"),
  exportArtifactPath: text("export_artifact_path"),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  submissionSafetyMode: text("submission_safety_mode").notNull().default("export_only"),
  isMock: integer("is_mock", { mode: "boolean" }).notNull().default(false),
  auditTrailJson: text("audit_trail_json").notNull().default("[]"), // ClaimAuditEntry[] as JSON
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/* ── AQ) rcm_remittance — Phase 121: Durable remittances ──────────────────── */

export const rcmRemittance = sqliteTable("rcm_remittance", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  status: text("status").notNull().default("received"),          // received | matched | posted | disputed | voided
  ediTransactionId: text("edi_transaction_id"),
  checkNumber: text("check_number"),
  checkDate: text("check_date"),
  eftTraceNumber: text("eft_trace_number"),
  payerId: text("payer_id").notNull(),
  payerName: text("payer_name"),
  claimId: text("claim_id"),
  payerClaimId: text("payer_claim_id"),
  patientDfn: text("patient_dfn"),
  totalCharged: integer("total_charged").notNull().default(0),
  totalPaid: integer("total_paid").notNull().default(0),
  totalAdjusted: integer("total_adjusted").notNull().default(0),
  totalPatientResponsibility: integer("total_patient_responsibility").notNull().default(0),
  serviceLinesJson: text("service_lines_json").notNull().default("[]"), // RemitServiceLine[] as JSON
  isMock: integer("is_mock", { mode: "boolean" }).notNull().default(false),
  importedAt: text("imported_at").notNull(),
  matchedAt: text("matched_at"),
  postedAt: text("posted_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/* ── AR) rcm_claim_case — Phase 121: Durable claim lifecycle cases ─────────── */

export const rcmClaimCase = sqliteTable("rcm_claim_case", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  lifecycleStatus: text("lifecycle_status").notNull().default("draft"),
  baseClaimId: text("base_claim_id"),
  philhealthDraftId: text("philhealth_draft_id"),
  loaCaseId: text("loa_case_id"),
  patientDfn: text("patient_dfn").notNull(),
  patientName: text("patient_name"),
  patientDob: text("patient_dob"),
  patientGender: text("patient_gender"),
  subscriberId: text("subscriber_id"),
  memberPin: text("member_pin"),
  billingProviderNpi: text("billing_provider_npi"),
  renderingProviderNpi: text("rendering_provider_npi"),
  facilityCode: text("facility_code"),
  facilityName: text("facility_name"),
  payerId: text("payer_id").notNull(),
  payerName: text("payer_name"),
  payerType: text("payer_type"),
  claimType: text("claim_type").notNull().default("professional"),
  dateOfService: text("date_of_service").notNull(),
  dateOfDischarge: text("date_of_discharge"),
  diagnosesJson: text("diagnoses_json").notNull().default("[]"),
  proceduresJson: text("procedures_json").notNull().default("[]"),
  totalCharge: integer("total_charge").notNull().default(0),
  scrubHistoryJson: text("scrub_history_json").notNull().default("[]"),
  lastScrubResultJson: text("last_scrub_result_json"),
  attachmentsJson: text("attachments_json").notNull().default("[]"),
  eventsJson: text("events_json").notNull().default("[]"),
  denialsJson: text("denials_json").notNull().default("[]"),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  isMock: integer("is_mock", { mode: "boolean" }).notNull().default(false),
  priority: text("priority").notNull().default("medium"),
  vistaEncounterIen: text("vista_encounter_ien"),
  vistaChargeIen: text("vista_charge_ien"),
  vistaArIen: text("vista_ar_ien"),
  createdBy: text("created_by"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/* ── AS) portal_access_log — Phase 121: Durable portal access logs ────────── */

export const portalAccessLog = sqliteTable("portal_access_log", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  actorName: text("actor_name").notNull(),
  isProxy: integer("is_proxy", { mode: "boolean" }).notNull().default(false),
  targetPatientDfn: text("target_patient_dfn"),
  eventType: text("event_type").notNull(),
  description: text("description").notNull(),
  metadataJson: text("metadata_json").notNull().default("{}"),   // Record<string,string> as JSON
  createdAt: text("created_at").notNull(),                       // serves as timestamp
});

/* ── AT) scheduling_request — Phase 121: Durable scheduling requests ────────── */

export const schedulingRequest = sqliteTable("scheduling_request", {
  id: text("id").primaryKey(),
  patientDfn: text("patient_dfn").notNull(),
  clinicName: text("clinic_name").notNull(),
  preferredDate: text("preferred_date").notNull(),
  priority: text("priority").notNull().default("routine"),
  status: text("status").notNull().default("pending"),           // pending | booked | cancelled
  reason: text("reason"),
  requestType: text("request_type").notNull().default("new_appointment"), // new_appointment | reschedule | cancel_request
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/* ── AU) rcm_durable_job — Phase 142: Durable RCM job queue ─────────────── */

export const rcmDurableJob = sqliteTable("rcm_durable_job", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  type: text("type").notNull(),                                  // CLAIM_SUBMIT | ELIGIBILITY_CHECK | STATUS_POLL | ERA_INGEST | ACK_PROCESS | REMITTANCE_IMPORT | DENIAL_FOLLOWUP_TICK
  status: text("status").notNull().default("queued"),            // queued | processing | completed | failed | dead_letter | cancelled
  payloadJson: text("payload_json").notNull().default("{}"),
  resultJson: text("result_json"),
  error: text("error"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  idempotencyKey: text("idempotency_key"),
  priority: integer("priority").notNull().default(5),            // 0 = highest, 9 = lowest
  scheduledAt: text("scheduled_at").notNull(),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  nextRetryAt: text("next_retry_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Phase 157: Audit JSONL Shipping
export const auditShipOffset = sqliteTable("audit_ship_offset", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  source: text("source").notNull(),
  lastOffset: integer("last_offset").notNull().default(0),
  lastHash: text("last_hash").notNull().default(""),
  shippedAt: text("shipped_at").notNull(),
});

export const auditShipManifest = sqliteTable("audit_ship_manifest", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  objectKey: text("object_key").notNull(),
  contentHash: text("content_hash").notNull(),
  entryCount: integer("entry_count").notNull().default(0),
  firstSeq: integer("first_seq").notNull().default(0),
  lastSeq: integer("last_seq").notNull().default(0),
  lastEntryHash: text("last_entry_hash").notNull().default(""),
  byteSize: integer("byte_size").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

// Phase 158: Specialty Template & Workflow Studio
export const clinicalTemplate = sqliteTable("clinical_template", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  setting: text("setting").notNull().default("any"),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("draft"),
  description: text("description"),
  tagsJson: text("tags_json"),
  sectionsJson: text("sections_json"),
  quickInsertSectionsJson: text("quick_insert_sections_json"),
  autoExpandRulesJson: text("auto_expand_rules_json"),
  createdBy: text("created_by"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const templateVersionEvent = sqliteTable("template_version_event", {
  id: text("id").primaryKey(),
  templateId: text("template_id").notNull(),
  tenantId: text("tenant_id").notNull().default("default"),
  version: integer("version").notNull(),
  action: text("action").notNull(),
  actor: text("actor").notNull(),
  changeSummary: text("change_summary"),
  snapshotJson: text("snapshot_json"),
  createdAt: text("created_at").notNull(),
});

export const quickText = sqliteTable("quick_text", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  key: text("key").notNull(),
  text: text("text").notNull(),
  tagsJson: text("tags_json"),
  specialty: text("specialty"),
  version: integer("version").notNull().default(1),
  createdBy: text("created_by"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ── Phase 159: Patient Queue / Waiting / Numbering / Calling ────────
export const queueTicket = sqliteTable("queue_ticket", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  department: text("department").notNull(),
  ticketNumber: text("ticket_number").notNull(),
  patientDfn: text("patient_dfn").notNull(),
  patientName: text("patient_name").notNull(),
  priority: text("priority").notNull().default("normal"),
  status: text("status").notNull().default("waiting"),
  providerDuz: text("provider_duz"),
  windowNumber: text("window_number"),
  notes: text("notes"),
  appointmentIen: text("appointment_ien"),
  transferredFrom: text("transferred_from"),
  createdAt: text("created_at").notNull(),
  calledAt: text("called_at"),
  servedAt: text("served_at"),
  completedAt: text("completed_at"),
});

export const queueEvent = sqliteTable("queue_event", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  ticketId: text("ticket_id").notNull(),
  eventType: text("event_type").notNull(),
  actorDuz: text("actor_duz"),
  detail: text("detail"),
  createdAt: text("created_at").notNull(),
});

// ── Phase 160: Department Workflow Packs ─────────────────────────────
export const workflowDefinition = sqliteTable("workflow_definition", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  department: text("department").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("draft"),
  stepsJson: text("steps_json"),
  tagsJson: text("tags_json"),
  createdBy: text("created_by"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const workflowInstance = sqliteTable("workflow_instance", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().default("default"),
  definitionId: text("definition_id").notNull(),
  department: text("department").notNull(),
  patientDfn: text("patient_dfn").notNull(),
  encounterRef: text("encounter_ref"),
  queueTicketId: text("queue_ticket_id"),
  status: text("status").notNull().default("not_started"),
  stepsJson: text("steps_json"),
  startedBy: text("started_by"),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
});
