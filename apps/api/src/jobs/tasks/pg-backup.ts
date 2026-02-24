/**
 * Task: pg_backup — Phase 118: Go-Live Hardening
 *
 * Automated PG backup via pg_dump. Runs as a Graphile Worker task
 * on a cron schedule (default: daily at 1 AM).
 *
 * Writes backups to the configured backup directory.
 * Retains up to N most recent backups (default: 7).
 *
 * Payload (no PHI):
 *   { tenantId, retainCount, backupDir }
 */

import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from "fs";
import { join, resolve } from "path";
import { log } from "../../lib/logger.js";
import { isPgConfigured } from "../../platform/pg/index.js";

const DEFAULT_BACKUP_DIR = resolve(
  process.env.PG_BACKUP_DIR || "artifacts/backups/pg",
);
const DEFAULT_RETAIN_COUNT = Number(process.env.PG_BACKUP_RETAIN_COUNT) || 7;

export interface PgBackupPayload {
  tenantId?: string;
  retainCount?: number;
  backupDir?: string;
}

/**
 * Run pg_dump and store the output as a compressed SQL file.
 * Then prune old backups beyond the retention count.
 */
export async function handlePgBackup(
  payload: Record<string, unknown>,
): Promise<void> {
  const p = payload as PgBackupPayload;
  const pgUrl = process.env.PLATFORM_PG_URL;
  if (!pgUrl || !isPgConfigured()) {
    log.warn("pg_backup: skipped — PLATFORM_PG_URL not configured");
    return;
  }

  const backupDir = p.backupDir || DEFAULT_BACKUP_DIR;
  const retainCount = p.retainCount || DEFAULT_RETAIN_COUNT;

  // Ensure backup directory exists
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `ve-platform-${timestamp}.sql`;
  const filepath = join(backupDir, filename);

  log.info("pg_backup: starting", { backupDir, filename, retainCount });

  try {
    // Use pg_dump via execFileSync (no shell injection — BUG-114 per AGENTS.md)
    const output = execFileSync("pg_dump", [
      "--format=plain",
      "--no-owner",
      "--no-privileges",
      "--clean",
      "--if-exists",
      pgUrl,
    ], {
      timeout: 120_000, // 2 minute timeout
      maxBuffer: 100 * 1024 * 1024, // 100 MB
      encoding: "utf-8",
    });

    // Write output to file
    const { writeFileSync } = await import("fs");
    writeFileSync(filepath, output, "utf-8");

    const stats = statSync(filepath);
    log.info("pg_backup: completed", {
      filename,
      sizeBytes: stats.size,
      path: filepath,
    });

    // Prune old backups
    pruneOldBackups(backupDir, retainCount);
  } catch (err: any) {
    log.error("pg_backup: failed", {
      error: err.message?.slice(0, 500),
      exitCode: err.status,
    });
    throw new Error(`pg_dump failed: ${err.message?.slice(0, 200)}`);
  }
}

/**
 * Remove oldest backups beyond the retention count.
 * Only touches files matching ve-platform-*.sql pattern.
 */
function pruneOldBackups(dir: string, retainCount: number): void {
  try {
    const files = readdirSync(dir)
      .filter((f) => f.startsWith("ve-platform-") && f.endsWith(".sql"))
      .map((f) => ({
        name: f,
        path: join(dir, f),
        mtime: statSync(join(dir, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime); // newest first

    if (files.length <= retainCount) return;

    const toDelete = files.slice(retainCount);
    for (const f of toDelete) {
      unlinkSync(f.path);
      log.info("pg_backup: pruned old backup", { file: f.name });
    }
  } catch (err: any) {
    log.warn("pg_backup: prune failed (non-fatal)", { error: err.message });
  }
}
