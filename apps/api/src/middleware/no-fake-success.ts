/**
 * Phase 72 — No Fake Success Middleware
 *
 * Fastify onSend hook that validates API responses returning `ok: true`:
 *
 *   - MUST include an `effectProof` field (e.g. msgId, orderId, problemIen,
 *     ien, id, count, items, data, etc.) that proves something real happened, OR
 *   - MUST include a `pendingTargets` field naming VistA files/RPCs/queues
 *     that are not yet integrated.
 *
 * Responses that return `ok: true` with NEITHER field trigger a structured
 * warning in non-production and a tracked metric. In strict mode
 * (`NO_FAKE_SUCCESS_STRICT=true`), these become 500 errors.
 *
 * Exemptions:
 *   - Health/ready/ping endpoints (operational, not data)
 *   - Auth endpoints (login/logout/session)
 *   - Metrics/prometheus endpoints
 *   - WebSocket upgrade responses
 *   - Responses that already carry substantive data fields
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

const STRICT_MODE = process.env.NO_FAKE_SUCCESS_STRICT === "true";

/** URL patterns exempt from the no-fake-success check */
const EXEMPT_PATTERNS: RegExp[] = [
  /^\/(health|ready|vista\/ping|version)/,
  /^\/auth\//,
  /^\/portal\/auth\//,  // Portal auth (own session handling)
  /^\/metrics/,
  /^\/__/,       // Next.js internals
  /^\/ws\//,     // WebSocket routes
  /^\/favicon/,
];

/**
 * Fields that count as effect proof — if ANY of these exist and are
 * non-null/non-undefined in the response, the check passes.
 */
const EFFECT_PROOF_FIELDS = new Set([
  // Identity / record proofs
  "effectProof",
  "id",
  "ien",
  "dfn",
  "msgId",
  "orderId",
  "problemIen",
  "noteIen",
  "claimId",
  "sessionId",
  "accessionNumber",
  "roomId",
  "deviceId",
  "tenantId",
  "templateId",
  "ruleId",
  "policyId",
  "draftId",
  "jobId",

  // Collection proofs (data was fetched/produced)
  "items",
  "data",
  "results",
  "records",
  "entries",
  "rows",
  "events",
  "claims",
  "payers",
  "connectors",
  "patients",
  "allergies",
  "problems",
  "meds",
  "medications",
  "orders",
  "notes",
  "labs",
  "vitals",
  "appointments",
  "messages",
  "studies",
  "devices",
  "rooms",
  "modules",
  "capabilities",
  "adapters",
  "models",
  "prompts",
  "templates",
  "flags",
  "featureFlags",
  "enabledModules",
  "uiDefaults",
  "immunizations",
  "encounters",
  "diagnoses",
  "insurances",
  "refills",
  "tasks",
  "shares",
  "proxies",
  "filters",
  "languages",

  // Singular object proofs (single record returned)
  "message",
  "appointment",
  "result",
  "refill",
  "task",
  "share",
  "proxy",
  "attachment",
  "credential",
  "preview",
  "viewer",
  "requirements",
  "settings",

  // Mutation proofs
  "created",
  "updated",
  "deleted",
  "signed",
  "submitted",
  "exported",
  "linked",
  "verified",
  "acknowledged",
  "reset",
  "invalidated",
  "retried",

  // Write-back / operation fields
  "mode",
  "response",
  "rpcUsed",
  "syncPending",
  "joinUrl",
  "notice",
  "slaDisclaimer",
  "vistaSync",

  // Aggregate proofs
  "count",
  "total",
  "summary",
  "stats",
  "metrics",
  "report",
  "chain",
  "version",
  "uptime",

  // Read proofs with substantive payload
  "tenant",
  "claim",
  "payer",
  "connector",
  "patient",
  "session",
  "policy",
  "text",
  "content",
  "segments",
  "body",

  // VistA-grounded fields
  "rpcsUsed",
  "vistaFile",
  "vistaFiles",
  "rpc",
  "rpcs",
  "pending",

  // Pending target naming
  "pendingTargets",
  "vistaGrounding",
  "migrationPath",
  "sandboxNote",
  "targetRpc",
  "targetFile",
]);

/* ------------------------------------------------------------------ */
/* Violation tracker (in-memory for observability)                      */
/* ------------------------------------------------------------------ */

interface FakeSuccessViolation {
  url: string;
  method: string;
  timestamp: string;
  responseKeys: string[];
}

const violations: FakeSuccessViolation[] = [];
const MAX_VIOLATIONS = 500;

/** Get recent violations for the admin API */
export function getFakeSuccessViolations(): FakeSuccessViolation[] {
  return [...violations];
}

/** Get violation count */
export function getFakeSuccessViolationCount(): number {
  return violations.length;
}

/* ------------------------------------------------------------------ */
/* Hook registration                                                   */
/* ------------------------------------------------------------------ */

export function registerNoFakeSuccessHook(server: FastifyInstance): void {
  server.addHook(
    "onSend",
    async (request: FastifyRequest, reply: FastifyReply, payload: unknown) => {
      // Only check JSON responses
      if (typeof payload !== "string") return payload;

      // Skip exempt routes
      const url = request.url.split("?")[0];
      if (EXEMPT_PATTERNS.some((p) => p.test(url))) return payload;

      // Skip non-2xx responses (errors don't need effect proof)
      if (reply.statusCode < 200 || reply.statusCode >= 300) return payload;

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(payload);
      } catch {
        return payload; // Not JSON
      }

      // Only check responses with ok: true
      if (!parsed || parsed.ok !== true) return payload;

      // Check if any effect proof field is present
      const keys = Object.keys(parsed);
      const hasProof = keys.some((k) => {
        if (!EFFECT_PROOF_FIELDS.has(k)) return false;
        const val = parsed[k];
        // null/undefined don't count as proof
        return val !== null && val !== undefined;
      });

      if (hasProof) return payload;

      // VIOLATION: ok:true without any effect proof
      const violation: FakeSuccessViolation = {
        url,
        method: request.method,
        timestamp: new Date().toISOString(),
        responseKeys: keys,
      };

      // Track
      if (violations.length >= MAX_VIOLATIONS) violations.shift();
      violations.push(violation);

      // Log warning
      log.warn("No-fake-success violation: ok:true without effectProof or pendingTargets", {
        url,
        method: request.method,
        responseKeys: keys,
        requestId: (request as any).requestId,
      });

      if (STRICT_MODE) {
        // In strict mode, replace the response with an error
        reply.code(500);
        return JSON.stringify({
          ok: false,
          error: "Internal: response lacks effectProof (no-fake-success gate)",
          violation: { url, method: request.method, responseKeys: keys },
        });
      }

      // In non-strict mode, inject a warning header but pass through
      reply.header("X-Fake-Success-Warning", "missing-effect-proof");
      return payload;
    }
  );

  log.info(`No-fake-success hook registered (strict=${STRICT_MODE})`);
}
