/**
 * Phase 54 -- Action Trace Audit Module
 *
 * Verifies the actionId -> endpoint -> RPC mapping completeness:
 *   1. Every action references RPCs that exist in rpcRegistry
 *   2. Every action's RPC is called somewhere in the API source
 *   3. Stubs and integration-pending actions are documented
 */

import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, relative, extname } from "path";
import type { AuditModule, AuditFinding } from "../types.js";

const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", ".turbo", "coverage", ".pnpm"]);

function collectFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectFiles(full));
    } else if (stat.isFile() && SCAN_EXTENSIONS.has(extname(entry))) {
      results.push(full);
    }
  }
  return results;
}

interface ActionEntry {
  actionId: string;
  label: string;
  location: string;
  rpcs: string[];
  status: string;
  pendingNote?: string;
}

export const actionTraceAudit: AuditModule = {
  name: "actionTraceAudit",
  requires: "offline",

  async run(root: string): Promise<AuditFinding[]> {
    const findings: AuditFinding[] = [];

    const registryFile = join(root, "apps", "web", "src", "actions", "actionRegistry.ts");
    if (!existsSync(registryFile)) {
      findings.push({
        rule: "action-registry-exists",
        status: "fail",
        severity: "critical",
        message: "actionRegistry.ts not found",
      });
      return findings;
    }

    const registrySource = readFileSync(registryFile, "utf-8");

    // Parse action entries from source
    const actions: ActionEntry[] = [];
    const actionBlockRe = /\{\s*actionId:\s*["']([^"']+)["'][\s\S]*?status:\s*["']([^"']+)["'][\s\S]*?\}/g;

    let m: RegExpExecArray | null;
    while ((m = actionBlockRe.exec(registrySource)) !== null) {
      const block = m[0];
      const actionId = m[1];
      const status = m[2];

      // Extract label
      const labelM = block.match(/label:\s*["']([^"']+)["']/);
      const label = labelM ? labelM[1] : actionId;

      // Extract location
      const locM = block.match(/location:\s*["']([^"']+)["']/);
      const location = locM ? locM[1] : "unknown";

      // Extract rpcs array
      const rpcsM = block.match(/rpcs:\s*\[([\s\S]*?)\]/);
      const rpcs: string[] = [];
      if (rpcsM) {
        const rpcItems = rpcsM[1].matchAll(/["']([^"']+)["']/g);
        for (const ri of rpcItems) {
          rpcs.push(ri[1]);
        }
      }

      // Extract pendingNote
      const noteM = block.match(/pendingNote:\s*["']([^"']+)["']/);

      actions.push({
        actionId,
        label,
        location,
        rpcs,
        status,
        pendingNote: noteM ? noteM[1] : undefined,
      });
    }

    findings.push({
      rule: "actions-parsed",
      status: "pass",
      severity: "info",
      message: `Parsed ${actions.length} actions from actionRegistry`,
    });

    // Load RPC registry names for cross-ref
    const rpcRegistryFile = join(root, "apps", "api", "src", "vista", "rpcRegistry.ts");
    const rpcNames = new Set<string>();
    if (existsSync(rpcRegistryFile)) {
      const rpcSrc = readFileSync(rpcRegistryFile, "utf-8");
      const nameRe = /name:\s*["']([^"']+)["']/g;
      let rm: RegExpExecArray | null;
      while ((rm = nameRe.exec(rpcSrc)) !== null) {
        rpcNames.add(rm[1].toUpperCase());
      }
    }

    // Check 1: every action RPC exists in rpcRegistry
    let missingRpcCount = 0;
    for (const action of actions) {
      for (const rpc of action.rpcs) {
        if (!rpcNames.has(rpc.toUpperCase())) {
          missingRpcCount++;
          findings.push({
            rule: "action-rpc-in-registry",
            status: "fail",
            severity: "high",
            message: `Action "${action.actionId}" references RPC "${rpc}" not in rpcRegistry`,
            file: "apps/web/src/actions/actionRegistry.ts",
            fix: `Add "${rpc}" to RPC_REGISTRY or RPC_EXCEPTIONS`,
          });
        }
      }
    }
    if (missingRpcCount === 0) {
      findings.push({
        rule: "action-rpc-in-registry",
        status: "pass",
        severity: "info",
        message: "All action RPCs exist in rpcRegistry",
      });
    }

    // Check 2: scan API source to verify RPCs are called
    const apiSrc = join(root, "apps", "api", "src");
    const apiFiles = collectFiles(apiSrc);
    const calledRpcs = new Set<string>();
    const rpcCallPattern = /(?:callRpc|safeCallRpc|callRpcWithList|safeCallRpcWithList)\s*\(\s*["']([^"']+)["']/g;

    for (const file of apiFiles) {
      const content = readFileSync(file, "utf-8");
      let cm: RegExpExecArray | null;
      rpcCallPattern.lastIndex = 0;
      while ((cm = rpcCallPattern.exec(content)) !== null) {
        calledRpcs.add(cm[1].toUpperCase());
      }
    }

    // For wired actions, verify their RPCs are actually called
    const wiredActions = actions.filter((a) => a.status === "wired");
    const unwiredRpcs: { action: string; rpc: string }[] = [];
    for (const action of wiredActions) {
      for (const rpc of action.rpcs) {
        if (!calledRpcs.has(rpc.toUpperCase())) {
          unwiredRpcs.push({ action: action.actionId, rpc });
        }
      }
    }

    if (unwiredRpcs.length === 0) {
      findings.push({
        rule: "wired-rpcs-called",
        status: "pass",
        severity: "info",
        message: `All wired action RPCs (${wiredActions.length} actions) are called in API source`,
      });
    } else {
      for (const u of unwiredRpcs) {
        findings.push({
          rule: "wired-rpcs-called",
          status: "warn",
          severity: "medium",
          message: `Wired action "${u.action}" references RPC "${u.rpc}" not found in callRpc patterns`,
          fix: "Verify the RPC is called via a different pattern or mark action as stub",
        });
      }
    }

    // Check 3: stub/pending actions should have pendingNote
    const stubActions = actions.filter((a) => a.status === "stub" || a.status === "integration-pending");
    const missingNotes = stubActions.filter((a) => !a.pendingNote);
    if (missingNotes.length === 0) {
      findings.push({
        rule: "stub-has-note",
        status: "pass",
        severity: "info",
        message: `All ${stubActions.length} stub/pending actions have pendingNote`,
      });
    } else {
      for (const a of missingNotes) {
        findings.push({
          rule: "stub-has-note",
          status: "warn",
          severity: "low",
          message: `${a.status} action "${a.actionId}" has no pendingNote`,
          fix: `Add pendingNote explaining what's missing`,
        });
      }
    }

    // Summary stats
    const wired = actions.filter((a) => a.status === "wired").length;
    const stubs = actions.filter((a) => a.status === "stub").length;
    const pending = actions.filter((a) => a.status === "integration-pending").length;
    findings.push({
      rule: "action-stats",
      status: "pass",
      severity: "info",
      message: `Actions: ${actions.length} total, ${wired} wired, ${stubs} stub, ${pending} integration-pending`,
    });

    return findings;
  },
};
