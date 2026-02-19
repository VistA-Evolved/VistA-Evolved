/**
 * AI Gateway — Audit Log (Phase 33)
 *
 * Every AI gateway invocation is audit-logged:
 * prompt hash + model + inputs/outputs + user role + patient context.
 *
 * PHI-safe: actor and patient IDs are hashed, never stored raw.
 * Ring buffer with configurable max entries.
 */

import { createHash } from "node:crypto";
import { log } from "../lib/logger.js";
import type {
  AIAuditEvent,
  AIUseCase,
  AIActorRole,
  DisallowedCategory,
  RAGSourceCategory,
} from "./types.js";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

const MAX_AUDIT_ENTRIES = 5000;
const HASH_SALT = process.env.AI_AUDIT_HASH_SALT || "ve-ai-audit-salt-33";

/* ------------------------------------------------------------------ */
/* Ring buffer store                                                   */
/* ------------------------------------------------------------------ */

const auditLog: AIAuditEvent[] = [];
let nextId = 1;

/* ------------------------------------------------------------------ */
/* Hash helpers (PHI-safe)                                             */
/* ------------------------------------------------------------------ */

/** Hash an actor/patient ID for audit — never store raw DUZ/DFN. */
export function hashAiId(id: string): string {
  return createHash("sha256")
    .update(HASH_SALT + id)
    .digest("hex")
    .slice(0, 16);
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export interface AuditLogInput {
  useCase: AIUseCase;
  modelId: string;
  promptId: string;
  promptHash: string;
  actorId: string;
  actorRole: AIActorRole;
  patientDfn: string | null;
  outcome: "success" | "blocked" | "error" | "safety_filtered";
  blockedCategory?: DisallowedCategory;
  safetyWarnings: string[];
  wasRedacted: boolean;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  ragCategories: RAGSourceCategory[];
  citationCount: number;
}

/** Log an AI audit event. PHI-safe: hashes actor and patient IDs. */
export function logAiAudit(input: AuditLogInput): AIAuditEvent {
  const event: AIAuditEvent = {
    id: `ai-audit-${nextId++}`,
    timestamp: new Date().toISOString(),
    useCase: input.useCase,
    modelId: input.modelId,
    promptId: input.promptId,
    promptHash: input.promptHash,
    actorRole: input.actorRole,
    actorHash: hashAiId(input.actorId),
    patientHash: input.patientDfn ? hashAiId(input.patientDfn) : null,
    outcome: input.outcome,
    blockedCategory: input.blockedCategory,
    safetyWarnings: input.safetyWarnings,
    wasRedacted: input.wasRedacted,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    latencyMs: input.latencyMs,
    ragCategories: input.ragCategories,
    citationCount: input.citationCount,
    clinicianConfirmed: null, // pending until clinician acts
  };

  // Ring buffer maintenance
  auditLog.push(event);
  while (auditLog.length > MAX_AUDIT_ENTRIES) {
    auditLog.shift();
  }

  // Structured log (no PHI — only hashes, action, outcome)
  log.info("AI audit event", {
    id: event.id,
    useCase: event.useCase,
    modelId: event.modelId,
    promptHash: event.promptHash,
    actorRole: event.actorRole,
    outcome: event.outcome,
    latencyMs: event.latencyMs,
  });

  return event;
}

/** Record clinician confirmation/rejection for a draft. */
export function recordConfirmation(
  auditEventId: string,
  confirmed: boolean
): { ok: boolean; error?: string } {
  const event = auditLog.find((e) => e.id === auditEventId);
  if (!event) return { ok: false, error: "Audit event not found" };
  event.clinicianConfirmed = confirmed;
  return { ok: true };
}

/** Query audit events with optional filters. */
export function queryAiAudit(filters?: {
  useCase?: AIUseCase;
  outcome?: string;
  actorRole?: AIActorRole;
  limit?: number;
}): AIAuditEvent[] {
  let results = [...auditLog];

  if (filters?.useCase) {
    results = results.filter((e) => e.useCase === filters.useCase);
  }
  if (filters?.outcome) {
    results = results.filter((e) => e.outcome === filters.outcome);
  }
  if (filters?.actorRole) {
    results = results.filter((e) => e.actorRole === filters.actorRole);
  }

  // Most recent first
  results.reverse();

  const limit = filters?.limit ?? 100;
  return results.slice(0, limit);
}

/** Get aggregate statistics. */
export function getAiAuditStats(): {
  totalEvents: number;
  byOutcome: Record<string, number>;
  byUseCase: Record<string, number>;
  byModel: Record<string, number>;
  avgLatencyMs: number;
  blockedCount: number;
  confirmationRate: number;
} {
  const byOutcome: Record<string, number> = {};
  const byUseCase: Record<string, number> = {};
  const byModel: Record<string, number> = {};
  let totalLatency = 0;
  let blockedCount = 0;
  let confirmedCount = 0;
  let confirmableCount = 0;

  for (const e of auditLog) {
    byOutcome[e.outcome] = (byOutcome[e.outcome] ?? 0) + 1;
    byUseCase[e.useCase] = (byUseCase[e.useCase] ?? 0) + 1;
    byModel[e.modelId] = (byModel[e.modelId] ?? 0) + 1;
    totalLatency += e.latencyMs;
    if (e.outcome === "blocked") blockedCount++;
    if (e.clinicianConfirmed !== null) {
      confirmableCount++;
      if (e.clinicianConfirmed) confirmedCount++;
    }
  }

  return {
    totalEvents: auditLog.length,
    byOutcome,
    byUseCase,
    byModel,
    avgLatencyMs: auditLog.length > 0 ? Math.round(totalLatency / auditLog.length) : 0,
    blockedCount,
    confirmationRate: confirmableCount > 0 ? confirmedCount / confirmableCount : 0,
  };
}

/** Get total audit event count. */
export function getAiAuditCount(): number {
  return auditLog.length;
}
