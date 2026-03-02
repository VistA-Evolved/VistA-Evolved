#!/usr/bin/env node
/**
 * Phase 480 -- Integration-Pending Budget Gate
 *
 * Counts "integration-pending" occurrences in apps/api/src/ and compares
 * against a committed baseline. FAILs if the count increases, which
 * prevents new integration-pending debt from creeping in without review.
 *
 * Usage:
 *   node scripts/qa-gates/integration-pending-budget.mjs
 *   node scripts/qa-gates/integration-pending-budget.mjs --update
 *   node scripts/qa-gates/integration-pending-budget.mjs --report
 *
 * Options:
 *   --update    Update the baseline file with current count (requires justification)
 *   --report    Print per-file breakdown without pass/fail judgment
 *   --tolerance N  Allow N more than baseline before failing (default: 0)
 *
 * Exit codes:
 *   0 — count <= baseline (+ tolerance)
 *   1 — count > baseline (+ tolerance)
 *   2 — baseline file missing (run with --update first)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const SRC_DIR = join(ROOT, "apps", "api", "src");
const BASELINE_PATH = join(ROOT, "docs", "qa", "integration-pending-baseline.json");
const BACKLOG_PATH = join(ROOT, "docs", "qa", "integration-pending-backlog.md");

/* ── CLI ──────────────────────────────────────────────────── */

const args = process.argv.slice(2);
function flag(name) { return args.includes(name); }
function opt(name, fallback) {
  const idx = args.indexOf(name);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}

const UPDATE_MODE = flag("--update");
const REPORT_MODE = flag("--report");
const TOLERANCE = Number(opt("--tolerance", "0"));

/* ── File Scanner ─────────────────────────────────────────── */

const PATTERN = /integration[._-]pending/gi;
const EXTENSIONS = new Set([".ts", ".tsx"]);

function walkDir(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      results.push(...walkDir(full));
    } else if (EXTENSIONS.has(entry.name.slice(entry.name.lastIndexOf(".")))) {
      results.push(full);
    }
  }
  return results;
}

function countOccurrences(filepath) {
  const content = readFileSync(filepath, "utf-8");
  const matches = content.match(PATTERN);
  return matches ? matches.length : 0;
}

function scanAll() {
  const files = walkDir(SRC_DIR);
  const results = [];
  let total = 0;

  for (const f of files) {
    const count = countOccurrences(f);
    if (count > 0) {
      const rel = relative(ROOT, f).replace(/\\/g, "/");
      results.push({ file: rel, count });
      total += count;
    }
  }

  results.sort((a, b) => b.count - a.count);
  return { total, files: results };
}

/* ── Baseline I/O ─────────────────────────────────────────── */

function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return null;
  const raw = readFileSync(BASELINE_PATH, "utf-8");
  // Strip BOM (BUG-064)
  const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return JSON.parse(clean);
}

function saveBaseline(scan) {
  const baseline = {
    _meta: {
      description: "Integration-pending budget baseline (Phase 480)",
      updatedAt: new Date().toISOString(),
      updatedBy: "integration-pending-budget.mjs --update",
    },
    total: scan.total,
    tolerance: 0,
    files: scan.files,
  };
  writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + "\n", "utf-8");
  return baseline;
}

/* ── Main ─────────────────────────────────────────────────── */

function main() {
  console.log("Integration-Pending Budget Gate (Phase 480)\n");

  const scan = scanAll();
  console.log(`Current count: ${scan.total} occurrences in ${scan.files.length} files\n`);

  // Report mode
  if (REPORT_MODE) {
    console.log("Per-file breakdown:");
    for (const { file, count } of scan.files) {
      console.log(`  ${String(count).padStart(4)}  ${file}`);
    }
    console.log(`\nTotal: ${scan.total}`);
    process.exit(0);
  }

  // Update mode
  if (UPDATE_MODE) {
    const baseline = saveBaseline(scan);
    console.log(`Baseline updated: ${BASELINE_PATH}`);
    console.log(`  Total: ${baseline.total}`);
    console.log(`  Files: ${scan.files.length}`);
    process.exit(0);
  }

  // Compare mode (default)
  const baseline = loadBaseline();
  if (!baseline) {
    console.error("No baseline found. Run with --update first:");
    console.error(`  node scripts/qa-gates/integration-pending-budget.mjs --update`);
    process.exit(2);
  }

  const limit = baseline.total + TOLERANCE;
  const delta = scan.total - baseline.total;

  console.log(`Baseline:  ${baseline.total} (from ${baseline._meta?.updatedAt || "unknown"})`);
  console.log(`Current:   ${scan.total}`);
  console.log(`Delta:     ${delta >= 0 ? "+" : ""}${delta}`);
  console.log(`Tolerance: ${TOLERANCE}`);
  console.log();

  if (scan.total <= limit) {
    if (delta < 0) {
      console.log(`PASS  Budget improved by ${Math.abs(delta)}! Consider running --update to lower the baseline.`);
    } else if (delta === 0) {
      console.log(`PASS  Budget unchanged.`);
    } else {
      console.log(`PASS  Budget within tolerance (+${delta} <= +${TOLERANCE}).`);
    }
    process.exit(0);
  } else {
    console.log(`FAIL  Budget exceeded by ${scan.total - limit}.`);
    console.log();

    // Show new files not in baseline
    const baselineFiles = new Set((baseline.files || []).map((f) => f.file));
    const newFiles = scan.files.filter((f) => !baselineFiles.has(f.file));
    const grownFiles = scan.files.filter((f) => {
      const baseEntry = (baseline.files || []).find((b) => b.file === f.file);
      return baseEntry && f.count > baseEntry.count;
    });

    if (newFiles.length > 0) {
      console.log("New files with integration-pending:");
      for (const { file, count } of newFiles) {
        console.log(`  +${count}  ${file}`);
      }
    }
    if (grownFiles.length > 0) {
      console.log("Files with increased counts:");
      for (const { file, count } of grownFiles) {
        const baseEntry = (baseline.files || []).find((b) => b.file === file);
        console.log(`  ${baseEntry.count} -> ${count}  ${file}`);
      }
    }

    console.log();
    console.log("To fix: resolve integration-pending items or update baseline with justification.");
    process.exit(1);
  }
}

main();
