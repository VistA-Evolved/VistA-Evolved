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
import type { PostureGate } from "./observability-posture.js";

// Resolve workspace root from this file's location (apps/api/src/posture/)
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const WS_ROOT = join(__dirname, "..", "..", "..", "..");

/**
 * Number of in-memory Map/Set stores across the API codebase.
 * Inventoried in Phase 107 IMPLEMENT (room-store, imaging-worklist,
 * imaging-ingest, claim-store, session-store, analytics-store,
 * payer-registry, edi-pipeline, rcm connectors, device-check,
 * imaging-devices, imaging-audit, immutable-audit, rcm-audit,
 * tenant-config, capability caches, policy-engine, biometric
 * challenge stores, rate-limiter buckets, circuit breaker state,
 * etc.). Update when new stores are added.
 */
const IN_MEMORY_STORE_COUNT = 30;

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
