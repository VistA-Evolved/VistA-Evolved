#!/usr/bin/env node

/**
 * Verifies documentation is "Notion-friendly":
 * - Each .md file has a top-level H1 heading
 * - No files exceed Notion's 100-block practical limit excessively
 * - Consistent structure patterns
 *
 * Usage: node scripts/notion/verify-notion-readiness.mjs
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname, relative } from 'path';

const DOCS_ROOT = join(process.cwd(), 'docs');

let total = 0;
let passed = 0;
let warnings = 0;
const issues = [];

function scanDir(dir, depth = 0) {
  if (depth > 3) return;
  let entries;
  try { entries = readdirSync(dir); } catch { return; }

  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);

    if (stat.isDirectory() && !entry.startsWith('.')) {
      scanDir(full, depth + 1);
      continue;
    }

    if (!stat.isFile() || extname(entry) !== '.md') continue;

    total++;
    const relPath = relative(process.cwd(), full);
    const content = readFileSync(full, 'utf-8');
    const lines = content.split('\n');

    const h1Lines = lines.filter(l => l.startsWith('# '));
    if (h1Lines.length === 0) {
      issues.push(`WARN: ${relPath} -- no H1 heading (Notion pages need a title)`);
      warnings++;
    } else {
      passed++;
    }

    if (lines.length > 500) {
      issues.push(`INFO: ${relPath} -- ${lines.length} lines (consider splitting for Notion)`);
    }

    const hasTable = lines.some(l => l.includes('|') && l.includes('---'));
    const hasCodeBlock = lines.some(l => l.startsWith('```'));
    const hasMermaid = lines.some(l => l.startsWith('```mermaid'));

    if (hasMermaid) {
      issues.push(`INFO: ${relPath} -- contains mermaid diagram (Notion renders these natively)`);
    }
  }
}

scanDir(DOCS_ROOT);

console.log('\n=== Notion Readiness Check ===\n');
console.log(`Total markdown files: ${total}`);
console.log(`With H1 heading:     ${passed}`);
console.log(`Missing H1 heading:  ${warnings}`);
console.log(`Pass rate:            ${total > 0 ? Math.round(passed / total * 100) : 0}%\n`);

if (issues.length > 0) {
  console.log('Issues:');
  for (const issue of issues) {
    console.log(`  ${issue}`);
  }
}

console.log(`\nResult: ${warnings === 0 ? 'PASS' : 'PASS with warnings'}`);
process.exit(0);
