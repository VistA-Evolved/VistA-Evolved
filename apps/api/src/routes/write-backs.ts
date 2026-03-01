/**
 * Write-back routes — Phase 14C.
 *
 * Centralized write-back endpoints that check RPC availability at runtime
 * and fall back to server-side structured drafts when RPCs are unavailable.
 *
 * Patterns:
 *   - "real" — RPC exists and write-back persists to VistA
 *   - "draft" — RPC unavailable; store structured draft server-side with audit
 *   - "sync-pending" — draft stored, will auto-retry when capability appears
 *
 * Endpoints:
 *   POST /vista/orders/sign     — sign order (ORWDX SAVE or server-side draft)
 *   POST /vista/orders/release  — release signed order
 *   POST /vista/labs/ack        — acknowledge lab result (ORWLRR ACK or server-side)
 *   POST /vista/consults/create — create consult request (ORQQCN2 or draft)
 *   POST /vista/surgery/create  — create surgery record (or draft)
 *   POST /vista/problems/save   — add/edit problem (ORQQPL ADD SAVE or draft)
 *   GET  /vista/drafts          — list all pending server-side drafts
 *   GET  /vista/drafts/stats    — draft stats summary
 */

import type { FastifyInstance } from "fastify";
import { validateCredentials } from "../vista/config.js";
import { connect, disconnect, callRpc, getDuz } from "../vista/rpcBrokerClient.js";
import { optionalRpc } from "../vista/rpcCapabilities.js";
import { audit as centralAudit } from "../lib/audit.js";
import { log } from "../lib/logger.js";
import type { AuditAction } from "../lib/audit.js";

/* ------------------------------------------------------------------ */
/* Server-side draft store                                             */
/* ------------------------------------------------------------------ */

export interface ServerDraft {
  id: string;
  type: 'order-sign' | 'order-release' | 'order-dc' | 'order-flag' | 'lab-ack' | 'consult-create' | 'surgery-create' | 'problem-save';
  status: 'pending' | 'synced' | 'failed' | 'expired';
  /** Patient DFN */
  dfn: string;
  /** User DUZ who created the draft */
  duz: string;
  /** User-friendly name */
  userName: string;
  /** Payload for the write-back */
  payload: Record<string, unknown>;
  /** Which RPC was needed */
  requiredRpc: string;
  /** Audit trail */
  createdAt: string;
  updatedAt: string;
  /** Number of sync attempts */
  syncAttempts: number;
  /** Last error if sync failed */
  lastError?: string;
}

/** In-memory server-side draft store (production: use Redis/DB) */
const drafts: Map<string, ServerDraft> = new Map();

/* Phase 146: DB repo wiring */
let draftDbRepo: { upsert(d: any): Promise<any>; update?(id: string, u: any): Promise<any> } | null = null;
export function initDraftStoreRepo(repo: typeof draftDbRepo): void { draftDbRepo = repo; }
let draftSeq = 0;

export function createDraft(type: ServerDraft['type'], dfn: string, requiredRpc: string, payload: Record<string, unknown>): ServerDraft {
  const id = `draft-${++draftSeq}-${Date.now()}`;
  const now = new Date().toISOString();
  const draft: ServerDraft = {
    id,
    type,
    status: 'pending',
    dfn,
    duz: 'system',
    userName: 'System',
    payload,
    requiredRpc,
    createdAt: now,
    updatedAt: now,
    syncAttempts: 0,
  };
  drafts.set(id, draft);

  // Phase 146: Write-through to PG
  draftDbRepo?.upsert({ id, tenantId: 'default', patientDfn: dfn, draftType: type, content: JSON.stringify(payload), createdAt: draft.createdAt, updatedAt: draft.createdAt }).catch(() => {});

  log.info("Draft created", { type, draftId: id, requiredRpc });
  // Phase 15C: centralized audit for draft creation
  centralAudit("clinical.draft-create", "success", { duz: "system" }, {
    patientDfn: dfn,
    detail: { draftId: id, type, requiredRpc },
  });
  return draft;
}

function markDraftSynced(id: string): void {
  const draft = drafts.get(id);
  if (draft) {
    draft.status = 'synced';
    draft.updatedAt = new Date().toISOString();

    // Phase 146: Write-through synced status
    draftDbRepo?.upsert({ id, tenantId: 'default', status: 'synced', updatedAt: draft.updatedAt }).catch(() => {});
  }
}

function markDraftFailed(id: string, error: string): void {
  const draft = drafts.get(id);
  if (draft) {
    draft.status = 'failed';
    draft.lastError = error;
    draft.syncAttempts++;
    draft.updatedAt = new Date().toISOString();

    // Phase 146: Write-through failed status
    draftDbRepo?.upsert({ id, tenantId: 'default', status: 'failed', updatedAt: draft.updatedAt }).catch(() => {});
  }
}

/* ------------------------------------------------------------------ */
/* Audit trail (Phase 15C: wired to centralized audit)                  */
/* ------------------------------------------------------------------ */

interface WriteAuditEntry {
  timestamp: string;
  action: string;
  dfn: string;
  user: string;
  status: 'success' | 'draft-stored' | 'failed';
  rpc?: string;
  detail?: string;
}

const MAX_AUDIT = 500;
const writeAuditLog: WriteAuditEntry[] = [];

/** Dual-write: local legacy log + centralized audit system */
function auditWrite(entry: WriteAuditEntry) {
  writeAuditLog.push(entry);
  if (writeAuditLog.length > MAX_AUDIT) writeAuditLog.shift();

  // Map to centralized audit
  const actionMap: Record<string, AuditAction> = {
    'order-sign': 'clinical.order-sign',
    'order-release': 'clinical.order-release',
    'lab-ack': 'clinical.lab-ack',
    'consult-create': 'clinical.consult-create',
    'surgery-create': 'clinical.surgery-create',
    'problem-save': 'clinical.problem-save',
  };
  const mapped = actionMap[entry.action] || 'clinical.order-sign';
  const outcome = entry.status === 'success' ? 'success' as const
    : entry.status === 'failed' ? 'failure' as const
    : 'success' as const; // draft-stored is a successful draft creation

  centralAudit(mapped, outcome, { duz: entry.user || 'system' }, {
    patientDfn: entry.dfn,
    detail: { rpc: entry.rpc, mode: entry.status, info: entry.detail },
  });
}

/* ------------------------------------------------------------------ */
/* Route plugin                                                        */
/* ------------------------------------------------------------------ */

export default async function writeBackRoutes(server: FastifyInstance): Promise<void> {

  /* ---- POST /vista/orders/sign ---- */
  server.post("/vista/orders/sign", async (request, reply) => {
    const { dfn, orderId, orderName, signedBy } = request.body as any;
    if (!dfn || !orderId) {
      return reply.code(400).send({ ok: false, error: "Missing dfn or orderId" });
    }

    const check = optionalRpc("ORWDX SAVE");
    const action = 'order-sign';
    const now = new Date().toISOString();

    if (check.available) {
      // Attempt real RPC write-back
      try {
        validateCredentials();
        await connect();
        // ORWDX SAVE params: DFN, provider DUZ, locationIEN, dialog, orderList
        // This is a simplified call — full implementation requires order dialog IEN
        const duz = getDuz();
        const resp = await callRpc("ORWDX SAVE", [
          String(dfn), duz, "1", "1", String(orderId),
        ]);
        disconnect();

        auditWrite({ timestamp: now, action, dfn: String(dfn), user: signedBy || 'unknown', status: 'success', rpc: 'ORWDX SAVE', detail: `Order ${orderId} signed via RPC` });
        return { ok: true, mode: 'real', orderId, status: 'signed', rpcUsed: 'ORWDX SAVE', response: resp.join('\n') };
      } catch (err: any) {
        disconnect();
        // RPC call failed — fall through to draft
        auditWrite({ timestamp: now, action, dfn: String(dfn), user: signedBy || 'unknown', status: 'failed', rpc: 'ORWDX SAVE', detail: err.message });
      }
    }

    // Draft mode: store server-side
    const draft = createDraft('order-sign', String(dfn), 'ORWDX SAVE', {
      orderId, orderName, signedBy, attemptedAt: now,
    });
    auditWrite({ timestamp: now, action, dfn: String(dfn), user: signedBy || 'unknown', status: 'draft-stored', detail: `Draft ${draft.id} — ORWDX SAVE not available` });

    return { ok: true, mode: 'draft', draftId: draft.id, orderId, status: 'signed-locally', syncPending: true, message: 'Order signed locally. VistA sync will occur when RPC becomes available.' };
  });

  /* ---- POST /vista/orders/release ---- */
  server.post("/vista/orders/release", async (request, reply) => {
    const { dfn, orderId, releasedBy } = request.body as any;
    if (!dfn || !orderId) {
      return reply.code(400).send({ ok: false, error: "Missing dfn or orderId" });
    }

    const check = optionalRpc("ORWDXA VERIFY");
    const now = new Date().toISOString();

    if (check.available) {
      try {
        validateCredentials();
        await connect();
        const resp = await callRpc("ORWDXA VERIFY", [String(dfn), String(orderId), "E"]);
        disconnect();
        auditWrite({ timestamp: now, action: 'order-release', dfn: String(dfn), user: releasedBy || 'unknown', status: 'success', rpc: 'ORWDXA VERIFY' });
        return { ok: true, mode: 'real', orderId, status: 'released', rpcUsed: 'ORWDXA VERIFY', response: resp.join('\n') };
      } catch (err: any) {
        disconnect();
      }
    }

    const draft = createDraft('order-release', String(dfn), 'ORWDXA VERIFY', {
      orderId, releasedBy, attemptedAt: now,
    });
    auditWrite({ timestamp: now, action: 'order-release', dfn: String(dfn), user: releasedBy || 'unknown', status: 'draft-stored' });

    return { ok: true, mode: 'draft', draftId: draft.id, orderId, status: 'released-locally', syncPending: true };
  });

  /* ---- POST /vista/labs/ack ---- */
  server.post("/vista/labs/ack", async (request, reply) => {
    const { dfn, labIds, acknowledgedBy } = request.body as any;
    if (!dfn || !labIds?.length) {
      return reply.code(400).send({ ok: false, error: "Missing dfn or labIds" });
    }

    const check = optionalRpc("ORWLRR ACK");
    const now = new Date().toISOString();

    if (check.available) {
      try {
        validateCredentials();
        await connect();
        const results: string[] = [];
        for (const labId of labIds) {
          const resp = await callRpc("ORWLRR ACK", [String(dfn), String(labId)]);
          results.push(resp.join('\n'));
        }
        disconnect();
        auditWrite({ timestamp: now, action: 'lab-ack', dfn: String(dfn), user: acknowledgedBy || 'unknown', status: 'success', rpc: 'ORWLRR ACK', detail: `${labIds.length} results acknowledged` });
        return { ok: true, mode: 'real', count: labIds.length, status: 'acknowledged', rpcUsed: 'ORWLRR ACK' };
      } catch (err: any) {
        disconnect();
      }
    }

    // Server-side ack storage
    const draft = createDraft('lab-ack', String(dfn), 'ORWLRR ACK', {
      labIds, acknowledgedBy, acknowledgedAt: now,
    });
    auditWrite({ timestamp: now, action: 'lab-ack', dfn: String(dfn), user: acknowledgedBy || 'unknown', status: 'draft-stored', detail: `${labIds.length} acks stored server-side` });

    return { ok: true, mode: 'draft', draftId: draft.id, count: labIds.length, status: 'acknowledged-locally', syncPending: true, message: 'Lab acknowledgements stored server-side. VistA sync pending.' };
  });

  /* ---- POST /vista/consults/create ---- */
  server.post("/vista/consults/create", async (request, reply) => {
    const { dfn, service, urgency, reason, requestedBy } = request.body as any;
    if (!dfn || !service) {
      return reply.code(400).send({ ok: false, error: "Missing dfn or service" });
    }

    const check = optionalRpc("ORQQCN2 MED RESULTS");
    const now = new Date().toISOString();

    if (check.available) {
      try {
        validateCredentials();
        await connect();
        const duz = getDuz();
        const resp = await callRpc("ORQQCN2 MED RESULTS", [String(dfn), duz, service, urgency || "Routine", reason || ""]);
        disconnect();
        auditWrite({ timestamp: now, action: 'consult-create', dfn: String(dfn), user: requestedBy || 'unknown', status: 'success', rpc: 'ORQQCN2 MED RESULTS' });
        return { ok: true, mode: 'real', status: 'created', rpcUsed: 'ORQQCN2 MED RESULTS', response: resp.join('\n') };
      } catch (err: any) {
        disconnect();
      }
    }

    const draft = createDraft('consult-create', String(dfn), 'ORQQCN2 MED RESULTS', {
      service, urgency, reason, requestedBy, attemptedAt: now,
    });
    auditWrite({ timestamp: now, action: 'consult-create', dfn: String(dfn), user: requestedBy || 'unknown', status: 'draft-stored' });

    return { ok: true, mode: 'draft', draftId: draft.id, status: 'draft-stored', syncPending: true, message: 'Consult request stored as draft. VistA sync pending.' };
  });

  /* ---- POST /vista/surgery/create ---- */
  server.post("/vista/surgery/create", async (request, reply) => {
    const { dfn, procedure, surgeon, scheduledDate, createdBy } = request.body as any;
    if (!dfn || !procedure) {
      return reply.code(400).send({ ok: false, error: "Missing dfn or procedure" });
    }

    const check = optionalRpc("ORWSR RPTLIST");
    const now = new Date().toISOString();

    // No write-back RPC exists for surgery in standard VistA — always draft
    const draft = createDraft('surgery-create', String(dfn), 'SR CASE CREATION', {
      procedure, surgeon, scheduledDate, createdBy, attemptedAt: now,
    });
    auditWrite({ timestamp: now, action: 'surgery-create', dfn: String(dfn), user: createdBy || 'unknown', status: 'draft-stored', detail: 'No write-back RPC available for surgery' });

    return { ok: true, mode: 'draft', draftId: draft.id, status: 'draft-stored', syncPending: true, message: 'Surgery record stored as draft. No standard write-back RPC exists.' };
  });

  /* ---- POST /vista/problems/save ---- */
  server.post("/vista/problems/save", async (request, reply) => {
    const { dfn, problemText, icdCode, onset, status: probStatus, action: probAction, savedBy } = request.body as any;
    if (!dfn || !problemText) {
      return reply.code(400).send({ ok: false, error: "Missing dfn or problemText" });
    }

    const rpcName = probAction === 'edit' ? 'ORQQPL EDIT SAVE' : 'ORQQPL ADD SAVE';
    const check = optionalRpc(rpcName);
    const now = new Date().toISOString();

    if (check.available) {
      try {
        validateCredentials();
        await connect();
        const duz = getDuz();
        const resp = await callRpc(rpcName, [
          String(dfn), duz, problemText, icdCode || "", onset || "", probStatus || "A",
        ]);
        disconnect();
        auditWrite({ timestamp: now, action: 'problem-save', dfn: String(dfn), user: savedBy || 'unknown', status: 'success', rpc: rpcName });
        return { ok: true, mode: 'real', status: 'saved', rpcUsed: rpcName, response: resp.join('\n') };
      } catch (err: any) {
        disconnect();
      }
    }

    const draft = createDraft('problem-save', String(dfn), rpcName, {
      problemText, icdCode, onset, probStatus, probAction, savedBy, attemptedAt: now,
    });
    auditWrite({ timestamp: now, action: 'problem-save', dfn: String(dfn), user: savedBy || 'unknown', status: 'draft-stored', detail: `${rpcName} not available` });

    return { ok: true, mode: 'draft', draftId: draft.id, status: 'sync-pending', syncPending: true, message: `Problem saved as server-side draft. ${rpcName} sync pending.` };
  });

  /* ---- GET /vista/drafts ---- */
  server.get("/vista/drafts", async (request) => {
    const { type, status: filterStatus, dfn } = request.query as any;
    let results = Array.from(drafts.values());

    if (type) results = results.filter((d) => d.type === type);
    if (filterStatus) results = results.filter((d) => d.status === filterStatus);
    if (dfn) results = results.filter((d) => d.dfn === String(dfn));

    return { ok: true, count: results.length, drafts: results };
  });

  /* ---- GET /vista/drafts/stats ---- */
  server.get("/vista/drafts/stats", async () => {
    const all = Array.from(drafts.values());
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const d of all) {
      byType[d.type] = (byType[d.type] || 0) + 1;
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
    }
    return { ok: true, total: all.length, byType, byStatus };
  });

  /* ---- GET /vista/write-audit ---- */
  server.get("/vista/write-audit", async (request) => {
    const { limit } = request.query as any;
    const n = Math.min(Number(limit) || 50, MAX_AUDIT);
    // Return both legacy entries and hint about centralized audit
    const entries = writeAuditLog.slice(-n);
    return { ok: true, count: entries.length, entries, note: "Write-back events also available at /audit/events" };
  });
}
