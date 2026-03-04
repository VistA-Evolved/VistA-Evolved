#!/usr/bin/env node
/**
 * scripts/prompts-normalize-numbered-wave-folders.mjs
 *
 * Converts numeric-only shadow folders in prompts/ into proper wave-phase
 * naming convention. Reads WAVE_NN_MANIFEST.md to determine titles.
 *
 * Usage:
 *   node scripts/prompts-normalize-numbered-wave-folders.mjs --dry-run
 *   node scripts/prompts-normalize-numbered-wave-folders.mjs
 */

import {
  readdirSync,
  renameSync,
  readFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  unlinkSync,
  statSync,
  rmdirSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PROMPTS = join(ROOT, 'prompts');
const BACKUP_DIR = join(ROOT, 'artifacts', 'prompts-normalize', 'backups');

const DRY_RUN = process.argv.includes('--dry-run');

// ── Wave manifest parsing ─────────────────────────────────────

function parseManifest(waveNum) {
  const path = join(PROMPTS, `WAVE_${waveNum}_MANIFEST.md`);
  if (!existsSync(path)) return new Map();

  const content = readFileSync(path, 'utf-8');
  const lines = content.split('\n');
  const map = new Map(); // phase -> { code, title }

  for (const line of lines) {
    // Match table rows like: | 522 | C1 | Reality Scan Matrix ... |
    const m = line.match(/^\|\s*(\d+)\s*\|\s*(\w+)\s*\|\s*(.+?)\s*\|/);
    if (m) {
      const phase = m[1];
      const code = m[2].trim();
      const title = m[3]
        .trim()
        .replace(/[^A-Za-z0-9 -]/g, '') // strip special chars
        .replace(/\s+/g, '-') // spaces to dashes
        .toUpperCase()
        .slice(0, 50); // reasonable length limit
      map.set(phase, { code, title });
    }
  }
  return map;
}

// ── Standard file renames ─────────────────────────────────────

const FILE_RENAMES = [
  { pattern: /^\d+-01-IMPLEMENT\.md$/i, target: 'IMPLEMENT.md' },
  { pattern: /^\d+-99-VERIFY\.md$/i, target: 'VERIFY.md' },
  { pattern: /^\d+-NOTES\.md$/i, target: 'NOTES.md' },
];

function normalizeFiles(folderPath, phaseNum) {
  const files = readdirSync(folderPath);
  const actions = [];

  for (const { pattern, target } of FILE_RENAMES) {
    const oldFile = files.find((f) => pattern.test(f) && f !== target);
    if (oldFile) {
      const hasNew = files.includes(target);
      if (hasNew) {
        // Both exist: back up the old one
        actions.push({ type: 'backup', from: oldFile, to: target });
      } else {
        actions.push({ type: 'rename', from: oldFile, to: target });
      }
    }
  }

  // Create NOTES.md if missing
  if (!files.includes('NOTES.md') && !files.some((f) => /NOTES/i.test(f))) {
    actions.push({ type: 'create-notes' });
  }

  return actions;
}

// ── Main ──────────────────────────────────────────────────────

function main() {
  console.log(`Prompts Normalize: Numbered Wave Folders${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  // Parse all wave manifests
  const waves = new Map();
  for (let w = 30; w <= 45; w++) {
    const m = parseManifest(w);
    if (m.size > 0) {
      for (const [phase, info] of m) {
        waves.set(phase, { wave: w, ...info });
      }
    }
  }

  // Find all numeric-only shadow folders
  const shadowFolders = readdirSync(PROMPTS)
    .filter((e) => /^\d+$/.test(e) && existsSync(join(PROMPTS, e)))
    .filter((e) => {
      try {
        return statSync(join(PROMPTS, e)).isDirectory();
      } catch {
        return false;
      }
    })
    .sort((a, b) => parseInt(a) - parseInt(b));

  if (shadowFolders.length === 0) {
    console.log('No numeric-only shadow folders found. Nothing to do.');
    process.exit(0);
  }

  console.log(
    `Found ${shadowFolders.length} shadow folders: ${shadowFolders[0]}..${shadowFolders[shadowFolders.length - 1]}\n`
  );

  let renamed = 0;
  let fileOps = 0;

  for (const folder of shadowFolders) {
    const info = waves.get(folder);
    if (!info) {
      console.log(`  SKIP  ${folder} -- not found in any wave manifest`);
      continue;
    }

    const waveNum = info.wave;
    const piNum = info.code.replace(/[^0-9]/g, '') || info.code;
    const slug = info.title;

    // Build new folder name: NNN-WNN-PNN-SLUG
    const newName = `${folder}-W${waveNum}-P${piNum}-${slug}`;
    const oldPath = join(PROMPTS, folder);
    const newPath = join(PROMPTS, newName);

    // Check if target already exists
    if (existsSync(newPath)) {
      // Move old to backups
      console.log(`  BACKUP  ${folder} -> artifacts/... (target ${newName} already exists)`);
      if (!DRY_RUN) {
        mkdirSync(join(BACKUP_DIR, folder), { recursive: true });
        const files = readdirSync(oldPath);
        for (const f of files) {
          copyFileSync(join(oldPath, f), join(BACKUP_DIR, folder, f));
          unlinkSync(join(oldPath, f));
        }
        rmdirSync(oldPath);
      }
      continue;
    }

    console.log(`  RENAME  ${folder} -> ${newName}`);
    if (!DRY_RUN) {
      renameSync(oldPath, newPath);
    }
    renamed++;

    // Normalize files inside
    const targetPath = DRY_RUN ? oldPath : newPath;
    if (!DRY_RUN) {
      const fileActions = normalizeFiles(newPath, folder);
      for (const action of fileActions) {
        if (action.type === 'rename') {
          console.log(`    file: ${action.from} -> ${action.to}`);
          renameSync(join(newPath, action.from), join(newPath, action.to));
          fileOps++;
        } else if (action.type === 'backup') {
          console.log(`    backup: ${action.from} (${action.to} already exists)`);
          mkdirSync(join(BACKUP_DIR, newName), { recursive: true });
          copyFileSync(join(newPath, action.from), join(BACKUP_DIR, newName, action.from));
          unlinkSync(join(newPath, action.from));
          fileOps++;
        } else if (action.type === 'create-notes') {
          console.log(`    create: NOTES.md`);
          const notesContent = `# Phase ${folder} -- ${info.title.replace(/-/g, ' ')} -- NOTES\n\n## Summary\nPart of Wave ${waveNum}.\n\n## Key Decisions\n- TBD\n\n## Follow-ups\n- TBD\n`;
          writeFileSync(join(newPath, 'NOTES.md'), notesContent, 'utf-8');
          fileOps++;
        }
      }
    } else {
      const fileActions = normalizeFiles(oldPath, folder);
      for (const action of fileActions) {
        if (action.type === 'rename') {
          console.log(`    would rename: ${action.from} -> ${action.to}`);
        } else if (action.type === 'backup') {
          console.log(`    would backup: ${action.from}`);
        } else if (action.type === 'create-notes') {
          console.log(`    would create: NOTES.md`);
        }
        fileOps++;
      }
    }
  }

  console.log(`\nDone. Folders renamed: ${renamed}, File operations: ${fileOps}`);
}

main();
