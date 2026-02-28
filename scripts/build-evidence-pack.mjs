#!/usr/bin/env node
/**
 * Certification Evidence Pack Builder v2
 * Phase 291 -- Push-button evidence bundler
 *
 * Scans evidence/, docs/runbooks/, scripts/verify-*, tests/interop/,
 * and config/ to produce:
 *   1. artifacts/evidence-pack/manifest.json  -- full file inventory + SHA-256
 *   2. artifacts/evidence-pack/EVIDENCE_INDEX.md -- human-readable index
 *
 * Usage:
 *   node scripts/build-evidence-pack.mjs
 *   node scripts/build-evidence-pack.mjs --out ./artifacts/evidence-pack
 *   node scripts/build-evidence-pack.mjs --strict   # exit 1 on gaps
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, basename, dirname } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const args = process.argv.slice(2);

const outDir = args.includes("--out")
  ? args[args.indexOf("--out") + 1]
  : join(ROOT, "artifacts", "evidence-pack");

const strict = args.includes("--strict");

// ---- helpers ---------------------------------------------------------------

function sha256(filePath) {
  try {
    const buf = readFileSync(filePath);
    return createHash("sha256").update(buf).digest("hex").slice(0, 16);
  } catch {
    return "unreadable";
  }
}

function walkDir(dir, filter = () => true) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full, filter));
    } else if (filter(entry.name, full)) {
      results.push(full);
    }
  }
  return results;
}

function relPath(absPath) {
  return relative(ROOT, absPath).replace(/\\/g, "/");
}

// ---- scanners --------------------------------------------------------------

function scanEvidence() {
  const evidenceDir = join(ROOT, "evidence");
  const files = walkDir(evidenceDir);
  const byWave = {};
  for (const f of files) {
    const rel = relPath(f);
    const parts = rel.split("/");
    const wave = parts[1] || "unknown";
    const phase = parts[2] || "unknown";
    const key = `${wave}/${phase}`;
    if (!byWave[key]) byWave[key] = [];
    byWave[key].push({ path: rel, hash: sha256(f), size: statSync(f).size });
  }
  return { total: files.length, byWave };
}

function scanRunbooks() {
  const dir = join(ROOT, "docs", "runbooks");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith(".md"))
    .map(f => ({
      name: f,
      path: `docs/runbooks/${f}`,
      hash: sha256(join(dir, f)),
    }));
}

function scanVerifiers() {
  const dir = join(ROOT, "scripts");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.startsWith("verify-") && f.endsWith(".ps1"))
    .map(f => ({
      name: f,
      path: `scripts/${f}`,
      hash: sha256(join(dir, f)),
      phase: f.match(/phase(\d+[a-z]?)/i)?.[1] || null,
    }));
}

function scanInteropSuites() {
  const dir = join(ROOT, "tests", "interop");
  if (!existsSync(dir)) return [];
  return walkDir(dir, (name) => name.endsWith(".mjs") || name.endsWith(".ps1"))
    .map(f => ({
      path: relPath(f),
      hash: sha256(f),
    }));
}

function scanK6Tests() {
  const dir = join(ROOT, "tests", "k6");
  if (!existsSync(dir)) return [];
  return walkDir(dir, (name) => name.endsWith(".js") || name.endsWith(".ps1") || name.endsWith(".md"))
    .map(f => ({
      path: relPath(f),
      hash: sha256(f),
    }));
}

function scanPrompts() {
  const dir = join(ROOT, "prompts");
  if (!existsSync(dir)) return { folders: 0, files: 0 };
  const folders = readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  let fileCount = 0;
  for (const folder of folders) {
    const fdir = join(dir, folder);
    fileCount += readdirSync(fdir).filter(f => f.endsWith(".md")).length;
  }
  return { folders: folders.length, files: fileCount };
}

// ---- gap detection ---------------------------------------------------------

function detectGaps(verifiers, runbooks, evidence) {
  const gaps = [];

  // Verifiers without evidence
  for (const v of verifiers) {
    if (v.phase) {
      const hasEvidence = Object.keys(evidence.byWave).some(k =>
        k.includes(v.phase)
      );
      if (!hasEvidence) {
        gaps.push({
          type: "verifier_no_evidence",
          detail: `${v.name} (phase ${v.phase}) has no evidence captured`,
          severity: "warn",
        });
      }
    }
  }

  // Evidence directories without verifiers
  const verifierPhases = new Set(verifiers.map(v => v.phase).filter(Boolean));
  for (const key of Object.keys(evidence.byWave)) {
    const phaseNum = key.split("/").pop();
    if (phaseNum && /^\d+/.test(phaseNum) && !verifierPhases.has(phaseNum)) {
      // Not all evidence phases need verifiers (e.g. wave-8 narrative evidence)
    }
  }

  return gaps;
}

// ---- main ------------------------------------------------------------------

function main() {
  console.log("Certification Evidence Pack Builder v2");
  console.log("=".repeat(50));

  const evidence = scanEvidence();
  const runbooks = scanRunbooks();
  const verifiers = scanVerifiers();
  const interopSuites = scanInteropSuites();
  const k6Tests = scanK6Tests();
  const prompts = scanPrompts();
  const gaps = detectGaps(verifiers, runbooks, evidence);

  console.log(`  Evidence files:    ${evidence.total}`);
  console.log(`  Evidence groups:   ${Object.keys(evidence.byWave).length}`);
  console.log(`  Runbooks:          ${runbooks.length}`);
  console.log(`  Verifiers:         ${verifiers.length}`);
  console.log(`  Interop suites:    ${interopSuites.length}`);
  console.log(`  K6 tests:          ${k6Tests.length}`);
  console.log(`  Prompt folders:    ${prompts.folders}`);
  console.log(`  Prompt files:      ${prompts.files}`);
  console.log(`  Gaps detected:     ${gaps.length}`);

  // Build manifest
  const manifest = {
    generatedAt: new Date().toISOString(),
    summary: {
      evidenceFiles: evidence.total,
      evidenceGroups: Object.keys(evidence.byWave).length,
      runbooks: runbooks.length,
      verifiers: verifiers.length,
      interopSuites: interopSuites.length,
      k6Tests: k6Tests.length,
      promptFolders: prompts.folders,
      promptFiles: prompts.files,
      gaps: gaps.length,
    },
    evidence: evidence.byWave,
    runbooks,
    verifiers,
    interopSuites,
    k6Tests,
    gaps,
  };

  // Write manifest
  mkdirSync(outDir, { recursive: true });
  const manifestPath = join(outDir, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n  Manifest: ${relPath(manifestPath)}`);

  // Generate EVIDENCE_INDEX.md
  const lines = [];
  lines.push("# Certification Evidence Index");
  lines.push("");
  lines.push(`> Auto-generated by \`scripts/build-evidence-pack.mjs\` on ${new Date().toISOString()}`);
  lines.push("> Do NOT edit manually. Regenerate with: `node scripts/build-evidence-pack.mjs`");
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Evidence files | ${evidence.total} |`);
  lines.push(`| Evidence groups | ${Object.keys(evidence.byWave).length} |`);
  lines.push(`| Runbooks | ${runbooks.length} |`);
  lines.push(`| Verifiers | ${verifiers.length} |`);
  lines.push(`| Interop test suites | ${interopSuites.length} |`);
  lines.push(`| K6 load tests | ${k6Tests.length} |`);
  lines.push(`| Prompt folders | ${prompts.folders} |`);
  lines.push(`| Prompt files | ${prompts.files} |`);
  lines.push("");

  lines.push("## Evidence by Wave/Phase");
  lines.push("");
  const sortedKeys = Object.keys(evidence.byWave).sort();
  for (const key of sortedKeys) {
    const files = evidence.byWave[key];
    lines.push(`### ${key}`);
    lines.push("");
    lines.push("| File | SHA-256 (first 16) | Size |");
    lines.push("|------|--------------------|------|");
    for (const f of files) {
      lines.push(`| ${f.path} | \`${f.hash}\` | ${f.size} B |`);
    }
    lines.push("");
  }

  lines.push("## Verifiers");
  lines.push("");
  lines.push("| Script | Phase | SHA-256 (first 16) |");
  lines.push("|--------|-------|--------------------|");
  for (const v of verifiers) {
    lines.push(`| ${v.path} | ${v.phase || "-"} | \`${v.hash}\` |`);
  }
  lines.push("");

  lines.push("## Runbooks");
  lines.push("");
  lines.push("| Runbook | SHA-256 (first 16) |");
  lines.push("|---------|-------------------|");
  for (const r of runbooks) {
    lines.push(`| ${r.path} | \`${r.hash}\` |`);
  }
  lines.push("");

  if (gaps.length > 0) {
    lines.push("## Gaps");
    lines.push("");
    lines.push("| Type | Detail | Severity |");
    lines.push("|------|--------|----------|");
    for (const g of gaps) {
      lines.push(`| ${g.type} | ${g.detail} | ${g.severity} |`);
    }
    lines.push("");
  }

  const indexPath = join(outDir, "EVIDENCE_INDEX.md");
  writeFileSync(indexPath, lines.join("\n"));
  console.log(`  Index:    ${relPath(indexPath)}`);

  // Fail-loud in strict mode
  if (strict && gaps.length > 0) {
    console.error(`\n  STRICT MODE: ${gaps.length} gap(s) detected -- failing.`);
    process.exit(1);
  }

  console.log("\n  Evidence pack built successfully.");
  process.exit(0);
}

main();
