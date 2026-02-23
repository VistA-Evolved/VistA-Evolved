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
 * Only runs if PLATFORM_PG_RLS_ENABLED=true.
 */
export async function applyRlsPolicies(): Promise<{ applied: string[]; errors: string[] }> {
  if (process.env.PLATFORM_PG_RLS_ENABLED !== "true") {
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
