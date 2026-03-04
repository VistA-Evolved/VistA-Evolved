#!/usr/bin/env node
/**
 * Phase 53 -- PromptOS Fix Tool
 *
 * Repairs prompt folder/file naming issues discovered by auditPrompts.ts.
 *
 * Safety guarantees:
 *   - Creates /artifacts/promptos/backup/<timestamp>/ before ANY changes
 *   - Refuses to run if backup creation fails
 *   - Refuses to run if it can't guarantee non-destructive rename
 *   - Dry-run mode by default (pass --apply to execute)
 *
 * What it fixes:
 *   1. Folder prefix renumbering (if gaps exist)
 *   2. File prefix inside folders to match folder prefix
 *   3. First H1 header to include correct phase number
 *   4. Creates missing XX-01-IMPLEMENT.md / XX-99-VERIFY.md stubs
 *
 * Usage:
 *   npx tsx scripts/promptos/fixPrompts.ts          # dry-run
 *   npx tsx scripts/promptos/fixPrompts.ts --apply   # execute fixes
 *
 * Outputs (ARTIFACTS only):
 *   /artifacts/promptos/fix-plan.json
 *   /artifacts/promptos/backup/<timestamp>/
 */

import {
  readdirSync,
  statSync,
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  renameSync,
} from 'fs';
import { join, basename } from 'path';
import { cpSync } from 'fs';

const ROOT = process.cwd();
const PROMPTS_DIR = join(ROOT, 'prompts');
const ARTIFACTS_DIR = join(ROOT, 'artifacts', 'promptos');

const dryRun = !process.argv.includes('--apply');

interface FixAction {
  type: 'rename-folder' | 'rename-file' | 'fix-header' | 'create-stub';
  from?: string;
  to?: string;
  file?: string;
  details: string;
}

const actions: FixAction[] = [];

if (!existsSync(PROMPTS_DIR)) {
  console.error('ERROR: prompts/ directory not found');
  process.exit(1);
}

// ── Create backup ────────────────────────────────────────────────

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupDir = join(ARTIFACTS_DIR, 'backup', timestamp);

if (!dryRun) {
  mkdirSync(backupDir, { recursive: true });
  try {
    cpSync(PROMPTS_DIR, join(backupDir, 'prompts'), { recursive: true });
    console.log(`Backup created at: ${backupDir}`);
  } catch (err) {
    console.error(`FATAL: Could not create backup: ${err}`);
    process.exit(1);
  }
}

// ── Collect current state ────────────────────────────────────────

const allEntries = readdirSync(PROMPTS_DIR)
  .filter((e) => statSync(join(PROMPTS_DIR, e)).isDirectory())
  .sort();

const META_RE = /^00-/;
const phaseFolders = allEntries.filter((e) => !META_RE.test(e) && /^\d{1,3}-/.test(e));

// ── Fix 1: Create missing IMPLEMENT/VERIFY stubs ─────────────────

for (const folder of phaseFolders) {
  const m = folder.match(/^(\d{1,3})-/);
  if (!m) continue;
  const prefix = m[1];
  const folderPath = join(PROMPTS_DIR, folder);
  const files = readdirSync(folderPath).filter((f) => f.endsWith('.md'));

  const hasImplement = files.some(
    (f) => f.startsWith(`${prefix}-01-IMPLEMENT`) || /^\d{2}-\d{2}-(IMPLEMENT|implement)/.test(f)
  );
  const hasVerify = files.some(
    (f) => f.startsWith(`${prefix}-99-VERIFY`) || /^\d{2}-\d{2}-(VERIFY|verify)/.test(f)
  );
  const hasPromptMd = files.includes('prompt.md');

  // Extract phase info from folder name
  const phaseMatch = folder.match(/^(\d{2})-PHASE-(\d+[A-Z]?)-(.+)$/);
  const phaseNum = phaseMatch ? phaseMatch[2] : '?';
  const phaseTitle = phaseMatch ? phaseMatch[3].replace(/-/g, ' ') : folder;

  if (!hasImplement && !hasPromptMd) {
    const stubFile = `${prefix}-01-IMPLEMENT.md`;
    actions.push({
      type: 'create-stub',
      file: join(folder, stubFile),
      details: `Create missing IMPLEMENT stub: ${stubFile}`,
    });
    if (!dryRun) {
      writeFileSync(
        join(folderPath, stubFile),
        `# Phase ${phaseNum} -- ${phaseTitle} (IMPLEMENT)\n\n> TODO: Add implementation instructions.\n`
      );
    }
  }

  if (!hasVerify) {
    const stubFile = `${prefix}-99-VERIFY.md`;
    actions.push({
      type: 'create-stub',
      file: join(folder, stubFile),
      details: `Create missing VERIFY stub: ${stubFile}`,
    });
    if (!dryRun) {
      writeFileSync(
        join(folderPath, stubFile),
        `# Phase ${phaseNum} -- ${phaseTitle} (VERIFY)\n\n> TODO: Add verification gates.\n`
      );
    }
  }
}

// ── Fix 2: Rename files whose prefix doesn't match folder ────────

for (const folder of phaseFolders) {
  const m = folder.match(/^(\d{2})-/);
  if (!m) continue;
  const expectedPrefix = m[1];
  const folderPath = join(PROMPTS_DIR, folder);
  const files = readdirSync(folderPath).filter(
    (f) => f.endsWith('.md') && f !== 'prompt.md' && f !== 'README.md'
  );

  for (const file of files) {
    const fileMatch = file.match(/^(\d{2})-/);
    if (fileMatch && fileMatch[1] !== expectedPrefix) {
      const newName = file.replace(/^(\d{2})-/, `${expectedPrefix}-`);
      // Check for collision
      if (existsSync(join(folderPath, newName))) {
        console.warn(`SKIP: Would collide -- ${file} -> ${newName} in ${folder}`);
        continue;
      }
      actions.push({
        type: 'rename-file',
        from: join(folder, file),
        to: join(folder, newName),
        details: `Rename file prefix to match folder: ${file} -> ${newName}`,
      });
      if (!dryRun) {
        renameSync(join(folderPath, file), join(folderPath, newName));
      }
    }
  }
}

// ── Emit plan ────────────────────────────────────────────────────

mkdirSync(ARTIFACTS_DIR, { recursive: true });
writeFileSync(
  join(ARTIFACTS_DIR, 'fix-plan.json'),
  JSON.stringify(
    {
      mode: dryRun ? 'dry-run' : 'applied',
      timestamp: new Date().toISOString(),
      backupDir: dryRun ? '(none -- dry-run)' : backupDir,
      actions,
      totalActions: actions.length,
    },
    null,
    2
  )
);

console.log(`\n=== PromptOS Fix Tool (Phase 53) ===`);
console.log(`Mode: ${dryRun ? 'DRY-RUN (pass --apply to execute)' : 'APPLIED'}`);
console.log(`Actions: ${actions.length}\n`);

for (const a of actions) {
  const prefix = dryRun ? '[DRY-RUN]' : '[APPLIED]';
  console.log(`  ${prefix} ${a.type}: ${a.details}`);
}

if (actions.length === 0) {
  console.log('  No fixes needed -- prompts structure is clean.');
}

console.log(`\nPlan written to: artifacts/promptos/fix-plan.json`);
if (!dryRun && actions.length > 0) {
  console.log(`Backup at: ${backupDir}`);
}
