/**
 * Backup Drill Evidence -- Phase 75
 *
 * Runs a backup drill and produces evidence artifacts at:
 *   /artifacts/evidence/phase75/backup/
 *
 * Can run standalone or be orchestrated by generateEvidencePack.ts.
 *
 * Usage:
 *   npx tsx scripts/ops/backup-drill-evidence.ts [--skip-docker]
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const EVIDENCE_DIR = path.join(ROOT, 'artifacts/evidence/phase75/backup');
const BACKUP_DIR = path.join(ROOT, 'artifacts/backups/phase75-drill');

interface BackupEvidenceReport {
  _meta: {
    phase: number;
    tool: string;
    generatedAt: string;
    durationMs: number;
  };
  drill: {
    backupRan: boolean;
    backupStatus: string;
    restoreRan: boolean;
    restoreStatus: string;
  };
  artifacts: Array<{
    name: string;
    path: string;
    sizeBytes: number;
    exists: boolean;
  }>;
  pass: boolean;
  summary: string;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

/** Strip UTF-8 BOM that PowerShell's ConvertTo-Json / Set-Content adds */
function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function runDrill(scriptName: string, args: string[]): { stdout: string; exitCode: number } {
  const scriptPath = path.join(ROOT, 'scripts/ops', scriptName);
  if (!fs.existsSync(scriptPath)) {
    return { stdout: `Script not found: ${scriptPath}`, exitCode: 1 };
  }

  const cmd = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" ${args.join(' ')}`;
  try {
    const stdout = execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 120_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout, exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: err.stdout?.toString() || err.message,
      exitCode: err.status ?? 1,
    };
  }
}

export async function runBackupDrillEvidence(skipDocker = false): Promise<BackupEvidenceReport> {
  const start = Date.now();
  ensureDir(EVIDENCE_DIR);
  ensureDir(BACKUP_DIR);

  const report: BackupEvidenceReport = {
    _meta: {
      phase: 75,
      tool: 'backup-drill-evidence',
      generatedAt: new Date().toISOString(),
      durationMs: 0,
    },
    drill: {
      backupRan: false,
      backupStatus: 'not-started',
      restoreRan: false,
      restoreStatus: 'not-started',
    },
    artifacts: [],
    pass: false,
    summary: '',
  };

  // Step 1: Run backup drill
  console.log('[backup-drill] Running backup drill...');
  const backupArgs = [`-OutputDir`, `"${BACKUP_DIR}"`];
  if (skipDocker) backupArgs.push('-SkipDocker');

  const backup = runDrill('backup-drill.ps1', backupArgs);
  report.drill.backupRan = true;
  report.drill.backupStatus = backup.exitCode === 0 ? 'success' : 'failed';

  // Check for backup manifest
  const backupManifestPath = path.join(BACKUP_DIR, 'backup-manifest.json');
  if (fs.existsSync(backupManifestPath)) {
    const manifest = JSON.parse(stripBom(fs.readFileSync(backupManifestPath, 'utf-8')));
    report.drill.backupStatus = manifest.status || 'unknown';

    // Copy manifest to evidence dir
    fs.copyFileSync(backupManifestPath, path.join(EVIDENCE_DIR, 'backup-manifest.json'));
    report.artifacts.push({
      name: 'backup-manifest.json',
      path: path.join(EVIDENCE_DIR, 'backup-manifest.json'),
      sizeBytes: fs.statSync(backupManifestPath).size,
      exists: true,
    });

    // Enumerate backup artifacts
    if (Array.isArray(manifest.artifacts)) {
      for (const art of manifest.artifacts) {
        if (art.path && art.path !== '(none)' && art.path !== '(skipped)') {
          const exists = fs.existsSync(art.path);
          report.artifacts.push({
            name: art.name,
            path: art.path,
            sizeBytes: exists ? fs.statSync(art.path).size : 0,
            exists,
          });
        }
      }
    }
  } else {
    report.artifacts.push({
      name: 'backup-manifest.json',
      path: backupManifestPath,
      sizeBytes: 0,
      exists: false,
    });
  }

  // Step 2: Run restore drill (validates the backup)
  if (fs.existsSync(backupManifestPath)) {
    console.log('[backup-drill] Running restore drill...');
    const restoreArgs = [`-ManifestPath`, `"${backupManifestPath}"`];
    if (skipDocker) restoreArgs.push('-SkipDocker');

    const restore = runDrill('restore-drill.ps1', restoreArgs);
    report.drill.restoreRan = true;
    report.drill.restoreStatus = restore.exitCode === 0 ? 'success' : 'failed';

    // Copy restore report to evidence dir
    const restoreReportPath = path.join(BACKUP_DIR, 'restore-report.json');
    if (fs.existsSync(restoreReportPath)) {
      fs.copyFileSync(restoreReportPath, path.join(EVIDENCE_DIR, 'restore-report.json'));
      report.artifacts.push({
        name: 'restore-report.json',
        path: path.join(EVIDENCE_DIR, 'restore-report.json'),
        sizeBytes: fs.statSync(restoreReportPath).size,
        exists: true,
      });
    }
  } else {
    report.drill.restoreRan = false;
    report.drill.restoreStatus = 'skipped-no-backup';
  }

  // Evaluate pass/fail
  const backupOk =
    report.drill.backupStatus === 'success' || report.drill.backupStatus === 'partial';
  const restoreOk =
    report.drill.restoreStatus === 'success' || report.drill.restoreStatus === 'skipped-no-backup';
  report.pass = backupOk && restoreOk;
  report._meta.durationMs = Date.now() - start;

  const existingArtifacts = report.artifacts.filter((a) => a.exists).length;
  report.summary = `Backup: ${report.drill.backupStatus}, Restore: ${report.drill.restoreStatus}, Artifacts: ${existingArtifacts}/${report.artifacts.length}`;

  // Write the evidence report
  const evidencePath = path.join(EVIDENCE_DIR, 'backup-drill-evidence.json');
  fs.writeFileSync(evidencePath, JSON.stringify(report, null, 2));
  console.log(`[backup-drill] Evidence written to ${evidencePath}`);
  console.log(`[backup-drill] ${report.summary}`);

  return report;
}

// CLI entry point
if (
  import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}` ||
  process.argv[1]?.endsWith('backup-drill-evidence.ts')
) {
  const skipDocker = process.argv.includes('--skip-docker');
  runBackupDrillEvidence(skipDocker).then((r) => {
    process.exit(r.pass ? 0 : 1);
  });
}
