#!/usr/bin/env node
/**
 * scripts/upstream/snapshot-licenses.mjs
 *
 * Phase 448 (W29-P2). Reads vendor/worldvista/LOCK.json and produces
 * a license inventory with content hashes for change detection.
 *
 * Output: evidence/wave-29/448-upstream-mirror/licenses.json
 *
 * Usage:
 *   node scripts/upstream/snapshot-licenses.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

const ROOT = process.cwd();
const LOCK_FILE = join(ROOT, "vendor", "worldvista", "LOCK.json");
const EVIDENCE_DIR = join(ROOT, "evidence", "wave-29", "448-upstream-mirror");
const OUTPUT_FILE = join(EVIDENCE_DIR, "licenses.json");

// ── Read LOCK.json ──────────────────────────────────────────────────

if (!existsSync(LOCK_FILE)) {
  console.error("ERROR: vendor/worldvista/LOCK.json not found. Run worldvista-sync.ps1 first.");
  process.exit(1);
}

const raw = readFileSync(LOCK_FILE, "utf-8");
const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
const lock = JSON.parse(clean);
const repos = lock.repos || [];

console.log(`\n=== License Snapshot ===`);
console.log(`Lock file: ${LOCK_FILE}`);
console.log(`Repos: ${repos.length}`);

// ── Process each repo ──────────────────────────────────────────────

const licenses = [];

for (const entry of repos) {
  const repoName = entry.repo.split("/").pop();
  const repoDir = join(ROOT, "vendor", "worldvista", repoName);
  const licensePath = entry.licensePath
    ? join(repoDir, entry.licensePath)
    : null;

  const result = {
    repo: entry.repo,
    sha: entry.sha,
    fetchedAt: entry.fetchedAt,
    description: entry.description,
    licenseFile: entry.licensePath || null,
    licenseType: "unknown",
    licenseTextHash: null,
    notices: [],
  };

  if (licensePath && existsSync(licensePath)) {
    const licText = readFileSync(licensePath, "utf-8");
    result.licenseTextHash = createHash("sha256").update(licText).digest("hex").slice(0, 32);

    // Simple license type detection
    if (/Apache License.*2\.0/i.test(licText)) {
      result.licenseType = "Apache-2.0";
    } else if (/MIT License/i.test(licText)) {
      result.licenseType = "MIT";
    } else if (/BSD/i.test(licText)) {
      result.licenseType = "BSD";
    } else if (/GNU GENERAL PUBLIC LICENSE.*Version 2/i.test(licText)) {
      result.licenseType = "GPL-2.0";
      result.notices.push("CAUTION: GPL-2.0 -- review license policy");
    } else if (/GNU LESSER GENERAL/i.test(licText)) {
      result.licenseType = "LGPL";
    } else if (/PUBLIC DOMAIN/i.test(licText)) {
      result.licenseType = "Public-Domain";
    }
  } else {
    result.notices.push("No license file found in repository");
  }

  console.log(`  ${entry.repo}: ${result.licenseType} (hash: ${result.licenseTextHash || "N/A"})`);
  licenses.push(result);
}

// ── Write output ────────────────────────────────────────────────────

if (!existsSync(EVIDENCE_DIR)) {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const output = {
  generatedAt: new Date().toISOString(),
  generatedBy: "snapshot-licenses.mjs",
  lockFileHash: createHash("sha256").update(clean).digest("hex").slice(0, 32),
  licenses,
  summary: {
    total: licenses.length,
    withLicense: licenses.filter((l) => l.licenseTextHash).length,
    withoutLicense: licenses.filter((l) => !l.licenseTextHash).length,
    cautions: licenses.filter((l) => l.notices.length > 0).length,
  },
};

writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
console.log(`\nLicense snapshot written: ${OUTPUT_FILE}`);
console.log(`Summary: ${output.summary.withLicense} with license, ${output.summary.withoutLicense} without, ${output.summary.cautions} cautions`);
