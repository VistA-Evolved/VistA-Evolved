#!/usr/bin/env node
/**
 * scripts/qa-gates/prompts-tree-health.mjs -- Phase 113B: Prompts Tree Health
 *
 * QA gate that validates the prompts/ directory follows conventions:
 *
 *   WARN:
 *     - Legacy duplicate files (flat + folder versions of same phase)
 *     - Folders with only one of IMPLEMENT/VERIFY (missing pair)
 *
 *   FAIL:
 *     - Flat files at prompts/ root for phases that already have folders
 *     - Folder naming convention violations (must match NN-PHASE-NN-*)
 *     - IMPLEMENT/VERIFY files whose internal phase number mismatches folder
 *
 * Exit: 0 = pass (or WARN-only), 1 = FAIL
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const PROMPTS_DIR = join(ROOT, 'prompts');

let passed = 0;
let warned = 0;
let failed = 0;

function pass(gate, detail) {
  passed++;
  console.log(`  PASS  ${gate}: ${detail}`);
}

function warn(gate, detail) {
  warned++;
  console.log(`  WARN  ${gate}: ${detail}`);
}

function fail(gate, detail) {
  failed++;
  console.log(`  FAIL  ${gate}: ${detail}`);
}

console.log('\n=== QA Gate: Prompts Tree Health (Phase 113B) ===\n');

// -- Inventory ----------------------------------------

const allEntries = readdirSync(PROMPTS_DIR);

// Phase folders: match patterns like:
//   "42-PHASE-38-RCM-..."    (classic)
//   "01-BOOTSTRAP"           (bootstrap)
//   "327-W15-P1-MANIFEST-*"  (wave-phase naming, W25 onwards)
//   "263-WAVE-8-*"           (wave-level integrity audits)
const PHASE_FOLDER_RE = /^\d+-(?:PHASE-\d+\w?-|W\d+-P\d+-|WAVE-\d+-|BOOTSTRAP|PLAYBOOKS?)/;
const phaseFolders = allEntries.filter(
  (e) => statSync(join(PROMPTS_DIR, e)).isDirectory() && PHASE_FOLDER_RE.test(e)
);

// Flat markdown files (excluding 00-* meta files, manifests, and README)
const ALLOWED_ROOT_FILES = new Set(['README.md', 'PROMPTS_INDEX.md', '00-ORDERING-RULES.md']);
const flatFiles = allEntries.filter(
  (e) =>
    e.endsWith('.md') &&
    !e.startsWith('00-') &&
    !e.startsWith('WAVE_') &&
    !ALLOWED_ROOT_FILES.has(e) &&
    statSync(join(PROMPTS_DIR, e)).isFile()
);

// -- Gate 1: No flat files that duplicate existing folders -----

const folderPhaseNumbers = new Map();
for (const folder of phaseFolders) {
  // Extract phase number from folder name: "42-PHASE-38-..." -> "38", "327-W15-P1-..." -> "327"
  const m = folder.match(/PHASE-(\d+\w?)/i) || folder.match(/^(\d+)-W\d+-P\d+/);
  if (m) folderPhaseNumbers.set(m[1], folder);
}

const duplicateFlats = [];
const orphanFlats = [];

for (const file of flatFiles) {
  const m = file.match(/^(\d+)-/);
  if (!m) continue;

  // Extract phase number from the filename (e.g., "111-01-IMPLEMENT.md" -> "111")
  const phaseNum = m[1];
  if (folderPhaseNumbers.has(phaseNum)) {
    duplicateFlats.push({ file, folder: folderPhaseNumbers.get(phaseNum) });
  } else {
    orphanFlats.push(file);
  }
}

if (duplicateFlats.length > 0) {
  for (const { file, folder } of duplicateFlats) {
    fail('no-duplicate-flat', `"${file}" exists at root but folder "${folder}" already exists`);
  }
} else {
  pass('no-duplicate-flat', 'No flat files duplicating existing phase folders');
}

if (orphanFlats.length > 0) {
  for (const file of orphanFlats) {
    fail(
      'orphan-flat',
      `"${file}" at root has no corresponding phase folder -- must be moved into a folder`
    );
  }
} else {
  pass('orphan-flat', 'No orphan flat files at root');
}

// -- Gate 2: Folder naming convention ------------------

const FOLDER_CONVENTION_RE =
  /^\d{1,3}-(?:PHASE-\d+\w?-[A-Z0-9-]+|W\d+-P\d+-[A-Z0-9-]+|WAVE-\d+-[A-Z0-9-]+|BOOTSTRAP|PLAYBOOKS?)$/;
const badNames = [];

for (const folder of phaseFolders) {
  if (!FOLDER_CONVENTION_RE.test(folder) && folder !== '00-ARCHIVE') {
    badNames.push(folder);
  }
}

if (badNames.length > 0) {
  for (const name of badNames) {
    warn('naming-convention', `Folder "${name}" doesn't match convention`);
  }
} else {
  pass('naming-convention', `All ${phaseFolders.length} folders follow convention`);
}

// -- Gate 3: IMPLEMENT + VERIFY pair check -------------

let missingPairs = 0;
let checkedFolders = 0;

for (const folder of phaseFolders) {
  if (folder === '00-ARCHIVE' || folder.startsWith('00-')) continue;

  const folderPath = join(PROMPTS_DIR, folder);
  const files = readdirSync(folderPath);

  const hasImpl = files.some((f) => f.includes('IMPLEMENT'));
  const hasVerify = files.some((f) => f.includes('VERIFY'));

  checkedFolders++;
  if (!hasImpl && !hasVerify) {
    warn('impl-verify-pair', `"${folder}" has neither IMPLEMENT nor VERIFY`);
    missingPairs++;
  } else if (!hasImpl) {
    warn('impl-verify-pair', `"${folder}" is missing IMPLEMENT file`);
    missingPairs++;
  } else if (!hasVerify) {
    warn('impl-verify-pair', `"${folder}" is missing VERIFY file`);
    missingPairs++;
  }
}

if (missingPairs === 0) {
  pass('impl-verify-pair', `All ${checkedFolders} folders have IMPLEMENT + VERIFY`);
}

// -- Gate 4: Internal phase number must match folder ---

let mismatches = 0;

for (const folder of phaseFolders) {
  // Extract phase number: "42-PHASE-38-..." -> "38", "327-W15-P1-..." -> "327"
  const folderMatch = folder.match(/PHASE-(\d+\w?)/i) || folder.match(/^(\d+)-W\d+-P\d+/);
  if (!folderMatch) continue;
  const folderPhase = folderMatch[1];

  const folderPath = join(PROMPTS_DIR, folder);
  const files = readdirSync(folderPath).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    // Read first line to check phase number in heading
    try {
      const firstLine = readFileSync(join(folderPath, file), 'utf-8').split('\n')[0];
      // Match "Phase NNN" in heading
      const headingMatch = firstLine.match(/Phase\s+(\d+\w?)/i);
      if (headingMatch) {
        const headingPhase = headingMatch[1];
        // Extract numeric prefix for comparison: "5A" -> "5", "25D" -> "25"
        const folderNum = folderPhase.replace(/[A-Za-z]+$/, '');
        const headingNum = headingPhase.replace(/[A-Za-z]+$/, '');
        // Accept exact match OR sub-phase match (e.g., "5A" in folder "5")
        if (headingNum !== folderNum && headingPhase !== folderPhase) {
          fail(
            'phase-mismatch',
            `${folder}/${file}: heading says Phase ${headingPhase} but folder says Phase ${folderPhase}`
          );
          mismatches++;
        }
      }
    } catch {
      // skip unreadable
    }
  }
}

if (mismatches === 0) {
  pass('phase-mismatch', 'All file headings match their folder phase numbers');
}

// -- Gate 5: Duplicate phase numbers across folders ----

const phaseToFolders = new Map();
for (const folder of phaseFolders) {
  const m = folder.match(/PHASE-(\d+\w?)/i) || folder.match(/^(\d+)-W\d+-P\d+/);
  if (!m) continue;
  const num = m[1];
  if (!phaseToFolders.has(num)) phaseToFolders.set(num, []);
  phaseToFolders.get(num).push(folder);
}

let dupeCount = 0;
for (const [num, folders] of phaseToFolders) {
  if (folders.length > 1) {
    warn('duplicate-phase', `Phase ${num} has ${folders.length} folders: ${folders.join(', ')}`);
    dupeCount++;
  }
}

if (dupeCount === 0) {
  pass('duplicate-phase', 'No duplicate phase numbers across folders');
}

// -- Gate 6: No nested numbered subdirectories in phase folders ---

let nestedCount = 0;

for (const folder of phaseFolders) {
  const folderPath = join(PROMPTS_DIR, folder);
  try {
    const children = readdirSync(folderPath);
    for (const child of children) {
      const childPath = join(folderPath, child);
      if (statSync(childPath).isDirectory() && /^\d+/.test(child)) {
        fail(
          'nested-phase',
          `"${folder}/${child}" is a nested numbered subdirectory -- phases must be top-level`
        );
        nestedCount++;
      }
    }
  } catch {
    // skip unreadable
  }
}

if (nestedCount === 0) {
  pass('nested-phase', 'No nested numbered subdirectories in phase folders');
}

// -- Gate 7: No shadow numbered directories (unscanned) ---

const ALLOWED_NON_PHASE_DIRS = new Set(['00-ARCHIVE', '00-PLAYBOOKS']);
const allNumberedDirs = allEntries.filter(
  (e) =>
    /^\d+/.test(e) && statSync(join(PROMPTS_DIR, e)).isDirectory() && !ALLOWED_NON_PHASE_DIRS.has(e)
);

const shadowDirs = allNumberedDirs.filter((d) => !phaseFolders.includes(d));
if (shadowDirs.length > 0) {
  for (const d of shadowDirs) {
    fail(
      'shadow-folder',
      `"${d}" is a numbered directory not matching phase folder convention -- rename to NNN-PHASE-NNN-SLUG`
    );
  }
} else {
  pass(
    'shadow-folder',
    `No shadow numbered directories (${allNumberedDirs.length} dirs all recognized)`
  );
}

// -- Gate 8: NOTES.md presence (WARN only -- many legacy gaps) --

let missingNotes = 0;
for (const folder of phaseFolders) {
  if (folder === '00-ARCHIVE' || folder.startsWith('00-')) continue;
  const folderPath = join(PROMPTS_DIR, folder);
  const files = readdirSync(folderPath);
  if (!files.some((f) => f.includes('NOTES'))) {
    missingNotes++;
  }
}
if (missingNotes > 0) {
  warn('notes-present', `${missingNotes} phase folders missing NOTES.md (legacy)`);
} else {
  pass('notes-present', 'All phase folders have NOTES.md');
}

// -- Summary ------------------------------------------

console.log('\n=== Summary ===');
console.log(`  PASS: ${passed}`);
console.log(`  WARN: ${warned}`);
console.log(`  FAIL: ${failed}`);

const exitCode = failed > 0 ? 1 : 0;
console.log(`\nExit code: ${exitCode}`);
process.exit(exitCode);
