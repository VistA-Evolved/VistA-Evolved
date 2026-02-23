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
