#!/usr/bin/env node
/**
 * scripts/qa/phase-comment-audit.mjs -- Code Comment Traceability Audit
 *
 * Scans the repo for occurrences of "Phase <token>" and "Wave <token>"
 * in code comments, then cross-references with docs/qa/phase-index.json
 * to find unresolvable, ambiguous, and well-traced references.
 *
 * Outputs:
 *   - docs/qa/phase-comment-audit.json  (machine-readable)
 *   - docs/qa/phase-comment-audit.md    (human-readable report)
 *
 * Usage:
 *   node scripts/qa/phase-comment-audit.mjs [--out-dir path]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative, extname } from 'node:path';

const ROOT = process.cwd();
const INDEX_PATH = resolve(ROOT, 'docs/qa/phase-index.json');
const DEFAULT_OUT_DIR = resolve(ROOT, 'docs/qa');

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out-dir');
const outDir = outIdx >= 0 && args[outIdx + 1] ? args[outIdx + 1] : DEFAULT_OUT_DIR;

// -- Load phase index --

if (!existsSync(INDEX_PATH)) {
  console.error('ERROR: docs/qa/phase-index.json not found. Run: pnpm qa:phase-index');
  process.exit(1);
}

const raw = readFileSync(INDEX_PATH, 'utf-8');
const index = JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);

// Build lookup maps from phase-index
const phaseToFolders = new Map(); // "284" -> [folder1, folder2, ...]
for (const p of index.phases) {
  const key = p.phaseNumber;
  if (!phaseToFolders.has(key)) phaseToFolders.set(key, []);
  phaseToFolders.get(key).push(p.folder);
}

// Load canonical map (for ambiguous tokens) if it exists
const CANONICAL_MAP_PATH = resolve(ROOT, 'docs/qa/phase-canonical-map.json');
let canonicalMap = {};
if (existsSync(CANONICAL_MAP_PATH)) {
  const cmRaw = readFileSync(CANONICAL_MAP_PATH, 'utf-8');
  canonicalMap = JSON.parse(cmRaw.charCodeAt(0) === 0xfeff ? cmRaw.slice(1) : cmRaw);
}

// Subphase regex: digits followed by one or more alpha chars (e.g. "15B", "103B", "14D")
const SUBPHASE_RE = /^(\d+)([A-Za-z].*)$/;

// -- Scan configuration --

const SCAN_DIRS = [
  'apps/api/src',
  'apps/web/src',
  'apps/portal/src',
  'packages',
  'config',
  'scripts',
  'services',
  'docs',
];

const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  '.turbo',
  'artifacts',
  'evidence',
  '.pnpm',
]);

const SKIP_FILES = new Set([
  'phase-index.json',
  'phase-registry.json',
  'phase-comment-audit.json',
  'phase-comment-audit.md',
  'pnpm-lock.yaml',
  'PROMPTS_INDEX.md',
]);

const SCAN_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.ps1',
  '.sh',
  '.lua',
  '.m',
  '.yml',
  '.yaml',
  '.sql',
  '.conf',
  '.rego',
]);

// Patterns
const PHASE_RE = /\bPhase\s+(\d+[A-Z]?\w*)\b/gi;
const WAVE_RE = /\bWave\s+(\d+)\b/gi;

// -- File walker --

function walkDir(dir, results = []) {
  if (!existsSync(dir)) return results;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, results);
    } else if (entry.isFile()) {
      if (SKIP_FILES.has(entry.name)) continue;
      const ext = extname(entry.name);
      if (SCAN_EXTENSIONS.has(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

// -- Scan all files --

console.log('\n=== Phase/Wave Comment Traceability Audit ===\n');

const allFiles = [];
for (const dir of SCAN_DIRS) {
  walkDir(resolve(ROOT, dir), allFiles);
}
// Also scan selective root-level files
const rootFiles = readdirSync(ROOT)
  .filter((f) => {
    const ext = extname(f);
    return SCAN_EXTENSIONS.has(ext) && !SKIP_FILES.has(f) && statSync(join(ROOT, f)).isFile();
  })
  .map((f) => join(ROOT, f));
allFiles.push(...rootFiles);

console.log(`  Scanning ${allFiles.length} files...\n`);

// -- Collect references --

const phaseRefs = new Map(); // token -> [{file, line, context}]
const waveRefs = new Map(); // wave# -> [{file, line, context}]

for (const filePath of allFiles) {
  let content;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    continue;
  }

  const lines = content.split('\n');
  const relPath = relative(ROOT, filePath).replace(/\\/g, '/');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Phase references
    let m;
    const phaseRe = new RegExp(PHASE_RE.source, 'gi');
    while ((m = phaseRe.exec(line))) {
      const token = m[1];
      if (!phaseRefs.has(token)) phaseRefs.set(token, []);
      phaseRefs.get(token).push({
        file: relPath,
        line: i + 1,
        context: line.trim().slice(0, 120),
      });
    }

    // Wave references
    const waveRe = new RegExp(WAVE_RE.source, 'gi');
    while ((m = waveRe.exec(line))) {
      const token = m[1];
      if (!waveRefs.has(token)) waveRefs.set(token, []);
      waveRefs.get(token).push({
        file: relPath,
        line: i + 1,
        context: line.trim().slice(0, 120),
      });
    }
  }
}

// -- Classify phase tokens --

const resolved = [];
const unresolved = [];
const ambiguous = [];
const resolvedViaBase = [];

for (const [token, refs] of phaseRefs) {
  const folders = phaseToFolders.get(token) || [];
  const entry = {
    token,
    refCount: refs.length,
    matchingFolders: folders,
    folderCount: folders.length,
    sampleRefs: refs.slice(0, 3),
  };

  if (folders.length === 0) {
    // Try subphase resolution: "15B" -> base "15"
    const subMatch = token.match(SUBPHASE_RE);
    if (subMatch) {
      const basePhase = subMatch[1];
      const baseFolders = phaseToFolders.get(basePhase) || [];
      if (baseFolders.length > 0) {
        entry.basePhase = basePhase;
        entry.baseFolders = baseFolders;
        entry.resolvedVia = 'basePhase';
        resolvedViaBase.push(entry);
        continue;
      }
    }
    // Check canonical map for direct override
    if (canonicalMap[token]) {
      entry.canonicalFolder = canonicalMap[token];
      entry.resolvedVia = 'canonicalMap';
      resolvedViaBase.push(entry);
      continue;
    }
    unresolved.push(entry);
  } else if (folders.length > 1) {
    // Pick canonical: from map first, then lowest prefix number
    if (canonicalMap[token]) {
      entry.canonicalFolder = canonicalMap[token];
    } else {
      const sorted = [...folders].sort((a, b) => {
        const pa = parseInt(a.match(/^(\d+)/)?.[1] || '9999', 10);
        const pb = parseInt(b.match(/^(\d+)/)?.[1] || '9999', 10);
        return pa - pb;
      });
      entry.canonicalFolder = sorted[0];
    }
    ambiguous.push(entry);
  } else {
    resolved.push(entry);
  }
}

// Wave classification
const waveEntries = [];
for (const [token, refs] of waveRefs) {
  const waveFolders = index.phases
    .filter((p) => {
      const wm = p.folder.match(/W(\d+)/);
      return wm && wm[1] === token;
    })
    .map((p) => p.folder);

  waveEntries.push({
    token: `Wave ${token}`,
    refCount: refs.length,
    matchingFolders: waveFolders,
    folderCount: waveFolders.length,
    sampleRefs: refs.slice(0, 3),
  });
}

// Top 50 most-referenced tokens
const allTokensSorted = [...phaseRefs.entries()]
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 50)
  .map(([token, refs]) => {
    // Check resolved via base phase
    const viaBase = resolvedViaBase.find((e) => e.token === token);
    if (viaBase) {
      const baseLabel =
        viaBase.resolvedVia === 'basePhase'
          ? `via base ${viaBase.basePhase}: ${viaBase.baseFolders.join(', ')}`
          : `via canonical: ${viaBase.canonicalFolder}`;
      return { token, refCount: refs.length, resolvedTo: baseLabel };
    }
    return {
      token,
      refCount: refs.length,
      resolvedTo:
        (phaseToFolders.get(token) || []).length > 0
          ? (phaseToFolders.get(token) || []).join(', ')
          : 'UNRESOLVED',
    };
  });

// -- Generate reports --

const jsonReport = {
  generatedAt: new Date().toISOString(),
  generator: 'scripts/qa/phase-comment-audit.mjs',
  summary: {
    totalPhaseTokens: phaseRefs.size,
    totalPhaseRefs: [...phaseRefs.values()].reduce((s, r) => s + r.length, 0),
    resolved: resolved.length,
    resolvedViaBasePhase: resolvedViaBase.length,
    unresolved: unresolved.length,
    ambiguous: ambiguous.length,
    totalWaveTokens: waveRefs.size,
    totalWaveRefs: [...waveRefs.values()].reduce((s, r) => s + r.length, 0),
    filesScanned: allFiles.length,
  },
  top50MostReferenced: allTokensSorted,
  unresolvedTokens: unresolved.sort((a, b) => b.refCount - a.refCount),
  resolvedViaBasePhaseTokens: resolvedViaBase.sort((a, b) => b.refCount - a.refCount),
  ambiguousTokens: ambiguous.sort((a, b) => b.refCount - a.refCount),
  waveReferences: waveEntries.sort((a, b) => b.refCount - a.refCount),
};

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'phase-comment-audit.json'), JSON.stringify(jsonReport, null, 2) + '\n');

// -- Markdown report --

const md = [];
md.push('# Phase/Wave Comment Traceability Audit');
md.push('');
md.push(`Generated: ${jsonReport.generatedAt}`);
md.push(`Files scanned: ${jsonReport.summary.filesScanned}`);
md.push('');
md.push('## Summary');
md.push('');
md.push(`| Metric | Count |`);
md.push(`|--------|-------|`);
md.push(`| Unique phase tokens in code | ${jsonReport.summary.totalPhaseTokens} |`);
md.push(`| Total phase references | ${jsonReport.summary.totalPhaseRefs} |`);
md.push(`| Resolved to single folder | ${jsonReport.summary.resolved} |`);
md.push(`| Resolved via base phase | ${jsonReport.summary.resolvedViaBasePhase} |`);
md.push(`| Unresolved (no matching folder) | ${jsonReport.summary.unresolved} |`);
md.push(`| Ambiguous (multiple folders) | ${jsonReport.summary.ambiguous} |`);
md.push(`| Unique wave tokens | ${jsonReport.summary.totalWaveTokens} |`);
md.push(`| Total wave references | ${jsonReport.summary.totalWaveRefs} |`);
md.push('');

md.push('## Top 50 Most-Referenced Phase Tokens');
md.push('');
md.push('| Rank | Token | Refs | Resolved To |');
md.push('|------|-------|------|-------------|');
for (let i = 0; i < allTokensSorted.length; i++) {
  const t = allTokensSorted[i];
  md.push(`| ${i + 1} | Phase ${t.token} | ${t.refCount} | ${t.resolvedTo} |`);
}
md.push('');

if (unresolved.length > 0) {
  md.push('## Unresolved Tokens');
  md.push('');
  md.push('These phase tokens appear in code but **cannot be mapped to any prompt folder**.');
  md.push('');
  md.push('| Token | Refs | Sample File |');
  md.push('|-------|------|-------------|');
  for (const u of unresolved) {
    const sample = u.sampleRefs[0]?.file || '-';
    md.push(`| Phase ${u.token} | ${u.refCount} | ${sample} |`);
  }
  md.push('');
}

if (resolvedViaBase.length > 0) {
  md.push('## Resolved via Base Phase');
  md.push('');
  md.push('These subphase tokens (e.g. "15B") were resolved by matching their base phase number.');
  md.push('');
  md.push('| Token | Refs | Base Phase | Base Folder |');
  md.push('|-------|------|------------|-------------|');
  for (const r of resolvedViaBase.sort((a, b) => b.refCount - a.refCount)) {
    const base = r.basePhase || '-';
    const folder = r.baseFolders ? r.baseFolders[0] : r.canonicalFolder || '-';
    md.push(`| Phase ${r.token} | ${r.refCount} | ${base} | ${folder} |`);
  }
  md.push('');
}

if (ambiguous.length > 0) {
  md.push('## Ambiguous Tokens (Multiple Folders)');
  md.push('');
  md.push('These tokens resolve to **more than one** prompt folder.');
  md.push('The recommended canonical folder (lowest prefix) is marked with **[C]**.');
  md.push('');
  for (const a of ambiguous) {
    md.push(`### Phase ${a.token} (${a.refCount} refs)`);
    md.push('');
    for (const f of a.matchingFolders) {
      const marker = f === a.canonicalFolder ? ' **[C]**' : '';
      md.push(`- \`${f}\`${marker}`);
    }
    md.push('');
  }
}

if (waveEntries.length > 0) {
  md.push('## Wave References');
  md.push('');
  md.push('| Wave | Refs | Matching Folders |');
  md.push('|------|------|-----------------|');
  for (const w of waveEntries) {
    md.push(`| ${w.token} | ${w.refCount} | ${w.folderCount} |`);
  }
  md.push('');
}

md.push('## How to Fix Unresolved References');
md.push('');
md.push('For each unresolved token, one of:');
md.push('1. The phase was never prompted (ad-hoc work) - add a retroactive prompt folder');
md.push('2. The phase number in the comment is wrong - fix the comment');
md.push('3. The phase exists under a different token - update the comment to the correct token');
md.push('');
md.push('Use `node scripts/prompt-ref.mjs --search "<keyword>"` to find the right folder.');
md.push('');
md.push('## How to Fix Ambiguous References');
md.push('');
md.push('For each ambiguous token, the canonical folder is the one with the lowest prefix.');
md.push('Add `REDUNDANT_OF: <canonical-folder>` to NOTES.md in non-canonical folders.');
md.push('New code should use the format: `Phase <token> (PromptFolder: <canonical-folder>)`');
md.push('');

writeFileSync(join(outDir, 'phase-comment-audit.md'), md.join('\n'));

// -- Console summary --

console.log('  Results:');
console.log(`    Phase tokens found:   ${phaseRefs.size}`);
console.log(
  `    Total phase refs:     ${[...phaseRefs.values()].reduce((s, r) => s + r.length, 0)}`
);
console.log(`    Resolved (1 folder):  ${resolved.length}`);
console.log(`    Resolved via base:    ${resolvedViaBase.length}`);
console.log(`    Unresolved (0):       ${unresolved.length}`);
console.log(`    Ambiguous (2+):       ${ambiguous.length}`);
console.log(`    Wave tokens found:    ${waveRefs.size}`);
console.log(
  `    Wave refs:            ${[...waveRefs.values()].reduce((s, r) => s + r.length, 0)}`
);
console.log('');
console.log(`  Written:`);
console.log(`    ${join(outDir, 'phase-comment-audit.json')}`);
console.log(`    ${join(outDir, 'phase-comment-audit.md')}`);
console.log('');
