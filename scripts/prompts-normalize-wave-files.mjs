#!/usr/bin/env node
/**
 * scripts/prompts-normalize-wave-files.mjs
 *
 * Renames old-style phase-prefixed filenames in wave-phase folders
 * to the standard IMPLEMENT.md / VERIFY.md / NOTES.md names.
 *
 * Usage:
 *   node scripts/prompts-normalize-wave-files.mjs            # execute renames
 *   node scripts/prompts-normalize-wave-files.mjs --dry-run   # preview only
 */

import {
  readdirSync,
  renameSync,
  statSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const PROMPTS = join(ROOT, 'prompts');
const BACKUP_DIR = join(ROOT, 'artifacts', 'prompts-normalize', 'backups');
const dryRun = process.argv.includes('--dry-run');

const WAVE_FOLDER_RE = /^\d+-W\d+-P\d+-/;

// Map old patterns to canonical names
const RENAME_MAP = [
  { pattern: /^\d+-01-IMPLEMENT\.md$/i, target: 'IMPLEMENT.md' },
  { pattern: /^\d+-99-VERIFY\.md$/i, target: 'VERIFY.md' },
  { pattern: /^\d+-NOTES\.md$/i, target: 'NOTES.md' },
];

let renamed = 0;
let backed = 0;
let created = 0;
let skipped = 0;
let errors = 0;

const folders = readdirSync(PROMPTS).filter(
  (e) => WAVE_FOLDER_RE.test(e) && statSync(join(PROMPTS, e)).isDirectory()
);

for (const folder of folders) {
  const dir = join(PROMPTS, folder);
  const files = readdirSync(dir);

  for (const { pattern, target } of RENAME_MAP) {
    const match = files.find((f) => pattern.test(f) && f !== target);
    if (!match) continue;

    // Target already exists -- back up the old file
    if (files.includes(target)) {
      if (dryRun) {
        console.log(`  DRY-BK  ${folder}/${match} -> artifacts backup`);
      } else {
        try {
          mkdirSync(join(BACKUP_DIR, folder), { recursive: true });
          copyFileSync(join(dir, match), join(BACKUP_DIR, folder, match));
          unlinkSync(join(dir, match));
          console.log(`  BACKUP  ${folder}/${match}`);
          backed++;
        } catch (err) {
          console.log(`  ERR   ${folder}/${match}: ${err.message}`);
          errors++;
        }
      }
      continue;
    }

    const src = join(dir, match);
    const dst = join(dir, target);

    if (dryRun) {
      console.log(`  DRY   ${folder}/${match} -> ${target}`);
    } else {
      try {
        renameSync(src, dst);
        console.log(`  MOVE  ${folder}/${match} -> ${target}`);
        renamed++;
      } catch (err) {
        console.log(`  ERR   ${folder}/${match}: ${err.message}`);
        errors++;
      }
    }
  }

  // Create NOTES.md if missing
  const updatedFiles = dryRun ? files : readdirSync(dir);
  if (!updatedFiles.includes('NOTES.md')) {
    const num = folder.match(/^(\d+)/)?.[1] || '?';
    const slug = folder.replace(/^\d+-W\d+-P\d+-/, '').replace(/-/g, ' ');
    if (dryRun) {
      console.log(`  DRY-C  ${folder}/NOTES.md`);
    } else {
      const content = `# Phase ${num} -- ${slug} -- NOTES\n\n## Summary\nPart of wave folder normalization.\n\n## Key Decisions\n- TBD\n\n## Follow-ups\n- TBD\n`;
      writeFileSync(join(dir, 'NOTES.md'), content, 'utf-8');
      console.log(`  CREATE  ${folder}/NOTES.md`);
    }
    created++;
  }
}

console.log(
  `\nDone. Renamed: ${renamed}, Backed-up: ${backed}, Created: ${created}, Skipped: ${skipped}, Errors: ${errors}`
);
if (dryRun) console.log('(dry-run mode -- no files were changed)');
process.exit(errors > 0 ? 1 : 0);
