#!/usr/bin/env node
/**
 * scripts/qa/prompt-redundancy-audit.mjs -- Prompt Redundancy Analysis
 *
 * Uses docs/qa/phase-index.json to find prompt folders that:
 *   1. Share the same phase number (exact duplicates)
 *   2. Have highly similar fingerprints (near-duplicate content)
 *
 * Outputs:
 *   - docs/qa/prompt-redundancy-report.md
 *
 * DOES NOT delete anything. Marks redundant folders with NOTES.md entries.
 *
 * Usage:
 *   node scripts/qa/prompt-redundancy-audit.mjs [--mark]
 *   --mark: Also create/update NOTES.md in redundant folders with REDUNDANT_OF markers
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const INDEX_PATH = resolve(ROOT, 'docs/qa/phase-index.json');
const PROMPTS_DIR = resolve(ROOT, 'prompts');
const OUT_PATH = resolve(ROOT, 'docs/qa/prompt-redundancy-report.md');

const args = process.argv.slice(2);
const doMark = args.includes('--mark');

// -- Load phase index --

if (!existsSync(INDEX_PATH)) {
  console.error('ERROR: docs/qa/phase-index.json not found. Run: pnpm qa:phase-index');
  process.exit(1);
}

const raw = readFileSync(INDEX_PATH, 'utf-8');
const index = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);

// -- Group by phase number --

const byPhaseNum = new Map();
for (const p of index.phases) {
  const key = p.phaseNumber;
  if (!byPhaseNum.has(key)) byPhaseNum.set(key, []);
  byPhaseNum.get(key).push(p);
}

// -- Find exact duplicates (same phaseNumber, different folders) --

const exactDuplicates = [];
for (const [phaseNum, phases] of byPhaseNum) {
  if (phases.length > 1) {
    // Canonical = lowest prefix number
    const sorted = [...phases].sort((a, b) => {
      const pa = parseInt(a.folder.match(/^(\d+)/)?.[1] || '9999', 10);
      const pb = parseInt(b.folder.match(/^(\d+)/)?.[1] || '9999', 10);
      return pa - pb;
    });
    exactDuplicates.push({
      phaseNumber: phaseNum,
      count: phases.length,
      canonical: sorted[0].folder,
      redundant: sorted.slice(1).map((p) => p.folder),
      titles: sorted.map((p) => ({ folder: p.folder, title: p.title })),
    });
  }
}

// -- Fingerprint-based near-duplicate detection --

function fingerprint(phase) {
  const parts = [
    phase.title.toLowerCase().replace(/[^a-z0-9]/g, ''),
    ...phase.routes.slice(0, 10).sort(),
    ...phase.rpcs.slice(0, 10).sort(),
    ...phase.filesTouched.slice(0, 10).sort(),
  ];
  return createHash('md5').update(parts.join('|')).digest('hex').slice(0, 12);
}

const fpMap = new Map(); // fingerprint -> [phase]
for (const p of index.phases) {
  const fp = fingerprint(p);
  if (!fpMap.has(fp)) fpMap.set(fp, []);
  fpMap.get(fp).push({ ...p, fingerprint: fp });
}

const nearDuplicates = [];
for (const [fp, phases] of fpMap) {
  if (phases.length > 1) {
    // Skip if these are already in exact duplicates
    const phaseNums = new Set(phases.map((p) => p.phaseNumber));
    if (phaseNums.size === 1 && exactDuplicates.some((d) => d.phaseNumber === [...phaseNums][0])) {
      continue; // Already captured as exact duplicate
    }
    const sorted = [...phases].sort((a, b) => {
      const pa = parseInt(a.folder.match(/^(\d+)/)?.[1] || '9999', 10);
      const pb = parseInt(b.folder.match(/^(\d+)/)?.[1] || '9999', 10);
      return pa - pb;
    });
    nearDuplicates.push({
      fingerprint: fp,
      count: phases.length,
      canonical: sorted[0].folder,
      group: sorted.map((p) => ({
        folder: p.folder,
        phaseNumber: p.phaseNumber,
        title: p.title,
      })),
    });
  }
}

// -- Generate report --

const md = [];
md.push('# Prompt Redundancy Report');
md.push('');
md.push(`Generated: ${new Date().toISOString()}`);
md.push(`Source: docs/qa/phase-index.json (${index.phaseCount} phases)`);
md.push('');
md.push('## Summary');
md.push('');
md.push(`| Metric | Count |`);
md.push(`|--------|-------|`);
md.push(`| Exact duplicate phase numbers | ${exactDuplicates.length} |`);
md.push(`| Near-duplicate fingerprint groups | ${nearDuplicates.length} |`);
md.push(
  `| Total redundant folders | ${exactDuplicates.reduce((s, d) => s + d.redundant.length, 0) + nearDuplicates.reduce((s, d) => s + d.count - 1, 0)} |`
);
md.push('');
md.push('> **Policy:** Redundant folders are NOT deleted. They are marked with');
md.push('> `REDUNDANT_OF: <canonical-folder>` in their NOTES.md file.');
md.push('');

if (exactDuplicates.length > 0) {
  md.push('## Exact Duplicates (Same Phase Number)');
  md.push('');
  for (const d of exactDuplicates) {
    md.push(`### Phase ${d.phaseNumber} (${d.count} folders)`);
    md.push('');
    md.push(`**Canonical:** \`${d.canonical}\``);
    md.push('');
    md.push('| Folder | Title | Status |');
    md.push('|--------|-------|--------|');
    for (const t of d.titles) {
      const status = t.folder === d.canonical ? 'CANONICAL' : 'REDUNDANT';
      md.push(`| \`${t.folder}\` | ${t.title} | ${status} |`);
    }
    md.push('');
  }
}

if (nearDuplicates.length > 0) {
  md.push('## Near-Duplicate Fingerprints');
  md.push('');
  md.push('These folders have different phase numbers but nearly identical content fingerprints.');
  md.push('');
  for (const d of nearDuplicates) {
    md.push(`### Fingerprint Group: ${d.fingerprint} (${d.count} folders)`);
    md.push('');
    md.push(`**Canonical:** \`${d.canonical}\``);
    md.push('');
    md.push('| Folder | Phase | Title |');
    md.push('|--------|-------|-------|');
    for (const g of d.group) {
      const marker = g.folder === d.canonical ? ' (CANONICAL)' : '';
      md.push(`| \`${g.folder}\` | ${g.phaseNumber} | ${g.title}${marker} |`);
    }
    md.push('');
  }
}

md.push('## Recommendations');
md.push('');
md.push('1. For exact duplicates: the CANONICAL folder has the lowest prefix and is the');
md.push('   authoritative prompt. Non-canonical folders have `REDUNDANT_OF:` markers.');
md.push('2. For near-duplicates: review manually. Different phase numbers with similar');
md.push('   content may be legitimate iterations or may need consolidation marks.');
md.push('3. Use `node scripts/prompt-ref.mjs --phase <N>` to find all folders for a phase.');
md.push('4. New code references should use the canonical folder name.');
md.push('');

mkdirSync(resolve(ROOT, 'docs/qa'), { recursive: true });
writeFileSync(OUT_PATH, md.join('\n'));

// -- Mark redundant folders with NOTES.md --

const markedFolders = [];

if (doMark) {
  for (const d of exactDuplicates) {
    for (const redundantFolder of d.redundant) {
      const notesPath = join(PROMPTS_DIR, redundantFolder, 'NOTES.md');
      const marker = `REDUNDANT_OF: ${d.canonical}`;

      if (existsSync(notesPath)) {
        const existing = readFileSync(notesPath, 'utf-8');
        if (existing.includes('REDUNDANT_OF:')) {
          // Already marked, skip
          continue;
        }
        // Append marker
        writeFileSync(notesPath, existing.trimEnd() + '\n\n' + marker + '\n');
      } else {
        writeFileSync(notesPath, `# Notes\n\n${marker}\n`);
      }
      markedFolders.push({ folder: redundantFolder, canonical: d.canonical });
    }
  }
}

// -- Console summary --

console.log('\n=== Prompt Redundancy Audit ===\n');
console.log(`  Exact duplicate phase numbers: ${exactDuplicates.length}`);
for (const d of exactDuplicates) {
  console.log(`    Phase ${d.phaseNumber}: ${d.count} folders (canonical: ${d.canonical})`);
  for (const r of d.redundant) {
    console.log(`      redundant: ${r}`);
  }
}
console.log(`  Near-duplicate fingerprint groups: ${nearDuplicates.length}`);
console.log('');
if (doMark && markedFolders.length > 0) {
  console.log(`  Marked ${markedFolders.length} folders with REDUNDANT_OF:`);
  for (const m of markedFolders) {
    console.log(`    ${m.folder} -> ${m.canonical}`);
  }
  console.log('');
}
console.log(`  Report: ${OUT_PATH}`);
console.log('');
