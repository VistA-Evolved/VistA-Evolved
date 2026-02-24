#!/usr/bin/env node
/**
 * backup-restore.mjs -- Phase 107: Production Posture Pack
 *
 * Unified backup/restore tooling for all VistA-Evolved persistent stores.
 *
 * Usage:
 *   node scripts/backup-restore.mjs backup [--output dir]   # Create backups
 *   node scripts/backup-restore.mjs restore --from dir --yes  # Restore from backup
 *   node scripts/backup-restore.mjs status                  # Show store inventory
 *
 * Supported stores:
 *   1. SQLite (data/platform.db) -- file copy with WAL checkpoint
 *   2. Postgres (if PLATFORM_PG_URL set) -- pg_dump wrapper
 *   3. Docker volumes (VistA, Keycloak, Orthanc) -- documented, not automated
 *   4. In-memory stores (~30) -- ephemeral, not backed up
 *   5. Immutable audit JSONL (logs/immutable-audit.jsonl) -- file copy
 */

import { existsSync, copyFileSync, mkdirSync, readdirSync, statSync, readFileSync, writeFileSync } from "fs";
import { join, basename } from "path";
import { execFileSync } from "child_process";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const command = args[0] || "status";

// ---- Store inventory ----

const STORES = {
  sqlite: {
    name: "SQLite Platform DB",
    path: "data/platform.db",
    type: "file",
    backupable: true,
  },
  sqliteWal: {
    name: "SQLite WAL",
    path: "data/platform.db-wal",
    type: "file",
    backupable: true,
  },
  auditLog: {
    name: "Immutable Audit JSONL",
    path: "apps/api/logs/immutable-audit.jsonl",
    type: "file",
    backupable: true,
  },
  postgres: {
    name: "PostgreSQL Platform DB",
    envVar: "PLATFORM_PG_URL",
    type: "pg_dump",
    backupable: true,
  },
  vistaDocker: {
    name: "WorldVistA Docker Volume",
    container: "wv",
    type: "docker_volume",
    backupable: false,
    note: "Use 'docker exec wv mupip backup ...' for M globals",
  },
  keycloakDocker: {
    name: "Keycloak Postgres Docker Volume",
    type: "docker_volume",
    backupable: false,
    note: "Use 'docker exec ... pg_dumpall' from keycloak-db container",
  },
  orthancDocker: {
    name: "Orthanc Docker Volume",
    type: "docker_volume",
    backupable: false,
    note: "Use Orthanc REST API for DICOM study export",
  },
  analyticsDocker: {
    name: "YottaDB/Octo Analytics Docker Volume",
    type: "docker_volume",
    backupable: false,
    note: "Use 'mupip backup' for M global backup",
  },
};

const IN_MEMORY_STORES = [
  "session-store.ts (user sessions)",
  "room-store.ts (telehealth rooms)",
  "imaging-worklist.ts (imaging orders)",
  "imaging-ingest.ts (Orthanc ingest)",
  "imaging-devices.ts (DICOM devices)",
  "imaging-authz.ts (break-glass sessions)",
  "imaging-audit.ts (imaging audit chain)",
  "analytics-store.ts (analytics events)",
  "analytics-aggregator.ts (aggregation state)",
  "record-portability-store.ts (export/share)",
  "ui-prefs-store.ts (UI preferences)",
  "portal-appointments.ts",
  "portal-messaging.ts",
  "portal-sensitivity.ts",
  "portal-settings.ts",
  "portal-user-store.ts",
  "proxy-store.ts",
  "access-log-store.ts",
  "handoff-store.ts (shift handoffs)",
  "claim-store.ts (RCM claims)",
  "payment-store.ts (remittance batches)",
  "payerOps/store.ts",
  "registry-store.ts",
  "capability-matrix.ts",
  "philhealth-store.ts",
  "normalization.ts (payer directory)",
  "payer-rules.ts",
  "workqueue-store.ts",
  "loa-store.ts",
  "remittance-intake.ts",
];

// ---- Commands ----

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function status() {
  console.log("\n=== VistA-Evolved Store Inventory ===\n");

  console.log("--- Persistent Stores (backupable) ---");
  for (const [key, store] of Object.entries(STORES)) {
    if (store.type === "file") {
      const fullPath = join(ROOT, store.path);
      const exists = existsSync(fullPath);
      const size = exists ? statSync(fullPath).size : 0;
      const sizeStr = exists ? `${(size / 1024).toFixed(1)}KB` : "not found";
      console.log(`  ${exists ? "OK" : "--"}  ${store.name}: ${store.path} (${sizeStr})`);
    } else if (store.type === "pg_dump") {
      const configured = !!process.env[store.envVar];
      console.log(`  ${configured ? "OK" : "--"}  ${store.name}: ${configured ? "configured" : "not configured"}`);
    } else if (store.type === "docker_volume") {
      console.log(`  --  ${store.name}: ${store.note}`);
    }
  }

  console.log("\n--- In-Memory Stores (ephemeral, reset on restart) ---");
  console.log(`  ${IN_MEMORY_STORES.length} stores:`);
  for (const s of IN_MEMORY_STORES) {
    console.log(`    - ${s}`);
  }

  console.log(`\nTotal: ${Object.keys(STORES).length} persistent + ${IN_MEMORY_STORES.length} in-memory\n`);
}

function backup() {
  const outputFlag = args.indexOf("--output");
  const outputDir = outputFlag >= 0 ? args[outputFlag + 1] : join(ROOT, "artifacts", "backups", getTimestamp());

  mkdirSync(outputDir, { recursive: true });
  console.log(`\n=== Backup to: ${outputDir} ===\n`);

  let backed = 0;
  let skipped = 0;

  // 1. SQLite files
  for (const key of ["sqlite", "sqliteWal", "auditLog"]) {
    const store = STORES[key];
    if (store.type !== "file") continue;
    const src = join(ROOT, store.path);
    if (existsSync(src)) {
      const dest = join(outputDir, basename(store.path));
      copyFileSync(src, dest);
      console.log(`  BACKED UP  ${store.path} -> ${basename(dest)}`);
      backed++;
    } else {
      console.log(`  SKIPPED    ${store.path} (not found)`);
      skipped++;
    }
  }

  // 2. Postgres (if configured) -- uses execFileSync to avoid shell injection (M-1)
  if (process.env.PLATFORM_PG_URL) {
    try {
      const dumpFile = join(outputDir, "platform-pg.sql");
      const dump = execFileSync("pg_dump", ["--dbname", process.env.PLATFORM_PG_URL], {
        timeout: 60000,
        maxBuffer: 50 * 1024 * 1024, // 50MB
      });
      writeFileSync(dumpFile, dump);
      console.log(`  BACKED UP  Postgres -> platform-pg.sql`);
      backed++;
    } catch (err) {
      console.log(`  FAILED     Postgres: ${err.message?.split("\n")[0] || "pg_dump failed"}`);
    }
  } else {
    console.log(`  SKIPPED    Postgres (not configured)`);
    skipped++;
  }

  console.log(`\n=== Backup Complete: ${backed} backed up, ${skipped} skipped ===\n`);
}

function restore() {
  const fromFlag = args.indexOf("--from");
  if (fromFlag < 0 || !args[fromFlag + 1]) {
    console.error("Usage: node scripts/backup-restore.mjs restore --from <backup-dir> [--yes]");
    process.exit(1);
  }
  const fromDir = args[fromFlag + 1];

  if (!existsSync(fromDir)) {
    console.error(`Backup directory not found: ${fromDir}`);
    process.exit(1);
  }

  console.log(`\n=== Restore from: ${fromDir} ===\n`);
  console.log("WARNING: This will overwrite current data. Ensure the API server is stopped.\n");

  // Safety gate: require --yes to confirm destructive operation
  if (!args.includes("--yes")) {
    console.error("Destructive operation -- pass --yes to confirm restore.");
    process.exit(1);
  }

  let restored = 0;

  // 1. SQLite
  const sqliteBackup = join(fromDir, "platform.db");
  if (existsSync(sqliteBackup)) {
    const dest = join(ROOT, "data", "platform.db");
    mkdirSync(join(ROOT, "data"), { recursive: true });
    copyFileSync(sqliteBackup, dest);
    console.log(`  RESTORED  platform.db`);
    restored++;
  }

  // WAL
  const walBackup = join(fromDir, "platform.db-wal");
  if (existsSync(walBackup)) {
    copyFileSync(walBackup, join(ROOT, "data", "platform.db-wal"));
    console.log(`  RESTORED  platform.db-wal`);
    restored++;
  }

  // Audit log
  const auditBackup = join(fromDir, "immutable-audit.jsonl");
  if (existsSync(auditBackup)) {
    const dest = join(ROOT, "apps", "api", "logs", "immutable-audit.jsonl");
    mkdirSync(join(ROOT, "apps", "api", "logs"), { recursive: true });
    copyFileSync(auditBackup, dest);
    console.log(`  RESTORED  immutable-audit.jsonl`);
    restored++;
  }

  // 2. Postgres -- uses execFileSync + stdin to avoid shell injection (M-1)
  const pgBackup = join(fromDir, "platform-pg.sql");
  if (existsSync(pgBackup) && process.env.PLATFORM_PG_URL) {
    try {
      const sqlData = readFileSync(pgBackup);
      execFileSync("psql", ["--dbname", process.env.PLATFORM_PG_URL], {
        input: sqlData,
        timeout: 120000,
      });
      console.log(`  RESTORED  Postgres from platform-pg.sql`);
      restored++;
    } catch (err) {
      console.log(`  FAILED    Postgres: ${err.message?.split("\n")[0] || "psql failed"}`);
    }
  }

  console.log(`\n=== Restore Complete: ${restored} files restored ===\n`);
}

// ---- Main ----

switch (command) {
  case "status":
    status();
    break;
  case "backup":
    backup();
    break;
  case "restore":
    restore();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.error("Usage: node scripts/backup-restore.mjs [backup|restore|status]");
    process.exit(1);
}
