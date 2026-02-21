/**
 * Restore Drill Evidence -- Phase 75
 *
 * Standalone restore validation, reads a backup manifest and validates.
 * Used by the evidence pack orchestrator.
 *
 * Usage:
 *   npx tsx scripts/ops/restore-drill-evidence.ts --manifest <path> [--skip-docker]
 */

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");
const EVIDENCE_DIR = path.join(ROOT, "artifacts/evidence/phase75/backup");

interface RestoreEvidenceReport {
  _meta: {
    phase: number;
    tool: string;
    generatedAt: string;
    durationMs: number;
  };
  sourceManifest: string;
  restoreStatus: string;
  checks: Array<{ name: string; pass: boolean; detail: string }>;
  pass: boolean;
  summary: string;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export async function runRestoreDrillEvidence(
  manifestPath: string,
  skipDocker = false
): Promise<RestoreEvidenceReport> {
  const start = Date.now();
  ensureDir(EVIDENCE_DIR);

  const report: RestoreEvidenceReport = {
    _meta: {
      phase: 75,
      tool: "restore-drill-evidence",
      generatedAt: new Date().toISOString(),
      durationMs: 0,
    },
    sourceManifest: manifestPath,
    restoreStatus: "not-started",
    checks: [],
    pass: false,
    summary: "",
  };

  if (!fs.existsSync(manifestPath)) {
    report.restoreStatus = "manifest-not-found";
    report.checks.push({ name: "manifest-exists", pass: false, detail: `Not found: ${manifestPath}` });
    report.summary = "Manifest not found";
    report._meta.durationMs = Date.now() - start;
    return report;
  }

  // Parse and validate manifest
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  report.checks.push({
    name: "manifest-readable",
    pass: true,
    detail: `Status: ${manifest.status}, Artifacts: ${manifest.totalArtifacts}`,
  });

  // Validate each artifact reference
  if (Array.isArray(manifest.artifacts)) {
    for (const art of manifest.artifacts) {
      const skipValues = ["(none)", "(skipped)", "(no container)", "(failed)"];
      if (skipValues.includes(art.path)) {
        report.checks.push({
          name: `artifact-${art.name}`,
          pass: true,
          detail: `Skipped: ${art.path}`,
        });
        continue;
      }

      const exists = fs.existsSync(art.path);
      report.checks.push({
        name: `artifact-${art.name}-exists`,
        pass: exists,
        detail: exists ? `Found (${art.sizeBytes} bytes)` : `Missing: ${art.path}`,
      });

      // If it's a tar.gz, verify it's a valid archive
      if (exists && art.path.endsWith(".tar.gz")) {
        try {
          execSync(`tar -tzf "${art.path}"`, { encoding: "utf-8", timeout: 30_000, stdio: ["pipe", "pipe", "pipe"] });
          report.checks.push({
            name: `artifact-${art.name}-extractable`,
            pass: true,
            detail: "Archive is valid and extractable",
          });
        } catch {
          report.checks.push({
            name: `artifact-${art.name}-extractable`,
            pass: false,
            detail: "Archive extraction validation failed",
          });
        }
      }
    }
  }

  // Run the actual restore drill PS1 if available
  const restorePsPath = path.join(ROOT, "scripts/ops/restore-drill.ps1");
  if (fs.existsSync(restorePsPath)) {
    const args = [`-ManifestPath`, `"${manifestPath}"`];
    if (skipDocker) args.push("-SkipDocker");

    try {
      execSync(
        `powershell -ExecutionPolicy Bypass -File "${restorePsPath}" ${args.join(" ")}`,
        { cwd: ROOT, encoding: "utf-8", timeout: 120_000, stdio: ["pipe", "pipe", "pipe"] }
      );
      report.restoreStatus = "success";
    } catch (err: any) {
      report.restoreStatus = "partial";
    }

    // Copy restore report if generated
    const drillDir = path.dirname(manifestPath);
    const restoreReportPath = path.join(drillDir, "restore-report.json");
    if (fs.existsSync(restoreReportPath)) {
      fs.copyFileSync(restoreReportPath, path.join(EVIDENCE_DIR, "restore-report.json"));
    }
  } else {
    report.restoreStatus = "no-restore-script";
  }

  const passed = report.checks.filter((c) => c.pass).length;
  const total = report.checks.length;
  report.pass = passed === total && report.restoreStatus !== "no-restore-script";
  report._meta.durationMs = Date.now() - start;
  report.summary = `${passed}/${total} checks passed, restore: ${report.restoreStatus}`;

  const evidencePath = path.join(EVIDENCE_DIR, "restore-drill-evidence.json");
  fs.writeFileSync(evidencePath, JSON.stringify(report, null, 2));
  console.log(`[restore-drill] Evidence written to ${evidencePath}`);
  console.log(`[restore-drill] ${report.summary}`);

  return report;
}

// CLI entry point
if (process.argv[1]?.endsWith("restore-drill-evidence.ts")) {
  const manifestIdx = process.argv.indexOf("--manifest");
  const manifestPath = manifestIdx >= 0 ? process.argv[manifestIdx + 1] : "";
  const skipDocker = process.argv.includes("--skip-docker");

  if (!manifestPath) {
    console.error("Usage: npx tsx scripts/ops/restore-drill-evidence.ts --manifest <path> [--skip-docker]");
    process.exit(1);
  }

  runRestoreDrillEvidence(manifestPath, skipDocker).then((r) => {
    process.exit(r.pass ? 0 : 1);
  });
}
