/**
 * Phase 54 -- Docs Policy Audit Module
 *
 * Checks for forbidden directories and verify output leaks.
 */

import { readdirSync, statSync, existsSync } from "fs";
import { join, relative } from "path";
import type { AuditModule, AuditFinding } from "../types.js";

export const docsPolicyAudit: AuditModule = {
  name: "docsPolicyAudit",
  requires: "offline",

  async run(root: string): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];

    // Forbidden directories
    const FORBIDDEN = [
      { path: "reports", rule: "no-root-reports" },
      { path: join("docs", "reports"), rule: "no-docs-reports" },
      { path: join("docs", "verify"), rule: "no-docs-verify" },
    ];

    for (const { path, rule } of FORBIDDEN) {
      const fullPath = join(root, path);
      if (existsSync(fullPath) && statSync(fullPath).isDirectory()) {
        const files = readdirSync(fullPath);
        if (files.length > 0) {
          findings.push({
            rule,
            status: "fail",
            severity: "high",
            message: `Forbidden dir '${path}' has ${files.length} file(s). Move to /artifacts/`,
            file: path,
            fix: `Move contents to artifacts/ and git rm -r ${path}`,
          });
        } else {
          findings.push({
            rule,
            status: "warn",
            severity: "low",
            message: `Empty forbidden dir '${path}' exists`,
            file: path,
            fix: `rm -rf ${path}`,
          });
        }
      } else {
        findings.push({
          rule,
          status: "pass",
          severity: "info",
          message: `No forbidden dir '${path}'`,
        });
      }
    }

    // Verify output patterns in docs/
    const VERIFY_PATTERNS = [
      /phase\d+-verify-report\.md$/i,
      /verify-output/i,
      /phase\d+-verify\.md$/i,
    ];

    const docsDir = join(root, "docs");
    let verifyLeaks = 0;

    function scanDir(dir: string) {
      if (!existsSync(dir)) return;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "evidence" || entry.name === "node_modules") continue;
          scanDir(full);
        } else {
          for (const pat of VERIFY_PATTERNS) {
            if (pat.test(entry.name)) {
              verifyLeaks++;
              findings.push({
                rule: "no-verify-in-docs",
                status: "fail",
                severity: "medium",
                message: `Verify output '${entry.name}' in docs/`,
                file: relative(root, full),
                fix: `Move to artifacts/ and git rm`,
              });
            }
          }
        }
      }
    }

    scanDir(docsDir);

    if (verifyLeaks === 0) {
      findings.push({
        rule: "no-verify-in-docs",
        status: "pass",
        severity: "info",
        message: "No verify output files found in docs/",
      });
    }

    // Check ops/ for stray verify reports
    const opsDir = join(root, "ops");
    if (existsSync(opsDir)) {
      const opsFiles = readdirSync(opsDir);
      const opsVerify = opsFiles.filter((f) =>
        /verify-report|verify-output/i.test(f)
      );
      if (opsVerify.length > 0) {
        for (const f of opsVerify) {
          findings.push({
            rule: "no-verify-in-ops",
            status: "fail",
            severity: "medium",
            message: `Verify output '${f}' in ops/`,
            file: `ops/${f}`,
            fix: `Move to artifacts/ and git rm`,
          });
        }
      } else {
        findings.push({
          rule: "no-verify-in-ops",
          status: "pass",
          severity: "info",
          message: "No verify outputs in ops/",
        });
      }
    }

    return findings;
  },
};
