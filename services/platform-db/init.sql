-- Platform DB — Initialization Script (Phase 101)
--
-- Runs once on first container start via docker-entrypoint-initdb.d.
-- Creates extensions and optional RLS setup function.

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crypto functions (for hash verification)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =======================================================
-- RLS helper: call this per-connection to set tenant scope
-- =======================================================
-- Usage: SELECT set_config('app.current_tenant_id', 'tenant-abc', true);
-- The 'true' means it's transaction-local.

-- =======================================================
-- RLS policy creation helper (called by migration if RLS enabled)
-- =======================================================
CREATE OR REPLACE FUNCTION create_tenant_rls_policy(target_table TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'ALTER TABLE %I ENABLE ROW LEVEL SECURITY', target_table
  );
  EXECUTE format(
    'CREATE POLICY tenant_isolation_%I ON %I
     USING (tenant_id = current_setting(''app.current_tenant_id'', true))
     WITH CHECK (tenant_id = current_setting(''app.current_tenant_id'', true))',
    target_table, target_table
  );
  -- Allow superuser / migration user to bypass RLS
  EXECUTE format(
    'ALTER TABLE %I FORCE ROW LEVEL SECURITY', target_table
  );
END;
$$ LANGUAGE plpgsql;

-- Grant the API user ability to set app.current_tenant_id
-- (This is the key mechanism for RLS tenant isolation)
ALTER DATABASE ve_platform SET app.current_tenant_id = 'default';
