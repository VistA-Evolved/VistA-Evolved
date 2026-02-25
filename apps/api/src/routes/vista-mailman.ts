/**
 * Phase 130 — VistA MailMan Bridge: Clinician-facing routes.
 *
 * Wraps existing ZVEMSGR.m RPCs via secure-messaging.ts service layer.
 * Routes:
 *   GET  /vista/mailman/inbox           — Inbox messages (VistA basket 1 / fallback)
 *   GET  /vista/mailman/message/:ien    — Single message by IEN
 *   POST /vista/mailman/send            — Send via VistA MailMan
 *   POST /vista/mailman/manage          — Mark read / delete / move
 *   GET  /vista/mailman/folders         — List MailMan baskets/folders
 *
 * Auth: session (matches /^\/vista\// AUTH_RULE).
 * Security: message bodies NEVER in audit/logs.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  listFolders,
  listMessages,
  getVistaMessage,
  sendViaMailMan,
  manageMessage,
} from "../services/secure-messaging.js";
import { connect, disconnect } from "../vista/rpcBrokerClient.js";
import { immutableAudit } from "../lib/immutable-audit.js";
import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function auditActor(request: FastifyRequest): { sub: string; name: string; roles: string[] } {
  const s = request.session;
  return {
    sub: s?.duz || "anonymous",
    name: s?.userName || "unknown",
    roles: s?.role ? [s.role] : [],
  };
}

function requireSession(request: FastifyRequest, reply: FastifyReply): boolean {
  if (!request.session) {
    reply.code(401).send({ ok: false, error: "Authentication required" });
    return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Route Plugin                                                        */
/* ------------------------------------------------------------------ */

export default async function vistaMailmanRoutes(server: FastifyInstance) {

  /* ---- GET /vista/mailman/inbox ---- */
  server.get("/vista/mailman/inbox", async (request, reply) => {
    if (!requireSession(request, reply)) return;
    const limit = Number((request.query as any)?.limit) || 50;

    try {
      await connect();
      const result = await listMessages("1", limit); // basket 1 = IN
      disconnect();
      immutableAudit("messaging.read", result.ok ? "success" : "failure", auditActor(request), {
        detail: { route: "/vista/mailman/inbox", count: result.messages.length, source: result.source },
      });
      return {
        ok: result.ok,
        source: result.source,
        count: result.messages.length,
        messages: result.messages,
        error: result.error,
      };
    } catch (err: any) {
      disconnect();
      log.error(`MailMan inbox error: ${err.message}`);
      return reply.code(502).send({ ok: false, error: "VistA MailMan unavailable", source: "local" });
    }
  });

  /* ---- GET /vista/mailman/message/:ien ---- */
  server.get("/vista/mailman/message/:ien", async (request, reply) => {
    if (!requireSession(request, reply)) return;
    const { ien } = request.params as { ien: string };
    if (!ien || !/^\d+$/.test(ien)) {
      return reply.code(400).send({ ok: false, error: "Invalid message IEN" });
    }

    try {
      await connect();
      const result = await getVistaMessage(ien);
      disconnect();
      // Audit: metadata only — never log message body
      immutableAudit("messaging.read", result.ok ? "success" : "failure", auditActor(request), {
        detail: { route: "/vista/mailman/message", ien, source: result.source },
      });
      if (!result.ok) {
        return reply.code(result.source === "vista" ? 404 : 502).send(result);
      }
      return { ok: true, source: result.source, message: result.message };
    } catch (err: any) {
      disconnect();
      log.error(`MailMan message error: ${err.message}`);
      return reply.code(502).send({ ok: false, error: "VistA MailMan unavailable", source: "local" });
    }
  });

  /* ---- POST /vista/mailman/send ---- */
  server.post("/vista/mailman/send", async (request, reply) => {
    if (!requireSession(request, reply)) return;
    const body = (request.body as any) || {};
    if (!body.subject || !body.body) {
      return reply.code(400).send({ ok: false, error: "Missing required: subject, body" });
    }
    if (!body.to) {
      return reply.code(400).send({ ok: false, error: "Missing required: to (recipient DUZ, name, or mail group)" });
    }

    try {
      await connect();
      const recipients = Array.isArray(body.to) ? body.to : [{ type: "user" as const, id: body.to, name: body.toName || body.to }];
      const result = await sendViaMailMan(
        body.subject,
        body.body,
        recipients,
        body.priority || "routine",
      );
      disconnect();

      // Audit: metadata only — never log message body
      immutableAudit("messaging.send", result.ok ? "success" : "failure", auditActor(request), {
        detail: {
          route: "/vista/mailman/send",
          subjectLength: body.subject.length,
          recipientCount: recipients.length,
          vistaRef: result.vistaRef,
        },
      });

      return {
        ok: result.ok,
        vistaRef: result.vistaRef,
        source: "vista",
        error: result.error,
      };
    } catch (err: any) {
      disconnect();
      log.error(`MailMan send error: ${err.message}`);
      return reply.code(500).send({ ok: false, error: "Internal error during message send" });
    }
  });

  /* ---- POST /vista/mailman/manage ---- */
  server.post("/vista/mailman/manage", async (request, reply) => {
    if (!requireSession(request, reply)) return;
    const body = (request.body as any) || {};
    const action = body.action;
    if (!action || !body.ien) {
      return reply.code(400).send({ ok: false, error: "Missing required: action (markread|delete|move), ien" });
    }
    if (!["markread", "delete", "move"].includes(action)) {
      return reply.code(400).send({ ok: false, error: "action must be markread, delete, or move" });
    }

    try {
      await connect();
      const result = await manageMessage(action, body.ien, body.basket, body.toBasket);
      disconnect();
      immutableAudit("messaging.manage", result.ok ? "success" : "failure", auditActor(request), {
        detail: { route: "/vista/mailman/manage", action, ien: body.ien },
      });
      return result;
    } catch (err: any) {
      disconnect();
      log.error(`MailMan manage error: ${err.message}`);
      return reply.code(502).send({ ok: false, error: "VistA MailMan unavailable" });
    }
  });

  /* ---- GET /vista/mailman/folders ---- */
  server.get("/vista/mailman/folders", async (request, reply) => {
    if (!requireSession(request, reply)) return;
    try {
      await connect();
      const result = await listFolders();
      disconnect();
      return { ok: result.ok, source: result.source, folders: result.folders, error: result.error };
    } catch (err: any) {
      disconnect();
      log.error(`MailMan folders error: ${err.message}`);
      return reply.code(502).send({ ok: false, error: "VistA MailMan unavailable", source: "local" });
    }
  });
}
