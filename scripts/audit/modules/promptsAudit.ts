/**
 * Phase 54 -- Prompts Audit Module
 *
 * Delegates to the Phase 53 auditPrompts.ts and translates results
 * into the Audit v2 finding format.
 */

import { readdirSync, statSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import type { AuditModule, AuditFinding } from "../types.js";

export const promptsAudit: AuditModule = {
  name: "promptsAudit",
  requires: "offline",

  async run(root: string): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];
    const promptsDir = join(root, "prompts");

    if (!existsSync(promptsDir)) {
      findings.push({
        rule: "prompts-dir-exists",
        status: "fail",
        severity: "critical",
        message: "prompts/ directory not found",
      });
      return findings;
    }

    const allEntries = readdirSync(promptsDir)
      .filter((e) => statSync(join(promptsDir, e)).isDirectory())
      .sort();

    const PHASE_RE = /^(\d{2})-PHASE-(\d+[A-Z]?)-(.+)$/;
    const phaseFolders = allEntries.filter((e) => /^\d{2}-/.test(e) && !e.startsWith("00-"));

    // Check: unique prefixes
    const prefixMap = new Map<string, string[]>();
    for (const f of phaseFolders) {
      const m = f.match(/^(\d{2})-/);
      if (m) {
        const p = m[1];
        if (!prefixMap.has(p)) prefixMap.set(p, []);
        prefixMap.get(p)!.push(f);
      }
    }
    const dupes = [...prefixMap.entries()].filter(([_, v]) => v.length > 1);
    if (dupes.length === 0) {
      findings.push({
        rule: "unique-prefixes",
        status: "pass",
        severity: "info",
        message: `All ${prefixMap.size} folder prefixes are unique`,
      });
    } else {
      for (const [p, folders] of dupes) {
        findings.push({
          rule: "unique-prefixes",
          status: "fail",
          severity: "high",
          message: `Duplicate prefix ${p}: ${folders.join(", ")}`,
        });
      }
    }

    // Check: IMPLEMENT + VERIFY files
    let missingImplement = 0;
    let missingVerify = 0;
    for (const folder of phaseFolders) {
      const m = folder.match(PHASE_RE);
      if (!m) continue;
      const prefix = m[1];
      const folderPath = join(promptsDir, folder);
      const files = readdirSync(folderPath);

      const hasImplement = files.some((f) => f.match(new RegExp(`^${prefix}-01-IMPLEMENT\\.md$`)));
      const hasVerify = files.some((f) => f.match(new RegExp(`^${prefix}-99-VERIFY\\.md$`)));

      // Check for legacy patterns
      const hasLegacyPrompt = files.some((f) => f === "prompt.md");
      const hasAnyMd = files.some((f) => f.endsWith(".md"));

      if (!hasImplement) {
        if (hasLegacyPrompt || hasAnyMd) {
          // Legacy pattern -- warn only
          findings.push({
            rule: "implement-file",
            status: "warn",
            severity: "low",
            message: `${folder}: missing ${prefix}-01-IMPLEMENT.md (has legacy .md files)`,
            file: `prompts/${folder}`,
          });
        } else {
          missingImplement++;
          findings.push({
            rule: "implement-file",
            status: "fail",
            severity: "high",
            message: `${folder}: missing ${prefix}-01-IMPLEMENT.md`,
            file: `prompts/${folder}`,
          });
        }
      }

      if (!hasVerify) {
        if (hasLegacyPrompt || hasAnyMd) {
          findings.push({
            rule: "verify-file",
            status: "warn",
            severity: "low",
            message: `${folder}: missing ${prefix}-99-VERIFY.md (has legacy .md files)`,
            file: `prompts/${folder}`,
          });
        } else {
          missingVerify++;
          findings.push({
            rule: "verify-file",
            status: "fail",
            severity: "high",
            message: `${folder}: missing ${prefix}-99-VERIFY.md`,
            file: `prompts/${folder}`,
          });
        }
      }
    }

    if (missingImplement === 0 && missingVerify === 0) {
      findings.push({
        rule: "prompt-files-complete",
        status: "pass",
        severity: "info",
        message: `All phase folders have required prompt files (or legacy pattern)`,
      });
    }

    findings.push({
      rule: "prompts-total",
      status: "pass",
      severity: "info",
      message: `${phaseFolders.length} phase folders audited`,
    });

    return findings;
  },
};
