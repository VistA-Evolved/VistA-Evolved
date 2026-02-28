/**
 * Evidence Gate — Phase 142: RCM Operational Excellence
 *
 * Checks the integration_evidence registry before allowing payer API calls.
 * If no verified evidence exists, the call is routed to manual workflow
 * and an audit event is logged.
 *
 * Evidence freshness:
 *   - last_verified_at > 90 days ago → stale warning
 *   - RCM_EVIDENCE_STRICT=true → stale evidence blocks the call
 *
 * Non-negotiable: Never fabricate payer API calls. If evidence is missing,
 * produce print-ready packets and route to manual/contracting_needed.
 */

import { findByPayerAndMethod, listByPayer } from "./evidence-registry-repo.js";
import { appendRcmAudit } from "../audit/rcm-audit.js";
import { log } from "../../lib/logger.js";

/* ── Config ────────────────────────────────────────────────── */

const STALENESS_DAYS = parseInt(process.env.RCM_EVIDENCE_STALENESS_DAYS ?? "90", 10) || 90;
const STRICT_MODE = process.env.RCM_EVIDENCE_STRICT === "true";

/* ── Types ─────────────────────────────────────────────────── */

export type EvidenceGateResult =
  | { allowed: true; status: "verified"; payerId: string; method: string; evidenceId: string; staleWarning: boolean; lastVerified: string | null }
  | { allowed: false; status: "missing" | "stale" | "unverified"; payerId: string; method: string; reason: string; recommendation: string };

/* ── Gate Check ────────────────────────────────────────────── */

/**
 * Check whether a payer + method combination has verified evidence.
 * Returns an EvidenceGateResult describing whether the call is allowed.
 */
export async function checkEvidenceGate(
  payerId: string,
  method: string,
  actor?: string,
): Promise<EvidenceGateResult> {
  const evidence = await findByPayerAndMethod(payerId, method);

  // No evidence at all
  if (!evidence) {
    const result: EvidenceGateResult = {
      allowed: false,
      status: "missing",
      payerId,
      method,
      reason: `No integration evidence for payer ${payerId} method ${method}`,
      recommendation: "Route to manual workflow. Register evidence via /rcm/evidence before attempting direct integration.",
    };

    appendRcmAudit("evidence.gate_blocked", {
      userId: actor,
      detail: {
        payerId,
        method,
        gateResult: "missing",
        recommendation: result.recommendation,
      },
    });

    log.info("Evidence gate: BLOCKED (missing)", { payerId, method });
    return result;
  }

  // Evidence exists but not verified
  if (evidence.status !== "verified") {
    const result: EvidenceGateResult = {
      allowed: false,
      status: "unverified",
      payerId,
      method,
      reason: `Evidence exists but status is '${evidence.status}' (not verified)`,
      recommendation: "Verify the evidence record before attempting direct integration.",
    };

    appendRcmAudit("evidence.gate_blocked", {
      userId: actor,
      detail: {
        payerId,
        method,
        evidenceId: evidence.id,
        evidenceStatus: evidence.status,
        gateResult: "unverified",
      },
    });

    log.info("Evidence gate: BLOCKED (unverified)", { payerId, method, evidenceStatus: evidence.status });
    return result;
  }

  // Check staleness
  const staleWarning = isStale(evidence.lastVerifiedAt);

  if (staleWarning && STRICT_MODE) {
    const result: EvidenceGateResult = {
      allowed: false,
      status: "stale",
      payerId,
      method,
      reason: `Evidence last verified ${evidence.lastVerifiedAt ?? "never"} — exceeds ${STALENESS_DAYS}-day threshold (strict mode)`,
      recommendation: "Re-verify evidence or disable strict mode (RCM_EVIDENCE_STRICT=false).",
    };

    appendRcmAudit("evidence.gate_blocked", {
      userId: actor,
      detail: {
        payerId,
        method,
        evidenceId: evidence.id,
        gateResult: "stale_strict",
        lastVerified: evidence.lastVerifiedAt,
        thresholdDays: STALENESS_DAYS,
      },
    });

    log.warn("Evidence gate: BLOCKED (stale, strict mode)", {
      payerId,
      method,
      lastVerified: evidence.lastVerifiedAt,
    });
    return result;
  }

  // Evidence is verified (with optional stale warning)
  if (staleWarning) {
    appendRcmAudit("evidence.stale_warning", {
      userId: actor,
      detail: {
        payerId,
        method,
        evidenceId: evidence.id,
        lastVerified: evidence.lastVerifiedAt,
        thresholdDays: STALENESS_DAYS,
      },
    });
    log.info("Evidence gate: ALLOWED (stale warning)", { payerId, method });
  }

  return {
    allowed: true,
    status: "verified",
    payerId,
    method,
    evidenceId: evidence.id,
    staleWarning,
    lastVerified: evidence.lastVerifiedAt,
  };
}

/**
 * Bulk check all evidence for a payer across all methods.
 */
export async function checkPayerEvidenceOverview(payerId: string): Promise<{
  payerId: string;
  methods: Array<{
    method: string;
    status: string;
    lastVerified: string | null;
    stale: boolean;
  }>;
  hasAnyVerified: boolean;
  recommendation: string;
}> {
  const records = await listByPayer(payerId);

  if (records.length === 0) {
    return {
      payerId,
      methods: [],
      hasAnyVerified: false,
      recommendation: "No evidence registered. All integrations must route through manual workflow.",
    };
  }

  const methods = records.map((r) => ({
    method: r.method,
    status: r.status,
    lastVerified: r.lastVerifiedAt,
    stale: isStale(r.lastVerifiedAt),
  }));

  const hasAnyVerified = methods.some((m) => m.status === "verified" && !m.stale);

  return {
    payerId,
    methods,
    hasAnyVerified,
    recommendation: hasAnyVerified
      ? "At least one verified method available."
      : "No current verified evidence. Route to manual workflow until evidence is registered and verified.",
  };
}

/* ── Helpers ────────────────────────────────────────────────── */

function isStale(lastVerifiedAt: string | null | undefined): boolean {
  if (!lastVerifiedAt) return true;
  const verifiedDate = new Date(lastVerifiedAt);
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - STALENESS_DAYS);
  return verifiedDate < thresholdDate;
}
