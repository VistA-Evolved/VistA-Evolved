/**
 * Platform DB — Idempotent Migration
 *
 * Phase 95B: Platform Persistence Unification
 *
 * Uses raw SQL CREATE TABLE IF NOT EXISTS statements.
 * This is intentionally NOT using Drizzle Kit push/migrate
 * because we want zero-config startup: just run the API.
 *
 * For schema changes, add ALTER TABLE statements below
 * with version guards (check if column exists first).
 */

import { getRawDb } from "./db.js";

const MIGRATION_SQL = `
-- A) payer (global reference)
CREATE TABLE IF NOT EXISTS payer (
  id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  aliases TEXT NOT NULL DEFAULT '[]',
  country_code TEXT NOT NULL DEFAULT 'PH',
  regulator_source TEXT,
  regulator_license_no TEXT,
  category TEXT,
  integration_mode TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- B) tenant_payer (tenant-scoped operational config)
CREATE TABLE IF NOT EXISTS tenant_payer (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  payer_id TEXT NOT NULL REFERENCES payer(id),
  status TEXT NOT NULL DEFAULT 'contracting_needed',
  notes TEXT,
  vault_ref TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- C) payer_capability (tenant-scoped overrides + baseline)
CREATE TABLE IF NOT EXISTS payer_capability (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  payer_id TEXT NOT NULL REFERENCES payer(id),
  capability_key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'unknown',
  evidence_snapshot_id TEXT,
  reason TEXT,
  updated_at TEXT NOT NULL
);

-- D) payer_task (contracting + implementation tasks)
CREATE TABLE IF NOT EXISTS payer_task (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  payer_id TEXT NOT NULL REFERENCES payer(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  due_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- E) payer_evidence_snapshot (provenance + hash)
CREATE TABLE IF NOT EXISTS payer_evidence_snapshot (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  source_type TEXT NOT NULL,
  source_url TEXT,
  as_of_date TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  stored_path TEXT,
  parser_version TEXT NOT NULL DEFAULT '1.0.0',
  status TEXT NOT NULL DEFAULT 'pending',
  payer_count INTEGER,
  ingested_at TEXT NOT NULL
);

-- F) payer_audit_event (append-only immutable)
CREATE TABLE IF NOT EXISTS payer_audit_event (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  reason TEXT,
  evidence_snapshot_id TEXT,
  created_at TEXT NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_payer_country ON payer(country_code);
CREATE INDEX IF NOT EXISTS idx_payer_active ON payer(active);
CREATE INDEX IF NOT EXISTS idx_tenant_payer_tenant ON tenant_payer(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_payer_payer ON tenant_payer(payer_id);
CREATE INDEX IF NOT EXISTS idx_capability_payer ON payer_capability(payer_id);
CREATE INDEX IF NOT EXISTS idx_capability_tenant ON payer_capability(tenant_id);
CREATE INDEX IF NOT EXISTS idx_capability_key ON payer_capability(capability_key);
CREATE INDEX IF NOT EXISTS idx_task_payer ON payer_task(payer_id);
CREATE INDEX IF NOT EXISTS idx_task_status ON payer_task(status);
CREATE INDEX IF NOT EXISTS idx_evidence_status ON payer_evidence_snapshot(status);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON payer_audit_event(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON payer_audit_event(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON payer_audit_event(actor_id);

-- G) denial_case (Phase 98: Denials & Appeals)
CREATE TABLE IF NOT EXISTS denial_case (
  id TEXT PRIMARY KEY,
  claim_ref TEXT NOT NULL,
  vista_claim_ien TEXT,
  patient_dfn TEXT,
  payer_id TEXT NOT NULL,
  denial_status TEXT NOT NULL DEFAULT 'NEW',
  denial_source TEXT NOT NULL DEFAULT 'MANUAL',
  denial_codes_json TEXT NOT NULL DEFAULT '[]',
  denial_narrative TEXT,
  received_date TEXT NOT NULL,
  deadline_date TEXT,
  assigned_to TEXT,
  assigned_team TEXT,
  billed_amount_cents INTEGER NOT NULL DEFAULT 0,
  allowed_amount_cents INTEGER,
  paid_amount_cents INTEGER,
  patient_resp_cents INTEGER,
  adjustment_amount_cents INTEGER,
  evidence_refs_json TEXT NOT NULL DEFAULT '[]',
  import_file_hash TEXT,
  import_timestamp TEXT,
  import_parser_version TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- H) denial_action (Phase 98: append-only action log)
CREATE TABLE IF NOT EXISTS denial_action (
  id TEXT PRIMARY KEY,
  denial_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  action_type TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  previous_status TEXT,
  new_status TEXT
);

-- I) denial_attachment (Phase 98: reference-only, no raw PHI)
CREATE TABLE IF NOT EXISTS denial_attachment (
  id TEXT PRIMARY KEY,
  denial_id TEXT NOT NULL,
  label TEXT NOT NULL,
  ref_type TEXT NOT NULL,
  stored_path TEXT,
  sha256 TEXT,
  added_at TEXT NOT NULL,
  added_by TEXT
);

-- J) resubmission_attempt (Phase 98: appeal/correction tracking)
CREATE TABLE IF NOT EXISTS resubmission_attempt (
  id TEXT PRIMARY KEY,
  denial_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  method TEXT NOT NULL,
  reference_number TEXT,
  follow_up_date TEXT,
  notes TEXT,
  actor TEXT NOT NULL
);

-- Phase 98 indexes
CREATE INDEX IF NOT EXISTS idx_denial_status ON denial_case(denial_status);
CREATE INDEX IF NOT EXISTS idx_denial_payer ON denial_case(payer_id);
CREATE INDEX IF NOT EXISTS idx_denial_assigned ON denial_case(assigned_to);
CREATE INDEX IF NOT EXISTS idx_denial_deadline ON denial_case(deadline_date);
CREATE INDEX IF NOT EXISTS idx_denial_created ON denial_case(created_at);
CREATE INDEX IF NOT EXISTS idx_denial_claim_ref ON denial_case(claim_ref);
CREATE INDEX IF NOT EXISTS idx_denial_action_denial ON denial_action(denial_id);
CREATE INDEX IF NOT EXISTS idx_denial_action_ts ON denial_action(timestamp);
CREATE INDEX IF NOT EXISTS idx_denial_attach_denial ON denial_attachment(denial_id);
CREATE INDEX IF NOT EXISTS idx_resub_denial ON resubmission_attempt(denial_id);

-- K) remittance_import (Phase 99: Reconciliation)
CREATE TABLE IF NOT EXISTS remittance_import (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'MANUAL',
  received_at TEXT NOT NULL,
  file_hash TEXT,
  original_filename TEXT,
  parser_name TEXT,
  parser_version TEXT,
  mapping_version TEXT,
  line_count INTEGER NOT NULL DEFAULT 0,
  total_paid_cents INTEGER NOT NULL DEFAULT 0,
  total_billed_cents INTEGER NOT NULL DEFAULT 0,
  imported_by TEXT NOT NULL
);

-- L) payment_record (Phase 99: Individual payment lines)
CREATE TABLE IF NOT EXISTS payment_record (
  id TEXT PRIMARY KEY,
  remittance_import_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  claim_ref TEXT NOT NULL,
  payer_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'IMPORTED',
  billed_amount_cents INTEGER NOT NULL DEFAULT 0,
  paid_amount_cents INTEGER NOT NULL DEFAULT 0,
  allowed_amount_cents INTEGER,
  patient_resp_cents INTEGER,
  adjustment_amount_cents INTEGER,
  trace_number TEXT,
  check_number TEXT,
  posted_date TEXT,
  service_date TEXT,
  raw_codes_json TEXT NOT NULL DEFAULT '[]',
  patient_dfn TEXT,
  line_index INTEGER NOT NULL DEFAULT 0
);

-- M) reconciliation_match (Phase 99: Payment-to-claim matching)
CREATE TABLE IF NOT EXISTS reconciliation_match (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  payment_id TEXT NOT NULL,
  claim_ref TEXT NOT NULL,
  match_confidence INTEGER NOT NULL DEFAULT 0,
  match_method TEXT NOT NULL,
  match_status TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED',
  match_notes TEXT,
  confirmed_by TEXT,
  confirmed_at TEXT
);

-- N) underpayment_case (Phase 99: Shortfall tracking)
CREATE TABLE IF NOT EXISTS underpayment_case (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  claim_ref TEXT NOT NULL,
  payer_id TEXT NOT NULL,
  payment_id TEXT NOT NULL,
  expected_amount_model TEXT NOT NULL DEFAULT 'BILLED_AMOUNT',
  expected_amount_cents INTEGER NOT NULL,
  paid_amount_cents INTEGER NOT NULL,
  delta_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW',
  denial_case_id TEXT,
  resolved_at TEXT,
  resolved_by TEXT,
  resolution_note TEXT
);

-- Phase 99 indexes
CREATE INDEX IF NOT EXISTS idx_remit_import_source ON remittance_import(source_type);
CREATE INDEX IF NOT EXISTS idx_remit_import_created ON remittance_import(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_import ON payment_record(remittance_import_id);
CREATE INDEX IF NOT EXISTS idx_payment_claim ON payment_record(claim_ref);
CREATE INDEX IF NOT EXISTS idx_payment_payer ON payment_record(payer_id);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment_record(status);
CREATE INDEX IF NOT EXISTS idx_recon_payment ON reconciliation_match(payment_id);
CREATE INDEX IF NOT EXISTS idx_recon_claim ON reconciliation_match(claim_ref);
CREATE INDEX IF NOT EXISTS idx_recon_status ON reconciliation_match(match_status);
CREATE INDEX IF NOT EXISTS idx_underpay_claim ON underpayment_case(claim_ref);
CREATE INDEX IF NOT EXISTS idx_underpay_status ON underpayment_case(status);
CREATE INDEX IF NOT EXISTS idx_underpay_payer ON underpayment_case(payer_id);

-- O) eligibility_check (Phase 100: Durable eligibility results)
CREATE TABLE IF NOT EXISTS eligibility_check (
  id TEXT PRIMARY KEY,
  patient_dfn TEXT NOT NULL,
  payer_id TEXT NOT NULL,
  subscriber_id TEXT,
  member_id TEXT,
  date_of_service TEXT,
  provenance TEXT NOT NULL,
  eligible INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  response_json TEXT,
  error_message TEXT,
  response_ms INTEGER,
  checked_by TEXT,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  created_at TEXT NOT NULL
);

-- P) claim_status_check (Phase 100: Durable claim status results)
CREATE TABLE IF NOT EXISTS claim_status_check (
  id TEXT PRIMARY KEY,
  claim_ref TEXT NOT NULL,
  payer_id TEXT NOT NULL,
  payer_claim_id TEXT,
  provenance TEXT NOT NULL,
  claim_status TEXT,
  adjudication_date TEXT,
  paid_amount_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  response_json TEXT,
  error_message TEXT,
  response_ms INTEGER,
  checked_by TEXT,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  created_at TEXT NOT NULL
);

-- Phase 100 indexes
CREATE INDEX IF NOT EXISTS idx_elig_patient ON eligibility_check(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_elig_payer ON eligibility_check(payer_id);
CREATE INDEX IF NOT EXISTS idx_elig_provenance ON eligibility_check(provenance);
CREATE INDEX IF NOT EXISTS idx_elig_status ON eligibility_check(status);
CREATE INDEX IF NOT EXISTS idx_elig_created ON eligibility_check(created_at);
CREATE INDEX IF NOT EXISTS idx_elig_tenant ON eligibility_check(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cstat_claim ON claim_status_check(claim_ref);
CREATE INDEX IF NOT EXISTS idx_cstat_payer ON claim_status_check(payer_id);
CREATE INDEX IF NOT EXISTS idx_cstat_provenance ON claim_status_check(provenance);
CREATE INDEX IF NOT EXISTS idx_cstat_status ON claim_status_check(status);
CREATE INDEX IF NOT EXISTS idx_cstat_created ON claim_status_check(created_at);
CREATE INDEX IF NOT EXISTS idx_cstat_tenant ON claim_status_check(tenant_id);

-- Phase 109: Module Registry + Feature Flags + Entitlements

CREATE TABLE IF NOT EXISTS module_catalog (
  module_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  always_enabled INTEGER NOT NULL DEFAULT 0,
  dependencies_json TEXT NOT NULL DEFAULT '[]',
  route_patterns_json TEXT NOT NULL DEFAULT '[]',
  adapters_json TEXT NOT NULL DEFAULT '[]',
  permissions_json TEXT NOT NULL DEFAULT '[]',
  data_stores_json TEXT NOT NULL DEFAULT '[]',
  health_check_endpoint TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tenant_module (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  plan_tier TEXT NOT NULL DEFAULT 'base',
  enabled_at TEXT,
  disabled_at TEXT,
  enabled_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_module_unique ON tenant_module(tenant_id, module_id);
CREATE INDEX IF NOT EXISTS idx_tenant_module_tenant ON tenant_module(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_module_module ON tenant_module(module_id);
CREATE INDEX IF NOT EXISTS idx_tenant_module_enabled ON tenant_module(enabled);

CREATE TABLE IF NOT EXISTS tenant_feature_flag (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  flag_key TEXT NOT NULL,
  flag_value TEXT NOT NULL DEFAULT 'true',
  module_id TEXT,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_flag_unique ON tenant_feature_flag(tenant_id, flag_key);
CREATE INDEX IF NOT EXISTS idx_tenant_flag_tenant ON tenant_feature_flag(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_flag_module ON tenant_feature_flag(module_id);

CREATE TABLE IF NOT EXISTS module_audit_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'user',
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  reason TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mod_audit_tenant ON module_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mod_audit_entity ON module_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_mod_audit_created ON module_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_mod_audit_action ON module_audit_log(action);

-- Phase 110: Credential Vault + LOA Engine

CREATE TABLE IF NOT EXISTS credential_artifact (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  credential_type TEXT NOT NULL,
  credential_value TEXT NOT NULL,
  issuing_authority TEXT,
  state TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  issued_at TEXT,
  expires_at TEXT,
  renewal_reminder_days INTEGER DEFAULT 90,
  verified_at TEXT,
  verified_by TEXT,
  metadata_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cred_artifact_tenant ON credential_artifact(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cred_artifact_entity ON credential_artifact(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_cred_artifact_type ON credential_artifact(credential_type);
CREATE INDEX IF NOT EXISTS idx_cred_artifact_status ON credential_artifact(status);
CREATE INDEX IF NOT EXISTS idx_cred_artifact_expires ON credential_artifact(expires_at);

CREATE TABLE IF NOT EXISTS credential_document (
  id TEXT PRIMARY KEY,
  credential_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes INTEGER,
  sha256_hash TEXT,
  uploaded_by TEXT NOT NULL,
  uploaded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cred_doc_credential ON credential_document(credential_id);
CREATE INDEX IF NOT EXISTS idx_cred_doc_tenant ON credential_document(tenant_id);

CREATE TABLE IF NOT EXISTS accreditation_status (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  payer_id TEXT NOT NULL,
  payer_name TEXT NOT NULL,
  provider_entity_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  effective_date TEXT,
  expiration_date TEXT,
  last_verified_at TEXT,
  last_verified_by TEXT,
  notes_json TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_accred_tenant ON accreditation_status(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accred_payer ON accreditation_status(payer_id);
CREATE INDEX IF NOT EXISTS idx_accred_provider ON accreditation_status(provider_entity_id);
CREATE INDEX IF NOT EXISTS idx_accred_status ON accreditation_status(status);

CREATE TABLE IF NOT EXISTS accreditation_task (
  id TEXT PRIMARY KEY,
  accreditation_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date TEXT,
  assigned_to TEXT,
  completed_at TEXT,
  completed_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_accred_task_accred ON accreditation_task(accreditation_id);
CREATE INDEX IF NOT EXISTS idx_accred_task_tenant ON accreditation_task(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accred_task_status ON accreditation_task(status);

CREATE TABLE IF NOT EXISTS loa_request (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT NOT NULL,
  patient_name TEXT,
  payer_id TEXT NOT NULL,
  payer_name TEXT,
  encounter_ien TEXT,
  order_ien TEXT,
  loa_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  urgency TEXT NOT NULL DEFAULT 'standard',
  diagnosis_codes_json TEXT DEFAULT '[]',
  procedure_codes_json TEXT DEFAULT '[]',
  clinical_summary TEXT,
  requested_service_desc TEXT,
  requested_by TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  authorization_number TEXT,
  approved_units INTEGER,
  approved_from TEXT,
  approved_through TEXT,
  denial_reason TEXT,
  packet_generated_at TEXT,
  submitted_at TEXT,
  resolved_at TEXT,
  metadata_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_loa_tenant ON loa_request(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loa_patient ON loa_request(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_loa_payer ON loa_request(payer_id);
CREATE INDEX IF NOT EXISTS idx_loa_status ON loa_request(status);
CREATE INDEX IF NOT EXISTS idx_loa_type ON loa_request(loa_type);

CREATE TABLE IF NOT EXISTS loa_attachment (
  id TEXT PRIMARY KEY,
  loa_request_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  attachment_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT,
  inline_content TEXT,
  description TEXT,
  added_by TEXT NOT NULL,
  added_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_loa_attach_request ON loa_attachment(loa_request_id);
CREATE INDEX IF NOT EXISTS idx_loa_attach_tenant ON loa_attachment(tenant_id);

-- Phase 111: Claim Lifecycle + Scrubber
CREATE TABLE IF NOT EXISTS claim_draft (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  idempotency_key TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  claim_type TEXT NOT NULL DEFAULT 'professional',
  encounter_id TEXT,
  patient_id TEXT NOT NULL,
  patient_name TEXT,
  provider_id TEXT NOT NULL,
  billing_provider_id TEXT,
  payer_id TEXT NOT NULL,
  payer_name TEXT,
  date_of_service TEXT NOT NULL,
  diagnoses_json TEXT DEFAULT '[]',
  lines_json TEXT DEFAULT '[]',
  attachments_json TEXT DEFAULT '[]',
  total_charge_cents INTEGER DEFAULT 0,
  denial_code TEXT,
  denial_reason TEXT,
  appeal_packet_ref TEXT,
  resubmission_of TEXT,
  resubmission_count INTEGER DEFAULT 0,
  paid_amount_cents INTEGER,
  adjustment_cents INTEGER,
  patient_resp_cents INTEGER,
  scrub_score INTEGER,
  last_scrub_at TEXT,
  submitted_at TEXT,
  paid_at TEXT,
  denied_at TEXT,
  closed_at TEXT,
  vista_charge_ien TEXT,
  vista_ar_ien TEXT,
  metadata_json TEXT DEFAULT '{}',
  audit_json TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cd_tenant ON claim_draft(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cd_status ON claim_draft(status);
CREATE INDEX IF NOT EXISTS idx_cd_payer ON claim_draft(payer_id);
CREATE INDEX IF NOT EXISTS idx_cd_patient ON claim_draft(patient_id);
CREATE INDEX IF NOT EXISTS idx_cd_encounter ON claim_draft(encounter_id);
CREATE INDEX IF NOT EXISTS idx_cd_idemp ON claim_draft(tenant_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_cd_dos ON claim_draft(date_of_service);
CREATE INDEX IF NOT EXISTS idx_cd_resub ON claim_draft(resubmission_of);

CREATE TABLE IF NOT EXISTS scrub_rule (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  payer_id TEXT,
  service_type TEXT,
  rule_code TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'error',
  field TEXT NOT NULL,
  description TEXT NOT NULL,
  condition_json TEXT NOT NULL,
  suggested_fix TEXT,
  evidence_source TEXT,
  evidence_date TEXT,
  blocks_submission INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sr_tenant ON scrub_rule(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sr_payer ON scrub_rule(payer_id);
CREATE INDEX IF NOT EXISTS idx_sr_code ON scrub_rule(rule_code);
CREATE INDEX IF NOT EXISTS idx_sr_active ON scrub_rule(is_active);

CREATE TABLE IF NOT EXISTS scrub_result (
  id TEXT PRIMARY KEY,
  claim_draft_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  rule_id TEXT,
  rule_code TEXT NOT NULL,
  severity TEXT NOT NULL,
  category TEXT NOT NULL,
  field TEXT NOT NULL,
  message TEXT NOT NULL,
  suggested_fix TEXT,
  blocks_submission INTEGER NOT NULL DEFAULT 1,
  score INTEGER NOT NULL DEFAULT 100,
  scrubbed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sres_claim ON scrub_result(claim_draft_id);
CREATE INDEX IF NOT EXISTS idx_sres_tenant ON scrub_result(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sres_severity ON scrub_result(severity);

CREATE TABLE IF NOT EXISTS claim_lifecycle_event (
  id TEXT PRIMARY KEY,
  claim_draft_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor TEXT NOT NULL,
  reason TEXT,
  denial_code TEXT,
  resubmission_ref TEXT,
  detail_json TEXT DEFAULT '{}',
  occurred_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cle_claim ON claim_lifecycle_event(claim_draft_id);
CREATE INDEX IF NOT EXISTS idx_cle_tenant ON claim_lifecycle_event(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cle_status ON claim_lifecycle_event(to_status);
CREATE INDEX IF NOT EXISTS idx_cle_time ON claim_lifecycle_event(occurred_at);

-- AE) integration_evidence — Phase 112: Per-payer integration proof
CREATE TABLE IF NOT EXISTS integration_evidence (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  payer_id TEXT NOT NULL,
  method TEXT NOT NULL,
  channel TEXT,
  source TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'url',
  contact_info TEXT,
  submission_requirements TEXT,
  supported_channels_json TEXT DEFAULT '[]',
  last_verified_at TEXT,
  verified_by TEXT,
  status TEXT NOT NULL DEFAULT 'unverified',
  confidence TEXT NOT NULL DEFAULT 'unknown',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_intev_payer ON integration_evidence(payer_id);
CREATE INDEX IF NOT EXISTS idx_intev_tenant ON integration_evidence(tenant_id);
CREATE INDEX IF NOT EXISTS idx_intev_status ON integration_evidence(status);
CREATE INDEX IF NOT EXISTS idx_intev_method ON integration_evidence(method);

-- AF) auth_session — Phase 114: Durable sessions
CREATE TABLE IF NOT EXISTS auth_session (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  facility_station TEXT NOT NULL,
  facility_name TEXT NOT NULL,
  division_ien TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  csrf_secret TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  metadata_json TEXT DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_authsess_token ON auth_session(token_hash);
CREATE INDEX IF NOT EXISTS idx_authsess_user ON auth_session(user_id);
CREATE INDEX IF NOT EXISTS idx_authsess_tenant ON auth_session(tenant_id);
CREATE INDEX IF NOT EXISTS idx_authsess_expires ON auth_session(expires_at);

-- AG) rcm_work_item — Phase 114: Durable work queue items
CREATE TABLE IF NOT EXISTS rcm_work_item (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  claim_id TEXT NOT NULL,
  payer_id TEXT,
  payer_name TEXT,
  patient_dfn TEXT,
  reason_code TEXT NOT NULL,
  reason_description TEXT NOT NULL,
  reason_category TEXT,
  recommended_action TEXT NOT NULL,
  field_to_fix TEXT,
  triggering_rule TEXT,
  source_type TEXT NOT NULL,
  source_id TEXT,
  source_timestamp TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to TEXT,
  due_date TEXT,
  resolved_at TEXT,
  resolved_by TEXT,
  resolution_note TEXT,
  locked_by TEXT,
  locked_at TEXT,
  lock_expires_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rcmwi_tenant ON rcm_work_item(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rcmwi_claim ON rcm_work_item(claim_id);
CREATE INDEX IF NOT EXISTS idx_rcmwi_status ON rcm_work_item(status);
CREATE INDEX IF NOT EXISTS idx_rcmwi_type ON rcm_work_item(type);
CREATE INDEX IF NOT EXISTS idx_rcmwi_priority ON rcm_work_item(priority);
CREATE INDEX IF NOT EXISTS idx_rcmwi_locked ON rcm_work_item(locked_by, lock_expires_at);

-- AH) rcm_work_item_event — Phase 114: Append-only work item audit
CREATE TABLE IF NOT EXISTS rcm_work_item_event (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  work_item_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_status TEXT,
  after_status TEXT,
  actor TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rcmwie_item ON rcm_work_item_event(work_item_id);
CREATE INDEX IF NOT EXISTS idx_rcmwie_tenant ON rcm_work_item_event(tenant_id);

-- AI) portal_message — Phase 115: Durable portal secure messaging
CREATE TABLE IF NOT EXISTS portal_message (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  from_dfn TEXT NOT NULL,
  from_name TEXT NOT NULL,
  to_dfn TEXT NOT NULL,
  to_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  attachments_json TEXT DEFAULT '[]',
  reply_to_id TEXT,
  vista_sync INTEGER DEFAULT 0,
  vista_ref TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pmsg_thread ON portal_message(thread_id);
CREATE INDEX IF NOT EXISTS idx_pmsg_from ON portal_message(from_dfn);
CREATE INDEX IF NOT EXISTS idx_pmsg_to ON portal_message(to_dfn);
CREATE INDEX IF NOT EXISTS idx_pmsg_status ON portal_message(status);
CREATE INDEX IF NOT EXISTS idx_pmsg_category ON portal_message(category);

-- AJ) portal_appointment — Phase 115: Durable portal appointment requests
CREATE TABLE IF NOT EXISTS portal_appointment (
  id TEXT PRIMARY KEY,
  patient_dfn TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  clinic_id TEXT NOT NULL,
  clinic_name TEXT NOT NULL,
  provider_name TEXT,
  appointment_type TEXT NOT NULL DEFAULT 'in-person',
  scheduled_at TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'requested',
  reason TEXT,
  notes TEXT,
  vista_sync INTEGER DEFAULT 0,
  vista_ref TEXT,
  cancel_reason TEXT,
  reschedule_preference TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pappt_dfn ON portal_appointment(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_pappt_status ON portal_appointment(status);
CREATE INDEX IF NOT EXISTS idx_pappt_sched ON portal_appointment(scheduled_at);

-- AK) telehealth_room — Phase 115: Durable telehealth room state
CREATE TABLE IF NOT EXISTS telehealth_room (
  id TEXT PRIMARY KEY,
  appointment_id TEXT,
  patient_dfn TEXT NOT NULL,
  provider_duz TEXT NOT NULL,
  provider_name TEXT,
  room_status TEXT NOT NULL DEFAULT 'scheduled',
  meeting_url TEXT,
  access_token TEXT,
  participants_json TEXT DEFAULT '{}',
  scheduled_start TEXT,
  actual_start TEXT,
  actual_end TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_troom_status ON telehealth_room(room_status);
CREATE INDEX IF NOT EXISTS idx_troom_appt ON telehealth_room(appointment_id);
CREATE INDEX IF NOT EXISTS idx_troom_expires ON telehealth_room(expires_at);

-- AL) imaging_work_order — Phase 115: Durable imaging worklist items
CREATE TABLE IF NOT EXISTS imaging_work_order (
  id TEXT PRIMARY KEY,
  vista_order_id TEXT,
  patient_dfn TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  accession_number TEXT NOT NULL,
  scheduled_procedure TEXT NOT NULL,
  procedure_code TEXT,
  modality TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  facility TEXT NOT NULL DEFAULT 'DEFAULT',
  location TEXT NOT NULL DEFAULT 'Radiology',
  ordering_provider_duz TEXT NOT NULL,
  ordering_provider_name TEXT NOT NULL,
  clinical_indication TEXT,
  priority TEXT NOT NULL DEFAULT 'routine',
  status TEXT NOT NULL DEFAULT 'ordered',
  linked_study_uid TEXT,
  linked_orthanc_study_id TEXT,
  source TEXT NOT NULL DEFAULT 'prototype-sidecar',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_imgwo_dfn ON imaging_work_order(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_imgwo_accn ON imaging_work_order(accession_number);
CREATE INDEX IF NOT EXISTS idx_imgwo_status ON imaging_work_order(status);
CREATE INDEX IF NOT EXISTS idx_imgwo_mod ON imaging_work_order(modality);

-- AM) imaging_study_link — Phase 115: Durable study-to-order linkages
CREATE TABLE IF NOT EXISTS imaging_study_link (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  patient_dfn TEXT NOT NULL,
  study_instance_uid TEXT NOT NULL,
  orthanc_study_id TEXT NOT NULL,
  accession_number TEXT NOT NULL,
  modality TEXT NOT NULL,
  study_date TEXT,
  study_description TEXT,
  series_count INTEGER DEFAULT 0,
  instance_count INTEGER DEFAULT 0,
  reconciliation_type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'prototype-sidecar',
  linked_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_imgsl_order ON imaging_study_link(order_id);
CREATE INDEX IF NOT EXISTS idx_imgsl_dfn ON imaging_study_link(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_imgsl_uid ON imaging_study_link(study_instance_uid);
CREATE INDEX IF NOT EXISTS idx_imgsl_accn ON imaging_study_link(accession_number);

-- AN) imaging_unmatched — Phase 115: Quarantined unmatched studies
CREATE TABLE IF NOT EXISTS imaging_unmatched (
  id TEXT PRIMARY KEY,
  orthanc_study_id TEXT NOT NULL,
  study_instance_uid TEXT NOT NULL,
  dicom_patient_id TEXT NOT NULL,
  dicom_patient_name TEXT,
  accession_number TEXT,
  modality TEXT,
  study_date TEXT,
  study_description TEXT,
  series_count INTEGER DEFAULT 0,
  instance_count INTEGER DEFAULT 0,
  reason TEXT NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0,
  quarantined_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_imgum_uid ON imaging_unmatched(study_instance_uid);
CREATE INDEX IF NOT EXISTS idx_imgum_resolved ON imaging_unmatched(resolved);

-- AO) idempotency_key — Phase 115: Durable request deduplication
CREATE TABLE IF NOT EXISTS idempotency_key (
  composite_key TEXT PRIMARY KEY,
  status_code INTEGER NOT NULL DEFAULT 0,
  response_body TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_idem_expires ON idempotency_key(expires_at);

-- AP) rcm_claim — Phase 121: Durable RCM claims
CREATE TABLE IF NOT EXISTS rcm_claim (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  claim_type TEXT NOT NULL DEFAULT 'professional',
  status TEXT NOT NULL DEFAULT 'draft',
  patient_dfn TEXT NOT NULL,
  patient_name TEXT,
  patient_dob TEXT,
  patient_first_name TEXT,
  patient_last_name TEXT,
  patient_gender TEXT,
  subscriber_id TEXT,
  billing_provider_npi TEXT,
  rendering_provider_npi TEXT,
  facility_npi TEXT,
  facility_name TEXT,
  facility_tax_id TEXT,
  payer_id TEXT NOT NULL,
  payer_name TEXT,
  payer_claim_id TEXT,
  date_of_service TEXT NOT NULL,
  diagnoses_json TEXT NOT NULL DEFAULT '[]',
  lines_json TEXT NOT NULL DEFAULT '[]',
  total_charge INTEGER NOT NULL DEFAULT 0,
  edi_transaction_id TEXT,
  connector_id TEXT,
  submitted_at TEXT,
  response_received_at TEXT,
  paid_amount INTEGER,
  adjustment_amount INTEGER,
  patient_responsibility INTEGER,
  remit_date TEXT,
  vista_charge_ien TEXT,
  vista_ar_ien TEXT,
  validation_result_json TEXT,
  pipeline_entry_id TEXT,
  export_artifact_path TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  submission_safety_mode TEXT NOT NULL DEFAULT 'export_only',
  is_mock INTEGER NOT NULL DEFAULT 0,
  audit_trail_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rcmcl_tenant ON rcm_claim(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rcmcl_status ON rcm_claim(status);
CREATE INDEX IF NOT EXISTS idx_rcmcl_payer ON rcm_claim(payer_id);
CREATE INDEX IF NOT EXISTS idx_rcmcl_patient ON rcm_claim(patient_dfn);

-- AQ) rcm_remittance — Phase 121: Durable remittances
CREATE TABLE IF NOT EXISTS rcm_remittance (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  status TEXT NOT NULL DEFAULT 'received',
  edi_transaction_id TEXT,
  check_number TEXT,
  check_date TEXT,
  eft_trace_number TEXT,
  payer_id TEXT NOT NULL,
  payer_name TEXT,
  claim_id TEXT,
  payer_claim_id TEXT,
  patient_dfn TEXT,
  total_charged INTEGER NOT NULL DEFAULT 0,
  total_paid INTEGER NOT NULL DEFAULT 0,
  total_adjusted INTEGER NOT NULL DEFAULT 0,
  total_patient_responsibility INTEGER NOT NULL DEFAULT 0,
  service_lines_json TEXT NOT NULL DEFAULT '[]',
  is_mock INTEGER NOT NULL DEFAULT 0,
  imported_at TEXT NOT NULL,
  matched_at TEXT,
  posted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rcmrm_tenant ON rcm_remittance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rcmrm_claim ON rcm_remittance(claim_id);
CREATE INDEX IF NOT EXISTS idx_rcmrm_payer ON rcm_remittance(payer_id);

-- AR) rcm_claim_case — Phase 121: Durable claim lifecycle cases
CREATE TABLE IF NOT EXISTS rcm_claim_case (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  lifecycle_status TEXT NOT NULL DEFAULT 'draft',
  base_claim_id TEXT,
  philhealth_draft_id TEXT,
  loa_case_id TEXT,
  patient_dfn TEXT NOT NULL,
  patient_name TEXT,
  patient_dob TEXT,
  patient_gender TEXT,
  subscriber_id TEXT,
  member_pin TEXT,
  billing_provider_npi TEXT,
  rendering_provider_npi TEXT,
  facility_code TEXT,
  facility_name TEXT,
  payer_id TEXT NOT NULL,
  payer_name TEXT,
  payer_type TEXT,
  claim_type TEXT NOT NULL DEFAULT 'professional',
  date_of_service TEXT NOT NULL,
  date_of_discharge TEXT,
  diagnoses_json TEXT NOT NULL DEFAULT '[]',
  procedures_json TEXT NOT NULL DEFAULT '[]',
  total_charge INTEGER NOT NULL DEFAULT 0,
  scrub_history_json TEXT NOT NULL DEFAULT '[]',
  last_scrub_result_json TEXT,
  attachments_json TEXT NOT NULL DEFAULT '[]',
  events_json TEXT NOT NULL DEFAULT '[]',
  denials_json TEXT NOT NULL DEFAULT '[]',
  is_demo INTEGER NOT NULL DEFAULT 0,
  is_mock INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'medium',
  vista_encounter_ien TEXT,
  vista_charge_ien TEXT,
  vista_ar_ien TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rcmcc_tenant ON rcm_claim_case(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rcmcc_status ON rcm_claim_case(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_rcmcc_payer ON rcm_claim_case(payer_id);
CREATE INDEX IF NOT EXISTS idx_rcmcc_patient ON rcm_claim_case(patient_dfn);

-- AS) portal_access_log — Phase 121: Durable portal access logs
CREATE TABLE IF NOT EXISTS portal_access_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  is_proxy INTEGER NOT NULL DEFAULT 0,
  target_patient_dfn TEXT,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pal_user ON portal_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_pal_type ON portal_access_log(event_type);
CREATE INDEX IF NOT EXISTS idx_pal_created ON portal_access_log(created_at);

-- AT) scheduling_request — Phase 121: Durable scheduling requests
CREATE TABLE IF NOT EXISTS scheduling_request (
  id TEXT PRIMARY KEY,
  patient_dfn TEXT NOT NULL,
  clinic_name TEXT NOT NULL,
  preferred_date TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'routine',
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  request_type TEXT NOT NULL DEFAULT 'new_appointment',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_schedreq_patient ON scheduling_request(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_schedreq_status ON scheduling_request(status);

`;

// Phase 97B: Add payer_type column (idempotent — catches "duplicate column" error)
const ALTER_MIGRATIONS: string[] = [
  `ALTER TABLE payer ADD COLUMN payer_type TEXT`,
];

/**
 * Run all migrations idempotently. Safe to call on every startup.
 */
export function runMigrations(): void {
  const db = getRawDb();

  // Step 1: Run idempotent CREATE TABLE / CREATE INDEX statements
  db.exec("BEGIN;");
  try {
    db.exec(MIGRATION_SQL);
    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }

  // Step 2: Run ALTER TABLE migrations individually (catch "duplicate column")
  for (const alter of ALTER_MIGRATIONS) {
    try {
      db.exec(alter + ";");
    } catch (alterErr) {
      const msg = alterErr instanceof Error ? alterErr.message : String(alterErr);
      if (!msg.includes("duplicate column")) {
        throw alterErr;
      }
      // Column already exists — idempotent, continue
    }
  }
}
