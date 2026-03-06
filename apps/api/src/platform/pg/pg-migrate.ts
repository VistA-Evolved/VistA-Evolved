/**
 * Platform DB — PostgreSQL Migration Runner
 *
 * Phase 101: Platform Data Architecture Convergence
 *
 * Uses raw SQL DDL statements (CREATE TABLE IF NOT EXISTS) for
 * zero-config startup — same pattern as ../db/migrate.ts for SQLite.
 *
 * Migrations are version-tracked in a _migrations table. Each
 * migration runs exactly once, in order. Safe to call repeatedly.
 *
 * For schema evolution, add new migration entries to MIGRATIONS[].
 * Never modify existing migration SQL — add ALTER TABLE statements
 * as new migrations.
 */

import { getPgPool } from './pg-db.js';
import { createHash } from 'node:crypto';

interface Migration {
  version: number;
  name: string;
  sql: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'create_core_platform_tables',
    sql: `
-- Core: platform_audit_event (append-only, hash-chained)
CREATE TABLE IF NOT EXISTS platform_audit_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  actor TEXT NOT NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  detail JSONB,
  prev_hash TEXT,
  entry_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_created ON platform_audit_event(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON platform_audit_event(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON platform_audit_event(action);

-- Core: idempotency_key (request deduplication)
CREATE TABLE IF NOT EXISTS idempotency_key (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  key TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_idempotency_tenant_key ON idempotency_key(tenant_id, key);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_key(expires_at);

-- Core: outbox_event (transactional outbox)
CREATE TABLE IF NOT EXISTS outbox_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_outbox_unpublished ON outbox_event(published, created_at);
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate ON outbox_event(aggregate_type, aggregate_id);
`,
  },
  {
    version: 2,
    name: 'create_payer_tables',
    sql: `
-- Payer domain (mirrored from SQLite, enhanced with Postgres types)
CREATE TABLE IF NOT EXISTS payer (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  canonical_name TEXT NOT NULL,
  aliases JSONB NOT NULL DEFAULT '[]',
  country_code TEXT NOT NULL DEFAULT 'PH',
  regulator_source TEXT,
  regulator_license_no TEXT,
  category TEXT,
  payer_type TEXT,
  integration_mode TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payer_tenant ON payer(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payer_country ON payer(country_code);

CREATE TABLE IF NOT EXISTS tenant_payer (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  payer_id TEXT NOT NULL REFERENCES payer(id),
  status TEXT NOT NULL DEFAULT 'contracting_needed',
  notes TEXT,
  vault_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenant_payer_tenant ON tenant_payer(tenant_id);

CREATE TABLE IF NOT EXISTS payer_capability (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  payer_id TEXT NOT NULL REFERENCES payer(id),
  capability_key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'unknown',
  evidence_snapshot_id TEXT,
  reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_capability_payer ON payer_capability(payer_id);

CREATE TABLE IF NOT EXISTS payer_task (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  payer_id TEXT NOT NULL REFERENCES payer(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payer_evidence_snapshot (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  source_type TEXT NOT NULL,
  source_url TEXT,
  as_of_date TIMESTAMPTZ NOT NULL,
  sha256 TEXT NOT NULL,
  stored_path TEXT,
  parser_version TEXT NOT NULL DEFAULT '1.0.0',
  status TEXT NOT NULL DEFAULT 'pending',
  payer_count INTEGER,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payer_audit_event (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json JSONB,
  after_json JSONB,
  reason TEXT,
  evidence_snapshot_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payer_audit_entity ON payer_audit_event(entity_type, entity_id);
`,
  },
  {
    version: 3,
    name: 'create_denial_reconciliation_tables',
    sql: `
-- Denial case
CREATE TABLE IF NOT EXISTS denial_case (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  claim_ref TEXT NOT NULL,
  vista_claim_ien TEXT,
  patient_dfn TEXT,
  payer_id TEXT NOT NULL,
  denial_status TEXT NOT NULL DEFAULT 'NEW',
  denial_source TEXT NOT NULL DEFAULT 'MANUAL',
  denial_codes_json JSONB NOT NULL DEFAULT '[]',
  denial_narrative TEXT,
  received_date TIMESTAMPTZ NOT NULL,
  deadline_date TIMESTAMPTZ,
  assigned_to TEXT,
  assigned_team TEXT,
  billed_amount_cents INTEGER NOT NULL DEFAULT 0,
  allowed_amount_cents INTEGER,
  paid_amount_cents INTEGER,
  patient_resp_cents INTEGER,
  adjustment_amount_cents INTEGER,
  evidence_refs_json JSONB NOT NULL DEFAULT '[]',
  import_file_hash TEXT,
  import_timestamp TIMESTAMPTZ,
  import_parser_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_denial_tenant ON denial_case(tenant_id);
CREATE INDEX IF NOT EXISTS idx_denial_payer ON denial_case(payer_id);
CREATE INDEX IF NOT EXISTS idx_denial_status ON denial_case(denial_status);

CREATE TABLE IF NOT EXISTS denial_action (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  denial_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL,
  action_type TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}',
  previous_status TEXT,
  new_status TEXT
);

CREATE TABLE IF NOT EXISTS denial_attachment (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  denial_id TEXT NOT NULL,
  label TEXT NOT NULL,
  ref_type TEXT NOT NULL,
  stored_path TEXT,
  sha256 TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by TEXT
);

CREATE TABLE IF NOT EXISTS resubmission_attempt (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  denial_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  method TEXT NOT NULL,
  reference_number TEXT,
  follow_up_date TIMESTAMPTZ,
  notes TEXT,
  actor TEXT NOT NULL
);

-- Remittance + Payments + Reconciliation
CREATE TABLE IF NOT EXISTS remittance_import (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_type TEXT NOT NULL DEFAULT 'MANUAL',
  received_at TIMESTAMPTZ NOT NULL,
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

CREATE TABLE IF NOT EXISTS payment_record (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  remittance_import_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
  posted_date TIMESTAMPTZ,
  service_date TIMESTAMPTZ,
  raw_codes_json JSONB NOT NULL DEFAULT '[]',
  patient_dfn TEXT,
  line_index INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_payment_tenant ON payment_record(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_claim ON payment_record(claim_ref);

CREATE TABLE IF NOT EXISTS reconciliation_match (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_id TEXT NOT NULL,
  claim_ref TEXT NOT NULL,
  match_confidence INTEGER NOT NULL DEFAULT 0,
  match_method TEXT NOT NULL,
  match_status TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED',
  match_notes TEXT,
  confirmed_by TEXT,
  confirmed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS underpayment_case (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claim_ref TEXT NOT NULL,
  payment_id TEXT NOT NULL,
  payer_id TEXT NOT NULL,
  expected_amount_model TEXT NOT NULL DEFAULT 'BILLED_AMOUNT',
  expected_amount_cents INTEGER NOT NULL,
  paid_amount_cents INTEGER NOT NULL,
  delta_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW',
  denial_case_id TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_note TEXT
);
CREATE INDEX IF NOT EXISTS idx_underpayment_tenant ON underpayment_case(tenant_id);
`,
  },
  {
    version: 4,
    name: 'create_eligibility_claim_status_tables',
    sql: `
-- Eligibility check (Phase 100)
CREATE TABLE IF NOT EXISTS eligibility_check (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT NOT NULL,
  payer_id TEXT NOT NULL,
  subscriber_id TEXT,
  member_id TEXT,
  date_of_service TIMESTAMPTZ,
  provenance TEXT NOT NULL,
  eligible BOOLEAN,
  status TEXT NOT NULL DEFAULT 'pending',
  response_json JSONB,
  error_message TEXT,
  response_ms INTEGER,
  checked_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_eligibility_tenant ON eligibility_check(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_patient ON eligibility_check(patient_dfn, payer_id);

-- Claim status check (Phase 100)
CREATE TABLE IF NOT EXISTS claim_status_check (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  claim_ref TEXT NOT NULL,
  payer_id TEXT NOT NULL,
  payer_claim_id TEXT,
  provenance TEXT NOT NULL,
  claim_status TEXT,
  adjudication_date TIMESTAMPTZ,
  paid_amount_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  response_json JSONB,
  error_message TEXT,
  response_ms INTEGER,
  checked_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_claim_status_tenant ON claim_status_check(tenant_id);
CREATE INDEX IF NOT EXISTS idx_claim_status_claim ON claim_status_check(claim_ref);
`,
  },
  {
    version: 5,
    name: 'create_capability_matrix_tables',
    sql: `
-- Capability matrix cell — one row per (payerId x capabilityType)
CREATE TABLE IF NOT EXISTS capability_matrix_cell (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  payer_id TEXT NOT NULL,
  payer_name TEXT NOT NULL,
  capability TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'manual',
  maturity TEXT NOT NULL DEFAULT 'none',
  operational_notes TEXT,
  updated_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cap_matrix_payer_cap ON capability_matrix_cell(payer_id, capability);
CREATE INDEX IF NOT EXISTS idx_cap_matrix_tenant ON capability_matrix_cell(tenant_id);

-- Capability matrix evidence — one-to-many evidence links per cell
CREATE TABLE IF NOT EXISTS capability_matrix_evidence (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  cell_id TEXT NOT NULL REFERENCES capability_matrix_cell(id),
  evidence_type TEXT NOT NULL,
  value TEXT NOT NULL,
  added_by TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cap_evidence_cell ON capability_matrix_evidence(cell_id);
`,
  },
  {
    version: 6,
    name: 'performance_indexes_and_partitioning_posture',
    sql: `
-- ============================================================
-- Phase 103: DB Performance Posture
-- Additional indexes for common query patterns + tenant scoping
-- ============================================================

-- Payer: composite for filtered lookups
CREATE INDEX IF NOT EXISTS idx_payer_tenant_active ON payer(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_payer_country_active ON payer(country_code, active);
CREATE INDEX IF NOT EXISTS idx_payer_integration_mode ON payer(integration_mode);

-- Tenant payer: composite for tenant + payer uniqueness check
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_payer_unique ON tenant_payer(tenant_id, payer_id);

-- Payer capability: unique per payer+key+tenant (prevents duplicate capabilities)
CREATE UNIQUE INDEX IF NOT EXISTS idx_capability_payer_key ON payer_capability(payer_id, capability_key, COALESCE(tenant_id, '__null__'));

-- Payer task: tenant + status for workqueue queries
CREATE INDEX IF NOT EXISTS idx_task_tenant_status ON payer_task(COALESCE(tenant_id, 'default'), status);
CREATE INDEX IF NOT EXISTS idx_task_payer ON payer_task(payer_id);

-- Payer audit: tenant + created_at for time-range queries
CREATE INDEX IF NOT EXISTS idx_payer_audit_tenant_time ON payer_audit_event(COALESCE(tenant_id, 'default'), created_at);

-- Denial case: composite for workqueue
CREATE INDEX IF NOT EXISTS idx_denial_tenant_status ON denial_case(tenant_id, denial_status, deadline_date);
CREATE INDEX IF NOT EXISTS idx_denial_claim ON denial_case(claim_ref);

-- Denial action: lookup by denial
CREATE INDEX IF NOT EXISTS idx_denial_action_denial ON denial_action(denial_id);

-- Denial attachment: lookup by denial
CREATE INDEX IF NOT EXISTS idx_denial_attach_denial ON denial_attachment(denial_id);

-- Resubmission: lookup by denial
CREATE INDEX IF NOT EXISTS idx_resub_denial ON resubmission_attempt(denial_id);

-- Remittance: tenant + time
CREATE INDEX IF NOT EXISTS idx_remittance_tenant ON remittance_import(tenant_id, received_at);

-- Payment: tenant + payer for reconciliation
CREATE INDEX IF NOT EXISTS idx_payment_payer ON payment_record(payer_id);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment_record(status);

-- Reconciliation: tenant + status for review queues
CREATE INDEX IF NOT EXISTS idx_recon_tenant ON reconciliation_match(tenant_id, match_status);
CREATE INDEX IF NOT EXISTS idx_recon_payment ON reconciliation_match(payment_id);

-- Underpayment: status for workqueue
CREATE INDEX IF NOT EXISTS idx_underpay_status ON underpayment_case(status);

-- Outbox: tenant scope
CREATE INDEX IF NOT EXISTS idx_outbox_tenant ON outbox_event(tenant_id);

-- Platform audit: actor for audit-by-user queries
CREATE INDEX IF NOT EXISTS idx_audit_actor ON platform_audit_event(actor);

-- Idempotency: cleanup index for expired key pruning
-- (idx_idempotency_expires already exists from v1)

-- Evidence snapshot: tenant + status for ingestion pipeline
CREATE INDEX IF NOT EXISTS idx_evidence_tenant ON payer_evidence_snapshot(COALESCE(tenant_id, 'default'), status);

-- Eligibility: status for polling
CREATE INDEX IF NOT EXISTS idx_eligibility_status ON eligibility_check(status, created_at);

-- Claim status: status for polling
CREATE INDEX IF NOT EXISTS idx_claim_status_status ON claim_status_check(status, created_at);

-- ============================================================
-- Partitioning posture: documented, not yet applied
-- ============================================================
-- NOTE: PostgreSQL native RANGE partitioning on created_at is
-- the recommended strategy for high-growth tables:
--   - platform_audit_event (append-only, unbounded growth)
--   - outbox_event (high-volume, prunable after publish)
--   - payer_audit_event (append-only per payer change)
--
-- Partitioning DEFERRED to Phase 103B because:
--   1. Requires CREATE TABLE ... PARTITION BY RANGE (breaks IF NOT EXISTS idempotency)
--   2. Existing tables must be migrated (pg_dump → recreate → restore)
--   3. Needs partition management cron (pg_partman or manual CREATE PARTITION)
--   4. Current data volumes don't justify the operational complexity yet
--
-- When activated, the plan is:
--   PARTITION BY RANGE (created_at) with monthly partitions
--   Auto-create 3 months ahead, detach partitions older than 13 months
--   See docs/architecture/platform-db-performance.md for full plan
`,
  },
  {
    version: 7,
    name: 'security_integrity_posture',
    sql: `
-- ============================================================
-- Phase 104: Platform DB Security/Compliance Posture
-- ============================================================

-- 1. Optimistic concurrency: version columns on mutable tables
ALTER TABLE payer ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE tenant_payer ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE payer_capability ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE payer_task ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE payer_evidence_snapshot ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- 2. updated_by columns for attribution on mutations
ALTER TABLE payer ADD COLUMN IF NOT EXISTS updated_by TEXT;
ALTER TABLE tenant_payer ADD COLUMN IF NOT EXISTS updated_by TEXT;
ALTER TABLE payer_capability ADD COLUMN IF NOT EXISTS updated_by TEXT;
ALTER TABLE payer_task ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- 3. RLS helper function (idempotent CREATE OR REPLACE)
-- Creates a row-level security policy that restricts rows to the
-- tenant set via SET LOCAL app.current_tenant_id.
-- Also adds FORCE ROW LEVEL SECURITY so even table owners are subject.
-- Note: DROP + CREATE is necessary because PG does not allow renaming
-- input parameters via CREATE OR REPLACE (BUG-069).
DROP FUNCTION IF EXISTS create_tenant_rls_policy(TEXT);
CREATE OR REPLACE FUNCTION create_tenant_rls_policy(tbl TEXT) RETURNS void AS $$
BEGIN
  -- Enable RLS on the table
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
  -- Force RLS even for table owner (critical for compliance)
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);

  -- Drop existing policy if present (idempotent)
  BEGIN
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
  EXCEPTION WHEN undefined_object THEN
    NULL; -- policy didn't exist, that's fine
  END;

  -- Create the isolation policy
  -- current_setting('app.current_tenant_id', true) returns '' if not set
  EXECUTE format(
    'CREATE POLICY tenant_isolation ON %I '
    'USING (tenant_id = current_setting(''app.current_tenant_id'', true)) '
    'WITH CHECK (tenant_id = current_setting(''app.current_tenant_id'', true))',
    tbl
  );
END;
$$ LANGUAGE plpgsql;

-- 4. prevent_audit_mutation trigger: block UPDATE/DELETE on audit tables
CREATE OR REPLACE FUNCTION prevent_audit_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Audit table % is append-only. UPDATE/DELETE is prohibited.', TG_TABLE_NAME;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply append-only triggers to audit tables
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_platform_audit_immutable'
  ) THEN
    CREATE TRIGGER trg_platform_audit_immutable
      BEFORE UPDATE OR DELETE ON platform_audit_event
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_payer_audit_immutable'
  ) THEN
    CREATE TRIGGER trg_payer_audit_immutable
      BEFORE UPDATE OR DELETE ON payer_audit_event
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
  END IF;
END $$;
`,
  },
  {
    version: 8,
    name: 'create_job_run_log',
    sql: `
-- ============================================================
-- Phase 116: Job Run Log (Graphile Worker governance)
-- ============================================================

-- Tracks every job execution for audit, debugging, and retention.
-- PHI is structurally excluded from payload_json (validated at enqueue).
CREATE TABLE IF NOT EXISTS job_run_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  graphile_job_id TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}',
  tenant_id TEXT NOT NULL DEFAULT 'default',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  ok BOOLEAN NOT NULL DEFAULT false,
  duration_ms INTEGER,
  error_redacted TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_job_run_log_name ON job_run_log(job_name, started_at);
CREATE INDEX IF NOT EXISTS idx_job_run_log_tenant ON job_run_log(tenant_id, started_at);
CREATE INDEX IF NOT EXISTS idx_job_run_log_ok ON job_run_log(ok, finished_at);
`,
  },
  {
    version: 9,
    name: 'session_workqueue_multi_instance',
    sql: `
-- ============================================================
-- Phase 117: Postgres-first Prod Posture + Multi-Instance
-- auth_session, rcm_work_item, rcm_work_item_event tables
-- ============================================================

-- Auth session table (mirrors SQLite auth_session)
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
  metadata_json TEXT
);

-- Session indexes: tenant scope, token lookup, expiry cleanup, user query
CREATE INDEX IF NOT EXISTS idx_auth_session_tenant ON auth_session(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_session_token_hash ON auth_session(token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_session_expires ON auth_session(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_session_user ON auth_session(user_id);

-- RCM work item table (mirrors SQLite rcm_work_item)
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

-- Work item indexes: tenant, status+updated (queue queries), claim, priority, lock
CREATE INDEX IF NOT EXISTS idx_work_item_tenant ON rcm_work_item(tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_item_status_updated ON rcm_work_item(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_work_item_claim ON rcm_work_item(claim_id);
CREATE INDEX IF NOT EXISTS idx_work_item_priority_created ON rcm_work_item(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_work_item_locked ON rcm_work_item(locked_by, lock_expires_at);

-- RCM work item event table (mirrors SQLite rcm_work_item_event)
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

-- Work event indexes: item lookup, tenant scope
CREATE INDEX IF NOT EXISTS idx_work_event_item ON rcm_work_item_event(work_item_id);
CREATE INDEX IF NOT EXISTS idx_work_event_tenant ON rcm_work_item_event(tenant_id);
`,
  },
  {
    version: 10,
    name: 'rcm_durability_pg',
    sql: `
-- ============================================================
-- Phase 126: RCM Durability Wave (Map stores -> Postgres)
-- rcm_claim, rcm_remittance, rcm_claim_case,
-- edi_acknowledgement, edi_claim_status, edi_pipeline_entry
-- ============================================================

-- RCM Claim (mirrors SQLite rcm_claim from Phase 121)
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
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  submission_safety_mode TEXT NOT NULL DEFAULT 'export_only',
  is_mock BOOLEAN NOT NULL DEFAULT FALSE,
  audit_trail_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rcm_claim_tenant ON rcm_claim(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rcm_claim_status ON rcm_claim(status);
CREATE INDEX IF NOT EXISTS idx_rcm_claim_patient ON rcm_claim(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_rcm_claim_payer ON rcm_claim(payer_id);
CREATE INDEX IF NOT EXISTS idx_rcm_claim_updated ON rcm_claim(updated_at);

-- RCM Remittance (mirrors SQLite rcm_remittance from Phase 121)
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
  total_charged INTEGER NOT NULL,
  total_paid INTEGER NOT NULL,
  total_adjusted INTEGER NOT NULL,
  total_patient_responsibility INTEGER NOT NULL,
  service_lines_json TEXT NOT NULL DEFAULT '[]',
  is_mock BOOLEAN NOT NULL DEFAULT FALSE,
  imported_at TEXT NOT NULL,
  matched_at TEXT,
  posted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rcm_remit_tenant ON rcm_remittance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rcm_remit_claim ON rcm_remittance(claim_id);
CREATE INDEX IF NOT EXISTS idx_rcm_remit_payer ON rcm_remittance(payer_id);

-- RCM Claim Case (mirrors SQLite rcm_claim_case from Phase 121)
CREATE TABLE IF NOT EXISTS rcm_claim_case (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  lifecycle_status TEXT NOT NULL DEFAULT 'intake',
  base_claim_id TEXT,
  philhealth_draft_id TEXT,
  loa_case_id TEXT,
  patient_dfn TEXT NOT NULL,
  patient_name TEXT,
  payer_id TEXT,
  payer_name TEXT,
  provider_duz TEXT,
  provider_name TEXT,
  encounter_date TEXT,
  diagnoses_json TEXT NOT NULL DEFAULT '[]',
  procedures_json TEXT NOT NULL DEFAULT '[]',
  scrub_result_json TEXT,
  scrub_score INTEGER,
  events_json TEXT NOT NULL DEFAULT '[]',
  attachments_json TEXT NOT NULL DEFAULT '[]',
  denials_json TEXT NOT NULL DEFAULT '[]',
  notes_json TEXT NOT NULL DEFAULT '[]',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rcm_case_tenant ON rcm_claim_case(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rcm_case_status ON rcm_claim_case(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_rcm_case_patient ON rcm_claim_case(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_rcm_case_base_claim ON rcm_claim_case(base_claim_id);

-- EDI Acknowledgement (NEW: Phase 126 -- replaces in-memory ack store)
CREATE TABLE IF NOT EXISTS edi_acknowledgement (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  type TEXT NOT NULL,
  disposition TEXT NOT NULL,
  claim_id TEXT,
  original_control_number TEXT NOT NULL,
  ack_control_number TEXT NOT NULL,
  payer_id TEXT,
  payer_name TEXT,
  errors_json TEXT NOT NULL DEFAULT '[]',
  raw_payload TEXT,
  idempotency_key TEXT NOT NULL,
  received_at TEXT NOT NULL,
  processed_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_edi_ack_tenant ON edi_acknowledgement(tenant_id);
CREATE INDEX IF NOT EXISTS idx_edi_ack_claim ON edi_acknowledgement(claim_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_edi_ack_idempotency ON edi_acknowledgement(tenant_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_edi_ack_received ON edi_acknowledgement(received_at);

-- EDI Claim Status (NEW: Phase 126 -- replaces in-memory status store)
CREATE TABLE IF NOT EXISTS edi_claim_status (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  claim_id TEXT,
  payer_claim_id TEXT,
  category_code TEXT NOT NULL,
  status_code TEXT NOT NULL,
  status_description TEXT NOT NULL,
  effective_date TEXT,
  check_date TEXT,
  total_charged INTEGER,
  total_paid INTEGER,
  payer_id TEXT,
  payer_name TEXT,
  raw_payload TEXT,
  idempotency_key TEXT NOT NULL,
  received_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_edi_status_tenant ON edi_claim_status(tenant_id);
CREATE INDEX IF NOT EXISTS idx_edi_status_claim ON edi_claim_status(claim_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_edi_status_idempotency ON edi_claim_status(tenant_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_edi_status_received ON edi_claim_status(received_at);

-- EDI Pipeline Entry (NEW: Phase 126 -- replaces in-memory pipeline store)
CREATE TABLE IF NOT EXISTS edi_pipeline_entry (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  claim_id TEXT NOT NULL,
  transaction_set TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'build',
  connector_id TEXT NOT NULL,
  payer_id TEXT NOT NULL,
  outbound_payload TEXT,
  inbound_payload TEXT,
  errors_json TEXT NOT NULL DEFAULT '[]',
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_edi_pipeline_tenant ON edi_pipeline_entry(tenant_id);
CREATE INDEX IF NOT EXISTS idx_edi_pipeline_claim ON edi_pipeline_entry(claim_id);
CREATE INDEX IF NOT EXISTS idx_edi_pipeline_stage ON edi_pipeline_entry(stage);
CREATE INDEX IF NOT EXISTS idx_edi_pipeline_payer ON edi_pipeline_entry(payer_id);
`,
  },
  {
    version: 11,
    name: 'portal_telehealth_durability_pg',
    sql: `
-- ============================================================
-- Phase 127: Portal + Telehealth Durability (Map stores -> PG)
-- portal_message, portal_access_log, portal_patient_setting,
-- telehealth_room, telehealth_room_event
-- ============================================================

-- Portal Message (mirrors SQLite portal_message from Phase 115)
CREATE TABLE IF NOT EXISTS portal_message (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
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
  vista_sync BOOLEAN DEFAULT FALSE,
  vista_ref TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_msg_tenant ON portal_message(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portal_msg_thread ON portal_message(thread_id);
CREATE INDEX IF NOT EXISTS idx_portal_msg_from ON portal_message(from_dfn);
CREATE INDEX IF NOT EXISTS idx_portal_msg_to ON portal_message(to_dfn);
CREATE INDEX IF NOT EXISTS idx_portal_msg_status ON portal_message(status);
CREATE INDEX IF NOT EXISTS idx_portal_msg_created ON portal_message(created_at);

-- Portal Access Log (mirrors SQLite portal_access_log from Phase 121)
CREATE TABLE IF NOT EXISTS portal_access_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  is_proxy BOOLEAN NOT NULL DEFAULT FALSE,
  target_patient_dfn TEXT,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_alog_tenant ON portal_access_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portal_alog_user ON portal_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_portal_alog_event ON portal_access_log(event_type);
CREATE INDEX IF NOT EXISTS idx_portal_alog_created ON portal_access_log(created_at);

-- Portal Patient Setting (NEW -- no SQLite predecessor)
CREATE TABLE IF NOT EXISTS portal_patient_setting (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  notifications_json TEXT NOT NULL DEFAULT '{}',
  display_json TEXT NOT NULL DEFAULT '{}',
  mfa_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_setting_tenant ON portal_patient_setting(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_setting_patient ON portal_patient_setting(tenant_id, patient_dfn);

-- Telehealth Room (mirrors SQLite telehealth_room from Phase 115)
CREATE TABLE IF NOT EXISTS telehealth_room (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
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
CREATE INDEX IF NOT EXISTS idx_th_room_tenant ON telehealth_room(tenant_id);
CREATE INDEX IF NOT EXISTS idx_th_room_patient ON telehealth_room(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_th_room_provider ON telehealth_room(provider_duz);
CREATE INDEX IF NOT EXISTS idx_th_room_status ON telehealth_room(room_status);
CREATE INDEX IF NOT EXISTS idx_th_room_expires ON telehealth_room(expires_at);

-- Telehealth Room Event (NEW -- lifecycle event log)
CREATE TABLE IF NOT EXISTS telehealth_room_event (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  room_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_id TEXT,
  actor_role TEXT,
  detail TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_th_event_tenant ON telehealth_room_event(tenant_id);
CREATE INDEX IF NOT EXISTS idx_th_event_room ON telehealth_room_event(room_id);
CREATE INDEX IF NOT EXISTS idx_th_event_type ON telehealth_room_event(event_type);
CREATE INDEX IF NOT EXISTS idx_th_event_created ON telehealth_room_event(created_at);
`,
  },
  {
    version: 12,
    name: 'imaging_scheduling_durability_pg',
    sql: `
-- ============================================================
-- Phase 128: Imaging + Scheduling Durability (Map stores -> PG)
-- imaging_work_item, imaging_ingest_event,
-- scheduling_waitlist_request, scheduling_booking_lock
-- ============================================================

-- Imaging Work Item (worklist orders)
CREATE TABLE IF NOT EXISTS imaging_work_item (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  vista_order_id TEXT,
  patient_dfn TEXT NOT NULL,
  patient_name TEXT NOT NULL DEFAULT '',
  accession_number TEXT NOT NULL,
  scheduled_procedure TEXT NOT NULL DEFAULT '',
  procedure_code TEXT,
  modality TEXT NOT NULL,
  scheduled_time TEXT NOT NULL DEFAULT '',
  facility TEXT NOT NULL DEFAULT 'DEFAULT',
  location TEXT NOT NULL DEFAULT 'Radiology',
  ordering_provider_duz TEXT NOT NULL DEFAULT '',
  ordering_provider_name TEXT NOT NULL DEFAULT '',
  clinical_indication TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'routine',
  status TEXT NOT NULL DEFAULT 'ordered',
  linked_study_uid TEXT,
  linked_orthanc_study_id TEXT,
  source TEXT NOT NULL DEFAULT 'prototype-sidecar',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_img_wi_tenant ON imaging_work_item(tenant_id);
CREATE INDEX IF NOT EXISTS idx_img_wi_patient ON imaging_work_item(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_img_wi_accession ON imaging_work_item(accession_number);
CREATE INDEX IF NOT EXISTS idx_img_wi_modality ON imaging_work_item(modality);
CREATE INDEX IF NOT EXISTS idx_img_wi_status ON imaging_work_item(status);
CREATE INDEX IF NOT EXISTS idx_img_wi_scheduled ON imaging_work_item(scheduled_time);

-- Imaging Ingest Event (study linkages + unmatched quarantine)
CREATE TABLE IF NOT EXISTS imaging_ingest_event (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  event_type TEXT NOT NULL,
  order_id TEXT,
  patient_dfn TEXT NOT NULL DEFAULT '',
  study_instance_uid TEXT NOT NULL,
  orthanc_study_id TEXT NOT NULL,
  accession_number TEXT NOT NULL DEFAULT '',
  modality TEXT NOT NULL DEFAULT '',
  study_date TEXT NOT NULL DEFAULT '',
  study_description TEXT NOT NULL DEFAULT '',
  series_count INTEGER NOT NULL DEFAULT 0,
  instance_count INTEGER NOT NULL DEFAULT 0,
  reconciliation_type TEXT,
  source TEXT NOT NULL DEFAULT 'prototype-sidecar',
  reason TEXT,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  dicom_patient_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_img_ie_tenant ON imaging_ingest_event(tenant_id);
CREATE INDEX IF NOT EXISTS idx_img_ie_type ON imaging_ingest_event(event_type);
CREATE INDEX IF NOT EXISTS idx_img_ie_patient ON imaging_ingest_event(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_img_ie_study_uid ON imaging_ingest_event(study_instance_uid);
CREATE INDEX IF NOT EXISTS idx_img_ie_order ON imaging_ingest_event(order_id);
CREATE INDEX IF NOT EXISTS idx_img_ie_accession ON imaging_ingest_event(accession_number);

-- Add dicom_patient_name column if missing (Phase 128 fix)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='imaging_ingest_event' AND column_name='dicom_patient_name')
  THEN
    ALTER TABLE imaging_ingest_event ADD COLUMN dicom_patient_name TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- Scheduling Waitlist Request (operational tracking -- NOT appointment truth)
CREATE TABLE IF NOT EXISTS scheduling_waitlist_request (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
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
CREATE INDEX IF NOT EXISTS idx_sched_wr_tenant ON scheduling_waitlist_request(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sched_wr_patient ON scheduling_waitlist_request(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_sched_wr_clinic ON scheduling_waitlist_request(clinic_name);
CREATE INDEX IF NOT EXISTS idx_sched_wr_status ON scheduling_waitlist_request(status);
CREATE INDEX IF NOT EXISTS idx_sched_wr_date ON scheduling_waitlist_request(preferred_date);

-- Scheduling Booking Lock (TTL-based concurrency locks)
CREATE TABLE IF NOT EXISTS scheduling_booking_lock (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  lock_key TEXT NOT NULL,
  holder_duz TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  acquired_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sched_bl_tenant ON scheduling_booking_lock(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sched_bl_key ON scheduling_booking_lock(tenant_id, lock_key);
CREATE INDEX IF NOT EXISTS idx_sched_bl_expires ON scheduling_booking_lock(expires_at);
`,
  },
  {
    version: 13,
    name: 'imaging_ingest_dicom_patient_name',
    sql: `
-- Phase 128 fix: Add dicom_patient_name column to imaging_ingest_event
-- For fresh installs this is already in v12 DDL; this covers upgrades
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='imaging_ingest_event' AND column_name='dicom_patient_name')
  THEN
    ALTER TABLE imaging_ingest_event ADD COLUMN dicom_patient_name TEXT NOT NULL DEFAULT '';
  END IF;
END $$;
`,
  },
  {
    version: 14,
    name: 'scheduling_lifecycle',
    sql: `
-- Phase 131: Scheduling lifecycle — operational state machine tracking.
-- VistA is source of truth; this table tracks transitions for audit/UI.
-- States: requested, waitlisted, booked, checked_in, completed, cancelled, no_show
CREATE TABLE IF NOT EXISTS scheduling_lifecycle (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  appointment_ref TEXT NOT NULL,
  patient_dfn TEXT NOT NULL,
  clinic_ien TEXT,
  clinic_name TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'requested',
  previous_state TEXT,
  vista_ien TEXT,
  rpc_used TEXT,
  transition_note TEXT,
  created_by_duz TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sched_lc_tenant ON scheduling_lifecycle(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sched_lc_patient ON scheduling_lifecycle(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_sched_lc_ref ON scheduling_lifecycle(appointment_ref);
CREATE INDEX IF NOT EXISTS idx_sched_lc_state ON scheduling_lifecycle(state);
CREATE INDEX IF NOT EXISTS idx_sched_lc_clinic ON scheduling_lifecycle(clinic_name);
CREATE INDEX IF NOT EXISTS idx_sched_lc_created ON scheduling_lifecycle(created_at);
`,
  },
  {
    version: 15,
    name: 'i18n_foundation',
    sql: `
-- Phase 132: I18N foundation — user locale preferences + intake question schema.

-- Clinician locale preference (per user per tenant)
CREATE TABLE IF NOT EXISTS user_locale_preference (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_duz TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ulp_tenant_duz ON user_locale_preference(tenant_id, user_duz);
CREATE INDEX IF NOT EXISTS idx_ulp_tenant ON user_locale_preference(tenant_id);

-- Intake question schema — locale-aware question definitions for intake forms
CREATE TABLE IF NOT EXISTS intake_question_schema (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  question_key TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  category TEXT NOT NULL DEFAULT 'general',
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'text',
  options_json TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  vista_field_target TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_iqs_key_locale ON intake_question_schema(tenant_id, question_key, locale);
CREATE INDEX IF NOT EXISTS idx_iqs_tenant ON intake_question_schema(tenant_id);
CREATE INDEX IF NOT EXISTS idx_iqs_locale ON intake_question_schema(locale);
CREATE INDEX IF NOT EXISTS idx_iqs_category ON intake_question_schema(category);
CREATE INDEX IF NOT EXISTS idx_iqs_active ON intake_question_schema(active);
`,
  },
  {
    version: 16,
    name: 'clinic_preferences',
    sql: `
-- Phase 139: Clinic scheduling preferences -- tenant-scoped overlay on VistA clinic data.
-- VistA remains the master clinic record (SD W/L RETRIVE HOSP LOC).
-- Preferences control display config, slot duration, timezone.
CREATE TABLE IF NOT EXISTS clinic_preferences (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  clinic_ien TEXT NOT NULL,
  clinic_name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
  max_daily_slots INTEGER NOT NULL DEFAULT 20,
  display_config TEXT,
  operating_hours TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cp_tenant ON clinic_preferences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cp_clinic ON clinic_preferences(clinic_ien);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cp_tenant_clinic ON clinic_preferences(tenant_id, clinic_ien);
`,
  },
  {
    version: 17,
    name: 'patient_consent_and_portal_pref',
    sql: `
-- Phase 140: Patient consent decisions (HIPAA, research, data sharing, etc.)
CREATE TABLE IF NOT EXISTS patient_consent (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT NOT NULL,
  consent_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  signed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  locale TEXT NOT NULL DEFAULT 'en',
  version INTEGER NOT NULL DEFAULT 1,
  metadata TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pc_tenant ON patient_consent(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pc_patient ON patient_consent(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_pc_type ON patient_consent(consent_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pc_tenant_patient_type ON patient_consent(tenant_id, patient_dfn, consent_type);

-- Phase 140: Patient portal preferences (notifications, language, display)
CREATE TABLE IF NOT EXISTS patient_portal_pref (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT NOT NULL,
  notifications TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  display_prefs TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ppp_tenant ON patient_portal_pref(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ppp_patient ON patient_portal_pref(patient_dfn);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ppp_tenant_patient ON patient_portal_pref(tenant_id, patient_dfn);
`,
  },
  {
    version: 18,
    name: 'durability_wave3_critical_stores',
    sql: `
-- ============================================================
-- Phase 146: Durability Wave 3 — Critical Map Stores to PG
-- Covers portal, RCM, imaging, auth, clinical, intake, infra
-- ============================================================

-- Portal: User accounts (portal_user_store.ts)
CREATE TABLE IF NOT EXISTS portal_user (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'patient',
  status TEXT NOT NULL DEFAULT 'active',
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_secret TEXT,
  mfa_backup_codes TEXT,
  patient_profiles_json TEXT DEFAULT '[]',
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  password_reset_token TEXT,
  password_reset_expires TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pu_tenant ON portal_user(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pu_username ON portal_user(tenant_id, username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pu_email ON portal_user(tenant_id, email);

-- Portal: Sessions (portal-auth.ts + portal-iam-routes.ts)
CREATE TABLE IF NOT EXISTS portal_session (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  token TEXT NOT NULL,
  user_id TEXT NOT NULL,
  data_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ps_tenant ON portal_session(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ps_token ON portal_session(token);
CREATE INDEX IF NOT EXISTS idx_ps_user ON portal_session(user_id);
CREATE INDEX IF NOT EXISTS idx_ps_expires ON portal_session(expires_at);

-- Portal: Refill requests (portal-refills.ts)
CREATE TABLE IF NOT EXISTS portal_refill (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT NOT NULL,
  medication_name TEXT NOT NULL,
  rx_number TEXT,
  pharmacy TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pr_tenant ON portal_refill(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pr_patient ON portal_refill(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_pr_status ON portal_refill(status);

-- Portal: Tasks (portal-tasks.ts)
CREATE TABLE IF NOT EXISTS portal_task (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'normal',
  due_date TEXT,
  assigned_to TEXT,
  completed_at TEXT,
  metadata_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pt_tenant ON portal_task(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pt_patient ON portal_task(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_pt_status ON portal_task(status);

-- Portal: Sensitivity/proxy config (portal-sensitivity.ts)
CREATE TABLE IF NOT EXISTS portal_sensitivity_config (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  config_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_psc_tenant ON portal_sensitivity_config(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_psc_entity ON portal_sensitivity_config(tenant_id, entity_type, entity_id);

-- Portal: Share links (portal-sharing.ts)
CREATE TABLE IF NOT EXISTS portal_share_link (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT NOT NULL,
  token TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  permissions_json TEXT DEFAULT '[]',
  expires_at TEXT NOT NULL,
  accessed_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_psl_tenant ON portal_share_link(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_psl_token ON portal_share_link(token);
CREATE INDEX IF NOT EXISTS idx_psl_patient ON portal_share_link(patient_dfn);

-- Portal: Exports (record-portability-store.ts)
CREATE TABLE IF NOT EXISTS portal_export (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'fhir_bundle',
  status TEXT NOT NULL DEFAULT 'pending',
  resource_types_json TEXT DEFAULT '[]',
  output_path TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_pe_tenant ON portal_export(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pe_patient ON portal_export(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_pe_status ON portal_export(status);

-- Portal: Proxy invitations (proxy-store.ts)
CREATE TABLE IF NOT EXISTS portal_proxy_invitation (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  from_user_id TEXT NOT NULL,
  to_email TEXT NOT NULL,
  relationship TEXT NOT NULL DEFAULT 'caregiver',
  status TEXT NOT NULL DEFAULT 'pending',
  token TEXT,
  permissions_json TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  accepted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_ppi_tenant ON portal_proxy_invitation(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ppi_from ON portal_proxy_invitation(from_user_id);
CREATE INDEX IF NOT EXISTS idx_ppi_status ON portal_proxy_invitation(status);

-- Imaging: Device registry (imaging-devices.ts)
CREATE TABLE IF NOT EXISTS imaging_device (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  ae_title TEXT NOT NULL,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'workstation',
  manufacturer TEXT,
  model TEXT,
  host TEXT,
  port INTEGER,
  tls_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  facility_id TEXT NOT NULL DEFAULT 'DEFAULT',
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_echo_at TEXT,
  config_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_id_tenant ON imaging_device(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_id_ae_title ON imaging_device(tenant_id, ae_title);
CREATE INDEX IF NOT EXISTS idx_id_facility ON imaging_device(facility_id);
CREATE INDEX IF NOT EXISTS idx_id_status ON imaging_device(status);

-- Auth: IDP VistA bindings (vista-binding.ts)
CREATE TABLE IF NOT EXISTS idp_vista_binding (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  idp_user_id TEXT NOT NULL,
  vista_duz TEXT NOT NULL,
  provider TEXT NOT NULL,
  display_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ivb_tenant ON idp_vista_binding(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ivb_idp_user ON idp_vista_binding(tenant_id, provider, idp_user_id);
CREATE INDEX IF NOT EXISTS idx_ivb_duz ON idp_vista_binding(vista_duz);

-- Auth: Break-glass sessions (enterprise-break-glass.ts)
CREATE TABLE IF NOT EXISTS iam_break_glass_session (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  user_name TEXT,
  patient_dfn TEXT NOT NULL,
  reason TEXT NOT NULL,
  approved_by TEXT,
  justification TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_ibgs_tenant ON iam_break_glass_session(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ibgs_user ON iam_break_glass_session(user_id);
CREATE INDEX IF NOT EXISTS idx_ibgs_patient ON iam_break_glass_session(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_ibgs_status ON iam_break_glass_session(status);

-- RCM: Payment batches (payment-store.ts)
CREATE TABLE IF NOT EXISTS rcm_payment_batch (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  payer_id TEXT,
  payer_name TEXT,
  check_number TEXT,
  check_date TEXT,
  eft_trace TEXT,
  payment_method TEXT NOT NULL DEFAULT 'check',
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  applied_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'received',
  source TEXT NOT NULL DEFAULT 'manual',
  metadata_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rpb_tenant ON rcm_payment_batch(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rpb_payer ON rcm_payment_batch(payer_id);
CREATE INDEX IF NOT EXISTS idx_rpb_status ON rcm_payment_batch(status);

-- RCM: Payment lines (payment-store.ts)
CREATE TABLE IF NOT EXISTS rcm_payment_line (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  batch_id TEXT NOT NULL,
  claim_id TEXT,
  patient_name TEXT,
  service_date TEXT,
  procedure_code TEXT,
  charged_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  adjustment_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  patient_responsibility NUMERIC(12,2) NOT NULL DEFAULT 0,
  adjustment_reason_json TEXT DEFAULT '[]',
  remark_codes_json TEXT DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'unposted',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rpl_tenant ON rcm_payment_line(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rpl_batch ON rcm_payment_line(batch_id);
CREATE INDEX IF NOT EXISTS idx_rpl_claim ON rcm_payment_line(claim_id);
CREATE INDEX IF NOT EXISTS idx_rpl_status ON rcm_payment_line(status);

-- RCM: Payment posting events (payment-store.ts)
CREATE TABLE IF NOT EXISTS rcm_payment_posting (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  claim_id TEXT NOT NULL,
  batch_id TEXT,
  line_id TEXT,
  posting_type TEXT NOT NULL DEFAULT 'payment',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  posted_by TEXT,
  posted_at TEXT NOT NULL,
  reversal_of TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rpp_tenant ON rcm_payment_posting(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rpp_claim ON rcm_payment_posting(claim_id);

-- RCM: Underpayment cases (payment-store.ts)
CREATE TABLE IF NOT EXISTS rcm_underpayment_case (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  claim_id TEXT NOT NULL,
  payer_id TEXT,
  expected_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  variance NUMERIC(12,2) NOT NULL DEFAULT 0,
  variance_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ruc_tenant ON rcm_underpayment_case(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ruc_claim ON rcm_underpayment_case(claim_id);
CREATE INDEX IF NOT EXISTS idx_ruc_status ON rcm_underpayment_case(status);

-- RCM: LOA requests (loa-store.ts)
CREATE TABLE IF NOT EXISTS rcm_loa_request (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  payer_id TEXT NOT NULL,
  patient_dfn TEXT NOT NULL,
  patient_name TEXT,
  auth_number TEXT,
  service_type TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TEXT,
  approved_at TEXT,
  denied_at TEXT,
  expires_at TEXT,
  metadata_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rlr_tenant ON rcm_loa_request(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rlr_payer ON rcm_loa_request(payer_id);
CREATE INDEX IF NOT EXISTS idx_rlr_patient ON rcm_loa_request(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_rlr_status ON rcm_loa_request(status);

-- RCM: Remittance documents (remittance-intake.ts)
CREATE TABLE IF NOT EXISTS rcm_remit_document (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  source TEXT NOT NULL DEFAULT 'manual',
  file_name TEXT,
  content_type TEXT,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  processed_at TEXT,
  error TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rrd_tenant ON rcm_remit_document(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rrd_status ON rcm_remit_document(status);

-- RCM: Transaction envelopes (envelope.ts)
CREATE TABLE IF NOT EXISTS rcm_transaction_envelope (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  source_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  control_number TEXT,
  envelope_type TEXT NOT NULL DEFAULT 'outbound',
  content TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  correlation_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rte_tenant ON rcm_transaction_envelope(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rte_source ON rcm_transaction_envelope(source_id, source_type);
CREATE INDEX IF NOT EXISTS idx_rte_correlation ON rcm_transaction_envelope(correlation_id);

-- RCM: PhilHealth submissions (eclaims3/submission-tracker.ts)
CREATE TABLE IF NOT EXISTS rcm_ph_submission (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  claim_id TEXT,
  draft_id TEXT,
  packet_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TEXT,
  response_json TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rphs_tenant ON rcm_ph_submission(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rphs_claim ON rcm_ph_submission(claim_id);
CREATE INDEX IF NOT EXISTS idx_rphs_draft ON rcm_ph_submission(draft_id);
CREATE INDEX IF NOT EXISTS idx_rphs_status ON rcm_ph_submission(status);

-- RCM: HMO submissions (hmo-portal/submission-tracker.ts)
CREATE TABLE IF NOT EXISTS rcm_hmo_submission (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  claim_id TEXT,
  payer_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TEXT,
  response_json TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rhms_tenant ON rcm_hmo_submission(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rhms_claim ON rcm_hmo_submission(claim_id);
CREATE INDEX IF NOT EXISTS idx_rhms_status ON rcm_hmo_submission(status);

-- RCM: Payer enrollments (payerOps/store.ts)
CREATE TABLE IF NOT EXISTS rcm_payer_enrollment (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  payer_id TEXT NOT NULL,
  provider_npi TEXT,
  enrollment_type TEXT NOT NULL DEFAULT 'electronic',
  status TEXT NOT NULL DEFAULT 'pending',
  enrolled_at TEXT,
  metadata_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rpe_tenant ON rcm_payer_enrollment(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rpe_payer ON rcm_payer_enrollment(payer_id);
CREATE INDEX IF NOT EXISTS idx_rpe_status ON rcm_payer_enrollment(status);

-- RCM: LOA cases (payerOps/store.ts)
CREATE TABLE IF NOT EXISTS rcm_loa_case (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  payer_id TEXT NOT NULL,
  patient_dfn TEXT NOT NULL,
  auth_number TEXT,
  service_type TEXT,
  units_approved INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TEXT,
  metadata_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rlc_tenant ON rcm_loa_case(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rlc_payer ON rcm_loa_case(payer_id);
CREATE INDEX IF NOT EXISTS idx_rlc_patient ON rcm_loa_case(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_rlc_status ON rcm_loa_case(status);

-- RCM: Credential vault (payerOps/store.ts) — encrypted at rest
CREATE TABLE IF NOT EXISTS rcm_credential_vault (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  payer_id TEXT NOT NULL,
  credential_type TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  label TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rcv_tenant ON rcm_credential_vault(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rcv_payer ON rcm_credential_vault(payer_id);

-- RCM: PhilHealth claim drafts (payerOps/philhealth-store.ts)
CREATE TABLE IF NOT EXISTS rcm_ph_claim_draft (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT,
  payer_id TEXT,
  form_type TEXT NOT NULL DEFAULT 'cf2',
  form_data_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rpcd_tenant ON rcm_ph_claim_draft(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rpcd_status ON rcm_ph_claim_draft(status);

-- RCM: PhilHealth facility setups (payerOps/philhealth-store.ts)
CREATE TABLE IF NOT EXISTS rcm_ph_facility_setup (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  facility_code TEXT NOT NULL,
  facility_name TEXT,
  setup_data_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rpfs_tenant ON rcm_ph_facility_setup(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rpfs_facility ON rcm_ph_facility_setup(tenant_id, facility_code);

-- RCM: Payer rules (rules/payer-rules.ts)
CREATE TABLE IF NOT EXISTS rcm_payer_rule (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  payer_id TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  name TEXT NOT NULL,
  condition_json TEXT NOT NULL DEFAULT '{}',
  action_json TEXT NOT NULL DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rpr_tenant ON rcm_payer_rule(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rpr_payer ON rcm_payer_rule(payer_id);
CREATE INDEX IF NOT EXISTS idx_rpr_type ON rcm_payer_rule(rule_type);

-- RCM: Payer rulepacks (payers/payer-rulepacks.ts)
CREATE TABLE IF NOT EXISTS rcm_payer_rulepack (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  payer_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  rules_json TEXT NOT NULL DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rprp_tenant ON rcm_payer_rulepack(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rprp_payer ON rcm_payer_rulepack(payer_id);

-- RCM: Denial cases (workflows/claims-workflow.ts)
CREATE TABLE IF NOT EXISTS rcm_denial (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  claim_id TEXT NOT NULL,
  reason_code TEXT,
  reason_description TEXT,
  payer_id TEXT,
  denial_date TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rd_tenant ON rcm_denial(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rd_claim ON rcm_denial(claim_id);
CREATE INDEX IF NOT EXISTS idx_rd_status ON rcm_denial(status);

-- RCM: Payer directory (payerDirectory/normalization.ts)
CREATE TABLE IF NOT EXISTS rcm_payer_directory_entry (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  payer_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_value TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  confidence NUMERIC(3,2) DEFAULT 1.0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rpde_tenant ON rcm_payer_directory_entry(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rpde_payer ON rcm_payer_directory_entry(payer_id);

-- RCM: Job queue (jobs/queue.ts)
CREATE TABLE IF NOT EXISTS rcm_job_queue_entry (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  job_type TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 100,
  max_retries INTEGER NOT NULL DEFAULT 3,
  retry_count INTEGER NOT NULL DEFAULT 0,
  scheduled_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  error TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rjqe_tenant ON rcm_job_queue_entry(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rjqe_status ON rcm_job_queue_entry(status);
CREATE INDEX IF NOT EXISTS idx_rjqe_type ON rcm_job_queue_entry(job_type);
CREATE INDEX IF NOT EXISTS idx_rjqe_scheduled ON rcm_job_queue_entry(scheduled_at);

-- Clinical: Write-back drafts (routes/write-backs.ts)
CREATE TABLE IF NOT EXISTS clinical_draft (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT NOT NULL,
  user_duz TEXT NOT NULL,
  draft_type TEXT NOT NULL,
  content_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cd_tenant ON clinical_draft(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cd_patient ON clinical_draft(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_cd_user ON clinical_draft(user_duz);

-- Clinical: UI preferences (ui-prefs-store.ts)
CREATE TABLE IF NOT EXISTS ui_preference (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_duz TEXT NOT NULL,
  pref_key TEXT NOT NULL,
  pref_value TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_up_tenant ON ui_preference(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_up_user_key ON ui_preference(tenant_id, user_duz, pref_key);

-- Clinical: Handoff reports (handoff/handoff-store.ts)
CREATE TABLE IF NOT EXISTS handoff_report (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT NOT NULL,
  from_provider TEXT NOT NULL,
  to_provider TEXT,
  report_type TEXT NOT NULL DEFAULT 'sbar',
  content_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hr_tenant ON handoff_report(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_patient ON handoff_report(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_hr_from ON handoff_report(from_provider);

-- Intake: Sessions (intake/intake-store.ts)
CREATE TABLE IF NOT EXISTS intake_session (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_step TEXT,
  answers_json TEXT NOT NULL DEFAULT '{}',
  summary_json TEXT,
  brain_provider TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_is_tenant ON intake_session(tenant_id);
CREATE INDEX IF NOT EXISTS idx_is_patient ON intake_session(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_is_status ON intake_session(status);

-- Infrastructure: Migration jobs (migration/migration-store.ts)
CREATE TABLE IF NOT EXISTS migration_job (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  job_type TEXT NOT NULL,
  source_system TEXT,
  target_system TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  progress_json TEXT DEFAULT '{}',
  started_at TEXT,
  completed_at TEXT,
  error TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mj_tenant ON migration_job(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mj_status ON migration_job(status);

-- Infrastructure: Export jobs (lib/export-governance.ts)
CREATE TABLE IF NOT EXISTS export_job (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  export_type TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'csv',
  status TEXT NOT NULL DEFAULT 'pending',
  output_path TEXT,
  row_count INTEGER,
  error TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_ej_tenant ON export_job(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ej_user ON export_job(user_id);
CREATE INDEX IF NOT EXISTS idx_ej_status ON export_job(status);
`,
  },
  {
    version: 19,
    name: 'phase150_portal_session_oidc',
    sql: `
-- ============================================================
-- Phase 150: Portal Session Modernization + Patient Identity
-- ============================================================

-- 1. Add OIDC/token-hash columns to portal_session
ALTER TABLE portal_session ADD COLUMN IF NOT EXISTS token_hash TEXT;
ALTER TABLE portal_session ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE portal_session ADD COLUMN IF NOT EXISTS patient_dfn TEXT;
ALTER TABLE portal_session ADD COLUMN IF NOT EXISTS last_activity_at TEXT;
ALTER TABLE portal_session ADD COLUMN IF NOT EXISTS revoked_at TEXT;

CREATE INDEX IF NOT EXISTS idx_ps_token_hash ON portal_session(token_hash);
CREATE INDEX IF NOT EXISTS idx_ps_subject ON portal_session(subject);

-- 2. Portal Patient Identity: maps OIDC subject to DFN
CREATE TABLE IF NOT EXISTS portal_patient_identity (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  oidc_sub TEXT NOT NULL,
  patient_dfn TEXT NOT NULL,
  display_name TEXT,
  verified_at TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ppi_sub ON portal_patient_identity(tenant_id, oidc_sub);
CREATE INDEX IF NOT EXISTS idx_ppi_dfn ON portal_patient_identity(tenant_id, patient_dfn);
CREATE INDEX IF NOT EXISTS idx_ppi_tenant ON portal_patient_identity(tenant_id);
`,
  },
  {
    version: 20,
    name: 'phase153_tenant_oidc_mapping',
    sql: `
-- ============================================================
-- Phase 153: Tenant OIDC Mapping
-- Maps each tenant to its OIDC provider configuration.
-- Required for multi-tenant enterprise SSO.
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_oidc_mapping (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  issuer_url TEXT NOT NULL,
  client_id TEXT NOT NULL,
  audience TEXT,
  claim_mapping_json TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tom_tenant_issuer
  ON tenant_oidc_mapping(tenant_id, issuer_url);
CREATE INDEX IF NOT EXISTS idx_tom_tenant
  ON tenant_oidc_mapping(tenant_id);
`,
  },

  /* ── v21: Phase 154 — CPOE order sign events ─────────────────── */
  {
    version: 21,
    name: 'phase154_cpoe_order_sign_event',
    sql: `
CREATE TABLE IF NOT EXISTS cpoe_order_sign_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  order_ien TEXT NOT NULL,
  dfn TEXT NOT NULL,
  duz TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  es_hash TEXT,
  rpc_used TEXT,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cpoe_sign_tenant
  ON cpoe_order_sign_event(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_cpoe_sign_order
  ON cpoe_order_sign_event(tenant_id, order_ien);
CREATE INDEX IF NOT EXISTS idx_cpoe_sign_dfn
  ON cpoe_order_sign_event(tenant_id, dfn);
`,
  },
  {
    version: 22,
    name: 'phase157_audit_ship_offset_manifest',
    sql: `
-- Phase 157: Audit JSONL shipping offset tracking
CREATE TABLE IF NOT EXISTS audit_ship_offset (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  source TEXT NOT NULL,
  last_offset INTEGER NOT NULL DEFAULT 0,
  last_hash TEXT NOT NULL DEFAULT '',
  shipped_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ship_offset_tenant_source
  ON audit_ship_offset(tenant_id, source);

-- Phase 157: Audit JSONL shipping manifest registry
CREATE TABLE IF NOT EXISTS audit_ship_manifest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  object_key TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  entry_count INTEGER NOT NULL DEFAULT 0,
  first_seq INTEGER NOT NULL DEFAULT 0,
  last_seq INTEGER NOT NULL DEFAULT 0,
  last_entry_hash TEXT NOT NULL DEFAULT '',
  byte_size INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ship_manifest_tenant
  ON audit_ship_manifest(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ship_manifest_key
  ON audit_ship_manifest(object_key);
`,
  },
  {
    version: 23,
    name: 'phase158_specialty_templates',
    sql: `
-- Phase 158: Specialty Template & Workflow Studio
CREATE TABLE IF NOT EXISTS clinical_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  setting TEXT NOT NULL DEFAULT 'any',
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  description TEXT,
  tags_json JSONB,
  sections_json JSONB,
  quick_insert_sections_json JSONB,
  auto_expand_rules_json JSONB,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_template_tenant
  ON clinical_template(tenant_id, specialty);
CREATE INDEX IF NOT EXISTS idx_template_status
  ON clinical_template(tenant_id, status);

CREATE TABLE IF NOT EXISTS template_version_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  template_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  change_summary TEXT,
  snapshot_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tpl_version_tenant
  ON template_version_event(tenant_id, template_id);

CREATE TABLE IF NOT EXISTS quick_text (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  key TEXT NOT NULL,
  text TEXT NOT NULL,
  tags_json JSONB,
  specialty TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quick_text_tenant
  ON quick_text(tenant_id, specialty);
`,
  },
  {
    version: 24,
    name: 'phase159_patient_queue',
    sql: `
-- Phase 159: Patient Queue / Waiting / Numbering / Calling System
CREATE TABLE IF NOT EXISTS queue_ticket (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  department TEXT NOT NULL,
  ticket_number TEXT NOT NULL,
  patient_dfn TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'waiting',
  provider_duz TEXT,
  window_number TEXT,
  notes TEXT,
  appointment_ien TEXT,
  transferred_from TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  called_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_queue_ticket_dept
  ON queue_ticket(tenant_id, department, status);
CREATE INDEX IF NOT EXISTS idx_queue_ticket_date
  ON queue_ticket(tenant_id, created_at);

CREATE TABLE IF NOT EXISTS queue_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  ticket_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_duz TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_queue_event_ticket
  ON queue_event(tenant_id, ticket_id);
`,
  },
  {
    version: 25,
    name: 'phase160_department_workflows',
    sql: `
-- Phase 160: Department Workflow Packs
CREATE TABLE IF NOT EXISTS workflow_definition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  department TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  steps_json JSONB,
  tags_json JSONB,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workflow_def_dept
  ON workflow_definition(tenant_id, department);
CREATE INDEX IF NOT EXISTS idx_workflow_def_status
  ON workflow_definition(tenant_id, status);

CREATE TABLE IF NOT EXISTS workflow_instance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  definition_id TEXT NOT NULL,
  department TEXT NOT NULL,
  patient_dfn TEXT NOT NULL,
  encounter_ref TEXT,
  queue_ticket_id TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  steps_json JSONB,
  started_by TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_workflow_inst_dept
  ON workflow_instance(tenant_id, department);
CREATE INDEX IF NOT EXISTS idx_workflow_inst_patient
  ON workflow_instance(tenant_id, patient_dfn);
CREATE INDEX IF NOT EXISTS idx_workflow_inst_status
  ON workflow_instance(tenant_id, status);
`,
  },

  // ── Phase 174: RCM SQLite-to-PG parity tables ────────────────
  {
    version: 26,
    name: 'phase174_rcm_pg_parity',
    sql: `
-- integration_evidence (Phase 112)
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
CREATE INDEX IF NOT EXISTS idx_int_evidence_tenant_payer
  ON integration_evidence(tenant_id, payer_id);
CREATE INDEX IF NOT EXISTS idx_int_evidence_status
  ON integration_evidence(tenant_id, status);

-- loa_request (Phase 110) -- separate from rcm_loa_request (durability)
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
CREATE INDEX IF NOT EXISTS idx_loa_request_tenant_status
  ON loa_request(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_loa_request_tenant_payer
  ON loa_request(tenant_id, payer_id);
CREATE INDEX IF NOT EXISTS idx_loa_request_tenant_patient
  ON loa_request(tenant_id, patient_dfn);

-- loa_attachment (Phase 110)
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
CREATE INDEX IF NOT EXISTS idx_loa_attachment_req
  ON loa_attachment(tenant_id, loa_request_id);

-- accreditation_status (Phase 110)
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
CREATE INDEX IF NOT EXISTS idx_accred_status_tenant_payer
  ON accreditation_status(tenant_id, payer_id);
CREATE INDEX IF NOT EXISTS idx_accred_status_tenant_entity
  ON accreditation_status(tenant_id, provider_entity_id);

-- accreditation_task (Phase 110)
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
CREATE INDEX IF NOT EXISTS idx_accred_task_tenant_accred
  ON accreditation_task(tenant_id, accreditation_id);
CREATE INDEX IF NOT EXISTS idx_accred_task_tenant_status
  ON accreditation_task(tenant_id, status);

-- credential_artifact (Phase 110)
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
CREATE INDEX IF NOT EXISTS idx_cred_artifact_tenant_entity
  ON credential_artifact(tenant_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_cred_artifact_tenant_type
  ON credential_artifact(tenant_id, credential_type);

-- credential_document (Phase 110)
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
CREATE INDEX IF NOT EXISTS idx_cred_doc_tenant_cred
  ON credential_document(tenant_id, credential_id);

-- claim_draft (Phase 111)
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_claim_draft_idemp
  ON claim_draft(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_claim_draft_tenant_status
  ON claim_draft(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_claim_draft_tenant_payer
  ON claim_draft(tenant_id, payer_id);
CREATE INDEX IF NOT EXISTS idx_claim_draft_tenant_patient
  ON claim_draft(tenant_id, patient_id);

-- claim_lifecycle_event (Phase 111)
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
CREATE INDEX IF NOT EXISTS idx_claim_lce_tenant_draft
  ON claim_lifecycle_event(tenant_id, claim_draft_id);

-- scrub_rule (Phase 111)
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
CREATE INDEX IF NOT EXISTS idx_scrub_rule_tenant
  ON scrub_rule(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scrub_rule_tenant_payer
  ON scrub_rule(tenant_id, payer_id);

-- scrub_result (Phase 111)
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
CREATE INDEX IF NOT EXISTS idx_scrub_result_tenant_draft
  ON scrub_result(tenant_id, claim_draft_id);

-- rcm_durable_job (Phase 142)
CREATE TABLE IF NOT EXISTS rcm_durable_job (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  payload_json TEXT NOT NULL DEFAULT '{}',
  result_json TEXT,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  idempotency_key TEXT,
  priority INTEGER NOT NULL DEFAULT 5,
  scheduled_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  next_retry_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rcm_job_idemp
  ON rcm_durable_job(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rcm_job_tenant_status
  ON rcm_durable_job(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_rcm_job_tenant_type
  ON rcm_durable_job(tenant_id, type);

-- module_catalog (Phase 109)
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

-- tenant_module (Phase 109)
CREATE TABLE IF NOT EXISTS tenant_module (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  module_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  plan_tier TEXT NOT NULL DEFAULT 'base',
  enabled_at TEXT,
  disabled_at TEXT,
  enabled_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tenant_module_tid
  ON tenant_module(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_module_uniq
  ON tenant_module(tenant_id, module_id);

-- tenant_feature_flag (Phase 109)
CREATE TABLE IF NOT EXISTS tenant_feature_flag (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  flag_key TEXT NOT NULL,
  flag_value TEXT NOT NULL DEFAULT 'true',
  module_id TEXT,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tff_tenant
  ON tenant_feature_flag(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tff_uniq
  ON tenant_feature_flag(tenant_id, flag_key);

-- module_audit_log (Phase 109)
CREATE TABLE IF NOT EXISTS module_audit_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
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
CREATE INDEX IF NOT EXISTS idx_mal_tenant_created
  ON module_audit_log(tenant_id, created_at);
`,
  },

  // ── Phase 275: Tenant Config Control Plane ────────────────
  {
    version: 27,
    name: 'phase275_tenant_config',
    sql: `
-- tenant_config: persistent multi-tenant configuration (Phase 275)
-- Replaces in-memory Map store from Phase 17A with DB-backed persistence.
CREATE TABLE IF NOT EXISTS tenant_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL UNIQUE,
  facility_name TEXT NOT NULL DEFAULT 'Development Facility',
  facility_station TEXT NOT NULL DEFAULT '500',
  vista_host TEXT NOT NULL DEFAULT '127.0.0.1',
  vista_port INTEGER NOT NULL DEFAULT 9430,
  vista_context TEXT NOT NULL DEFAULT 'OR CPRS GUI CHART',
  enabled_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  ui_defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
  note_templates JSONB NOT NULL DEFAULT '[]'::jsonb,
  connectors JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_config_station
  ON tenant_config(facility_station);
`,
  },
  {
    version: 28,
    name: 'phase282_tenant_branding',
    sql: `
-- tenant branding: JSONB column for per-tenant visual branding (Phase 282)
ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS branding JSONB NOT NULL DEFAULT '{}'::jsonb;
`,
  },
  {
    version: 29,
    name: 'phase285_feature_flags_upgrade',
    sql: `
-- Phase 285: Add rollout_percentage and user_targeting to tenant_feature_flag
ALTER TABLE tenant_feature_flag
  ADD COLUMN IF NOT EXISTS rollout_percentage INTEGER DEFAULT 100;
ALTER TABLE tenant_feature_flag
  ADD COLUMN IF NOT EXISTS user_targeting JSONB DEFAULT '[]'::jsonb;
-- Index for rollout queries
CREATE INDEX IF NOT EXISTS idx_tff_rollout
  ON tenant_feature_flag(tenant_id, rollout_percentage);
`,
  },
  {
    version: 30,
    name: 'phase300_clinical_writeback_commands',
    sql: `
-- Phase 300: Clinical Writeback Command Bus tables
CREATE TABLE IF NOT EXISTS clinical_command (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  patient_ref_hash TEXT NOT NULL,
  domain TEXT NOT NULL,
  intent TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL,
  correlation_id TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  dry_run_transcript JSONB,
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_cc_tenant_status ON clinical_command(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cc_tenant_domain ON clinical_command(tenant_id, domain);
CREATE INDEX IF NOT EXISTS idx_cc_tenant_created ON clinical_command(tenant_id, created_at);

CREATE TABLE IF NOT EXISTS clinical_command_attempt (
  id SERIAL PRIMARY KEY,
  command_id UUID NOT NULL REFERENCES clinical_command(id),
  attempt_no INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  error_class TEXT,
  error_detail_redacted TEXT
);
CREATE INDEX IF NOT EXISTS idx_cca_command ON clinical_command_attempt(command_id);

CREATE TABLE IF NOT EXISTS clinical_command_result (
  command_id UUID PRIMARY KEY REFERENCES clinical_command(id),
  vista_refs JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_summary TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`,
  },
  {
    version: 31,
    name: 'phase318_integration_control_plane',
    sql: `
-- Phase 318: Integration Control Plane v2 tables
CREATE TABLE IF NOT EXISTS integration_partner (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  description TEXT,
  contact_email TEXT,
  tags TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ip_tenant ON integration_partner(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ip_tenant_status ON integration_partner(tenant_id, status);

CREATE TABLE IF NOT EXISTS integration_endpoint (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  partner_id TEXT NOT NULL REFERENCES integration_partner(id),
  direction TEXT NOT NULL,
  protocol TEXT NOT NULL,
  address TEXT NOT NULL,
  port INTEGER,
  path TEXT,
  tls_mode TEXT DEFAULT 'required',
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_iep_partner ON integration_endpoint(partner_id);
CREATE INDEX IF NOT EXISTS idx_iep_tenant ON integration_endpoint(tenant_id);

CREATE TABLE IF NOT EXISTS integration_credential_ref (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  partner_id TEXT NOT NULL REFERENCES integration_partner(id),
  label TEXT NOT NULL,
  secret_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_icr_partner ON integration_credential_ref(partner_id);
CREATE INDEX IF NOT EXISTS idx_icr_tenant ON integration_credential_ref(tenant_id);

CREATE TABLE IF NOT EXISTS integration_route (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  partner_id TEXT NOT NULL REFERENCES integration_partner(id),
  message_type TEXT NOT NULL,
  route_to TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ir_partner ON integration_route(partner_id);
CREATE INDEX IF NOT EXISTS idx_ir_tenant ON integration_route(tenant_id);

CREATE TABLE IF NOT EXISTS integration_test_run (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  partner_id TEXT NOT NULL REFERENCES integration_partner(id),
  started_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  checks_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_itr_partner ON integration_test_run(partner_id);
CREATE INDEX IF NOT EXISTS idx_itr_tenant ON integration_test_run(tenant_id);
`,
  },
  // ─── v32: Phase 328 — Multi-Cluster Registry ───────────────────────────
  {
    version: 32,
    name: 'phase328_multi_cluster_registry',
    sql: `
-- Platform cluster registry
CREATE TABLE IF NOT EXISTS platform_cluster (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  region_tier TEXT NOT NULL DEFAULT 'primary',
  kube_context_ref TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  pg_connection_ref TEXT NOT NULL DEFAULT '',
  vista_placement_mode TEXT NOT NULL DEFAULT 'per_tenant',
  max_tenants INTEGER NOT NULL DEFAULT 200,
  current_tenant_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pc_region ON platform_cluster(region);
CREATE INDEX IF NOT EXISTS idx_pc_status ON platform_cluster(status);
CREATE INDEX IF NOT EXISTS idx_pc_tenant ON platform_cluster(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pc_name_active ON platform_cluster(name)
  WHERE status != 'decommissioned';

-- Tenant placement records
CREATE TABLE IF NOT EXISTS tenant_placement (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  cluster_id TEXT NOT NULL REFERENCES platform_cluster(id),
  region TEXT NOT NULL,
  placement_reason TEXT NOT NULL DEFAULT 'initial',
  data_residency_constraint TEXT,
  plan_tier TEXT NOT NULL DEFAULT 'starter',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tp_tenant ON tenant_placement(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tp_cluster ON tenant_placement(cluster_id);
CREATE INDEX IF NOT EXISTS idx_tp_region ON tenant_placement(region);
CREATE INDEX IF NOT EXISTS idx_tp_active ON tenant_placement(tenant_id) WHERE active = true;
`,
  },
  {
    version: 33,
    name: 'phase338_identity_hardening',
    sql: `
-- Session device fingerprints (Phase 338)
CREATE TABLE IF NOT EXISTS session_device_fingerprint (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  fingerprint_hash TEXT NOT NULL,
  user_agent_hash TEXT NOT NULL,
  ip_prefix TEXT NOT NULL,
  lang_hash TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sdf_session ON session_device_fingerprint(session_id);
CREATE INDEX IF NOT EXISTS idx_sdf_user ON session_device_fingerprint(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sdf_fingerprint ON session_device_fingerprint(fingerprint_hash);

-- Session security events (Phase 338)
CREATE TABLE IF NOT EXISTS session_security_event (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sse_tenant_time ON session_security_event(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sse_user ON session_security_event(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sse_type ON session_security_event(event_type);

-- Session MFA state (Phase 338)
CREATE TABLE IF NOT EXISTS session_mfa_state (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  mfa_method TEXT NOT NULL DEFAULT '',
  enrolled BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sms_session ON session_mfa_state(session_id);
CREATE INDEX IF NOT EXISTS idx_sms_user ON session_mfa_state(tenant_id, user_id);
`,
  },
  {
    version: 34,
    name: 'phase339_scim_provisioning',
    sql: `
-- SCIM Users (Phase 339)
CREATE TABLE IF NOT EXISTS scim_user (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  external_id TEXT,
  user_name TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  given_name TEXT NOT NULL DEFAULT '',
  family_name TEXT NOT NULL DEFAULT '',
  emails JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  vista_duz TEXT,
  vista_role TEXT,
  vista_facility_station TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_su_ext ON scim_user(tenant_id, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_su_tenant ON scim_user(tenant_id);
CREATE INDEX IF NOT EXISTS idx_su_username ON scim_user(tenant_id, user_name);

-- SCIM Groups (Phase 339)
CREATE TABLE IF NOT EXISTS scim_group (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  external_id TEXT,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sg_ext ON scim_group(tenant_id, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sg_tenant ON scim_group(tenant_id);

-- SCIM Group Membership (Phase 339)
CREATE TABLE IF NOT EXISTS scim_group_member (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_id TEXT NOT NULL REFERENCES scim_group(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES scim_user(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sgm_pair ON scim_group_member(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sgm_user ON scim_group_member(user_id);
`,
  },
  {
    version: 35,
    name: 'phase341_secrets_key_management',
    sql: `
-- Encrypted Key Store (Phase 341)
CREATE TABLE IF NOT EXISTS encryption_key (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  key_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  provider TEXT NOT NULL DEFAULT 'env',
  algorithm TEXT NOT NULL DEFAULT 'aes-256-gcm',
  status TEXT NOT NULL DEFAULT 'active',
  fingerprint TEXT NOT NULL,
  encrypted_material TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ek_key_ver ON encryption_key(tenant_id, key_id, version);
CREATE INDEX IF NOT EXISTS idx_ek_status ON encryption_key(tenant_id, status);

-- Key Rotation Event Log (Phase 341)
CREATE TABLE IF NOT EXISTS key_rotation_event (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  key_id TEXT NOT NULL,
  old_version INTEGER,
  new_version INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kre_key ON key_rotation_event(tenant_id, key_id);
CREATE INDEX IF NOT EXISTS idx_kre_time ON key_rotation_event(tenant_id, created_at);
`,
  },
  {
    version: 36,
    name: 'phase342_tenant_security_policy',
    sql: `
-- Tenant Security Policy (Phase 342)
CREATE TABLE IF NOT EXISTS tenant_security_policy (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL UNIQUE,
  allowed_cidrs JSONB NOT NULL DEFAULT '[]'::jsonb,
  require_mfa BOOLEAN NOT NULL DEFAULT false,
  allow_exports BOOLEAN NOT NULL DEFAULT true,
  max_session_age_sec INTEGER NOT NULL DEFAULT 28800,
  max_concurrent_sessions INTEGER NOT NULL DEFAULT 5,
  ip_allow_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  break_glass_enabled BOOLEAN NOT NULL DEFAULT true,
  min_password_length INTEGER NOT NULL DEFAULT 8,
  audit_shipping_enabled BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT NOT NULL DEFAULT 'system'
);
CREATE INDEX IF NOT EXISTS idx_tsp_tenant ON tenant_security_policy(tenant_id);

-- Tenant Security Policy Change Log (Phase 342)
CREATE TABLE IF NOT EXISTS tenant_security_policy_change (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tspc_tenant ON tenant_security_policy_change(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tspc_time ON tenant_security_policy_change(tenant_id, changed_at);
`,
  },
  {
    version: 37,
    name: 'phase343_privacy_segmentation',
    sql: `
-- Sensitivity Tags (Phase 343)
CREATE TABLE IF NOT EXISTS sensitivity_tag (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT,
  record_type TEXT,
  record_id TEXT,
  category TEXT NOT NULL DEFAULT 'normal',
  applied_by TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'manual',
  label TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_stag_patient ON sensitivity_tag(tenant_id, patient_dfn);
CREATE INDEX IF NOT EXISTS idx_stag_record ON sensitivity_tag(tenant_id, record_type, record_id);
CREATE INDEX IF NOT EXISTS idx_stag_category ON sensitivity_tag(tenant_id, category);

-- Access Reasons (Phase 343)
CREATE TABLE IF NOT EXISTS access_reason (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  patient_dfn TEXT NOT NULL,
  record_type TEXT NOT NULL,
  record_id TEXT NOT NULL,
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  reason TEXT NOT NULL,
  break_glass BOOLEAN NOT NULL DEFAULT false,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ar_tenant ON access_reason(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ar_patient ON access_reason(tenant_id, patient_dfn);
CREATE INDEX IF NOT EXISTS idx_ar_user ON access_reason(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ar_time ON access_reason(tenant_id, accessed_at);
`,
  },
  {
    version: 38,
    name: 'phase347_facility_location_model',
    sql: `
-- Facility (Phase 347)
CREATE TABLE IF NOT EXISTS facility (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  facility_type TEXT NOT NULL DEFAULT 'clinic',
  station_number TEXT,
  vista_station_ien TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'US',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  parent_facility_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fac_tenant ON facility(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fac_type ON facility(tenant_id, facility_type);
CREATE INDEX IF NOT EXISTS idx_fac_status ON facility(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_fac_station ON facility(tenant_id, station_number);

-- Department (Phase 347)
CREATE TABLE IF NOT EXISTS department (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  facility_id TEXT NOT NULL,
  name TEXT NOT NULL,
  department_type TEXT NOT NULL DEFAULT 'custom',
  code TEXT NOT NULL,
  vista_service_ien TEXT,
  cost_center TEXT,
  parent_department_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dept_tenant ON department(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dept_facility ON department(tenant_id, facility_id);
CREATE INDEX IF NOT EXISTS idx_dept_type ON department(tenant_id, department_type);
CREATE INDEX IF NOT EXISTS idx_dept_code ON department(tenant_id, code);

-- Location (Phase 347)
CREATE TABLE IF NOT EXISTS location (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  department_id TEXT NOT NULL,
  name TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'clinic',
  vista_location_ien TEXT,
  floor TEXT,
  wing TEXT,
  room_number TEXT,
  bed_count INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loc_tenant ON location(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loc_dept ON location(tenant_id, department_id);
CREATE INDEX IF NOT EXISTS idx_loc_type ON location(tenant_id, location_type);

-- Provider Facility Assignment (Phase 347)
CREATE TABLE IF NOT EXISTS provider_facility_assignment (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  provider_id TEXT NOT NULL,
  facility_id TEXT NOT NULL,
  department_id TEXT,
  role TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pfa_tenant ON provider_facility_assignment(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pfa_provider ON provider_facility_assignment(tenant_id, provider_id);
CREATE INDEX IF NOT EXISTS idx_pfa_facility ON provider_facility_assignment(tenant_id, facility_id);
`,
  },
  {
    version: 39,
    name: 'phase348_dept_rbac_templates',
    sql: `
-- Department Role Templates (Phase 348)
CREATE TABLE IF NOT EXISTS dept_role_template (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  department_type TEXT NOT NULL,
  role TEXT NOT NULL,
  allowed_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  denied_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_drt_tenant ON dept_role_template(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drt_dept ON dept_role_template(tenant_id, department_type);
CREATE INDEX IF NOT EXISTS idx_drt_role ON dept_role_template(tenant_id, role);

-- Department Role Membership (Phase 348)
CREATE TABLE IF NOT EXISTS dept_role_membership (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  department_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  granted_by TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active'
);
CREATE INDEX IF NOT EXISTS idx_drm_tenant ON dept_role_membership(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drm_user ON dept_role_membership(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_drm_dept ON dept_role_membership(tenant_id, department_id);
`,
  },
  {
    version: 40,
    name: 'phase349_department_packs',
    sql: `
-- Pack Installation Tracking (Phase 349)
CREATE TABLE IF NOT EXISTS pack_installation (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  department_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  pack_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'installed',
  installed_by TEXT NOT NULL,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uninstalled_at TIMESTAMPTZ,
  flag_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_pi_tenant ON pack_installation(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pi_dept ON pack_installation(tenant_id, department_id);
CREATE INDEX IF NOT EXISTS idx_pi_pack ON pack_installation(tenant_id, pack_id);
CREATE INDEX IF NOT EXISTS idx_pi_status ON pack_installation(tenant_id, status);
`,
  },
  {
    version: 41,
    name: 'phase350_workflow_inbox',
    sql: `
-- Workflow Task (Phase 350)
CREATE TABLE IF NOT EXISTS workflow_task (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  facility_id TEXT,
  department_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to TEXT,
  assigned_by TEXT,
  created_by TEXT NOT NULL,
  patient_dfn TEXT,
  source_type TEXT,
  source_id TEXT,
  due_at TIMESTAMPTZ,
  escalate_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wt_tenant ON workflow_task(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wt_dept ON workflow_task(tenant_id, department_id);
CREATE INDEX IF NOT EXISTS idx_wt_assigned ON workflow_task(tenant_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_wt_status ON workflow_task(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_wt_priority ON workflow_task(tenant_id, priority);
CREATE INDEX IF NOT EXISTS idx_wt_due ON workflow_task(tenant_id, due_at);

-- Workflow Task Event (Phase 350)
CREATE TABLE IF NOT EXISTS workflow_task_event (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wte_task ON workflow_task_event(task_id);
CREATE INDEX IF NOT EXISTS idx_wte_tenant ON workflow_task_event(tenant_id);
`,
  },
  // ── v42 — Phase 351: Patient Communications ──
  {
    version: 42,
    name: 'phase351_patient_comms',
    sql: `
-- Phase 351: Notification consent (separate from v17 patient_consent which is HIPAA/research)
CREATE TABLE IF NOT EXISTS notification_consent (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn_hash TEXT NOT NULL,
  channel TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '*',
  status TEXT NOT NULL DEFAULT 'opted_in',
  locale TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nc_tenant ON notification_consent(tenant_id);
CREATE INDEX IF NOT EXISTS idx_nc_patient ON notification_consent(tenant_id, patient_dfn_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_nc_uniq ON notification_consent(tenant_id, patient_dfn_hash, channel, category);

-- Notification Template (Phase 351)
CREATE TABLE IF NOT EXISTS notification_template (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  category TEXT NOT NULL,
  channel TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  contains_phi BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nt_tenant ON notification_template(tenant_id);
CREATE INDEX IF NOT EXISTS idx_nt_cat ON notification_template(tenant_id, category);

-- Notification Record (Phase 351)
CREATE TABLE IF NOT EXISTS notification_record (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn_hash TEXT NOT NULL,
  channel TEXT NOT NULL,
  category TEXT NOT NULL,
  template_id TEXT,
  provider_id TEXT,
  status TEXT NOT NULL,
  error TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nr_tenant ON notification_record(tenant_id);
CREATE INDEX IF NOT EXISTS idx_nr_patient ON notification_record(tenant_id, patient_dfn_hash);
`,
  },
  // -- v43 -- Phase 352: Department Scheduling & Resources --
  {
    version: 43,
    name: 'phase352_dept_scheduling',
    sql: `
-- Schedule Template (Phase 352)
CREATE TABLE IF NOT EXISTS schedule_template (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  department_id TEXT NOT NULL,
  facility_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  effective_from DATE NOT NULL,
  effective_to DATE,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  holidays JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_st_tenant ON schedule_template(tenant_id);
CREATE INDEX IF NOT EXISTS idx_st_dept ON schedule_template(tenant_id, department_id);

-- Department Resource (Phase 352)
CREATE TABLE IF NOT EXISTS dept_resource (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  department_id TEXT NOT NULL,
  facility_id TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'available',
  capacity INTEGER NOT NULL DEFAULT 1,
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  location TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dr_tenant ON dept_resource(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dr_dept ON dept_resource(tenant_id, department_id);
CREATE INDEX IF NOT EXISTS idx_dr_type ON dept_resource(tenant_id, type);

-- Resource Allocation (Phase 352)
CREATE TABLE IF NOT EXISTS resource_allocation (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  resource_id TEXT NOT NULL,
  department_id TEXT NOT NULL,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  appointment_ref TEXT,
  patient_dfn TEXT,
  allocated_by TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ra_tenant ON resource_allocation(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ra_resource ON resource_allocation(tenant_id, resource_id);
CREATE INDEX IF NOT EXISTS idx_ra_dept ON resource_allocation(tenant_id, department_id);
CREATE INDEX IF NOT EXISTS idx_ra_time ON resource_allocation(scheduled_start, scheduled_end);

-- Scheduling Rule (Phase 352)
CREATE TABLE IF NOT EXISTS scheduling_rule (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  department_id TEXT NOT NULL,
  facility_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 100,
  condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  action TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sr_tenant ON scheduling_rule(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sr_dept ON scheduling_rule(tenant_id, department_id);

-- Cross-Department Referral (Phase 352)
CREATE TABLE IF NOT EXISTS cross_dept_referral (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  from_department_id TEXT NOT NULL,
  to_department_id TEXT NOT NULL,
  from_facility_id TEXT NOT NULL,
  to_facility_id TEXT NOT NULL,
  patient_dfn TEXT NOT NULL,
  referred_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  clinical_notes TEXT NOT NULL DEFAULT '',
  urgency TEXT NOT NULL DEFAULT 'routine',
  status TEXT NOT NULL DEFAULT 'pending',
  appointment_ref TEXT,
  requested_date DATE,
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cdr_tenant ON cross_dept_referral(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cdr_from ON cross_dept_referral(tenant_id, from_department_id);
CREATE INDEX IF NOT EXISTS idx_cdr_to ON cross_dept_referral(tenant_id, to_department_id);
CREATE INDEX IF NOT EXISTS idx_cdr_status ON cross_dept_referral(tenant_id, status);
`,
  },
  // ── Phase 355: Event Bus ──
  {
    version: 44,
    name: 'phase355_event_bus',
    sql: `
CREATE TABLE IF NOT EXISTS event_bus_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  event_type TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  subject_ref_hash TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL,
  correlation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ebo_tenant ON event_bus_outbox(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ebo_type ON event_bus_outbox(tenant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_ebo_occurred ON event_bus_outbox(tenant_id, occurred_at);

CREATE TABLE IF NOT EXISTS event_bus_dlq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  event_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  consumer_id TEXT NOT NULL,
  error TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ebdlq_tenant ON event_bus_dlq(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ebdlq_consumer ON event_bus_dlq(tenant_id, consumer_id);

CREATE TABLE IF NOT EXISTS event_bus_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  event_id UUID NOT NULL,
  consumer_id TEXT NOT NULL,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT true,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_ebdl_tenant ON event_bus_delivery_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ebdl_event ON event_bus_delivery_log(tenant_id, event_id);
`,
  },
  // -- Phase 356: Webhooks --
  {
    version: 45,
    name: 'phase356_webhooks',
    sql: `
CREATE TABLE IF NOT EXISTS webhook_subscription (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  event_filters JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  retry_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ws_tenant ON webhook_subscription(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ws_enabled ON webhook_subscription(tenant_id, enabled);

CREATE TABLE IF NOT EXISTS webhook_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  subscription_id UUID NOT NULL,
  event_id UUID NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  http_status INTEGER,
  attempt INTEGER NOT NULL DEFAULT 1,
  max_attempts INTEGER NOT NULL DEFAULT 4,
  signature TEXT NOT NULL,
  delivered_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wdl_tenant ON webhook_delivery_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wdl_sub ON webhook_delivery_log(tenant_id, subscription_id);
CREATE INDEX IF NOT EXISTS idx_wdl_status ON webhook_delivery_log(tenant_id, status);
`,
  },

  // ── v46: FHIR Subscriptions (Phase 357) ──
  {
    version: 46,
    name: 'fhir_subscriptions',
    sql: `
CREATE TABLE IF NOT EXISTS fhir_subscription (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  status TEXT NOT NULL DEFAULT 'active',
  criteria TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  channel_type TEXT NOT NULL DEFAULT 'rest-hook',
  channel_endpoint TEXT NOT NULL,
  channel_payload TEXT NOT NULL DEFAULT 'application/fhir+json',
  channel_headers TEXT,
  end_time TIMESTAMPTZ,
  reason TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fsub_tenant ON fhir_subscription(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fsub_status ON fhir_subscription(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_fsub_resource ON fhir_subscription(tenant_id, resource_type);

CREATE TABLE IF NOT EXISTS fhir_notification (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  subscription_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  http_status INTEGER,
  attempt INTEGER NOT NULL DEFAULT 1,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fnot_tenant ON fhir_notification(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fnot_sub ON fhir_notification(tenant_id, subscription_id);
CREATE INDEX IF NOT EXISTS idx_fnot_status ON fhir_notification(tenant_id, status);
`,
  },

  // ── v47: Plugin SDK (Phase 358) ──
  {
    version: 47,
    name: 'plugin_sdk',
    sql: `
CREATE TABLE IF NOT EXISTS plugin_registry (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  plugin_id TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  author TEXT,
  status TEXT NOT NULL DEFAULT 'installed',
  manifest_json JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  stats_json JSONB NOT NULL DEFAULT '{}',
  installed_by TEXT NOT NULL,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, plugin_id)
);
CREATE INDEX IF NOT EXISTS idx_preg_tenant ON plugin_registry(tenant_id);
CREATE INDEX IF NOT EXISTS idx_preg_status ON plugin_registry(tenant_id, status);

CREATE TABLE IF NOT EXISTS plugin_audit_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  plugin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pal_tenant ON plugin_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pal_plugin ON plugin_audit_log(tenant_id, plugin_id);
CREATE INDEX IF NOT EXISTS idx_pal_created ON plugin_audit_log(tenant_id, created_at);
`,
  },

  // ── v48: UI Extension Slots (Phase 359) ──
  {
    version: 48,
    name: 'ui_extension_slots',
    sql: `
CREATE TABLE IF NOT EXISTS ui_extension_slot (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  plugin_id TEXT NOT NULL,
  slot_location TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT,
  component_ref TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  allowed_roles TEXT[] NOT NULL DEFAULT '{"*"}',
  status TEXT NOT NULL DEFAULT 'active',
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ues_tenant ON ui_extension_slot(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ues_slot ON ui_extension_slot(tenant_id, slot_location);
CREATE INDEX IF NOT EXISTS idx_ues_plugin ON ui_extension_slot(tenant_id, plugin_id);

CREATE TABLE IF NOT EXISTS ui_slot_policy (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  slot_location TEXT NOT NULL,
  max_extensions INTEGER NOT NULL DEFAULT 5,
  require_approval BOOLEAN NOT NULL DEFAULT true,
  admin_roles TEXT[] NOT NULL DEFAULT '{"admin"}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, slot_location)
);
CREATE INDEX IF NOT EXISTS idx_usp_tenant ON ui_slot_policy(tenant_id);
`,
  },

  // ── v49: Plugin Marketplace (Phase 360) ──
  {
    version: 49,
    name: 'plugin_marketplace',
    sql: `
CREATE TABLE IF NOT EXISTS marketplace_listing (
  id TEXT PRIMARY KEY,
  plugin_id TEXT NOT NULL,
  publisher_id TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  summary TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  tags TEXT[] NOT NULL DEFAULT '{}',
  manifest_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  review_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  install_count INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mpl_status ON marketplace_listing(status);
CREATE INDEX IF NOT EXISTS idx_mpl_category ON marketplace_listing(category);
CREATE INDEX IF NOT EXISTS idx_mpl_publisher ON marketplace_listing(publisher_id);

CREATE TABLE IF NOT EXISTS marketplace_install (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  listing_id TEXT NOT NULL,
  plugin_id TEXT NOT NULL,
  version TEXT NOT NULL,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uninstalled_at TIMESTAMPTZ,
  installed_by TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mpi_tenant ON marketplace_install(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mpi_listing ON marketplace_install(tenant_id, listing_id);

CREATE TABLE IF NOT EXISTS marketplace_review (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mpr_listing ON marketplace_review(listing_id);

CREATE TABLE IF NOT EXISTS marketplace_audit_log (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mpa_listing ON marketplace_audit_log(listing_id);
CREATE INDEX IF NOT EXISTS idx_mpa_created ON marketplace_audit_log(created_at);
`,
  },

  // ── v50: Analytics Data Platform (Wave 19, Phases 362-369) ──
  {
    version: 50,
    name: 'analytics_data_platform',
    sql: `
CREATE TABLE IF NOT EXISTS analytics_extract_run (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  entity_types TEXT[] NOT NULL DEFAULT '{}',
  incremental BOOLEAN NOT NULL DEFAULT TRUE,
  extracted_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS idx_axr_tenant ON analytics_extract_run(tenant_id);
CREATE INDEX IF NOT EXISTS idx_axr_started ON analytics_extract_run(tenant_id, started_at);

CREATE TABLE IF NOT EXISTS analytics_extract_record (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  entity_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_axrec_run ON analytics_extract_record(run_id);
CREATE INDEX IF NOT EXISTS idx_axrec_tenant ON analytics_extract_record(tenant_id, entity_type);

CREATE TABLE IF NOT EXISTS analytics_extract_offset (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  entity_type TEXT NOT NULL,
  last_offset TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, entity_type)
);

CREATE TABLE IF NOT EXISTS analytics_deid_config (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default' UNIQUE,
  mode TEXT NOT NULL DEFAULT 'strict',
  denylist_scan_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  custom_field_denylist TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_quality_metric_run (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  measure_id TEXT NOT NULL,
  value NUMERIC(12,4) NOT NULL DEFAULT 0,
  sample_size INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'computed',
  input_refs TEXT[] NOT NULL DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aqmr_tenant ON analytics_quality_metric_run(tenant_id);
CREATE INDEX IF NOT EXISTS idx_aqmr_measure ON analytics_quality_metric_run(tenant_id, measure_id);

CREATE TABLE IF NOT EXISTS analytics_dataset_permission (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  dataset_id TEXT NOT NULL,
  role TEXT NOT NULL,
  actions TEXT[] NOT NULL DEFAULT '{}',
  granted_by TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, dataset_id, role)
);
CREATE INDEX IF NOT EXISTS idx_adp_tenant ON analytics_dataset_permission(tenant_id);

CREATE TABLE IF NOT EXISTS analytics_column_mask_rule (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  dataset_id TEXT NOT NULL,
  column_name TEXT NOT NULL,
  mask_type TEXT NOT NULL DEFAULT 'redact',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_acmr_tenant ON analytics_column_mask_rule(tenant_id, dataset_id);

CREATE TABLE IF NOT EXISTS analytics_export_audit (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  dataset_id TEXT NOT NULL,
  exported_by TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'json',
  row_count INTEGER NOT NULL DEFAULT 0,
  filter_summary TEXT,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aea_tenant ON analytics_export_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_aea_exported ON analytics_export_audit(tenant_id, exported_at);
`,
  },

  // ── v51: Phase 492 (W34-P2) — Tenant Country Pack Binding ──
  {
    version: 51,
    name: 'phase492_tenant_country_binding',
    sql: `
-- Phase 492 (W34-P2): Add country pack binding to tenant_config.
-- countryPackId = ISO 3166-1 alpha-2 (e.g. "US", "PH", "GH")
-- locale = BCP-47 tag (e.g. "en", "fil", "es")
-- timezone = IANA timezone (e.g. "America/New_York", "Asia/Manila")
ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS country_pack_id TEXT NOT NULL DEFAULT 'US';
ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en';
ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/New_York';

CREATE INDEX IF NOT EXISTS idx_tenant_config_pack
  ON tenant_config(country_pack_id);
`,
  },

  // ── v52: Phase 514 (W37-P2) — Payer Dossiers + Onboarding Tasks ──
  {
    version: 52,
    name: 'phase514_payer_dossiers',
    sql: `
-- Phase 514 (W37-P2): Payer dossier enrichment profile + onboarding workflow tasks.
CREATE TABLE IF NOT EXISTS payer_dossier (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  payer_id TEXT NOT NULL REFERENCES payer(id),
  country_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  enrichment_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  contact_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  timing_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  compliance_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  completeness_score INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dossier_tenant ON payer_dossier(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dossier_payer ON payer_dossier(payer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dossier_tenant_payer ON payer_dossier(tenant_id, payer_id);

CREATE TABLE IF NOT EXISTS payer_onboarding_task (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  dossier_id TEXT NOT NULL REFERENCES payer_dossier(id),
  payer_id TEXT NOT NULL REFERENCES payer(id),
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  assignee TEXT,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  evidence_json JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_onboard_tenant ON payer_onboarding_task(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboard_dossier ON payer_onboarding_task(dossier_id);
CREATE INDEX IF NOT EXISTS idx_onboard_payer ON payer_onboarding_task(payer_id);
CREATE INDEX IF NOT EXISTS idx_onboard_status ON payer_onboarding_task(status);
`,
  },

  // ── v53: Phase 523 (W38-C2) — ED Durability ──
  {
    version: 53,
    name: 'phase523_ed_durability',
    sql: `
-- Phase 523 (W38-C2): Emergency Department PG-backed durability.
CREATE TABLE IF NOT EXISTS ed_visit (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  arrival_time TIMESTAMPTZ NOT NULL,
  arrival_mode TEXT NOT NULL,
  triage_json JSONB,
  bed_assignment_json JSONB,
  attending_provider TEXT,
  disposition TEXT,
  disposition_time TIMESTAMPTZ,
  disposition_by TEXT,
  admit_order_ien TEXT,
  created_by TEXT,
  total_minutes INTEGER,
  door_to_provider_minutes INTEGER,
  door_to_disposition_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ed_visit_tenant ON ed_visit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ed_visit_patient ON ed_visit(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_ed_visit_status ON ed_visit(status);
CREATE INDEX IF NOT EXISTS idx_ed_visit_arrival ON ed_visit(arrival_time);

CREATE TABLE IF NOT EXISTS ed_bed (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  zone TEXT NOT NULL,
  bed_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  current_visit_id TEXT,
  last_cleaned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ed_bed_tenant ON ed_bed(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ed_bed_status ON ed_bed(status);
`,
  },

  // ── v54: Phase 524 (W38-C3) — OR/Anesthesia Durability ──
  {
    version: 54,
    name: 'phase524_or_durability',
    sql: `
-- Phase 524 (W38-C3): Operating Room PG-backed durability.
CREATE TABLE IF NOT EXISTS or_case (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  priority TEXT NOT NULL DEFAULT 'elective',
  room_id TEXT,
  scheduled_date TEXT NOT NULL,
  scheduled_start_time TEXT,
  estimated_duration_min INTEGER NOT NULL,
  surgeon TEXT NOT NULL,
  assistants JSONB NOT NULL DEFAULT '[]'::jsonb,
  procedure TEXT NOT NULL,
  procedure_cpt TEXT,
  laterality TEXT,
  anesthesia_json JSONB,
  milestones_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_or_case_tenant ON or_case(tenant_id);
CREATE INDEX IF NOT EXISTS idx_or_case_patient ON or_case(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_or_case_status ON or_case(status);
CREATE INDEX IF NOT EXISTS idx_or_case_date ON or_case(scheduled_date);

CREATE TABLE IF NOT EXISTS or_room (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  current_case_id TEXT,
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_or_room_tenant ON or_room(tenant_id);
CREATE INDEX IF NOT EXISTS idx_or_room_status ON or_room(status);

CREATE TABLE IF NOT EXISTS or_block (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  room_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  surgeon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_or_block_tenant ON or_block(tenant_id);
CREATE INDEX IF NOT EXISTS idx_or_block_room ON or_block(room_id);
`,
  },

  // ── v55: Phase 525 (W38-C4) — ICU Durability ──
  {
    version: 55,
    name: 'phase525_icu_durability',
    sql: `
-- Phase 525 (W38-C4): ICU PG-backed durability (6 tables).
CREATE TABLE IF NOT EXISTS icu_admission (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT NOT NULL,
  bed_id TEXT NOT NULL,
  unit TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  admit_time TIMESTAMPTZ NOT NULL,
  admit_source TEXT NOT NULL,
  attending_provider TEXT NOT NULL,
  diagnosis TEXT NOT NULL,
  code_status TEXT NOT NULL DEFAULT 'full',
  isolation_precautions JSONB,
  discharge_time TIMESTAMPTZ,
  discharge_disposition TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_icu_adm_tenant ON icu_admission(tenant_id);
CREATE INDEX IF NOT EXISTS idx_icu_adm_patient ON icu_admission(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_icu_adm_status ON icu_admission(status);
CREATE INDEX IF NOT EXISTS idx_icu_adm_unit ON icu_admission(unit);

CREATE TABLE IF NOT EXISTS icu_bed (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  unit TEXT NOT NULL,
  bed_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  current_admission_id TEXT,
  monitors JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_icu_bed_tenant ON icu_bed(tenant_id);
CREATE INDEX IF NOT EXISTS idx_icu_bed_unit ON icu_bed(unit);
CREATE INDEX IF NOT EXISTS idx_icu_bed_status ON icu_bed(status);

CREATE TABLE IF NOT EXISTS icu_flowsheet_entry (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  admission_id TEXT NOT NULL,
  category TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  recorded_by TEXT NOT NULL,
  values_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  validated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_icu_fs_tenant ON icu_flowsheet_entry(tenant_id);
CREATE INDEX IF NOT EXISTS idx_icu_fs_admission ON icu_flowsheet_entry(admission_id);
CREATE INDEX IF NOT EXISTS idx_icu_fs_category ON icu_flowsheet_entry(category);
CREATE INDEX IF NOT EXISTS idx_icu_fs_timestamp ON icu_flowsheet_entry(timestamp);

CREATE TABLE IF NOT EXISTS icu_vent_record (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  admission_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  mode TEXT NOT NULL,
  tidal_volume INTEGER,
  respiratory_rate INTEGER,
  peep INTEGER NOT NULL,
  fio2 TEXT NOT NULL,
  pressure_support INTEGER,
  inspiratory_pressure INTEGER,
  pip INTEGER,
  plateau INTEGER,
  compliance INTEGER,
  recorded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_icu_vent_tenant ON icu_vent_record(tenant_id);
CREATE INDEX IF NOT EXISTS idx_icu_vent_admission ON icu_vent_record(admission_id);
CREATE INDEX IF NOT EXISTS idx_icu_vent_timestamp ON icu_vent_record(timestamp);

CREATE TABLE IF NOT EXISTS icu_io_record (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  admission_id TEXT NOT NULL,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  volume_ml INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  recorded_by TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_icu_io_tenant ON icu_io_record(tenant_id);
CREATE INDEX IF NOT EXISTS idx_icu_io_admission ON icu_io_record(admission_id);
CREATE INDEX IF NOT EXISTS idx_icu_io_type ON icu_io_record(type);

CREATE TABLE IF NOT EXISTS icu_score (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  admission_id TEXT NOT NULL,
  score_type TEXT NOT NULL,
  score INTEGER NOT NULL,
  components_json JSONB,
  timestamp TIMESTAMPTZ NOT NULL,
  calculated_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_icu_score_tenant ON icu_score(tenant_id);
CREATE INDEX IF NOT EXISTS idx_icu_score_admission ON icu_score(admission_id);
CREATE INDEX IF NOT EXISTS idx_icu_score_type ON icu_score(score_type);
`,
  },

  // ── v56: Phase 526 (W38-C5) — Device Registry Durability ──
  {
    version: 56,
    name: 'phase526_device_registry_durability',
    sql: `
-- Phase 526 (W38-C5): Device Registry PG-backed durability.
CREATE TABLE IF NOT EXISTS managed_device (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  device_class TEXT NOT NULL,
  protocols JSONB NOT NULL DEFAULT '[]'::jsonb,
  gateway_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  firmware_version TEXT,
  last_calibration TIMESTAMPTZ,
  next_calibration TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mdev_tenant ON managed_device(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mdev_tenant_serial ON managed_device(tenant_id, serial_number);
CREATE INDEX IF NOT EXISTS idx_mdev_class ON managed_device(device_class);
CREATE INDEX IF NOT EXISTS idx_mdev_status ON managed_device(status);
CREATE INDEX IF NOT EXISTS idx_mdev_gateway ON managed_device(gateway_id);

CREATE TABLE IF NOT EXISTS device_patient_association (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  device_id TEXT NOT NULL,
  patient_dfn TEXT NOT NULL,
  location TEXT,
  facility_code TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  associated_by TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dpa_tenant ON device_patient_association(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dpa_device ON device_patient_association(device_id);
CREATE INDEX IF NOT EXISTS idx_dpa_patient ON device_patient_association(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_dpa_status ON device_patient_association(status);

CREATE TABLE IF NOT EXISTS device_location_mapping (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  device_id TEXT NOT NULL,
  ward TEXT NOT NULL,
  room TEXT NOT NULL,
  bed TEXT NOT NULL,
  facility_code TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  mapped_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dlm_tenant ON device_location_mapping(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dlm_device ON device_location_mapping(device_id);
CREATE INDEX IF NOT EXISTS idx_dlm_ward ON device_location_mapping(ward);

CREATE TABLE IF NOT EXISTS device_audit_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  device_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dal_tenant ON device_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dal_device ON device_audit_log(device_id);
CREATE INDEX IF NOT EXISTS idx_dal_timestamp ON device_audit_log(timestamp);
`,
  },

  // ── v57: Phase 528 (W38-C7) — Radiology Durability ──
  {
    version: 57,
    name: 'phase528_radiology_durability',
    sql: `
-- Phase 528 (W38-C7): Radiology PG-backed durability (6 tables).
CREATE TABLE IF NOT EXISTS radiology_order (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT NOT NULL,
  vista_order_ien TEXT,
  vista_rad_proc_ien TEXT,
  status TEXT NOT NULL DEFAULT 'ordered',
  procedure_name TEXT NOT NULL,
  procedure_code TEXT,
  cpt_code TEXT,
  modality TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'routine',
  clinical_indication TEXT NOT NULL,
  ordering_provider_duz TEXT NOT NULL,
  ordering_provider_name TEXT NOT NULL,
  protocol_name TEXT,
  protocol_assigned_by_duz TEXT,
  protocol_assigned_at TIMESTAMPTZ,
  mwl_worklist_item_id TEXT,
  mpps_record_id TEXT,
  study_instance_uid TEXT,
  accession_number TEXT,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rad_order_tenant ON radiology_order(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rad_order_patient ON radiology_order(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_rad_order_status ON radiology_order(status);
CREATE INDEX IF NOT EXISTS idx_rad_order_modality ON radiology_order(modality);
CREATE INDEX IF NOT EXISTS idx_rad_order_accession ON radiology_order(accession_number);

CREATE TABLE IF NOT EXISTS reading_worklist_item (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  rad_order_id TEXT NOT NULL,
  patient_dfn TEXT NOT NULL,
  study_instance_uid TEXT NOT NULL,
  accession_number TEXT NOT NULL,
  modality TEXT NOT NULL,
  procedure_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread',
  priority TEXT NOT NULL DEFAULT 'routine',
  assigned_radiologist_duz TEXT,
  assigned_radiologist_name TEXT,
  assigned_at TIMESTAMPTZ,
  report_started_at TIMESTAMPTZ,
  report_finalized_at TIMESTAMPTZ,
  prior_study_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rwi_tenant ON reading_worklist_item(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rwi_order ON reading_worklist_item(rad_order_id);
CREATE INDEX IF NOT EXISTS idx_rwi_status ON reading_worklist_item(status);
CREATE INDEX IF NOT EXISTS idx_rwi_radiologist ON reading_worklist_item(assigned_radiologist_duz);

CREATE TABLE IF NOT EXISTS rad_report (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  rad_order_id TEXT NOT NULL,
  reading_worklist_item_id TEXT NOT NULL,
  patient_dfn TEXT NOT NULL,
  study_instance_uid TEXT NOT NULL,
  accession_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  findings TEXT NOT NULL DEFAULT '',
  impression TEXT NOT NULL DEFAULT '',
  report_text TEXT NOT NULL DEFAULT '',
  template_id TEXT,
  dictated_by_duz TEXT NOT NULL,
  dictated_by_name TEXT NOT NULL,
  dictated_at TIMESTAMPTZ NOT NULL,
  prelim_signed_by_duz TEXT,
  prelim_signed_by_name TEXT,
  prelim_signed_at TIMESTAMPTZ,
  verified_by_duz TEXT,
  verified_by_name TEXT,
  verified_at TIMESTAMPTZ,
  vista_tiu_note_ien TEXT,
  critical_finding BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rad_rpt_tenant ON rad_report(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rad_rpt_order ON rad_report(rad_order_id);
CREATE INDEX IF NOT EXISTS idx_rad_rpt_status ON rad_report(status);
CREATE INDEX IF NOT EXISTS idx_rad_rpt_patient ON rad_report(patient_dfn);

CREATE TABLE IF NOT EXISTS dose_registry_entry (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT NOT NULL,
  rad_order_id TEXT NOT NULL,
  study_instance_uid TEXT NOT NULL,
  accession_number TEXT NOT NULL,
  modality TEXT NOT NULL,
  procedure_name TEXT NOT NULL,
  ctdi_vol TEXT,
  dlp TEXT,
  dap TEXT,
  fluoro_time_sec INTEGER,
  exposure_count INTEGER,
  effective_dose_msv TEXT,
  exceeds_drl BOOLEAN NOT NULL DEFAULT FALSE,
  drl_threshold TEXT,
  drl_metric TEXT,
  mpps_record_id TEXT,
  performed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dose_tenant ON dose_registry_entry(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dose_patient ON dose_registry_entry(patient_dfn);
CREATE INDEX IF NOT EXISTS idx_dose_modality ON dose_registry_entry(modality);
CREATE INDEX IF NOT EXISTS idx_dose_exceeds ON dose_registry_entry(exceeds_drl);

CREATE TABLE IF NOT EXISTS rad_critical_alert (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  rad_report_id TEXT NOT NULL,
  rad_order_id TEXT NOT NULL,
  patient_dfn TEXT NOT NULL,
  finding TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notify_provider_duz TEXT NOT NULL,
  notify_provider_name TEXT NOT NULL,
  communicated_to_duz TEXT,
  communicated_to_name TEXT,
  communicated_at TIMESTAMPTZ,
  communication_method TEXT,
  acknowledged_by_duz TEXT,
  acknowledged_by_name TEXT,
  acknowledged_at TIMESTAMPTZ,
  communication_deadline_minutes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rca_tenant ON rad_critical_alert(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rca_status ON rad_critical_alert(status);
CREATE INDEX IF NOT EXISTS idx_rca_patient ON rad_critical_alert(patient_dfn);

CREATE TABLE IF NOT EXISTS peer_review (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  rad_report_id TEXT NOT NULL,
  rad_order_id TEXT NOT NULL,
  patient_dfn TEXT NOT NULL,
  reviewer_duz TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  original_dictator_duz TEXT NOT NULL,
  original_dictator_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  comments TEXT NOT NULL,
  discrepancy_category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pr_tenant ON peer_review(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pr_report ON peer_review(rad_report_id);
CREATE INDEX IF NOT EXISTS idx_pr_reviewer ON peer_review(reviewer_duz);
`,
  },

  // ═══════════════════════════════════════════════════════════
  // v58 — Wave 41: Durable Ops Stores (scheduling writeback,
  //        HL7 dead-letter + vault, DSAR requests, bulk exports)
  // ═══════════════════════════════════════════════════════════
  {
    version: 58,
    name: 'wave41_durable_ops_stores',
    sql: `
-- Scheduling writeback entries (Phase 170 -> PG)
CREATE TABLE IF NOT EXISTS scheduling_writeback_entry (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  appointment_ref TEXT NOT NULL,
  patient_dfn TEXT NOT NULL,
  clinic_ien TEXT,
  status TEXT NOT NULL DEFAULT 'pending_approval',
  truth_gate_result JSONB,
  vista_ien TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_swe_tenant ON scheduling_writeback_entry(tenant_id);
CREATE INDEX IF NOT EXISTS idx_swe_status ON scheduling_writeback_entry(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_swe_appt ON scheduling_writeback_entry(appointment_ref);

-- HL7 enhanced dead-letter queue (Phase 259 -> PG)
CREATE TABLE IF NOT EXISTS hl7_dead_letter (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  message_type TEXT NOT NULL,
  message_control_id TEXT NOT NULL,
  sending_application TEXT NOT NULL,
  sending_facility TEXT NOT NULL,
  received_at BIGINT NOT NULL,
  reason TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  message_hash TEXT NOT NULL,
  message_size_bytes INTEGER NOT NULL DEFAULT 0,
  last_retry_at BIGINT,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at BIGINT,
  resolved_by TEXT,
  raw_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hdl_tenant ON hl7_dead_letter(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hdl_resolved ON hl7_dead_letter(tenant_id, resolved);
CREATE INDEX IF NOT EXISTS idx_hdl_msgctrl ON hl7_dead_letter(message_control_id);

-- DSAR request store (Phase 496 -> PG)
CREATE TABLE IF NOT EXISTS dsar_request (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  request_type TEXT NOT NULL,
  subject_ref TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  status_history JSONB NOT NULL DEFAULT '[]',
  country_pack_id TEXT NOT NULL DEFAULT '',
  framework TEXT NOT NULL DEFAULT '',
  right_to_erasure BOOLEAN NOT NULL DEFAULT FALSE,
  data_portability BOOLEAN NOT NULL DEFAULT FALSE,
  due_date TEXT NOT NULL,
  fulfilled_at TEXT,
  fulfilled_by TEXT,
  denial_reason TEXT,
  export_ref TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dsar_tenant ON dsar_request(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dsar_status ON dsar_request(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_dsar_type ON dsar_request(tenant_id, request_type);

-- Bulk export job store (Phase 264 -> PG)
CREATE TABLE IF NOT EXISTS bulk_export_job (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  level TEXT NOT NULL DEFAULT 'system',
  subject_id TEXT,
  requested_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'accepted',
  resource_types JSONB NOT NULL DEFAULT '[]',
  since TEXT,
  output_files JSONB NOT NULL DEFAULT '[]',
  manifest JSONB,
  progress INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_bej_tenant ON bulk_export_job(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bej_status ON bulk_export_job(tenant_id, status);
`,
  },

  // ═══════════════════════════════════════════════════════════
  // v59 — ADT-1: Durable ADT movement store (admit/transfer/discharge)
  // PG-backed stubs for DGPM write RPCs not available in sandbox.
  // ═══════════════════════════════════════════════════════════
  {
    version: 59,
    name: 'adt_movement_store',
    sql: `
CREATE TABLE IF NOT EXISTS adt_movement (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  movement_type TEXT NOT NULL,
  patient_dfn TEXT NOT NULL,
  from_ward_ien TEXT,
  to_ward_ien TEXT,
  bed_id TEXT,
  admitting_duz TEXT,
  attending_duz TEXT,
  movement_datetime TEXT NOT NULL,
  discharge_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  vista_ien TEXT,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_adt_mv_tenant ON adt_movement(tenant_id);
CREATE INDEX IF NOT EXISTS idx_adt_mv_type ON adt_movement(tenant_id, movement_type);
CREATE INDEX IF NOT EXISTS idx_adt_mv_dfn ON adt_movement(tenant_id, patient_dfn);
CREATE INDEX IF NOT EXISTS idx_adt_mv_status ON adt_movement(tenant_id, status);
`,
  },
  {
    version: 60,
    name: 'wave42_new_domain_tables',
    sql: `
-- Phase 575 (Wave 42): 17 new domain tables for in-memory store migration

CREATE TABLE IF NOT EXISTS intake_brain_state (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  session_id TEXT NOT NULL,
  plugin_id TEXT NOT NULL,
  state_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ibs_tenant ON intake_brain_state(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ibs_session ON intake_brain_state(tenant_id, session_id);

CREATE TABLE IF NOT EXISTS intake_brain_audit (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  session_id TEXT NOT NULL,
  action TEXT NOT NULL,
  input_hash TEXT,
  output_hash TEXT,
  plugin_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_iba_tenant ON intake_brain_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_iba_session ON intake_brain_audit(tenant_id, session_id);

CREATE TABLE IF NOT EXISTS mha_administration (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT NOT NULL,
  instrument_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  score REAL,
  responses_json JSONB,
  administered_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mha_tenant ON mha_administration(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mha_dfn ON mha_administration(tenant_id, patient_dfn);

CREATE TABLE IF NOT EXISTS cp_result (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT NOT NULL,
  procedure_type TEXT NOT NULL,
  result_json JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cpr_tenant ON cp_result(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cpr_dfn ON cp_result(tenant_id, patient_dfn);

CREATE TABLE IF NOT EXISTS imaging_capture (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT NOT NULL,
  study_uid TEXT,
  capture_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  orthanc_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_imgcap_tenant ON imaging_capture(tenant_id);
CREATE INDEX IF NOT EXISTS idx_imgcap_dfn ON imaging_capture(tenant_id, patient_dfn);

CREATE TABLE IF NOT EXISTS scheduling_recall (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT NOT NULL,
  clinic_ien TEXT,
  recall_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_schrcl_tenant ON scheduling_recall(tenant_id);
CREATE INDEX IF NOT EXISTS idx_schrcl_dfn ON scheduling_recall(tenant_id, patient_dfn);

CREATE TABLE IF NOT EXISTS portal_audit_event (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  detail_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pae_tenant ON portal_audit_event(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pae_user ON portal_audit_event(tenant_id, user_id);

CREATE TABLE IF NOT EXISTS hl7_route (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  message_type TEXT NOT NULL,
  destination TEXT NOT NULL,
  transform_id TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hl7r_tenant ON hl7_route(tenant_id);

CREATE TABLE IF NOT EXISTS hl7_tenant_endpoint (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  endpoint_url TEXT NOT NULL,
  auth_type TEXT NOT NULL DEFAULT 'none',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hl7te_tenant ON hl7_tenant_endpoint(tenant_id);

CREATE TABLE IF NOT EXISTS hl7_message_event (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  message_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  body_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hl7me_tenant ON hl7_message_event(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hl7me_type ON hl7_message_event(tenant_id, message_type);

CREATE TABLE IF NOT EXISTS med_rec_session (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  medications_json JSONB,
  reconciled_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_medrec_tenant ON med_rec_session(tenant_id);
CREATE INDEX IF NOT EXISTS idx_medrec_dfn ON med_rec_session(tenant_id, patient_dfn);

CREATE TABLE IF NOT EXISTS discharge_plan (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  plan_json JSONB,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dp_tenant ON discharge_plan(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dp_dfn ON discharge_plan(tenant_id, patient_dfn);

CREATE TABLE IF NOT EXISTS mar_safety_event (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  patient_dfn TEXT NOT NULL,
  event_type TEXT NOT NULL,
  detail_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mse_tenant ON mar_safety_event(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mse_dfn ON mar_safety_event(tenant_id, patient_dfn);

CREATE TABLE IF NOT EXISTS device_alarm (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  device_id TEXT NOT NULL,
  alarm_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  detail_json JSONB,
  ack_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_da_tenant ON device_alarm(tenant_id);
CREATE INDEX IF NOT EXISTS idx_da_device ON device_alarm(tenant_id, device_id);
`,
  },
];

/**
 * Compute SHA-256 checksum for a migration's SQL.
 */
function migrationChecksum(sql: string): string {
  return createHash('sha256').update(sql).digest('hex').slice(0, 16);
}

/**
 * Get the full migration manifest (for CI gates and schema status).
 * Returns all defined migrations with their version, name, and SQL checksum.
 */
export function getMigrationManifest(): Array<{
  version: number;
  name: string;
  checksum: string;
}> {
  return MIGRATIONS.map((m) => ({
    version: m.version,
    name: m.name,
    checksum: migrationChecksum(m.sql),
  }));
}

/**
 * Get the latest migration version defined in code.
 */
export function getLatestMigrationVersion(): number {
  return MIGRATIONS.length > 0 ? Math.max(...MIGRATIONS.map((m) => m.version)) : 0;
}

/**
 * Canonical list of all tenant-scoped tables that receive RLS policies.
 * Phase 176: Exported so tenant-posture, tenant-guard, and CI tests can
 * reference a single source of truth instead of maintaining separate lists.
 *
 * ANY table with a tenant_id column MUST appear here.
 */
export const CANONICAL_RLS_TABLES: readonly string[] = [
  'platform_audit_event',
  'idempotency_key',
  'outbox_event',
  'payer',
  'tenant_payer',
  'payer_capability',
  'payer_task',
  'payer_evidence_snapshot',
  'payer_audit_event',
  'denial_case',
  'denial_action',
  'denial_attachment',
  'resubmission_attempt',
  'remittance_import',
  'payment_record',
  'reconciliation_match',
  'underpayment_case',
  'eligibility_check',
  'claim_status_check',
  'capability_matrix_cell',
  'capability_matrix_evidence',
  'job_run_log',
  'auth_session',
  'rcm_work_item',
  'rcm_work_item_event',
  'rcm_claim',
  'rcm_remittance',
  'rcm_claim_case',
  'edi_acknowledgement',
  'edi_claim_status',
  'edi_pipeline_entry',
  'portal_message',
  'portal_access_log',
  'portal_patient_setting',
  'telehealth_room',
  'telehealth_room_event',
  'imaging_work_item',
  'imaging_ingest_event',
  'scheduling_waitlist_request',
  'scheduling_booking_lock',
  'scheduling_lifecycle',
  'user_locale_preference',
  'intake_question_schema',
  'clinic_preferences',
  'patient_consent',
  'patient_portal_pref',
  // Phase 146: Durability Wave 3 tables
  'portal_user',
  'portal_session',
  'portal_refill',
  'portal_task',
  'portal_sensitivity_config',
  'portal_share_link',
  'portal_export',
  'portal_proxy_invitation',
  'imaging_device',
  'idp_vista_binding',
  'iam_break_glass_session',
  'rcm_payment_batch',
  'rcm_payment_line',
  'rcm_payment_posting',
  'rcm_underpayment_case',
  'rcm_loa_request',
  'rcm_remit_document',
  'rcm_transaction_envelope',
  'rcm_ph_submission',
  'rcm_hmo_submission',
  'rcm_payer_enrollment',
  'rcm_loa_case',
  'rcm_credential_vault',
  'rcm_ph_claim_draft',
  'rcm_ph_facility_setup',
  'rcm_payer_rule',
  'rcm_payer_rulepack',
  'rcm_denial',
  'rcm_payer_directory_entry',
  'rcm_job_queue_entry',
  'clinical_draft',
  'ui_preference',
  'handoff_report',
  'intake_session',
  'migration_job',
  'export_job',
  // Phase 150: Patient identity mapping
  'portal_patient_identity',
  // Phase 153: Tenant OIDC mapping
  'tenant_oidc_mapping',
  // Phase 154: CPOE order sign events
  'cpoe_order_sign_event',
  // Phase 157: Audit JSONL shipping
  'audit_ship_offset',
  'audit_ship_manifest',
  // Phase 158: Specialty Template & Workflow Studio
  'clinical_template',
  'template_version_event',
  'quick_text',
  // Phase 159: Patient Queue
  'queue_ticket',
  'queue_event',
  // Phase 160: Department Workflows
  'workflow_definition',
  'workflow_instance',
  // Phase 174: RCM SQLite-to-PG parity
  'integration_evidence',
  'loa_request',
  'loa_attachment',
  'accreditation_status',
  'accreditation_task',
  'credential_artifact',
  'credential_document',
  'claim_draft',
  'claim_lifecycle_event',
  'scrub_rule',
  'scrub_result',
  'rcm_durable_job',
  // Phase 174: Module entitlements (module_catalog is global — no tenant_id)
  'tenant_module',
  'tenant_feature_flag',
  'module_audit_log',
  // Phase 275: Tenant config control plane
  'tenant_config',
  // Phase 300: Clinical writeback command bus
  // clinical_command_attempt/result inherit tenant scope via FK to clinical_command
  'clinical_command',
  // Phase 318: Integration Control Plane v2
  'integration_partner',
  'integration_endpoint',
  'integration_credential_ref',
  'integration_route',
  'integration_test_run',
  // Phase 328: Multi-Cluster Registry
  'platform_cluster',
  'tenant_placement',
  // Phase 347: Facility/Location Model
  'facility',
  'department',
  'location',
  'provider_facility_assignment',
  // Phase 348: Dept RBAC Templates
  'dept_role_template',
  'dept_role_membership',
  // Phase 349: Department Packs
  'pack_installation',
  // Phase 350: Workflow Inbox
  'workflow_task',
  'workflow_task_event',
  // Phase 351: Patient Communications
  'notification_consent',
  'notification_template',
  'notification_record',
  // Phase 352: Department Scheduling & Resources
  'schedule_template',
  'dept_resource',
  'resource_allocation',
  'scheduling_rule',
  'cross_dept_referral',
  // Phase 355: Event Bus
  'event_bus_outbox',
  'event_bus_dlq',
  'event_bus_delivery_log',
  // Phase 356: Webhooks
  'webhook_subscription',
  'webhook_delivery_log',
  // Phase 357: FHIR Subscriptions
  'fhir_subscription',
  'fhir_notification',
  // Phase 358: Plugin SDK
  'plugin_registry',
  'plugin_audit_log',
  // Phase 359: UI Extension Slots
  'ui_extension_slot',
  'ui_slot_policy',
  // Phase 360: Plugin Marketplace (marketplace_listing/audit_log are global catalogs)
  'marketplace_install',
  'marketplace_review',
  // Wave 19: Analytics Data Platform (Phases 362-369)
  'analytics_extract_run',
  'analytics_extract_record',
  'analytics_extract_offset',
  'analytics_deid_config',
  'analytics_quality_metric_run',
  'analytics_dataset_permission',
  'analytics_column_mask_rule',
  'analytics_export_audit',
  // Phase 514: Payer dossiers + onboarding
  'payer_dossier',
  'payer_onboarding_task',
  // Phase 523 (W38-C2): ED durability
  'ed_visit',
  'ed_bed',
  // Phase 524 (W38-C3): OR durability
  'or_case',
  'or_room',
  'or_block',
  // Phase 525 (W38-C4): ICU durability
  'icu_admission',
  'icu_bed',
  'icu_flowsheet_entry',
  'icu_vent_record',
  'icu_io_record',
  'icu_score',
  // Phase 526 (W38-C5): Device registry durability
  'managed_device',
  'device_patient_association',
  'device_location_mapping',
  'device_audit_log',
  // Phase 528 (W38-C7): Radiology durability
  'radiology_order',
  'reading_worklist_item',
  'rad_report',
  'dose_registry_entry',
  'rad_critical_alert',
  'peer_review',
  // Wave 41: Durable Ops Stores
  'scheduling_writeback_entry',
  'hl7_dead_letter',
  'dsar_request',
  'bulk_export_job',
  // ADT-1: ADT movement store
  'adt_movement',
  // Phase 575 (Wave 42): New domain tables for store migration
  'intake_brain_state',
  'intake_brain_audit',
  'mha_administration',
  'cp_result',
  'imaging_capture',
  'scheduling_recall',
  'portal_audit_event',
  'hl7_route',
  'hl7_tenant_endpoint',
  'hl7_message_event',
  'med_rec_session',
  'discharge_plan',
  'mar_safety_event',
  'device_alarm',
  // Wave 16 (Phase 338-343): Session security + SCIM + ABAC + key management
  'session_device_fingerprint',
  'session_mfa_state',
  'session_security_event',
  'scim_user',
  'scim_group',
  'scim_group_member',
  'encryption_key',
  'key_rotation_event',
  'tenant_security_policy',
  'tenant_security_policy_change',
  'sensitivity_tag',
  'access_reason',
] as const;

/**
 * Run all pending migrations. Version-tracked in _platform_migrations table.
 * Idempotent -- safe to call on every startup.
 *
 * Phase 175: Enhanced with SQL checksums for drift detection.
 */
export async function runPgMigrations(): Promise<{
  applied: number;
  skipped: number;
  errors: string[];
  currentVersion: number;
  checksumMismatches: string[];
}> {
  const pool = getPgPool();
  let applied = 0;
  let skipped = 0;
  const errors: string[] = [];
  const checksumMismatches: string[] = [];

  // Create migrations tracking table (with checksum column, Phase 175)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _platform_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      checksum TEXT,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Phase 175: Add checksum column if it doesn't exist (backwards compat)
  await pool.query(`
    ALTER TABLE _platform_migrations
    ADD COLUMN IF NOT EXISTS checksum TEXT;
  `);

  // Get already-applied versions with checksums
  const result = await pool.query(
    'SELECT version, checksum FROM _platform_migrations ORDER BY version'
  );
  const appliedMap = new Map<number, string | null>(
    result.rows.map((r: any) => [r.version, r.checksum])
  );

  let currentVersion = 0;

  for (const migration of MIGRATIONS) {
    const expectedChecksum = migrationChecksum(migration.sql);

    if (appliedMap.has(migration.version)) {
      // Drift detection: warn if SQL changed after application
      const storedChecksum = appliedMap.get(migration.version);
      if (storedChecksum && storedChecksum !== expectedChecksum) {
        checksumMismatches.push(
          `v${migration.version} (${migration.name}): stored=${storedChecksum} code=${expectedChecksum}`
        );
      }
      skipped++;
      currentVersion = Math.max(currentVersion, migration.version);
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(migration.sql);
      await client.query(
        'INSERT INTO _platform_migrations (version, name, checksum) VALUES ($1, $2, $3)',
        [migration.version, migration.name, expectedChecksum]
      );
      await client.query('COMMIT');
      applied++;
      currentVersion = Math.max(currentVersion, migration.version);
    } catch (err: any) {
      await client.query('ROLLBACK');
      errors.push(`Migration v${migration.version} (${migration.name}): ${err.message}`);
    } finally {
      client.release();
    }
  }

  return { applied, skipped, errors, currentVersion, checksumMismatches };
}

/**
 * Apply optional RLS policies to all tenant-scoped tables.
 * Phase 122: Defaults to TRUE when PLATFORM_PG_URL is set AND NODE_ENV=production.
 * Phase 125: Also auto-enables for PLATFORM_RUNTIME_MODE=rc|prod.
 * Override with PLATFORM_PG_RLS_ENABLED=false to disable.
 */
export async function applyRlsPolicies(): Promise<{ applied: string[]; errors: string[] }> {
  const pgConfigured = !!process.env.PLATFORM_PG_URL;
  const isProduction = process.env.NODE_ENV === 'production';
  const explicit = process.env.PLATFORM_PG_RLS_ENABLED;

  // Phase 125: Check runtime mode for rc/prod auto-enable
  const runtimeMode = (process.env.PLATFORM_RUNTIME_MODE || '').toLowerCase().trim();
  const isRcOrProd = runtimeMode === 'rc' || runtimeMode === 'prod';

  // Phase 122: Auto-enable in production when PG is configured
  // Phase 125: Also auto-enable in rc/prod runtime modes
  const rlsEnabled =
    explicit !== undefined ? explicit === 'true' : pgConfigured && (isProduction || isRcOrProd);

  if (!rlsEnabled) {
    return { applied: [], errors: [] };
  }

  const pool = getPgPool();

  const applied: string[] = [];
  const errors: string[] = [];

  for (const table of CANONICAL_RLS_TABLES) {
    try {
      await pool.query(`SELECT create_tenant_rls_policy('${table}')`);
      applied.push(table);
    } catch (err: any) {
      // Policy may already exist — that's OK
      if (err.message?.includes('already exists')) {
        applied.push(table);
      } else {
        errors.push(`${table}: ${err.message}`);
      }
    }
  }

  return { applied, errors };
}
