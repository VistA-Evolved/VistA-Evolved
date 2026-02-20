#!/usr/bin/env node
/**
 * Phase 55 -- Extract UI actions from Delphi CPRS source
 *
 * Scans .pas files for:
 *   - TMenuItem handler assignments (OnClick = ...)
 *   - TAction handlers
 *   - procedure names matching common action patterns
 *   - mnuXxx / actXxx / popXxx identifiers
 *
 * Output: /artifacts/cprs/delphi-actions.json
 *
 * Usage: npx tsx scripts/cprs/extractDelphiActions.ts
 */

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, relative, extname } from "path";

const ROOT = process.cwd();
const DELPHI_ROOT = join(ROOT, "reference", "cprs");
const CHART_ROOT = join(DELPHI_ROOT, "Packages", "Order Entry Results Reporting", "CPRS", "CPRS-Chart");
const OUT_DIR = join(ROOT, "artifacts", "cprs");

const SKIP_DIRS = new Set([".git", "node_modules", "dcu", "__history"]);

interface DelphiAction {
  identifier: string;
  kind: "menuItem" | "action" | "popupItem" | "toolButton" | "handler";
  handler?: string;
  caption?: string;
  sourceFile: string;
  line: number;
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
      join(OUT_DIR, "delphi-actions.json"),
      JSON.stringify({ _meta: { source: scanRoot, status: "directory-not-found" }, actions: [] }, null, 2),
    );
    return;
  }

  console.log(`Scanning Delphi sources in ${relative(ROOT, scanRoot)}...`);

  const actions: DelphiAction[] = [];

  // Scan .dfm files for UI components
  const dfmFiles = collectFiles(scanRoot, ".dfm");
  console.log(`  Found ${dfmFiles.length} .dfm files`);

  for (const file of dfmFiles) {
    let content: string;
    try { content = readFileSync(file, "utf-8"); } catch {
      try { content = readFileSync(file, "latin1"); } catch { continue; }
    }
    const rel = relative(DELPHI_ROOT, file).replace(/\\/g, "/");
    const lines = content.split("\n");

    let currentComponent = "";
    let currentKind: DelphiAction["kind"] = "handler";
    let currentCaption = "";
    let componentLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // object mnuXxx: TMenuItem
      const objMatch = line.match(/^(?:object|inherited)\s+(\w+):\s+T(\w+)/);
      if (objMatch) {
        const [, name, typeName] = objMatch;
        if (/MenuItem/i.test(typeName)) {
          currentComponent = name;
          currentKind = "menuItem";
          currentCaption = "";
          componentLine = i + 1;
        } else if (/Action$/i.test(typeName)) {
          currentComponent = name;
          currentKind = "action";
          currentCaption = "";
          componentLine = i + 1;
        } else if (/PopupMenu|PopupItem/i.test(typeName)) {
          currentComponent = name;
          currentKind = "popupItem";
          currentCaption = "";
          componentLine = i + 1;
        } else if (/ToolButton/i.test(typeName)) {
          currentComponent = name;
          currentKind = "toolButton";
          currentCaption = "";
          componentLine = i + 1;
        } else {
          currentComponent = "";
        }
        continue;
      }

      if (currentComponent) {
        // Caption = 'New Note'
        const capMatch = line.match(/Caption\s*=\s*'([^']*)'/);
        if (capMatch) currentCaption = capMatch[1];

        // OnClick = mnuActNewClick
        const clickMatch = line.match(/OnClick\s*=\s*(\w+)/);
        if (clickMatch) {
          actions.push({
            identifier: currentComponent,
            kind: currentKind,
            handler: clickMatch[1],
            caption: currentCaption || undefined,
            sourceFile: rel,
            line: componentLine,
          });
        }

        // end of component
        if (line === "end") {
          currentComponent = "";
        }
      }
    }
  }

  // Scan .pas files for procedure handlers that match action patterns
  const pasFiles = collectFiles(scanRoot, ".pas");
  console.log(`  Found ${pasFiles.length} .pas files`);

  const handlerPattern = /^procedure\s+\w+\.(mnu\w+Click|act\w+Execute|pop\w+Click|btn\w+Click|cmd\w+Click)/i;

  for (const file of pasFiles) {
    let content: string;
    try { content = readFileSync(file, "utf-8"); } catch {
      try { content = readFileSync(file, "latin1"); } catch { continue; }
    }
    const rel = relative(DELPHI_ROOT, file).replace(/\\/g, "/");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(handlerPattern);
      if (m) {
        // Only add if not already captured from .dfm
        const handlerName = m[1];
        if (!actions.some((a) => a.handler === handlerName && a.sourceFile.replace(".dfm", ".pas") === rel)) {
          actions.push({
            identifier: handlerName,
            kind: "handler",
            handler: handlerName,
            sourceFile: rel,
            line: i + 1,
          });
        }
      }
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const output = {
    _meta: {
      source: relative(ROOT, scanRoot),
      extractedAt: new Date().toISOString(),
      dfmFilesScanned: dfmFiles.length,
      pasFilesScanned: pasFiles.length,
      totalActions: actions.length,
    },
    actions: actions.sort((a, b) => a.identifier.localeCompare(b.identifier)),
  };

  writeFileSync(join(OUT_DIR, "delphi-actions.json"), JSON.stringify(output, null, 2));
  console.log(`\nExtracted ${actions.length} UI actions`);
  console.log(`Output: artifacts/cprs/delphi-actions.json`);
}

main();
