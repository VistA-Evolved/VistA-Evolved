#!/usr/bin/env node
/**
 * Phase 274 — Prompt Canonical Audit
 *
 * Audits the prompts/ directory for structural issues:
 * 1. Duplicate folder numeric prefixes
 * 2. Duplicate phase numbers
 * 3. Missing implement/verify files per phase folder
 * 4. Flat files in prompts/ root that aren't meta (00-*) or README
 * 5. Folder naming pattern validation
 *
 * Output:
 *   artifacts/prompts-canonical-audit.json  (machine-readable)
 *   docs/audits/prompts-canonical-audit.md  (human-readable)
 *
 * Usage:
 *   node scripts/qa/prompts-canonical-audit.mjs
 */

import { readdirSync, statSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const ROOT = process.cwd();
const PROMPTS_DIR = join(ROOT, 'prompts');

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Parse a folder name like "99B-PHASE-95-STUFF" → { prefix: "99B", phase: "95", desc: "STUFF" } */
function parseFolder(name) {
  // Match: PREFIX-PHASE-NUMBER-DESCRIPTION or PREFIX-META-NAME
  const phaseMatch = name.match(/^(\d+[A-Z]?)-PHASE-(\d+[A-Z]?)-(.+)$/);
  if (phaseMatch) {
    return { prefix: phaseMatch[1], phase: phaseMatch[2], desc: phaseMatch[3], kind: 'phase' };
  }
  const numberedMatch = name.match(/^(\d+[A-Z]?)-(.+)$/);
  if (numberedMatch) {
    return { prefix: numberedMatch[1], desc: numberedMatch[2], kind: 'meta' };
  }
  return { kind: 'unknown', raw: name };
}

/* ------------------------------------------------------------------ */
/* Collect data                                                        */
/* ------------------------------------------------------------------ */

if (!existsSync(PROMPTS_DIR)) {
  console.error('prompts/ not found');
  process.exit(1);
}

const allEntries = readdirSync(PROMPTS_DIR);
const dirs = allEntries.filter((e) => statSync(join(PROMPTS_DIR, e)).isDirectory()).sort();
const flatFiles = allEntries.filter((e) => statSync(join(PROMPTS_DIR, e)).isFile());

/* ------------------------------------------------------------------ */
/* 1: Duplicate prefix detection                                       */
/* ------------------------------------------------------------------ */

const prefixMap = new Map();
for (const d of dirs) {
  const parsed = parseFolder(d);
  if (parsed.prefix && parsed.prefix !== '00') {
    if (!prefixMap.has(parsed.prefix)) prefixMap.set(parsed.prefix, []);
    prefixMap.get(parsed.prefix).push(d);
  }
}

const duplicatePrefixes = [];
for (const [prefix, folders] of prefixMap) {
  if (folders.length > 1) {
    duplicatePrefixes.push({ prefix, folders });
  }
}

/* ------------------------------------------------------------------ */
/* 2: Duplicate phase number detection                                 */
/* ------------------------------------------------------------------ */

const phaseMap = new Map();
for (const d of dirs) {
  const parsed = parseFolder(d);
  if (parsed.phase) {
    if (!phaseMap.has(parsed.phase)) phaseMap.set(parsed.phase, []);
    phaseMap.get(parsed.phase).push(d);
  }
}

const duplicatePhases = [];
for (const [phase, folders] of phaseMap) {
  if (folders.length > 1) {
    duplicatePhases.push({ phase, folders });
  }
}

/* ------------------------------------------------------------------ */
/* 3: Missing implement/verify files                                   */
/* ------------------------------------------------------------------ */

const missingFiles = [];
for (const d of dirs) {
  const parsed = parseFolder(d);
  if (parsed.kind !== 'phase') continue;

  const folderPath = join(PROMPTS_DIR, d);
  const files = readdirSync(folderPath);
  const hasImplement = files.some((f) => /-01-IMPLEMENT\.md$/i.test(f));
  const hasVerify = files.some((f) => /-99-VERIFY\.md$/i.test(f));

  if (!hasImplement || !hasVerify) {
    missingFiles.push({
      folder: d,
      missingImplement: !hasImplement,
      missingVerify: !hasVerify,
    });
  }
}

/* ------------------------------------------------------------------ */
/* 4: Flat file audit                                                  */
/* ------------------------------------------------------------------ */

const metaFiles = [];
const unexpectedFiles = [];
for (const f of flatFiles) {
  if (/^00-/.test(f) || f === 'README.md') {
    metaFiles.push(f);
  } else {
    unexpectedFiles.push(f);
  }
}

/* ------------------------------------------------------------------ */
/* 5: Naming pattern violations                                        */
/* ------------------------------------------------------------------ */

const badNames = [];
for (const d of dirs) {
  if (/^00-/.test(d)) continue; // Meta folders OK
  const parsed = parseFolder(d);
  if (parsed.kind === 'unknown') {
    badNames.push(d);
  }
}

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

const audit = {
  generatedAt: new Date().toISOString(),
  totalFolders: dirs.length,
  totalPhaseFolders: dirs.filter((d) => parseFolder(d).kind === 'phase').length,
  totalMetaFolders: dirs.filter((d) => /^00-/.test(d)).length,
  duplicatePrefixes,
  duplicatePhases,
  missingFiles,
  flatFiles: { meta: metaFiles, unexpected: unexpectedFiles },
  badNames,
  healthy: duplicatePrefixes.length === 0 && badNames.length === 0,
};

/* ------------------------------------------------------------------ */
/* Write outputs                                                       */
/* ------------------------------------------------------------------ */

// JSON artifact
const artifactDir = join(ROOT, 'artifacts');
mkdirSync(artifactDir, { recursive: true });
writeFileSync(join(artifactDir, 'prompts-canonical-audit.json'), JSON.stringify(audit, null, 2));

// Markdown report
const docsDir = join(ROOT, 'docs', 'audits');
mkdirSync(docsDir, { recursive: true });

let md = `# Prompt Canonical Audit\n\n`;
md += `Generated: ${audit.generatedAt}\n\n`;
md += `| Metric | Value |\n|--------|-------|\n`;
md += `| Total folders | ${audit.totalFolders} |\n`;
md += `| Phase folders | ${audit.totalPhaseFolders} |\n`;
md += `| Meta folders | ${audit.totalMetaFolders} |\n`;
md += `| Duplicate prefixes | ${audit.duplicatePrefixes.length} |\n`;
md += `| Duplicate phases | ${audit.duplicatePhases.length} |\n`;
md += `| Missing implement/verify | ${audit.missingFiles.length} |\n`;
md += `| Bad naming | ${audit.badNames.length} |\n`;
md += `| Healthy | ${audit.healthy ? 'YES' : 'NO'} |\n\n`;

if (audit.duplicatePrefixes.length > 0) {
  md += `## Duplicate Prefixes\n\n`;
  for (const d of audit.duplicatePrefixes) {
    md += `- **${d.prefix}**: ${d.folders.join(', ')}\n`;
  }
  md += `\n`;
}

if (audit.duplicatePhases.length > 0) {
  md += `## Duplicate Phase Numbers\n\n`;
  for (const d of audit.duplicatePhases) {
    md += `- **Phase ${d.phase}**: ${d.folders.join(', ')}\n`;
  }
  md += `\n`;
}

if (audit.missingFiles.length > 0) {
  md += `## Missing Implement/Verify Files\n\n`;
  md += `| Folder | Missing Implement | Missing Verify |\n|--------|-------------------|----------------|\n`;
  for (const m of audit.missingFiles) {
    md += `| ${m.folder} | ${m.missingImplement ? 'YES' : 'no'} | ${m.missingVerify ? 'YES' : 'no'} |\n`;
  }
  md += `\n`;
}

if (audit.badNames.length > 0) {
  md += `## Bad Folder Names\n\n`;
  for (const b of audit.badNames) {
    md += `- ${b}\n`;
  }
  md += `\n`;
}

writeFileSync(join(docsDir, 'prompts-canonical-audit.md'), md);

/* ------------------------------------------------------------------ */
/* Console summary                                                     */
/* ------------------------------------------------------------------ */

console.log(`\n=== Prompt Canonical Audit (Phase 274) ===\n`);
console.log(
  `  Folders:   ${audit.totalFolders} total (${audit.totalPhaseFolders} phase, ${audit.totalMetaFolders} meta)`
);
console.log(`  Dup pfx:   ${audit.duplicatePrefixes.length}`);
console.log(`  Dup phase: ${audit.duplicatePhases.length}`);
console.log(`  Missing:   ${audit.missingFiles.length} folders without implement/verify`);
console.log(`  Bad names: ${audit.badNames.length}`);
console.log(`  Healthy:   ${audit.healthy ? 'YES' : 'NO'}`);
console.log(`\n  Output: artifacts/prompts-canonical-audit.json`);
console.log(`  Output: docs/audits/prompts-canonical-audit.md\n`);

process.exit(audit.duplicatePrefixes.length > 0 ? 1 : 0);
