#!/usr/bin/env node
/**
 * scripts/prompts-index.mjs -- Regenerate prompts/PROMPTS_INDEX.md
 *
 * Scans all prompt folders and generates a complete index table.
 * Usage: node scripts/prompts-index.mjs
 */

import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PROMPTS_DIR = join(ROOT, "prompts");
const OUTPUT = join(PROMPTS_DIR, "PROMPTS_INDEX.md");

const entries = readdirSync(PROMPTS_DIR)
  .filter((e) => {
    const full = join(PROMPTS_DIR, e);
    if (!statSync(full).isDirectory()) return false;
    // Must start with a number (phase folder)
    return /^\d+/.test(e);
  })
  .sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    return na - nb;
  });

const rows = [];
for (const folder of entries) {
  const prefix = parseInt(folder, 10);
  const folderPath = join(PROMPTS_DIR, folder);
  const files = readdirSync(folderPath).filter((f) => f.endsWith(".md"));

  // Extract phase number from folder name
  let phase = prefix.toString();
  const phaseMatch = folder.match(/PHASE-(\d+\w?)/i);
  if (phaseMatch) phase = phaseMatch[1];
  const waveMatch = folder.match(/^(\d+)-W(\d+)-P(\d+)/);
  if (waveMatch) phase = waveMatch[1]; // prefix IS the phase for Wxx-Pxx

  rows.push({ prefix, folder, phase, fileCount: files.length });
}

const today = new Date().toISOString().split("T")[0];
const lines = [
  "# Prompts Index",
  "",
  `Generated: ${today}`,
  `Total prompt folders: ${rows.length}`,
  "",
  "| # | Folder | Phase | Files |",
  "|---|--------|-------|-------|",
];

for (const r of rows) {
  lines.push(`| ${r.prefix} | ${r.folder} | ${r.phase} | ${r.fileCount} |`);
}

lines.push("");

writeFileSync(OUTPUT, lines.join("\n"), "utf-8");
console.log(`Wrote ${OUTPUT} (${rows.length} folders)`);
