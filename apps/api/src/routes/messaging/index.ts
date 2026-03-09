/**
 * Secure Messaging Routes -- Phase 70: ZVEMSGR.m MailMan RPC bridge.
 *
 * VistA-backed endpoints (primary path):
 *   GET  /messaging/folders             -- VistA MailMan baskets with counts
 *   GET  /messaging/mail-list           -- messages in a VistA basket
 *   GET  /messaging/mail-get            -- single VistA message (header+body+recipients)
 *   POST /messaging/mail-manage         -- mark read/delete/move via VistA
 *
 * Legacy + fallback endpoints:
 *   GET  /messaging/inbox               -- clinician inbox (fallback cache)
 *   GET  /messaging/sent                -- clinician sent (fallback cache)
 *   GET  /messaging/message/:id         -- single message (fallback cache)
 *   GET  /messaging/thread/:threadId    -- thread (fallback cache)
 *   POST /messaging/message/:id/read    -- mark read (fallback cache)
 *   POST /messaging/compose             -- compose + send (VistA primary, cache fallback)
 *   GET  /messaging/mail-groups         -- available mail groups (VistA)
 *   POST /messaging/portal/send         -- portal send (VistA primary)
 *   GET  /messaging/portal/inbox        -- portal inbox (fallback cache)
 *   GET  /messaging/health              -- messaging health check
 *
 * Auth: session-based (default AUTH_RULES).
 * Security: message bodies are NEVER logged or audited.
 * Audit: metadata only (action, recipient count, subject length).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  getInbox,
  getSentMessages,
  getMessage,
  getThread,
  markAsRead,
  sendMessage,
  fetchMailGroups,
  portalSendToClinic,
  getPortalMessages,
  isRateLimited,
  getMessageStats,
  listFolders,
  listMessages,
  getVistaMessage,
  manageMessage,
} from '../../services/secure-messaging.js';
import { immutableAudit } from '../../lib/immutable-audit.js';
import { log } from '../../lib/logger.js';

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function auditActor(request: FastifyRequest): { sub: string; name: string; roles: string[] } {
  const s = request.session;
  return {
    sub: s?.duz || 'anonymous',
    name: s?.userName || 'unknown',
    roles: s?.role ? [s.role] : [],
  };
}

function requireSession(request: FastifyRequest, reply: FastifyReply): boolean {
  if (!request.session) {
    reply.code(401).send({ ok: false, error: 'Authentication required' });
    return false;
  }
  return true;
}

/**
 * Strip message body from any object before returning to avoid accidental PHI exposure in logs.
 * Body is included in the response to the client -- but never in audit/log entries.
 */
function sanitizeForAudit(msg: { subject?: string; recipients?: unknown[]; body?: string }): {
  subjectLength: number;
  recipientCount: number;
} {
  return {
    subjectLength: msg.subject?.length || 0,
    recipientCount: Array.isArray(msg.recipients) ? msg.recipients.length : 0,
  };
}

/* ------------------------------------------------------------------ */
/* Route Plugin                                                        */
/* ------------------------------------------------------------------ */

export default async function messagingRoutes(server: FastifyInstance) {
  /* ================================================================ */
  /* VistA-backed endpoints (Phase 70 -- primary path)                 */
  /* ================================================================ */

  /* ---- GET /messaging/folders ---- */
  server.get('/messaging/folders', async (request, reply) => {
    if (!requireSession(request, reply)) return;
    try {
      const result = await listFolders();
      return { ok: result.ok, source: result.source, folders: result.folders, error: result.error };
    } catch (err: any) {
      log.error(`Messaging folders error: ${err.message}`);
      return reply
        .code(502)
        .send({ ok: false, error: 'VistA MailMan unavailable', source: 'local' });
    }
  });

  /* ---- GET /messaging/mail-list ---- */
  server.get('/messaging/mail-list', async (request, reply) => {
    if (!requireSession(request, reply)) return;
    const folderId = (request.query as any)?.folderId || '1';
    const limit = Number((request.query as any)?.limit) || 50;
    try {
      const result = await listMessages(folderId, limit);
      return {
        ok: result.ok,
        source: result.source,
        count: result.messages.length,
        messages: result.messages,
        error: result.error,
      };
    } catch (err: any) {
      log.error(`Messaging mail-list error: ${err.message}`);
      return reply
        .code(502)
        .send({ ok: false, error: 'VistA MailMan unavailable', source: 'local' });
    }
  });

  /* ---- GET /messaging/mail-get ---- */
  server.get('/messaging/mail-get', async (request, reply) => {
    if (!requireSession(request, reply)) return;
    const ien = (request.query as any)?.ien;
    if (!ien) return reply.code(400).send({ ok: false, error: 'Missing ien query parameter' });
    try {
      const result = await getVistaMessage(ien);
      if (!result.ok) return reply.code(result.source === 'vista' ? 404 : 502).send(result);
      return { ok: true, source: result.source, message: result.message };
    } catch (err: any) {
      log.error(`Messaging mail-get error: ${err.message}`);
      return reply
        .code(502)
        .send({ ok: false, error: 'VistA MailMan unavailable', source: 'local' });
    }
  });

  /* ---- POST /messaging/mail-manage ---- */
  server.post('/messaging/mail-manage', async (request, reply) => {
    if (!requireSession(request, reply)) return;
    const body = (request.body as any) || {};
    const action = body.action;
    if (!action || !body.ien) {
      return reply
        .code(400)
        .send({ ok: false, error: 'Missing required: action (markread|delete|move), ien' });
    }
    if (!['markread', 'delete', 'move'].includes(action)) {
      return reply.code(400).send({ ok: false, error: 'action must be markread, delete, or move' });
    }
    try {
      const result = await manageMessage(action, body.ien, body.basket, body.toBasket);
      immutableAudit('messaging.manage', result.ok ? 'success' : 'failure', auditActor(request), {
        detail: { action, ien: body.ien },
      });
      return result;
    } catch (err: any) {
      log.error(`Messaging mail-manage error: ${err.message}`);
      return reply.code(502).send({ ok: false, error: 'VistA MailMan unavailable' });
    }
  });

  /* ================================================================ */
  /* Legacy / fallback endpoints                                       */
  /* ================================================================ */

  /* ---- GET /messaging/inbox ---- */
  server.get('/messaging/inbox', async (request, reply) => {
    if (!requireSession(request, reply)) return;
    const duz = request.session!.duz;
    const limit = Number((request.query as any)?.limit) || 50;
    const messages = getInbox(duz, limit);
    return { ok: true, count: messages.length, messages };
  });

  /* ---- GET /messaging/sent ---- */
  server.get('/messaging/sent', async (request, reply) => {
    if (!requireSession(request, reply)) return;
    const duz = request.session!.duz;
    const limit = Number((request.query as any)?.limit) || 50;
    const messages = getSentMessages(duz, limit);
    return { ok: true, count: messages.length, messages };
  });

  /* ---- GET /messaging/message/:id ---- */
  server.get('/messaging/message/:id', async (request, reply) => {
    if (!requireSession(request, reply)) return;
    const { id } = request.params as { id: string };
    const msg = getMessage(id);
    if (!msg) return reply.code(404).send({ ok: false, error: 'Message not found' });

    // Auto-mark as read if recipient views it
    const duz = request.session!.duz;
    const isRecipient = msg.recipients.some((r) => r.type === 'user' && r.id === duz);
    if (isRecipient && !msg.readAt) {
      markAsRead(id);
    }

    return { ok: true, message: msg };
  });

  /* ---- GET /messaging/thread/:threadId ---- */
  server.get('/messaging/thread/:threadId', async (request, reply) => {
    if (!requireSession(request, reply)) return;
    const { threadId } = request.params as { threadId: string };
    const messages = getThread(threadId);
    return { ok: true, count: messages.length, messages };
  });

  /* ---- POST /messaging/message/:id/read ---- */
  server.post('/messaging/message/:id/read', async (request, reply) => {
    if (!requireSession(request, reply)) return;
    const { id } = request.params as { id: string };
    const success = markAsRead(id);
    if (!success) return reply.code(404).send({ ok: false, error: 'Message not found' });

    immutableAudit('messaging.read', 'success', auditActor(request), {
      detail: { messageId: id },
    });
    return { ok: true, msgId: id, updated: true };
  });

  /* ---- POST /messaging/compose ---- */
  server.post('/messaging/compose', async (request, reply) => {
    if (!requireSession(request, reply)) return;
    const session = request.session!;
    const body = (request.body as any) || {};

    // Validate required fields
    if (!body.subject || !body.body || !body.recipients || !Array.isArray(body.recipients)) {
      return reply.code(400).send({
        ok: false,
        error: 'Missing required fields: subject, body, recipients[]',
      });
    }

    if (body.subject.length < 3 || body.subject.length > 65) {
      return reply.code(400).send({
        ok: false,
        error: 'Subject must be 3-65 characters (MailMan constraint)',
      });
    }

    // Rate limit check
    if (isRateLimited(session.duz, false)) {
      immutableAudit('security.rate-limited', 'denied', auditActor(request), {
        detail: { route: '/messaging/compose' },
      });
      return reply.code(429).send({ ok: false, error: 'Rate limit exceeded (60/hr)' });
    }

    const result = await sendMessage({
      fromDuz: session.duz,
      fromName: session.userName || 'Unknown Provider',
      recipients: body.recipients,
      subject: body.subject,
      body: body.body,
      priority: body.priority || 'routine',
      category: body.category || 'clinical',
      replyToId: body.replyToId || undefined,
    });

    // Audit: metadata only -- NEVER log body
    immutableAudit('messaging.send', 'success', auditActor(request), {
      detail: sanitizeForAudit({ subject: body.subject, recipients: body.recipients }),
    });

    return {
      ok: true,
      message: result.message,
      vistaSync: result.message.vistaSync,
    };
  });

  /* ---- GET /messaging/mail-groups ---- */
  server.get('/messaging/mail-groups', async (request, reply) => {
    if (!requireSession(request, reply)) return;
    const groups = await fetchMailGroups();
    return { ok: true, count: groups.length, groups };
  });

  /* ---- POST /messaging/portal/send ---- */
  server.post('/messaging/portal/send', async (request, reply) => {
    // Portal uses its own session mechanism
    const body = (request.body as any) || {};
    if (!body.patientDfn || !body.patientName || !body.subject || !body.body) {
      return reply.code(400).send({
        ok: false,
        error: 'Missing required fields: patientDfn, patientName, subject, body',
      });
    }

    if (body.subject.length < 3 || body.subject.length > 65) {
      return reply.code(400).send({
        ok: false,
        error: 'Subject must be 3-65 characters',
      });
    }

    // Rate limit check for portal
    if (isRateLimited(`patient-${body.patientDfn}`, true)) {
      immutableAudit(
        'security.rate-limited',
        'denied',
        {
          sub: `patient-${body.patientDfn}`,
          name: body.patientName,
          roles: ['patient'],
        },
        { detail: { route: '/messaging/portal/send' } }
      );
      return reply.code(429).send({ ok: false, error: 'Rate limit exceeded (10/hr)' });
    }

    // Default clinic mail group -- configurable via env var
    const clinicGroup = body.clinicGroup || process.env.MESSAGING_DEFAULT_CLINIC_GROUP || '';

    if (!clinicGroup) {
      // No clinic group configured -- return pending with target info
      return {
        ok: true,
        pending: true,
        target: 'ZVE MAIL SEND -> G.{clinic_group}',
        message:
          'Portal messaging to clinic requires MESSAGING_DEFAULT_CLINIC_GROUP env var or clinicGroup in request body. Configure a VistA mail group name.',
      };
    }

    const result = await portalSendToClinic({
      patientDfn: body.patientDfn,
      patientName: body.patientName,
      clinicGroupName: clinicGroup,
      subject: body.subject,
      body: body.body,
      category: body.category || 'portal',
    });

    // Audit: metadata only
    immutableAudit(
      'messaging.portal-send',
      'success',
      {
        sub: `patient-${body.patientDfn}`,
        name: body.patientName,
        roles: ['patient'],
      },
      {
        detail: {
          subjectLength: body.subject.length,
          clinicGroup,
        },
      }
    );

    return {
      ok: true,
      message: result.message,
      vistaSync: result.message.vistaSync,
    };
  });

  /* ---- GET /messaging/portal/inbox ---- */
  server.get('/messaging/portal/inbox', async (request, reply) => {
    const dfn = (request.query as any)?.dfn;
    if (!dfn) return reply.code(400).send({ ok: false, error: 'Missing dfn query parameter' });
    const limit = Number((request.query as any)?.limit) || 50;
    const messages = getPortalMessages(dfn, limit);
    return { ok: true, count: messages.length, messages };
  });

  /* ---- GET /messaging/health ---- */
  server.get('/messaging/health', async () => {
    const stats = getMessageStats();
    let mailGroupStatus = 'unknown';
    try {
      const groups = await fetchMailGroups();
      mailGroupStatus = groups.length > 0 ? 'available' : 'empty';
    } catch {
      mailGroupStatus = 'unavailable';
    }
    let folderStatus = 'unknown';
    try {
      const folders = await listFolders();
      folderStatus = folders.ok ? `ok (${folders.folders.length} baskets)` : 'unavailable';
    } catch {
      folderStatus = 'unavailable';
    }
    return {
      ok: true,
      module: 'secure-messaging',
      phase: 70,
      vistaRpcs: {
        folders: 'ZVE MAIL FOLDERS',
        list: 'ZVE MAIL LIST',
        get: 'ZVE MAIL GET',
        send: 'ZVE MAIL SEND',
        manage: 'ZVE MAIL MANAGE',
        mailGroups: 'ORQQXMB MAIL GROUPS',
      },
      mailGroupStatus,
      folderStatus,
      stats,
    };
  });
}
