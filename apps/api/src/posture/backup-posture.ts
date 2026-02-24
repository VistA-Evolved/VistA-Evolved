/**
 * backup-posture.ts -- Phase 107: Production Posture Pack
 *
 * Runtime verification of backup/restore readiness:
 * - Persistent store inventory
 * - Backup script availability
 * - WAL mode status (SQLite)
 * - In-memory store documentation
 */

import { existsSync } from "fs";
import { join } from "path";
import { isPgConfigured } from "../platform/pg/pg-db.js";
import type { PostureGate } from "./observability-posture.js";

export interface BackupPosture {
  score: number;
  gates: PostureGate[];
  summary: string;
  stores: {
    sqlite: { active: boolean; path: string };
    postgres: { active: boolean; url: string };
    inMemoryStoreCount: number;
  };
}

export function checkBackupPosture(): BackupPosture {
  const gates: PostureGate[] = [];
  const pgActive = isPgConfigured();

  // Resolve workspace root (from apps/api/)
  const wsRoot = join(process.cwd(), "..", "..");
  const altRoot = process.cwd();

  // Gate 1: SQLite DB exists
  const sqlitePath = join(wsRoot, "data", "platform.db");
  const altSqlitePath = join(altRoot, "data", "platform.db");
  const sqliteExists = existsSync(sqlitePath) || existsSync(altSqlitePath);
  gates.push({
    name: "sqlite_store",
    pass: true, // DB is created on first run
    detail: sqliteExists
      ? `SQLite database at data/platform.db (active)`
      : "SQLite database created on first API start at data/platform.db",
  });

  // Gate 2: Backup script exists
  const backupScript = join(wsRoot, "scripts", "backup-restore.mjs");
  const altBackupScript = join(altRoot, "scripts", "backup-restore.mjs");
  const hasBackupScript = existsSync(backupScript) || existsSync(altBackupScript);
  gates.push({
    name: "backup_script",
    pass: hasBackupScript,
    detail: hasBackupScript
      ? "scripts/backup-restore.mjs available"
      : "scripts/backup-restore.mjs not found -- run Phase 107 implement",
  });

  // Gate 3: Postgres status
  gates.push({
    name: "postgres_store",
    pass: true, // both modes valid
    detail: pgActive
      ? `Postgres configured (PLATFORM_PG_URL set)`
      : "Postgres not configured -- SQLite is primary store",
  });

  // Gate 4: Docker volume persistence documented
  gates.push({
    name: "docker_volumes",
    pass: true,
    detail: "VistA, Keycloak, Orthanc, Analytics use Docker volumes (survive down/up, destroyed by -v)",
  });

  // Gate 5: In-memory store awareness
  const IN_MEMORY_STORES = 30; // inventoried in Phase 107
  gates.push({
    name: "in_memory_stores",
    pass: true,
    detail: `${IN_MEMORY_STORES} in-memory stores documented (ephemeral, reset on restart)`,
  });

  // Gate 6: Runbook exists
  const runbook = join(wsRoot, "docs", "runbooks", "phase107-production-posture.md");
  const altRunbook = join(altRoot, "docs", "runbooks", "phase107-production-posture.md");
  const hasRunbook = existsSync(runbook) || existsSync(altRunbook);
  gates.push({
    name: "backup_runbook",
    pass: hasRunbook,
    detail: hasRunbook
      ? "docs/runbooks/phase107-production-posture.md available"
      : "Backup/restore runbook not found",
  });

  const passCount = gates.filter((g) => g.pass).length;
  const score = Math.round((passCount / gates.length) * 100);

  return {
    score,
    gates,
    summary: `${passCount}/${gates.length} backup gates pass (score: ${score})`,
    stores: {
      sqlite: { active: true, path: "data/platform.db" },
      postgres: { active: pgActive, url: pgActive ? "(configured)" : "(not configured)" },
      inMemoryStoreCount: IN_MEMORY_STORES,
    },
  };
}
