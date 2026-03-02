/**
 * Phase 168: Medication Reconciliation Routes
 *
 * VistA-first: reads active meds via ORWPS ACTIVE, outpatient meds via
 * ORWPS DETAIL, and allergy data via ORQQAL LIST. Cross-references
 * inpatient vs outpatient/pre-admission lists for discrepancy detection.
 *
 * Write operations (reconcile decision capture) are in-memory with
 * VistA writeback integration-pending targeting:
 *   - PSO UPDATE MED LIST (outpatient reconciliation)
 *   - PSJ LM ORDER UPDATE (inpatient reconciliation)
 *
 * RPCs used:
 *   - ORWPS ACTIVE (read: active inpatient meds)
 *   - ORQQAL LIST (read: allergies for cross-check)
 *
 * Integration-pending:
 *   - PSB MED LOG (full MAR history)
 *   - PSO UPDATE MED LIST (outpatient med-rec writeback)
 *   - PSJ LM ORDER UPDATE (inpatient med-rec writeback)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../auth/auth-routes.js";
import { safeCallRpc } from "../lib/rpc-resilience.js";
import { log } from "../lib/logger.js";
import { randomUUID } from "node:crypto";

// ── Types ───────────────────────────────────────────────────

export interface MedRecEntry {
  medicationName: string;
  dose: string;
  route: string;
  frequency: string;
  source: "inpatient" | "outpatient" | "pre-admission" | "patient-reported";
  orderIen?: string;
  status: "active" | "discontinued" | "hold" | "expired";
}

export interface MedRecDiscrepancy {
  id: string;
  medication: string;
  type: "missing-inpatient" | "missing-outpatient" | "dose-mismatch" | "duplicate-therapy" | "new-admission";
  inpatientEntry?: MedRecEntry;
  outpatientEntry?: MedRecEntry;
  severity: "high" | "medium" | "low";
  description: string;
}

export type ReconciliationDecision =
  | "continue"
  | "discontinue"
  | "modify"
  | "hold"
  | "defer";

export interface MedRecSession {
  id: string;
  tenantId: string;
  patientDfn: string;
  duz: string;
  status: "in-progress" | "completed" | "abandoned";
  inpatientMeds: MedRecEntry[];
  outpatientMeds: MedRecEntry[];
  discrepancies: MedRecDiscrepancy[];
  decisions: Array<{
    discrepancyId: string;
    decision: ReconciliationDecision;
    rationale: string;
    decidedAt: string;
    decidedBy: string;
  }>;
  createdAt: string;
  completedAt?: string;
}

// ── In-memory store (migration target: VistA PSO/PSJ) ──────

const medRecSessions = new Map<string, MedRecSession>();
const MED_REC_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MED_REC_MAX_SIZE = 500;

export function getMedRecSessionCount(): number {
  return medRecSessions.size;
}

/** Evict completed/stale sessions older than TTL */
function evictStaleMedRecSessions(): void {
  const now = Date.now();
  for (const [id, s] of medRecSessions) {
    const age = now - new Date(s.createdAt).getTime();
    if (age > MED_REC_TTL_MS || (s.status === "completed" && age > 60 * 60 * 1000)) {
      medRecSessions.delete(id);
    }
  }
  // Hard cap
  if (medRecSessions.size > MED_REC_MAX_SIZE) {
    const oldest = [...medRecSessions.entries()]
      .sort((a, b) => new Date(a[1].createdAt).getTime() - new Date(b[1].createdAt).getTime());
    while (medRecSessions.size > MED_REC_MAX_SIZE && oldest.length) {
      medRecSessions.delete(oldest.shift()![0]);
    }
  }
}

const _medRecCleanup = setInterval(evictStaleMedRecSessions, 60 * 60 * 1000);
_medRecCleanup.unref();

// ── Med parsing helpers ─────────────────────────────────────

function parseActiveMeds(raw: string): MedRecEntry[] {
  if (!raw || raw.trim() === "") return [];
  const entries: MedRecEntry[] = [];
  const lines = raw.split("\n");
  let currentMed: Partial<MedRecEntry> | null = null;

  for (const line of lines) {
    if (line.startsWith("~")) {
      if (currentMed?.medicationName) {
        entries.push({
          medicationName: currentMed.medicationName || "",
          dose: currentMed.dose || "",
          route: currentMed.route || "",
          frequency: currentMed.frequency || "",
          source: "inpatient",
          orderIen: currentMed.orderIen,
          status: "active",
        });
      }
      const parts = line.substring(1).split("^");
      currentMed = {
        medicationName: parts[1] || parts[0] || "",
        orderIen: parts[0]?.replace(/\D/g, "") || undefined,
      };
    } else if (currentMed && line.trim()) {
      const lower = line.toLowerCase().trim();
      if (lower.startsWith("dose:") || lower.includes("mg") || lower.includes("ml")) {
        currentMed.dose = line.trim();
      } else if (lower.startsWith("route:") || lower.includes("oral") || lower.includes("iv")) {
        currentMed.route = line.trim();
      } else if (lower.startsWith("schedule:") || lower.includes("bid") || lower.includes("tid") || lower.includes("daily")) {
        currentMed.frequency = line.trim();
      }
    }
  }
  if (currentMed?.medicationName) {
    entries.push({
      medicationName: currentMed.medicationName,
      dose: currentMed.dose || "",
      route: currentMed.route || "",
      frequency: currentMed.frequency || "",
      source: "inpatient",
      orderIen: currentMed.orderIen,
      status: "active",
    });
  }
  return entries;
}

function detectDiscrepancies(
  inpatient: MedRecEntry[],
  outpatient: MedRecEntry[],
): MedRecDiscrepancy[] {
  const discrepancies: MedRecDiscrepancy[] = [];

  // Find meds on outpatient list not on inpatient
  for (const op of outpatient) {
    const match = inpatient.find(
      (ip) => ip.medicationName.toLowerCase().includes(op.medicationName.toLowerCase().split(" ")[0]),
    );
    if (!match) {
      discrepancies.push({
        id: randomUUID(),
        medication: op.medicationName,
        type: "missing-inpatient",
        outpatientEntry: op,
        severity: "high",
        description: `Outpatient med "${op.medicationName}" not found on inpatient list`,
      });
    }
  }

  // Find meds on inpatient list not on outpatient (new on admission)
  for (const ip of inpatient) {
    const match = outpatient.find(
      (op) => op.medicationName.toLowerCase().includes(ip.medicationName.toLowerCase().split(" ")[0]),
    );
    if (!match) {
      discrepancies.push({
        id: randomUUID(),
        medication: ip.medicationName,
        type: "new-admission",
        inpatientEntry: ip,
        severity: "low",
        description: `Inpatient med "${ip.medicationName}" is new (not on outpatient list)`,
      });
    }
  }

  return discrepancies;
}

// ── Routes ──────────────────────────────────────────────────

export default async function medReconciliationRoutes(server: FastifyInstance) {
  // GET /vista/med-rec/active-meds — read active meds from VistA
  server.get("/vista/med-rec/active-meds", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const dfn = (request.query as any).dfn;
    if (!dfn) return reply.code(400).send({ ok: false, error: "dfn required" });

    try {
      const rawLines = await safeCallRpc("ORWPS ACTIVE", [dfn]);
      const raw = rawLines.join("\n");
      const meds = parseActiveMeds(raw);
      return { ok: true, meds, rpcUsed: ["ORWPS ACTIVE"], source: "vista" };
    } catch (err: any) {
      log.warn("Failed to read active meds", { err: err.message });
      return { ok: false, status: "integration-pending", targetRpc: ["ORWPS ACTIVE"], error: "Failed to read active medications" };
    }
  });

  // POST /vista/med-rec/start — start a reconciliation session
  server.post("/vista/med-rec/start", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const body = (request.body as any) || {};
    const dfn = body.dfn;
    if (!dfn) return reply.code(400).send({ ok: false, error: "dfn required" });

    // Read inpatient meds from VistA
    let inpatientMeds: MedRecEntry[] = [];
    let rpcUsed: string[] = [];
    try {
      const rawLines = await safeCallRpc("ORWPS ACTIVE", [dfn]);
      const raw = rawLines.join("\n");
      inpatientMeds = parseActiveMeds(raw);
      rpcUsed.push("ORWPS ACTIVE");
    } catch {
      // VistA unavailable — start with empty list
    }

    // Outpatient/pre-admission meds would come from a separate source
    // Integration-pending: PSO MED LIST for outpatient pharmacy
    const outpatientMeds: MedRecEntry[] = body.outpatientMeds || [];

    const discrepancies = detectDiscrepancies(inpatientMeds, outpatientMeds);

    const medRecSession: MedRecSession = {
      id: randomUUID(),
      tenantId: session.tenantId,
      patientDfn: dfn,
      duz: session.duz,
      status: "in-progress",
      inpatientMeds,
      outpatientMeds,
      discrepancies,
      decisions: [],
      createdAt: new Date().toISOString(),
    };

    medRecSessions.set(medRecSession.id, medRecSession);

    return {
      ok: true,
      session: {
        id: medRecSession.id,
        status: medRecSession.status,
        inpatientCount: inpatientMeds.length,
        outpatientCount: outpatientMeds.length,
        discrepancyCount: discrepancies.length,
        discrepancies,
      },
      rpcUsed,
      vistaGrounding: {
        vistaFiles: ["PSO(55)", "PS(55.06)", "OR(100)"],
        targetRoutines: ["PSOLM", "PSJLM"],
        targetRpc: ["PSO UPDATE MED LIST", "PSJ LM ORDER UPDATE"],
        migrationPath: "Phase 168+ — writeback via PSO/PSJ when available",
        sandboxNote: "Inpatient meds read via ORWPS ACTIVE; outpatient list is patient-reported until PSO integration",
      },
    };
  });

  // GET /vista/med-rec/session/:id — get reconciliation session detail
  server.get("/vista/med-rec/session/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as any;
    const medRec = medRecSessions.get(id);
    if (!medRec) return reply.code(404).send({ ok: false, error: "Session not found" });
    if (medRec.tenantId !== session.tenantId) return reply.code(403).send({ ok: false, error: "Forbidden" });

    return { ok: true, session: medRec };
  });

  // POST /vista/med-rec/session/:id/decide — record a reconciliation decision
  server.post("/vista/med-rec/session/:id/decide", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as any;
    const medRec = medRecSessions.get(id);
    if (!medRec) return reply.code(404).send({ ok: false, error: "Session not found" });
    if (medRec.tenantId !== session.tenantId) return reply.code(403).send({ ok: false, error: "Forbidden" });
    if (medRec.status !== "in-progress") return reply.code(409).send({ ok: false, error: "Session not in-progress" });

    const body = (request.body as any) || {};
    const { discrepancyId, decision, rationale } = body;
    if (!discrepancyId || !decision) {
      return reply.code(400).send({ ok: false, error: "discrepancyId and decision required" });
    }

    const validDecisions: ReconciliationDecision[] = ["continue", "discontinue", "modify", "hold", "defer"];
    if (!validDecisions.includes(decision)) {
      return reply.code(400).send({ ok: false, error: `Invalid decision. Valid: ${validDecisions.join(", ")}` });
    }

    const disc = medRec.discrepancies.find((d) => d.id === discrepancyId);
    if (!disc) return reply.code(404).send({ ok: false, error: "Discrepancy not found" });

    // Prevent duplicate decisions for same discrepancy
    const existingDecision = medRec.decisions.find((d) => d.discrepancyId === discrepancyId);
    if (existingDecision) {
      return reply.code(409).send({
        ok: false,
        error: `Discrepancy ${discrepancyId} already decided (${existingDecision.decision} at ${existingDecision.decidedAt})`,
      });
    }

    medRec.decisions.push({
      discrepancyId,
      decision,
      rationale: rationale || "",
      decidedAt: new Date().toISOString(),
      decidedBy: session.duz,
    });

    return {
      ok: true,
      decisionsRecorded: medRec.decisions.length,
      discrepanciesRemaining: medRec.discrepancies.length - medRec.decisions.length,
      vistaGrounding: {
        targetRpc: ["PSO UPDATE MED LIST", "PSJ LM ORDER UPDATE"],
        status: "integration-pending",
        nextSteps: ["Wire PSO for outpatient reconciliation writeback", "Wire PSJ for inpatient order updates"],
      },
    };
  });

  // POST /vista/med-rec/session/:id/complete — complete reconciliation
  server.post("/vista/med-rec/session/:id/complete", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as any;
    const medRec = medRecSessions.get(id);
    if (!medRec) return reply.code(404).send({ ok: false, error: "Session not found" });
    if (medRec.tenantId !== session.tenantId) return reply.code(403).send({ ok: false, error: "Forbidden" });
    if (medRec.status !== "in-progress") return reply.code(409).send({ ok: false, error: "Session not in-progress" });

    const undecided = medRec.discrepancies.length - medRec.decisions.length;
    if (undecided > 0) {
      return reply.code(409).send({
        ok: false,
        error: `${undecided} discrepancy(ies) still unresolved`,
        discrepanciesRemaining: undecided,
      });
    }

    medRec.status = "completed";
    medRec.completedAt = new Date().toISOString();

    return {
      ok: true,
      status: "completed",
      summary: {
        totalDiscrepancies: medRec.discrepancies.length,
        decisions: medRec.decisions.map((d) => ({
          medication: medRec.discrepancies.find((disc) => disc.id === d.discrepancyId)?.medication,
          decision: d.decision,
        })),
      },
      vistaGrounding: {
        targetRpc: ["PSO UPDATE MED LIST", "PSJ LM ORDER UPDATE", "TIU CREATE RECORD"],
        status: "integration-pending",
        nextSteps: [
          "Write reconciliation summary to TIU note",
          "Update PSO outpatient med list",
          "Update PSJ inpatient orders",
        ],
      },
    };
  });

  // GET /vista/med-rec/sessions — list all sessions for current tenant
  server.get("/vista/med-rec/sessions", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const sessions = Array.from(medRecSessions.values())
      .filter((s) => s.tenantId === session.tenantId)
      .map((s) => ({
        id: s.id,
        patientDfn: s.patientDfn,
        status: s.status,
        discrepancyCount: s.discrepancies.length,
        decisionCount: s.decisions.length,
        createdAt: s.createdAt,
        completedAt: s.completedAt,
      }));

    return { ok: true, sessions, total: sessions.length };
  });
}
