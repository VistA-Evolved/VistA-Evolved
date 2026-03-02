/**
 * Phase 168: Discharge Workflow Routes
 *
 * Structured discharge planning that pulls data from multiple VistA
 * subsystems and assembles a discharge checklist. Integrates with
 * existing ADT routes for census/movement data.
 *
 * VistA-first reads:
 *   - ORWPS ACTIVE (active meds for discharge med list)
 *   - ORQQAL LIST (allergies for discharge summary)
 *   - ORQQVI VITALS (last vitals for stability check)
 *   - TIU DOCUMENTS BY CONTEXT (existing notes)
 *
 * Integration-pending writes:
 *   - DG ADT DISCHARGE (VistA ADT movement)
 *   - TIU CREATE RECORD (discharge summary note)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../auth/auth-routes.js";
import { safeCallRpc } from "../lib/rpc-resilience.js";
import { log } from "../lib/logger.js";
import { randomUUID } from "node:crypto";

// ── Types ───────────────────────────────────────────────────

export type DischargeChecklistItemStatus = "pending" | "completed" | "not-applicable" | "blocked";

export interface DischargeChecklistItem {
  id: string;
  category: "medication" | "follow-up" | "education" | "documentation" | "safety";
  title: string;
  description: string;
  status: DischargeChecklistItemStatus;
  completedBy?: string;
  completedAt?: string;
  vistaRpc?: string;
  vistaStatus?: "live" | "integration-pending";
}

export interface DischargePlan {
  id: string;
  tenantId: string;
  patientDfn: string;
  duz: string;
  status: "planning" | "ready" | "completed" | "cancelled";
  admissionDate?: string;
  targetDischargeDate?: string;
  dischargeDisposition?: string;
  checklist: DischargeChecklistItem[];
  medRecSessionId?: string;
  followUpInstructions: string[];
  patientEducation: string[];
  createdAt: string;
  completedAt?: string;
}

// ── In-memory store (migration target: VistA DG ADT) ────────

const dischargePlans = new Map<string, DischargePlan>();
const DISCHARGE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const DISCHARGE_MAX_SIZE = 500;

export function getDischargePlanCount(): number {
  return dischargePlans.size;
}

/** Evict completed/stale plans older than TTL */
function evictStaleDischargePlans(): void {
  const now = Date.now();
  for (const [id, p] of dischargePlans) {
    const age = now - new Date(p.createdAt).getTime();
    if (age > DISCHARGE_TTL_MS || (p.status === "completed" && age > 60 * 60 * 1000)) {
      dischargePlans.delete(id);
    }
  }
  if (dischargePlans.size > DISCHARGE_MAX_SIZE) {
    const oldest = [...dischargePlans.entries()]
      .sort((a, b) => new Date(a[1].createdAt).getTime() - new Date(b[1].createdAt).getTime());
    while (dischargePlans.size > DISCHARGE_MAX_SIZE && oldest.length) {
      dischargePlans.delete(oldest.shift()![0]);
    }
  }
}

const _dischCleanup = setInterval(evictStaleDischargePlans, 60 * 60 * 1000);
_dischCleanup.unref();

// ── Default checklist template ──────────────────────────────

function buildDefaultChecklist(): DischargeChecklistItem[] {
  return [
    {
      id: randomUUID(),
      category: "medication",
      title: "Medication Reconciliation",
      description: "Complete inpatient-to-outpatient medication reconciliation",
      status: "pending",
      vistaRpc: "PSO UPDATE MED LIST",
      vistaStatus: "integration-pending",
    },
    {
      id: randomUUID(),
      category: "medication",
      title: "Discharge Prescriptions",
      description: "E-prescribe or print discharge medications",
      status: "pending",
      vistaRpc: "ORWDX SAVE",
      vistaStatus: "integration-pending",
    },
    {
      id: randomUUID(),
      category: "follow-up",
      title: "Follow-up Appointment",
      description: "Schedule follow-up appointment within 7-14 days",
      status: "pending",
      vistaRpc: "SDES CREATE APPOINTMENT",
      vistaStatus: "integration-pending",
    },
    {
      id: randomUUID(),
      category: "follow-up",
      title: "Specialist Referrals",
      description: "Complete any pending specialist referrals",
      status: "pending",
    },
    {
      id: randomUUID(),
      category: "documentation",
      title: "Discharge Summary",
      description: "Complete discharge summary TIU note",
      status: "pending",
      vistaRpc: "TIU CREATE RECORD",
      vistaStatus: "integration-pending",
    },
    {
      id: randomUUID(),
      category: "documentation",
      title: "Final Vitals",
      description: "Record final set of vitals before discharge",
      status: "pending",
      vistaRpc: "GMV ADD VM",
      vistaStatus: "live",
    },
    {
      id: randomUUID(),
      category: "education",
      title: "Patient Education",
      description: "Provide disease-specific education materials",
      status: "pending",
    },
    {
      id: randomUUID(),
      category: "education",
      title: "Medication Instructions",
      description: "Review new and changed medications with patient",
      status: "pending",
    },
    {
      id: randomUUID(),
      category: "safety",
      title: "Fall Risk Assessment",
      description: "Complete discharge fall risk assessment",
      status: "pending",
    },
    {
      id: randomUUID(),
      category: "safety",
      title: "Transport Arranged",
      description: "Confirm patient transportation is arranged",
      status: "pending",
    },
  ];
}

// ── Routes ──────────────────────────────────────────────────

export default async function dischargeWorkflowRoutes(server: FastifyInstance) {
  // POST /vista/discharge/plan — create a discharge plan
  server.post("/vista/discharge/plan", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const body = (request.body as any) || {};
    const dfn = body.dfn;
    if (!dfn) return reply.code(400).send({ ok: false, error: "dfn required" });

    // Pull current VistA data for plan context
    let lastVitals: string[] = [];
    const rpcUsed: string[] = [];
    try {
      lastVitals = await safeCallRpc("ORQQVI VITALS", [dfn]);
      rpcUsed.push("ORQQVI VITALS");
    } catch { /* VistA unavailable */ }

    const plan: DischargePlan = {
      id: randomUUID(),
      tenantId: session.tenantId,
      patientDfn: dfn,
      duz: session.duz,
      status: "planning",
      targetDischargeDate: body.targetDate || undefined,
      dischargeDisposition: body.disposition || undefined,
      checklist: buildDefaultChecklist(),
      followUpInstructions: [],
      patientEducation: [],
      createdAt: new Date().toISOString(),
    };

    dischargePlans.set(plan.id, plan);

    return {
      ok: true,
      plan: {
        id: plan.id,
        status: plan.status,
        checklistCount: plan.checklist.length,
        checklistPending: plan.checklist.filter((c) => c.status === "pending").length,
      },
      rpcUsed,
      vistaGrounding: {
        vistaFiles: ["DG(405)", "DG(405.1)"],
        targetRoutines: ["DGADT", "DGPMV"],
        targetRpc: ["DG ADT DISCHARGE"],
        migrationPath: "Phase 168+ — DG ADT DISCHARGE when ADT write RPCs confirmed",
        sandboxNote: "Discharge plan is local; VistA ADT movement is integration-pending",
      },
    };
  });

  // GET /vista/discharge/plan/:id — get discharge plan detail
  server.get("/vista/discharge/plan/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as any;
    const plan = dischargePlans.get(id);
    if (!plan) return reply.code(404).send({ ok: false, error: "Plan not found" });
    if (plan.tenantId !== session.tenantId) return reply.code(403).send({ ok: false, error: "Forbidden" });
    return { ok: true, plan };
  });

  // PUT /vista/discharge/plan/:id/checklist/:itemId — update checklist item
  server.put("/vista/discharge/plan/:id/checklist/:itemId", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id, itemId } = request.params as any;
    const plan = dischargePlans.get(id);
    if (!plan) return reply.code(404).send({ ok: false, error: "Plan not found" });
    if (plan.tenantId !== session.tenantId) return reply.code(403).send({ ok: false, error: "Forbidden" });

    const body = (request.body as any) || {};
    const item = plan.checklist.find((c) => c.id === itemId);
    if (!item) return reply.code(404).send({ ok: false, error: "Checklist item not found" });

    const validStatuses: DischargeChecklistItemStatus[] = ["pending", "completed", "not-applicable", "blocked"];
    if (body.status && !validStatuses.includes(body.status)) {
      return reply.code(400).send({ ok: false, error: `Invalid status. Valid: ${validStatuses.join(", ")}` });
    }

    if (body.status) {
      item.status = body.status;
      if (body.status === "completed") {
        item.completedBy = session.duz;
        item.completedAt = new Date().toISOString();
      }
    }

    const pending = plan.checklist.filter((c) => c.status === "pending").length;
    const completed = plan.checklist.filter((c) => c.status === "completed").length;

    return {
      ok: true,
      item,
      summary: { pending, completed, total: plan.checklist.length },
    };
  });

  // POST /vista/discharge/plan/:id/ready — mark plan as ready for discharge
  server.post("/vista/discharge/plan/:id/ready", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as any;
    const plan = dischargePlans.get(id);
    if (!plan) return reply.code(404).send({ ok: false, error: "Plan not found" });
    if (plan.tenantId !== session.tenantId) return reply.code(403).send({ ok: false, error: "Forbidden" });

    const blocked = plan.checklist.filter((c) => c.status === "blocked");
    const pending = plan.checklist.filter((c) => c.status === "pending");

    if (blocked.length > 0) {
      return reply.code(409).send({
        ok: false,
        error: "Cannot mark ready — blocked items exist",
        blockedItems: blocked.map((b) => b.title),
      });
    }

    if (pending.length > 0) {
      // Warning but allow — some items may be intentionally deferred
      log.warn("Discharge plan marked ready with pending items", { planId: id, pendingCount: pending.length });
    }

    plan.status = "ready";

    return {
      ok: true,
      status: "ready",
      warnings: pending.length > 0 ? [`${pending.length} item(s) still pending`] : [],
      vistaGrounding: {
        targetRpc: ["DG ADT DISCHARGE"],
        status: "integration-pending",
        nextSteps: ["Execute VistA ADT discharge movement when ready"],
      },
    };
  });

  // POST /vista/discharge/plan/:id/complete — complete discharge
  server.post("/vista/discharge/plan/:id/complete", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as any;
    const plan = dischargePlans.get(id);
    if (!plan) return reply.code(404).send({ ok: false, error: "Plan not found" });
    if (plan.tenantId !== session.tenantId) return reply.code(403).send({ ok: false, error: "Forbidden" });

    if (plan.status !== "ready") {
      return reply.code(409).send({ ok: false, error: "Plan must be in 'ready' state to complete" });
    }

    plan.status = "completed";
    plan.completedAt = new Date().toISOString();

    return {
      ok: true,
      status: "completed",
      completedAt: plan.completedAt,
      vistaGrounding: {
        targetRpc: ["DG ADT DISCHARGE", "TIU CREATE RECORD"],
        status: "integration-pending",
        nextSteps: [
          "Record VistA ADT discharge movement",
          "Auto-generate discharge summary TIU note",
        ],
      },
    };
  });

  // GET /vista/discharge/plans — list discharge plans
  server.get("/vista/discharge/plans", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const dfn = (request.query as any).dfn;

    let plans = Array.from(dischargePlans.values())
      .filter((p) => p.tenantId === session.tenantId);
    if (dfn) plans = plans.filter((p) => p.patientDfn === dfn);

    return {
      ok: true,
      plans: plans.map((p) => ({
        id: p.id,
        status: p.status,
        pending: p.checklist.filter((c) => c.status === "pending").length,
        completed: p.checklist.filter((c) => c.status === "completed").length,
        createdAt: p.createdAt,
      })),
      total: plans.length,
    };
  });
}
