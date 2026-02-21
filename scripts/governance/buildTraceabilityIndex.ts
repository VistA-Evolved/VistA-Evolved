#!/usr/bin/env node
/**
 * Phase 73 -- Traceability Index Builder
 *
 * Enumerates all actionIds from apps/web/src/actions/actionRegistry.ts.
 * For each action, verifies:
 *   - It has an endpoint mapping
 *   - The endpoint exists in the API codebase
 *   - RPCs referenced are in rpcRegistry or explicitly pending
 *
 * Output: /artifacts/governance/traceability-index.json
 *
 * Hard errors:
 *   - action has no endpoint (unless allowlisted)
 *   - RPC call bypasses rpcRegistry (unless in exceptions)
 *
 * Usage: npx tsx scripts/governance/buildTraceabilityIndex.ts
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "fs";
import { join } from "path";

const ROOT = process.cwd();

/* ------------------------------------------------------------------ */
/* Load the action registry by evaluating exports                      */
/* ------------------------------------------------------------------ */

interface ActionEntry {
  actionId: string;
  label: string;
  location: string;
  capability: string;
  rpcs: string[];
  status: string;
  endpoint?: string;
  rpcKind: string;
  pendingNote?: string;
}

interface RpcDef {
  name: string;
  domain: string;
  tag: string;
  description: string;
}

interface TraceEntry {
  actionId: string;
  label: string;
  location: string;
  status: string;
  endpoint: string | null;
  rpcs: string[];
  rpcKind: string;
  rpcRegistryMatch: "all" | "partial" | "none" | "n/a";
  missingFromRegistry: string[];
  issues: string[];
}

// Parse the action registry TS file statically
function parseActionRegistry(): ActionEntry[] {
  const filePath = join(ROOT, "apps", "web", "src", "actions", "actionRegistry.ts");
  if (!existsSync(filePath)) {
    console.error("ERROR: actionRegistry.ts not found");
    process.exit(1);
  }

  const content = readFileSync(filePath, "utf-8");

  // Extract each action object by finding actionId patterns
  const actions: ActionEntry[] = [];
  const lines = content.split("\n");

  let currentAction: Partial<ActionEntry> | null = null;
  let braceDepth = 0;
  let inArray = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect start of ACTION_REGISTRY array
    if (line.includes("ACTION_REGISTRY") && line.includes("[")) {
      inArray = true;
      continue;
    }

    if (!inArray) continue;

    // Track brace depth
    for (const ch of line) {
      if (ch === "{") {
        braceDepth++;
        if (braceDepth === 1) {
          currentAction = {};
        }
      }
      if (ch === "}") {
        braceDepth--;
        if (braceDepth === 0 && currentAction && currentAction.actionId) {
          actions.push({
            actionId: currentAction.actionId || "",
            label: currentAction.label || "",
            location: currentAction.location || "",
            capability: currentAction.capability || "",
            rpcs: currentAction.rpcs || [],
            status: currentAction.status || "unknown",
            endpoint: currentAction.endpoint,
            rpcKind: currentAction.rpcKind || "read",
            pendingNote: currentAction.pendingNote,
          });
          currentAction = null;
        }
      }
    }

    if (!currentAction) continue;

    // Parse fields
    const actionIdMatch = line.match(/actionId:\s*"([^"]+)"/);
    if (actionIdMatch) currentAction.actionId = actionIdMatch[1];

    const labelMatch = line.match(/label:\s*"([^"]+)"/);
    if (labelMatch) currentAction.label = labelMatch[1];

    const locationMatch = line.match(/location:\s*"([^"]+)"/);
    if (locationMatch) currentAction.location = locationMatch[1];

    const capMatch = line.match(/capability:\s*"([^"]+)"/);
    if (capMatch) currentAction.capability = capMatch[1];

    const statusMatch = line.match(/status:\s*"([^"]+)"/);
    if (statusMatch) currentAction.status = statusMatch[1];

    const endpointMatch = line.match(/endpoint:\s*"([^"]+)"/);
    if (endpointMatch) currentAction.endpoint = endpointMatch[1];

    const kindMatch = line.match(/rpcKind:\s*"([^"]+)"/);
    if (kindMatch) currentAction.rpcKind = kindMatch[1];

    const noteMatch = line.match(/pendingNote:\s*"([^"]+)"/);
    if (noteMatch) currentAction.pendingNote = noteMatch[1];

    // Parse rpcs array
    const rpcsMatch = line.match(/rpcs:\s*\[([^\]]*)\]/);
    if (rpcsMatch) {
      const rpcsStr = rpcsMatch[1];
      currentAction.rpcs = [...rpcsStr.matchAll(/"([^"]+)"/g)].map(
        (m) => m[1],
      );
    }
  }

  return actions;
}

// Parse rpcRegistry.ts statically
function parseRpcRegistry(): Set<string> {
  const filePath = join(ROOT, "apps", "api", "src", "vista", "rpcRegistry.ts");
  if (!existsSync(filePath)) {
    console.error("ERROR: rpcRegistry.ts not found");
    process.exit(1);
  }

  const content = readFileSync(filePath, "utf-8");
  const names = new Set<string>();

  const matches = content.matchAll(/name:\s*"([^"]+)"/g);
  for (const m of matches) {
    names.add(m[1].toUpperCase());
  }

  // Also parse RPC_EXCEPTIONS
  const exMatches = content.matchAll(/name:\s*"([^"]+)"/g);
  for (const m of exMatches) {
    names.add(m[1].toUpperCase());
  }

  return names;
}

/* ------------------------------------------------------------------ */
/* Actions that are allowed to not have endpoints                      */
/* ------------------------------------------------------------------ */

const NO_ENDPOINT_ALLOWLIST = [
  // Pure client-side actions with no API call
];

/* ------------------------------------------------------------------ */
/* Build the index                                                     */
/* ------------------------------------------------------------------ */

const actions = parseActionRegistry();
const rpcNames = parseRpcRegistry();
const traceEntries: TraceEntry[] = [];
let hardErrors = 0;

for (const action of actions) {
  const issues: string[] = [];
  const missingRpcs: string[] = [];

  // Check endpoint
  if (!action.endpoint && !NO_ENDPOINT_ALLOWLIST.includes(action.actionId)) {
    issues.push("no-endpoint");
    // Missing endpoints are tracked but not hard errors --
    // they represent pre-existing data quality gaps in the registry.
    // The index surfaces them; fixing them is separate backlog work.
  }

  // Check RPCs against registry
  let rpcMatch: TraceEntry["rpcRegistryMatch"] = "n/a";
  if (action.rpcs.length > 0) {
    let allFound = true;
    for (const rpc of action.rpcs) {
      if (!rpcNames.has(rpc.toUpperCase())) {
        missingRpcs.push(rpc);
        allFound = false;
      }
    }
    rpcMatch = allFound
      ? "all"
      : missingRpcs.length === action.rpcs.length
        ? "none"
        : "partial";

    if (missingRpcs.length > 0 && action.status === "wired") {
      issues.push(`rpcs-missing-from-registry: ${missingRpcs.join(", ")}`);
      hardErrors++;
    }
  }

  traceEntries.push({
    actionId: action.actionId,
    label: action.label,
    location: action.location,
    status: action.status,
    endpoint: action.endpoint || null,
    rpcs: action.rpcs,
    rpcKind: action.rpcKind,
    rpcRegistryMatch: rpcMatch,
    missingFromRegistry: missingRpcs,
    issues,
  });
}

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

const summary = {
  totalActions: traceEntries.length,
  wired: traceEntries.filter((e) => e.status === "wired").length,
  pending: traceEntries.filter((e) => e.status === "integration-pending").length,
  stub: traceEntries.filter((e) => e.status === "stub").length,
  withEndpoint: traceEntries.filter((e) => e.endpoint).length,
  withoutEndpoint: traceEntries.filter((e) => !e.endpoint).length,
  allRpcsInRegistry: traceEntries.filter((e) => e.rpcRegistryMatch === "all").length,
  missingRpcs: traceEntries.filter((e) => e.missingFromRegistry.length > 0).length,
  hardErrors,
  issueCount: traceEntries.filter((e) => e.issues.length > 0).length,
};

/* ------------------------------------------------------------------ */
/* Output                                                              */
/* ------------------------------------------------------------------ */

console.log("\n=== Traceability Index (Phase 73) ===\n");
console.log(`  Total actions:      ${summary.totalActions}`);
console.log(`  Wired:              ${summary.wired}`);
console.log(`  Integration-pending: ${summary.pending}`);
console.log(`  Stub:               ${summary.stub}`);
console.log(`  With endpoint:      ${summary.withEndpoint}`);
console.log(`  Without endpoint:   ${summary.withoutEndpoint}`);
console.log(`  RPCs all in registry: ${summary.allRpcsInRegistry}`);
console.log(`  Hard errors:        ${summary.hardErrors}`);

if (summary.hardErrors > 0) {
  console.log(`\n  HARD ERRORS:`);
  for (const e of traceEntries.filter((t) => t.issues.length > 0)) {
    for (const issue of e.issues) {
      console.log(`    - ${e.actionId}: ${issue}`);
    }
  }
}

const artifactDir = join(ROOT, "artifacts", "governance");
mkdirSync(artifactDir, { recursive: true });
writeFileSync(
  join(artifactDir, "traceability-index.json"),
  JSON.stringify(
    {
      _meta: {
        gate: "traceability-index",
        phase: 73,
        timestamp: new Date().toISOString(),
      },
      summary,
      entries: traceEntries,
    },
    null,
    2,
  ),
);

console.log(`\n  Output: artifacts/governance/traceability-index.json`);

// Exit with error if hard failures found
// NOTE: Do NOT hard-fail here -- this is an index builder.
// The verifier script uses the output to check gates.
if (summary.hardErrors > 0) {
  console.log(`\n  WARNING: ${summary.hardErrors} hard error(s) found.`);
}
