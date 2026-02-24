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
