#!/usr/bin/env node
/**
 * scripts/dr/backup.mjs -- Phase 134: Disaster Recovery
 *
 * Automated PostgreSQL backup with checksum verification and manifest.
 *
 * Usage:
 *   node scripts/dr/backup.mjs                          # Backup to ./backups/<timestamp>/
 *   node scripts/dr/backup.mjs --output ./my-dir        # Custom output directory
 *   node scripts/dr/backup.mjs --pg-url <url>           # Override PG URL
 *
 * Output:
 *   <dir>/platform-pg.sql        -- pg_dump plain-text output
 *   <dir>/manifest.json          -- backup metadata + SHA-256 checksums
 *
 * PITR posture:
 *   This script creates logical (pg_dump) backups. For WAL-based PITR, ensure
 *   archive_mode=on and wal_level=replica in postgresql.conf. See the runbook
 *   at docs/runbooks/disaster-recovery.md for production PITR configuration.
 *
 * Security:
 *   - No PHI in manifest (only table names + row counts, no row data)
 *   - Uses execFileSync (no shell injection)
 *   - Backup files are gitignored (/backups/)
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

// ---- Argument parsing ----

const args = process.argv.slice(2);

function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
}

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

// ---- Configuration ----

const pgUrl = getArg('pg-url') || process.env.PLATFORM_PG_URL;
const outputDir = getArg('output') || join(ROOT, 'backups', getTimestamp());

if (!pgUrl) {
  console.error('ERROR: No PostgreSQL URL configured.');
  console.error('Set PLATFORM_PG_URL env var or pass --pg-url <url>');
  process.exit(1);
}

// ---- Tool detection ----

function hasBinary(name) {
  try {
    execFileSync(process.platform === 'win32' ? 'where' : 'which', [name], {
      stdio: 'pipe',
      timeout: 5_000,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * If pg_dump is not installed locally, try to use it from the Docker container.
 * Returns { mode: 'local' | 'docker', containerName?: string }.
 */
function resolvePgDumpMode() {
  if (hasBinary('pg_dump')) return { mode: 'local' };

  // Check if the platform-db container is running
  try {
    const containers = execFileSync('docker', ['ps', '--format', '{{.Names}}'], {
      encoding: 'utf-8',
      timeout: 5_000,
    })
      .trim()
      .split('\n');

    for (const name of containers) {
      if (name.includes('platform-db') || name.includes('postgres')) {
        return { mode: 'docker', containerName: name.trim() };
      }
    }
  } catch {
    /* Docker not available */
  }

  return { mode: 'none' };
}

// ---- SHA-256 helper ----

function sha256(filePath) {
  const data = readFileSync(filePath);
  return createHash('sha256').update(data).digest('hex');
}

// ---- WAL / PITR posture check ----

function checkWalPosture() {
  try {
    const sql =
      "SELECT name || '=' || setting FROM pg_settings WHERE name IN ('wal_level','archive_mode','archive_command') ORDER BY name;";
    let result;

    if (pgMode.mode === 'local') {
      result = execFileSync('psql', ['--dbname', pgUrl, '--tuples-only', '--no-align', '-c', sql], {
        timeout: 10_000,
        encoding: 'utf-8',
      }).trim();
    } else if (pgMode.mode === 'docker') {
      const urlObj = new URL(pgUrl);
      result = execFileSync(
        'docker',
        [
          'exec',
          pgMode.containerName,
          'psql',
          '--dbname',
          urlObj.pathname.slice(1),
          '--username',
          urlObj.username,
          '--tuples-only',
          '--no-align',
          '-c',
          sql,
        ],
        { timeout: 10_000, encoding: 'utf-8' }
      ).trim();
    } else {
      return {
        wal_level: 'unknown',
        archive_mode: 'unknown',
        archive_command: '(unset)',
        pitrReady: false,
      };
    }

    const settings = {};
    for (const line of result.split('\n').filter(Boolean)) {
      const [k, v] = line.split('=', 2);
      settings[k] = v;
    }

    return {
      wal_level: settings.wal_level || 'unknown',
      archive_mode: settings.archive_mode || 'unknown',
      archive_command: settings.archive_command || '(unset)',
      pitrReady: settings.wal_level === 'replica' && settings.archive_mode === 'on',
    };
  } catch {
    return {
      wal_level: 'unknown',
      archive_mode: 'unknown',
      archive_command: '(unset)',
      pitrReady: false,
    };
  }
}

// ---- Table inventory (no row data, just counts) ----

function getTableInventory() {
  try {
    const sql = `SELECT relname || ':' || n_live_tup FROM pg_stat_user_tables WHERE schemaname = 'public' ORDER BY relname;`;
    let result;

    if (pgMode.mode === 'local') {
      result = execFileSync('psql', ['--dbname', pgUrl, '--tuples-only', '--no-align', '-c', sql], {
        timeout: 10_000,
        encoding: 'utf-8',
      }).trim();
    } else if (pgMode.mode === 'docker') {
      const urlObj = new URL(pgUrl);
      result = execFileSync(
        'docker',
        [
          'exec',
          pgMode.containerName,
          'psql',
          '--dbname',
          urlObj.pathname.slice(1),
          '--username',
          urlObj.username,
          '--tuples-only',
          '--no-align',
          '-c',
          sql,
        ],
        { timeout: 10_000, encoding: 'utf-8' }
      ).trim();
    } else {
      return {};
    }

    const tables = {};
    for (const line of result.split('\n').filter(Boolean)) {
      const [name, count] = line.split(':', 2);
      tables[name] = parseInt(count, 10) || 0;
    }
    return tables;
  } catch {
    return {};
  }
}

// ---- Main backup flow ----

console.log(`\n=== DR Backup: Phase 134 ===`);
console.log(`  Target: ${outputDir}\n`);

mkdirSync(outputDir, { recursive: true });

// 1. pg_dump (logical backup)
const dumpFile = join(outputDir, 'platform-pg.sql');
console.log('  [1/3] Running pg_dump...');

const pgMode = resolvePgDumpMode();

try {
  let dump;

  if (pgMode.mode === 'local') {
    // Local pg_dump binary
    dump = execFileSync(
      'pg_dump',
      [
        '--dbname',
        pgUrl,
        '--format',
        'plain',
        '--no-owner',
        '--no-privileges',
        '--clean',
        '--if-exists',
      ],
      {
        timeout: 120_000,
        maxBuffer: 100 * 1024 * 1024,
      }
    );
  } else if (pgMode.mode === 'docker') {
    // Parse connection details from pgUrl for Docker internal connection
    const urlObj = new URL(pgUrl);
    const dbName = urlObj.pathname.slice(1);
    const user = urlObj.username;

    console.log(`         Using Docker container: ${pgMode.containerName}`);
    dump = execFileSync(
      'docker',
      [
        'exec',
        pgMode.containerName,
        'pg_dump',
        '--dbname',
        dbName,
        '--username',
        user,
        '--format',
        'plain',
        '--no-owner',
        '--no-privileges',
        '--clean',
        '--if-exists',
      ],
      {
        timeout: 120_000,
        maxBuffer: 100 * 1024 * 1024,
      }
    );
  } else {
    console.error('  FATAL: pg_dump not found locally or in Docker.');
    console.error('         Install PostgreSQL client tools or ensure Docker is running.');
    process.exit(2);
  }

  writeFileSync(dumpFile, dump);
  const dumpSize = statSync(dumpFile).size;
  if (dumpSize === 0) {
    console.error('  FATAL: pg_dump produced an empty file. Check PG connectivity.');
    process.exit(2);
  }
  const sizeMB = (dumpSize / 1024 / 1024).toFixed(2);
  console.log(`         pg_dump complete: ${sizeMB} MB`);
} catch (err) {
  console.error(`  FATAL: pg_dump failed: ${err.message?.split('\n')[0]}`);
  process.exit(2);
}

// 2. WAL posture check
console.log('  [2/3] Checking WAL/PITR posture...');
const walPosture = checkWalPosture();
console.log(`         wal_level=${walPosture.wal_level}, archive_mode=${walPosture.archive_mode}`);
if (!walPosture.pitrReady) {
  console.log('         NOTE: PITR not fully configured (archive_mode != on). See runbook.');
}

// 3. Generate manifest
console.log('  [3/3] Writing manifest...');
const tableInventory = getTableInventory();

const manifest = {
  version: 1,
  createdAt: new Date().toISOString(),
  backupType: 'pg_dump_logical',
  pgUrl: pgUrl.replace(/\/\/[^@]+@/, '//***@').replace(/[?&]password=[^&]*/gi, ''), // redact credentials
  files: [
    {
      name: 'platform-pg.sql',
      sizeBytes: statSync(dumpFile).size,
      sha256: sha256(dumpFile),
    },
  ],
  tableInventory,
  tableCount: Object.keys(tableInventory).length,
  totalRows: Object.values(tableInventory).reduce((a, b) => a + b, 0),
  walPosture,
  pitrReady: walPosture.pitrReady,
};

writeFileSync(join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log(`\n=== Backup Complete ===`);
console.log(`  Tables: ${manifest.tableCount}`);
console.log(`  Rows: ${manifest.totalRows}`);
console.log(`  PITR ready: ${manifest.pitrReady}`);
console.log(`  Manifest: ${join(outputDir, 'manifest.json')}`);
console.log(`  Dump: ${dumpFile}\n`);
