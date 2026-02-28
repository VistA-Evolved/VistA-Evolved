#!/usr/bin/env node
/**
 * Phase 53 -- PromptOS Audit Tool
 *
 * Validates the /prompts directory structure:
 *   1. Phase folders are contiguous and unique (no gaps, no duplicates)
 *   2. Each phase folder contains XX-01-IMPLEMENT.md and XX-99-VERIFY.md
 *   3. The first H1 header inside each prompt matches filename and phase number
 *   4. No duplicate phase numbers across folders
 *
 * Outputs artifacts to /artifacts/promptos/ (NEVER to docs/ or reports/)
 *
 * Usage:
 *   npx tsx scripts/promptos/auditPrompts.ts
 *
 * Exit codes:
 *   0 = all checks pass
 *   1 = hard failures found
 */

import { readdirSync, statSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const PROMPTS_DIR = join(ROOT, "prompts");
const ARTIFACTS_DIR = join(ROOT, "artifacts", "promptos");

interface AuditResult {
  rule: string;
  status: "pass" | "fail" | "warn";
  details: string;
  folder?: string;
}

const results: AuditResult[] = [];

function pass(rule: string, details: string, folder?: string) {
  results.push({ rule, status: "pass", details, folder });
}
function fail(rule: string, details: string, folder?: string) {
  results.push({ rule, status: "fail", details, folder });
}
function warn(rule: string, details: string, folder?: string) {
  results.push({ rule, status: "warn", details, folder });
}

// ── Collect folders ──────────────────────────────────────────────

if (!existsSync(PROMPTS_DIR)) {
  fail("dir-exists", "prompts/ directory not found");
  emitAndExit();
}

const allEntries = readdirSync(PROMPTS_DIR)
  .filter((e) => statSync(join(PROMPTS_DIR, e)).isDirectory())
  .sort();

const META_RE = /^00-/;
const PHASE_RE = /^(\d{1,3})-PHASE-(\d+[A-Z]?)-(.+)$/;

const metaFolders = allEntries.filter((e) => META_RE.test(e));
const phaseFolders = allEntries.filter((e) => !META_RE.test(e) && /^\d{1,3}-/.test(e));

// ── Rule 1: Unique folder prefixes ──────────────────────────────

const prefixMap = new Map<string, string[]>();
for (const f of phaseFolders) {
  const m = f.match(/^(\d{1,3})-/);
  if (m) {
    const p = m[1];
    if (!prefixMap.has(p)) prefixMap.set(p, []);
    prefixMap.get(p)!.push(f);
  }
}
const dupes = [...prefixMap.entries()].filter(([_, v]) => v.length > 1);
if (dupes.length === 0) {
  pass("unique-prefixes", `All ${prefixMap.size} folder prefixes are unique`);
} else {
  for (const [p, folders] of dupes) {
    fail("unique-prefixes", `Duplicate prefix ${p}: ${folders.join(", ")}`);
  }
}

// ── Rule 2: Contiguous prefix sequence ──────────────────────────

const sortedPrefixes = [...prefixMap.keys()].map(Number).sort((a, b) => a - b);
const gaps: number[] = [];
for (let i = 1; i < sortedPrefixes.length; i++) {
  const expected = sortedPrefixes[i - 1] + 1;
  if (sortedPrefixes[i] !== expected && sortedPrefixes[i - 1] >= 1) {
    for (let g = expected; g < sortedPrefixes[i]; g++) {
      gaps.push(g);
    }
  }
}
if (gaps.length === 0) {
  pass("contiguous", `Prefix sequence is contiguous (${sortedPrefixes[0]}..${sortedPrefixes[sortedPrefixes.length - 1]})`);
} else {
  warn("contiguous", `Gaps in prefix sequence: ${gaps.join(", ")}`);
}

// ── Rule 3: IMPLEMENT + VERIFY files per phase ─────────────────

for (const folder of phaseFolders) {
  const m = folder.match(/^(\d{1,3})-/);
  if (!m) continue;
  const prefix = m[1];
  const folderPath = join(PROMPTS_DIR, folder);
  const files = readdirSync(folderPath).filter((f) => f.endsWith(".md"));

  // Check for IMPLEMENT file (prefix-01-IMPLEMENT or phase-num-01-IMPLEMENT)
  const implementFile = files.find((f) => f.includes("IMPLEMENT"));
  // Also accept prompt.md as a legacy single-file pattern
  const hasPrompt = files.some((f) => f === "prompt.md");

  if (implementFile) {
    pass("has-implement", `Found ${implementFile}`, folder);
  } else if (hasPrompt) {
    warn("has-implement", `Has prompt.md but no ${prefix}-01-IMPLEMENT.md (legacy pattern)`, folder);
  } else {
    // Check for sub-phase pattern (01=implement, 02=verify, 03=implement, ...)
    const hasAnyImplement = files.some((f) => /^\d{2}-\d{2}-(IMPLEMENT|implement)/.test(f));
    if (hasAnyImplement) {
      pass("has-implement", `Has sub-phase IMPLEMENT file(s)`, folder);
    } else if (files.length > 0) {
      // Has .md files but no standard IMPLEMENT naming -- legacy pattern
      warn("has-implement", `Has ${files.length} .md file(s) but no standard IMPLEMENT naming (legacy)`, folder);
    } else {
      fail("has-implement", `Missing ${prefix}-01-IMPLEMENT.md`, folder);
    }
  }

  // Check for VERIFY file (prefix-99-VERIFY or phase-num-99-VERIFY)
  const verifyFile = files.find((f) => f.includes("VERIFY"));
  if (verifyFile) {
    pass("has-verify", `Found ${verifyFile}`, folder);
  } else {
    // Check for sub-phase verify pattern
    const hasAnyVerify = files.some((f) => /^\d{2}-\d{2}-(VERIFY|verify)/.test(f));
    if (hasAnyVerify) {
      pass("has-verify", `Has sub-phase VERIFY file(s)`, folder);
    } else {
      warn("has-verify", `Missing ${prefix}-99-VERIFY.md`, folder);
    }
  }
}

// ── Rule 4: Header matches filename ─────────────────────────────

for (const folder of phaseFolders) {
  const folderPath = join(PROMPTS_DIR, folder);
  const files = readdirSync(folderPath).filter((f) => f.endsWith(".md") && f !== "prompt.md");

  for (const file of files) {
    const filePath = join(folderPath, file);
    const content = readFileSync(filePath, "utf-8");
    const firstHeader = content.match(/^#\s+(.+)/m);
    if (!firstHeader) {
      warn("header-match", `No H1 header found in ${file}`, folder);
      continue;
    }

    const header = firstHeader[1].trim();
    // Extract phase number from folder and file
    const folderPhaseMatch = folder.match(PHASE_RE);
    if (folderPhaseMatch) {
      const phaseNum = folderPhaseMatch[2];
      // Header should contain the phase number
      if (!header.includes(`Phase ${phaseNum}`) && !header.includes(`phase ${phaseNum}`) && !header.toLowerCase().includes(`phase ${phaseNum.toLowerCase()}`)) {
        warn("header-match", `Header "${header}" doesn't mention Phase ${phaseNum}`, folder);
      }
    }
  }
}

// ── Emit results ─────────────────────────────────────────────────

function emitAndExit() {
  const passCount = results.filter((r) => r.status === "pass").length;
  const failCount = results.filter((r) => r.status === "fail").length;
  const warnCount = results.filter((r) => r.status === "warn").length;

  // Console output
  console.log("\n=== PromptOS Audit (Phase 53) ===\n");
  for (const r of results) {
    const icon = r.status === "pass" ? "PASS" : r.status === "fail" ? "FAIL" : "WARN";
    const loc = r.folder ? ` [${r.folder}]` : "";
    console.log(`  [${icon}] ${r.rule}${loc}: ${r.details}`);
  }
  console.log(`\nTotal: ${passCount} pass, ${failCount} fail, ${warnCount} warn`);

  // Artifact outputs (NEVER to docs/)
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  writeFileSync(
    join(ARTIFACTS_DIR, "prompts-audit.json"),
    JSON.stringify(
      {
        gate: "promptos-audit",
        timestamp: new Date().toISOString(),
        results,
        summary: { passCount, failCount, warnCount, totalFolders: phaseFolders.length },
      },
      null,
      2,
    ),
  );

  const txt = results
    .map((r) => {
      const icon = r.status === "pass" ? "PASS" : r.status === "fail" ? "FAIL" : "WARN";
      const loc = r.folder ? ` [${r.folder}]` : "";
      return `[${icon}] ${r.rule}${loc}: ${r.details}`;
    })
    .join("\n");
  writeFileSync(join(ARTIFACTS_DIR, "prompts-audit.txt"), `PromptOS Audit -- ${new Date().toISOString()}\n\n${txt}\n\nTotal: ${passCount} pass, ${failCount} fail, ${warnCount} warn\n`);

  process.exit(failCount > 0 ? 1 : 0);
}

emitAndExit();
