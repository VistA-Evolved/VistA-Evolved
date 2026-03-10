/**
 * Schema Status Routes -- Phase 175
 *
 * Admin endpoint for database schema introspection:
 *   GET /admin/schema/status -- Migration history, current version, drift detection
 *
 * Provides:
 * - Current schema version (from DB)
 * - Migration manifest (from code)
 * - Applied vs pending migrations
 * - Checksum drift detection
 * - Table inventory from pg_tables
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../../auth/auth-routes.js';
import { getPgPool } from '../../platform/pg/pg-db.js';
import { getMigrationManifest, getLatestMigrationVersion } from '../../platform/pg/pg-migrate.js';

export default async function schemaStatusRoutes(server: FastifyInstance): Promise<void> {
  /**
   * GET /admin/schema/status
   *
   * Returns:
   * - codeVersion: latest migration version defined in code
   * - dbVersion: latest migration version applied to DB
   * - migrations: full history with checksums + drift flags
   * - pending: migrations not yet applied
   * - tableCount: number of application tables in 'public' schema
   * - rlsEnabled: count of tables with RLS enabled
   */
  server.get('/admin/schema/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const pool = getPgPool();

    // 1. Code manifest
    const manifest = getMigrationManifest();
    const codeVersion = getLatestMigrationVersion();

    // 2. DB applied migrations
    let dbMigrations: Array<{
      version: number;
      name: string;
      checksum: string | null;
      appliedAt: string;
    }> = [];
    let dbVersion = 0;

    try {
      const result = await pool.query(
        'SELECT version, name, checksum, applied_at FROM _platform_migrations ORDER BY version'
      );
      dbMigrations = result.rows.map((r: any) => ({
        version: r.version,
        name: r.name,
        checksum: r.checksum,
        appliedAt: r.applied_at?.toISOString?.() ?? String(r.applied_at),
      }));
      dbVersion = dbMigrations.length > 0 ? Math.max(...dbMigrations.map((m) => m.version)) : 0;
    } catch {
      // Table may not exist yet
    }

    // 3. Build combined view with drift detection
    const appliedVersions = new Map(dbMigrations.map((m) => [m.version, m]));
    const migrations = manifest.map((m) => {
      const applied = appliedVersions.get(m.version);
      return {
        version: m.version,
        name: m.name,
        codeChecksum: m.checksum,
        dbChecksum: applied?.checksum ?? null,
        appliedAt: applied?.appliedAt ?? null,
        status: applied
          ? applied.checksum && applied.checksum !== m.checksum
            ? ('drift' as const)
            : ('applied' as const)
          : ('pending' as const),
      };
    });

    const pending = migrations.filter((m) => m.status === 'pending');
    const drifted = migrations.filter((m) => m.status === 'drift');

    // 4. Table inventory
    let tableCount = 0;
    let rlsEnabledCount = 0;
    try {
      const tableResult = await pool.query(
        "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'"
      );
      tableCount = parseInt(tableResult.rows[0]?.count ?? '0', 10);

      const rlsResult = await pool.query(
        "SELECT COUNT(*) FROM pg_class WHERE relrowsecurity = true AND relkind = 'r'"
      );
      rlsEnabledCount = parseInt(rlsResult.rows[0]?.count ?? '0', 10);
    } catch {
      // OK if pg_tables not queryable
    }

    return {
      ok: true,
      codeVersion,
      dbVersion,
      inSync: codeVersion === dbVersion && drifted.length === 0,
      pending: pending.length,
      drifted: drifted.length,
      tableCount,
      rlsEnabledCount,
      migrations,
    };
  });
}
