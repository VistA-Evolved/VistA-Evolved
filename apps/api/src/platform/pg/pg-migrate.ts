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

import { getPgPool } from "./pg-db.js";

interface Migration {
  version: number;
  name: string;
  sql: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "create_core_platform_tables",
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
    name: "create_payer_tables",
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
    name: "create_denial_reconciliation_tables",
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
    name: "create_eligibility_claim_status_tables",
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
    name: "create_capability_matrix_tables",
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
    name: "performance_indexes_and_partitioning_posture",
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
    name: "security_integrity_posture",
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
    name: "create_job_run_log",
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
    name: "session_workqueue_multi_instance",
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
    name: "rcm_durability_pg",
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
    name: "portal_telehealth_durability_pg",
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
    name: "imaging_scheduling_durability_pg",
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
    name: "imaging_ingest_dicom_patient_name",
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
    name: "scheduling_lifecycle",
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
    name: "i18n_foundation",
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
    name: "clinic_preferences",
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
];

/**
 * Run all pending migrations. Version-tracked in _platform_migrations table.
 * Idempotent — safe to call on every startup.
 */
export async function runPgMigrations(): Promise<{
  applied: number;
  skipped: number;
  errors: string[];
}> {
  const pool = getPgPool();
  let applied = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Create migrations tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _platform_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Get already-applied versions
  const result = await pool.query("SELECT version FROM _platform_migrations ORDER BY version");
  const appliedVersions = new Set(result.rows.map((r: any) => r.version));

  for (const migration of MIGRATIONS) {
    if (appliedVersions.has(migration.version)) {
      skipped++;
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(migration.sql);
      await client.query(
        "INSERT INTO _platform_migrations (version, name) VALUES ($1, $2)",
        [migration.version, migration.name]
      );
      await client.query("COMMIT");
      applied++;
    } catch (err: any) {
      await client.query("ROLLBACK");
      errors.push(`Migration v${migration.version} (${migration.name}): ${err.message}`);
    } finally {
      client.release();
    }
  }

  return { applied, skipped, errors };
}

/**
 * Apply optional RLS policies to all tenant-scoped tables.
 * Phase 122: Defaults to TRUE when PLATFORM_PG_URL is set AND NODE_ENV=production.
 * Phase 125: Also auto-enables for PLATFORM_RUNTIME_MODE=rc|prod.
 * Override with PLATFORM_PG_RLS_ENABLED=false to disable.
 */
export async function applyRlsPolicies(): Promise<{ applied: string[]; errors: string[] }> {
  const pgConfigured = !!process.env.PLATFORM_PG_URL;
  const isProduction = process.env.NODE_ENV === "production";
  const explicit = process.env.PLATFORM_PG_RLS_ENABLED;

  // Phase 125: Check runtime mode for rc/prod auto-enable
  const runtimeMode = (process.env.PLATFORM_RUNTIME_MODE || "").toLowerCase().trim();
  const isRcOrProd = runtimeMode === "rc" || runtimeMode === "prod";

  // Phase 122: Auto-enable in production when PG is configured
  // Phase 125: Also auto-enable in rc/prod runtime modes
  const rlsEnabled = explicit !== undefined
    ? explicit === "true"
    : (pgConfigured && (isProduction || isRcOrProd));

  if (!rlsEnabled) {
    return { applied: [], errors: [] };
  }

  const pool = getPgPool();
  const tenantTables = [
    "platform_audit_event",
    "idempotency_key",
    "outbox_event",
    "payer",
    "tenant_payer",
    "payer_capability",
    "payer_task",
    "payer_evidence_snapshot",
    "payer_audit_event",
    "denial_case",
    "denial_action",
    "denial_attachment",
    "resubmission_attempt",
    "remittance_import",
    "payment_record",
    "reconciliation_match",
    "underpayment_case",
    "eligibility_check",
    "claim_status_check",
    "capability_matrix_cell",
    "capability_matrix_evidence",
    "job_run_log",
    "auth_session",
    "rcm_work_item",
    "rcm_work_item_event",
    "rcm_claim",
    "rcm_remittance",
    "rcm_claim_case",
    "edi_acknowledgement",
    "edi_claim_status",
    "edi_pipeline_entry",
    "portal_message",
    "portal_access_log",
    "portal_patient_setting",
    "telehealth_room",
    "telehealth_room_event",
    "imaging_work_item",
    "imaging_ingest_event",
    "scheduling_waitlist_request",
    "scheduling_booking_lock",
    "scheduling_lifecycle",
    "user_locale_preference",
    "intake_question_schema",
    "clinic_preferences",
  ];

  const applied: string[] = [];
  const errors: string[] = [];

  for (const table of tenantTables) {
    try {
      await pool.query(`SELECT create_tenant_rls_policy('${table}')`);
      applied.push(table);
    } catch (err: any) {
      // Policy may already exist — that's OK
      if (err.message?.includes("already exists")) {
        applied.push(table);
      } else {
        errors.push(`${table}: ${err.message}`);
      }
    }
  }

  return { applied, errors };
}
