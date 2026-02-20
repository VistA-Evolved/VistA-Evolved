#!/usr/bin/env node
/**
 * Phase 55 -- Extract form/dialog unit names from Delphi CPRS source
 *
 * Scans .dfm files for top-level form declarations (TForm, TfrmXxx)
 * and maps them to their .pas unit names.
 *
 * Output: /artifacts/cprs/delphi-forms.json
 *
 * Usage: npx tsx scripts/cprs/extractDelphiForms.ts
 */

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, relative, extname, basename } from "path";

const ROOT = process.cwd();
const DELPHI_ROOT = join(ROOT, "reference", "cprs");
const CHART_ROOT = join(DELPHI_ROOT, "Packages", "Order Entry Results Reporting", "CPRS", "CPRS-Chart");
const OUT_DIR = join(ROOT, "artifacts", "cprs");

const SKIP_DIRS = new Set([".git", "node_modules", "dcu", "__history"]);

interface DelphiForm {
  unitName: string;       // e.g. fNotes
  formName: string;       // e.g. frmNotes
  formClass: string;      // e.g. TfrmNotes
  parentClass: string;    // e.g. TfrmPage
  caption: string;        // e.g. "Notes"
  sourceFile: string;     // relative path
  componentCount: number; // number of child components
}

function collectFiles(dir: string, ext: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    try {
      const stat = statSync(full);
      if (stat.isDirectory()) {
        results.push(...collectFiles(full, ext));
      } else if (stat.isFile() && extname(entry).toLowerCase() === ext) {
        results.push(full);
      }
    } catch { continue; }
  }
  return results;
}

function main() {
  const scanRoot = existsSync(CHART_ROOT) ? CHART_ROOT : DELPHI_ROOT;

  if (!existsSync(scanRoot)) {
    console.log("WARNING: reference/cprs/ not found -- generating empty extraction");
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(
      join(OUT_DIR, "delphi-forms.json"),
      JSON.stringify({ _meta: { source: scanRoot, status: "directory-not-found" }, forms: [] }, null, 2),
    );
    return;
  }

  console.log(`Scanning Delphi .dfm files in ${relative(ROOT, scanRoot)}...`);
  const dfmFiles = collectFiles(scanRoot, ".dfm");
  console.log(`  Found ${dfmFiles.length} .dfm files`);

  const forms: DelphiForm[] = [];

  for (const file of dfmFiles) {
    let content: string;
    try { content = readFileSync(file, "utf-8"); } catch {
      try { content = readFileSync(file, "latin1"); } catch { continue; }
    }
    const rel = relative(DELPHI_ROOT, file).replace(/\\/g, "/");
    const unit = basename(file, ".dfm");
    const lines = content.split("\n");

    // First line: inherited frmNotes: TfrmNotes  or  object frmSplash: TfrmSplash
    const firstLineMatch = lines[0]?.match(/^(?:inherited|object)\s+(\w+):\s+T(\w+)/);
    if (!firstLineMatch) continue;

    const formName = firstLineMatch[1];
    const formClass = `T${firstLineMatch[2]}`;

    // Find parent class from .pas file
    let parentClass = "";
    const pasFile = file.replace(/\.dfm$/i, ".pas");
    if (existsSync(pasFile)) {
      try {
        const pasContent = readFileSync(pasFile, "utf-8");
        // TfrmNotes = class(TfrmPage)
        const classMatch = pasContent.match(new RegExp(`T${firstLineMatch[2]}\\s*=\\s*class\\s*\\((\\w+)\\)`));
        if (classMatch) parentClass = classMatch[1];
      } catch { /* ignore */ }
    }

    // Find caption
    let caption = "";
    for (const line of lines.slice(0, 30)) {
      const capMatch = line.match(/^\s*Caption\s*=\s*'([^']*)'/);
      if (capMatch) {
        caption = capMatch[1];
        break;
      }
    }

    // Count child objects
    let componentCount = 0;
    for (const line of lines) {
      if (/^\s+(?:object|inherited)\s+\w+:/.test(line)) {
        componentCount++;
      }
    }

    forms.push({
      unitName: unit,
      formName,
      formClass,
      parentClass,
      caption,
      sourceFile: rel,
      componentCount,
    });
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const output = {
    _meta: {
      source: relative(ROOT, scanRoot),
      extractedAt: new Date().toISOString(),
      dfmFilesScanned: dfmFiles.length,
      totalForms: forms.length,
    },
    forms: forms.sort((a, b) => a.unitName.localeCompare(b.unitName)),
  };

  writeFileSync(join(OUT_DIR, "delphi-forms.json"), JSON.stringify(output, null, 2));
  console.log(`\nExtracted ${forms.length} forms/dialogs`);
  console.log(`Output: artifacts/cprs/delphi-forms.json`);
}

main();
