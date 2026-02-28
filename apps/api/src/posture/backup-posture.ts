/**
 * backup-posture.ts -- Phase 107: Production Posture Pack
 *
 * Runtime verification of backup/restore readiness:
 * - Persistent store inventory
 * - Backup script availability
 * - In-memory store documentation
 */

import { existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { isPgConfigured } from "../platform/pg/pg-db.js";
import { STORE_INVENTORY } from "../platform/store-policy.js";
import type { PostureGate } from "./observability-posture.js";

// Resolve workspace root from this file's location (apps/api/src/posture/)
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const WS_ROOT = join(__dirname, "..", "..", "..", "..");

/**
 * Phase 177: Derive in-memory store count from the canonical STORE_INVENTORY
 * instead of a hardcoded constant. This prevents drift.
 */
const IN_MEMORY_STORE_COUNT = STORE_INVENTORY.filter(
  s => s.durability === "in_memory_only"
).length;

export interface BackupPosture {
  score: number;
  gates: PostureGate[];
  summary: string;
  stores: {
    postgres: { active: boolean; url: string };
    inMemoryStoreCount: number;
  };
}

export function checkBackupPosture(): BackupPosture {
  const gates: PostureGate[] = [];
  const pgActive = isPgConfigured();

  // Resolve workspace root from import.meta.url (stable regardless of cwd)
  const wsRoot = WS_ROOT;

  // Gate 1: Backup script exists
  const backupScript = join(wsRoot, "scripts", "backup-restore.mjs");
  const hasBackupScript = existsSync(backupScript);
  gates.push({
    name: "backup_script",
    pass: hasBackupScript,
    detail: hasBackupScript
      ? "scripts/backup-restore.mjs available"
      : "scripts/backup-restore.mjs not found -- run Phase 107 implement",
  });

  // Gate 2: Postgres status
  gates.push({
    name: "postgres_store",
    pass: true, // both modes valid
    detail: pgActive
      ? `Postgres configured (PLATFORM_PG_URL set)`
      : "Postgres not configured",
  });

  // Gate 3: Docker volume persistence documented
  gates.push({
    name: "docker_volumes",
    pass: true,
    detail: "VistA, Keycloak, Orthanc, Analytics use Docker volumes (survive down/up, destroyed by -v)",
  });

  // Gate 4: In-memory store awareness
  gates.push({
    name: "in_memory_stores",
    pass: true,
    detail: `${IN_MEMORY_STORE_COUNT} in-memory stores documented (ephemeral, reset on restart)`,
  });

  // Gate 5: Runbook exists
  const runbook = join(wsRoot, "docs", "runbooks", "phase107-production-posture.md");
  const hasRunbook = existsSync(runbook);
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
      postgres: { active: pgActive, url: pgActive ? "(configured)" : "(not configured)" },
      inMemoryStoreCount: IN_MEMORY_STORE_COUNT,
    },
  };
}
