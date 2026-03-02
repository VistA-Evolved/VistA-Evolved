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

import { readdirSync, renameSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PROMPTS = join(ROOT, "prompts");
const dryRun = process.argv.includes("--dry-run");

const WAVE_FOLDER_RE = /^\d+-W\d+-P\d+-/;

// Map old patterns to canonical names
const RENAME_MAP = [
  { pattern: /^\d+-01-IMPLEMENT\.md$/i, target: "IMPLEMENT.md" },
  { pattern: /^\d+-99-VERIFY\.md$/i, target: "VERIFY.md" },
  { pattern: /^\d+-NOTES\.md$/i, target: "NOTES.md" },
];

let renamed = 0;
let skipped = 0;
let errors = 0;

const folders = readdirSync(PROMPTS).filter(
  (e) => WAVE_FOLDER_RE.test(e) && statSync(join(PROMPTS, e)).isDirectory()
);

for (const folder of folders) {
  const dir = join(PROMPTS, folder);
  const files = readdirSync(dir);

  for (const { pattern, target } of RENAME_MAP) {
    const match = files.find((f) => pattern.test(f));
    if (!match) continue;

    // Already has canonical name — skip
    if (match === target) {
      skipped++;
      continue;
    }

    // Target already exists — don't clobber
    if (files.includes(target)) {
      console.log(`  SKIP  ${folder}: ${target} already exists (would clobber)`);
      skipped++;
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
}

console.log(`\nDone. Renamed: ${renamed}, Skipped: ${skipped}, Errors: ${errors}`);
if (dryRun) console.log("(dry-run mode — no files were changed)");
process.exit(errors > 0 ? 1 : 0);
