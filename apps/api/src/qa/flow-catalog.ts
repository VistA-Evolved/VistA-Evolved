/**
 * QA Flow Catalog — Loader + Runner
 *
 * Phase 96B: QA/Audit OS v1.1
 *
 * Loads declarative JSON flow definitions from config/qa-flows/
 * and provides a runner that executes flows against the API.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { QaFlow, QaFlowResult, QaStepResult } from "./types.js";

/* ── Config ───────────────────────────────────────────────── */

const FLOWS_DIR = resolve(
  process.env.QA_FLOWS_DIR || join(process.cwd(), "..", "..", "config", "qa-flows")
);

/* ── Catalog ──────────────────────────────────────────────── */

const catalog = new Map<string, QaFlow>();

/**
 * Load all QA flow JSON files from the flows directory.
 */
export function loadFlowCatalog(): { loaded: number; errors: string[] } {
  catalog.clear();
  const errors: string[] = [];

  if (!existsSync(FLOWS_DIR)) {
    return { loaded: 0, errors: [`Flows directory not found: ${FLOWS_DIR}`] };
  }

  const files = readdirSync(FLOWS_DIR).filter((f) => f.endsWith(".json") && f !== "schema.json");

  for (const file of files) {
    try {
      let raw = readFileSync(join(FLOWS_DIR, file), "utf-8");
      // BOM strip (BUG-064)
      if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
      const flow: QaFlow = JSON.parse(raw);

      if (!flow.id || !flow.name || !Array.isArray(flow.steps)) {
        errors.push(`${file}: missing id, name, or steps`);
        continue;
      }

      const validDomains = ["system", "auth", "clinical", "rcm", "imaging", "qa", "admin"];
      const validPriorities = ["smoke", "regression", "deep"];
      if (flow.domain && !validDomains.includes(flow.domain)) {
        errors.push(`${file}: invalid domain '${flow.domain}'`);
      }
      if (flow.priority && !validPriorities.includes(flow.priority)) {
        errors.push(`${file}: invalid priority '${flow.priority}'`);
      }

      catalog.set(flow.id, flow);
    } catch (err) {
      errors.push(`${file}: ${(err as Error).message}`);
    }
  }

  return { loaded: catalog.size, errors };
}

/**
 * Get all loaded flows.
 */
export function getAllFlows(): QaFlow[] {
  return [...catalog.values()];
}

/**
 * Get a flow by ID.
 */
export function getFlowById(id: string): QaFlow | undefined {
  return catalog.get(id);
}

/**
 * Get flows by priority.
 */
export function getFlowsByPriority(priority: 'smoke' | 'regression' | 'deep'): QaFlow[] {
  return [...catalog.values()].filter((f) => f.priority === priority);
}

/**
 * Get flows by domain.
 */
export function getFlowsByDomain(domain: string): QaFlow[] {
  return [...catalog.values()].filter((f) => f.domain === domain);
}

/* ── Runner ───────────────────────────────────────────────── */

/**
 * Execute a QA flow against the API.
 *
 * @param flow - The flow to execute
 * @param baseUrl - API base URL (e.g. http://localhost:3001)
 * @param variables - Initial variables (e.g. { patientDfn: "3" })
 * @param cookie - Session cookie for authenticated requests
 */
export async function executeFlow(
  flow: QaFlow,
  baseUrl: string,
  variables: Record<string, string> = {},
  cookie?: string
): Promise<QaFlowResult> {
  const startedAt = new Date().toISOString();
  const vars = { ...variables };
  const stepResults: QaStepResult[] = [];

  for (const step of flow.steps) {
    const stepStart = Date.now();

    // Resolve variables in path and body
    let path = resolveTemplate(step.path, vars);
    const body = step.body ? JSON.parse(resolveTemplate(JSON.stringify(step.body), vars)) : undefined;

    try {
      if (step.delayMs) {
        await new Promise((r) => setTimeout(r, step.delayMs));
      }

      const url = `${baseUrl}${path}`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (cookie) {
        headers["Cookie"] = cookie;
        // Extract CSRF token from cookie string for double-submit pattern
        const csrfMatch = cookie.match(/ehr_csrf=([^;]+)/);
        if (csrfMatch) headers["x-csrf-token"] = csrfMatch[1];
      }

      const res = await fetch(url, {
        method: step.method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const resBody = await res.json().catch(() => ({}));
      const durationMs = Date.now() - stepStart;

      // Extract variables
      const extracted: Record<string, string> = {};
      if (step.extract) {
        for (const [varName, jsonPath] of Object.entries(step.extract)) {
          const val = resolveJsonPath(resBody, jsonPath);
          if (val !== undefined) {
            vars[varName] = String(val);
            extracted[varName] = String(val);
          }
        }
      }

      // Check assertions
      let assertionFailed = false;
      if (step.assertions) {
        for (const [jsonPath, expected] of Object.entries(step.assertions)) {
          const actual = resolveJsonPath(resBody, jsonPath);
          if (actual !== expected) {
            assertionFailed = true;
          }
        }
      }

      const statusOk = step.expectedStatus == null || res.status === step.expectedStatus;
      const passed = statusOk && !assertionFailed;

      stepResults.push({
        step: step.step,
        description: step.description ?? `Step ${step.step}`,
        path,
        status: passed ? "passed" : step.optional ? "skipped" : "failed",
        durationMs,
        httpStatus: res.status,
        error: !passed ? `Expected ${step.expectedStatus ?? "any 2xx"}, got ${res.status}${assertionFailed ? " + assertion failed" : ""}` : undefined,
        extracted: Object.keys(extracted).length > 0 ? extracted : undefined,
      });

      // Stop on non-optional failure
      if (!passed && !step.optional) break;
    } catch (err) {
      stepResults.push({
        step: step.step,
        description: step.description,
        path,
        status: step.optional ? "skipped" : "failed",
        durationMs: Date.now() - stepStart,
        error: (err as Error).message,
      });
      if (!step.optional) break;
    }
  }

  const completedAt = new Date().toISOString();
  const passedSteps = stepResults.filter((s) => s.status === "passed").length;
  const failedSteps = stepResults.filter((s) => s.status === "failed").length;
  const skippedSteps = stepResults.filter((s) => s.status === "skipped").length;

  return {
    flowId: flow.id,
    flowName: flow.name,
    startedAt,
    completedAt,
    durationMs: new Date(completedAt).getTime() - new Date(startedAt).getTime(),
    totalSteps: flow.steps.length,
    passedSteps,
    failedSteps,
    skippedSteps,
    status: failedSteps === 0 ? "passed" : passedSteps > 0 ? "partial" : "failed",
    stepResults,
    variables: vars,
  };
}

/* ── Helpers ──────────────────────────────────────────────── */

/**
 * Replace {{variable}} placeholders in a string.
 */
function resolveTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

/**
 * Simple dot-path JSON accessor: "ok" or "data.items.0.id"
 */
function resolveJsonPath(obj: any, path: string): any {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

/* ── Results Store (in-memory) ────────────────────────────── */

const MAX_RESULTS = 200;
const results: QaFlowResult[] = [];

export function storeFlowResult(result: QaFlowResult): void {
  results.push(result);
  if (results.length > MAX_RESULTS) results.shift();
}

export function getRecentFlowResults(limit = 50): QaFlowResult[] {
  return results.slice(-limit).reverse();
}

export function getFlowResultsByFlowId(flowId: string): QaFlowResult[] {
  return results.filter((r) => r.flowId === flowId).reverse();
}
