/**
 * Phase 130 — Portal MailMan Bridge: VistA-first inbox with Postgres fallback.
 *
 * Routes:
 *   GET  /portal/mailman/inbox     — VistA inbox (primary) or Postgres (fallback with "local" label)
 *   GET  /portal/mailman/message/:id — Single message (VistA IEN or Postgres ID)
 *   POST /portal/mailman/send      — Send via VistA MailMan (primary) or Postgres draft+send (fallback)
 *
 * Auth: portal session (matches /^\/portal\// AUTH_RULE — own session check in handler).
 * Security: message bodies NEVER in audit/logs. Redacted before audit.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { listMessages, getVistaMessage, portalSendToClinic } from '../services/secure-messaging.js';
import { connect, disconnect } from '../vista/rpcBrokerClient.js';
import {
  getInbox as getLocalInbox,
  getMessage as getLocalMessage,
} from '../services/portal-messaging.js';
import { immutableAudit } from '../lib/immutable-audit.js';
import { log } from '../lib/logger.js';

/* ------------------------------------------------------------------ */
/* Session plumbing (same pattern as portal-core.ts)                    */
/* ------------------------------------------------------------------ */

interface PortalSessionData {
  token: string;
  patientDfn: string;
  patientName: string;
  createdAt: number;
  lastActivity: number;
}

let sessionLookup: (request: FastifyRequest) => PortalSessionData | null;

/** Called from index.ts to inject the portal session lookup. */
export function initPortalMailman(lookup: (request: FastifyRequest) => PortalSessionData | null) {
  sessionLookup = lookup;
}

function requirePortalSession(request: FastifyRequest): PortalSessionData {
  const session = sessionLookup?.(request);
  if (!session) {
    const err: any = new Error('Not authenticated');
    err.statusCode = 401;
    throw err;
  }
  return session;
}

function portalAuditActor(session: PortalSessionData): {
  sub: string;
  name: string;
  roles: string[];
} {
  return {
    sub: `patient-${session.patientDfn}`,
    name: session.patientName,
    roles: ['patient'],
  };
}

/* ------------------------------------------------------------------ */
/* Route Plugin                                                        */
/* ------------------------------------------------------------------ */

export default async function portalMailmanRoutes(server: FastifyInstance) {
  /* ---- GET /portal/mailman/inbox ---- */
  server.get('/portal/mailman/inbox', async (request, reply) => {
    const session = requirePortalSession(request);
    const limit = Number((request.query as any)?.limit) || 50;

    // 1) Try VistA MailMan inbox (basket "1" = IN)
    try {
      await connect();
      const vistaResult = await listMessages('1', limit);
      disconnect();
      if (vistaResult.ok && vistaResult.source === 'vista') {
        immutableAudit('messaging.read', 'success', portalAuditActor(session), {
          detail: {
            route: '/portal/mailman/inbox',
            source: 'vista',
            count: vistaResult.messages.length,
          },
        });
        return {
          ok: true,
          source: 'vista' as const,
          count: vistaResult.messages.length,
          messages: vistaResult.messages,
        };
      }
    } catch (err: any) {
      disconnect();
      log.warn(`Portal MailMan VistA inbox fallback: ${err.message}`);
    }

    // 2) Fallback: Postgres-backed portal_message store
    const localMessages = await getLocalInbox(session.patientDfn);
    immutableAudit('messaging.read', 'success', portalAuditActor(session), {
      detail: { route: '/portal/mailman/inbox', source: 'local', count: localMessages.length },
    });
    return {
      ok: true,
      source: 'local' as const,
      sourceLabel: 'Local Mode -- VistA MailMan unavailable',
      count: localMessages.length,
      messages: localMessages,
    };
  });

  /* ---- GET /portal/mailman/message/:id ---- */
  server.get('/portal/mailman/message/:id', async (request, reply) => {
    const session = requirePortalSession(request);
    const { id } = request.params as { id: string };

    // If numeric, try VistA IEN first
    if (/^\d+$/.test(id)) {
      try {
        await connect();
        const vistaResult = await getVistaMessage(id);
        disconnect();
        if (vistaResult.ok && vistaResult.source === 'vista') {
          // Audit metadata only — NEVER log message body
          immutableAudit('messaging.read', 'success', portalAuditActor(session), {
            detail: { route: '/portal/mailman/message', ien: id, source: 'vista' },
          });
          return { ok: true, source: 'vista' as const, message: vistaResult.message };
        }
      } catch (err: any) {
        disconnect();
        log.warn(`Portal MailMan VistA message fallback: ${err.message}`);
      }
    }

    // Fallback: Postgres-backed portal_message store
    const localMsg = await getLocalMessage(id, session.patientDfn);
    if (!localMsg) {
      return reply.code(404).send({ ok: false, error: 'Message not found' });
    }
    immutableAudit('messaging.read', 'success', portalAuditActor(session), {
      detail: { route: '/portal/mailman/message', id, source: 'local' },
    });
    return { ok: true, source: 'local' as const, sourceLabel: 'Local Mode', message: localMsg };
  });

  /* ---- POST /portal/mailman/send ---- */
  server.post('/portal/mailman/send', async (request, reply) => {
    const session = requirePortalSession(request);
    const body = (request.body as any) || {};
    if (!body.subject || !body.body) {
      return reply.code(400).send({ ok: false, error: 'Missing required: subject, body' });
    }

    // Default clinic mail group
    const clinicGroup = body.clinicGroup || process.env.MESSAGING_DEFAULT_CLINIC_GROUP || '';

    // Try VistA MailMan first
    if (clinicGroup) {
      try {
        await connect();
        const result = await portalSendToClinic({
          patientDfn: session.patientDfn,
          patientName: session.patientName,
          clinicGroupName: clinicGroup,
          subject: body.subject,
          body: body.body,
          category: body.category || 'portal',
        });
        disconnect();

        // Audit: metadata only — NEVER log message body
        immutableAudit('messaging.portal-send', 'success', portalAuditActor(session), {
          detail: {
            route: '/portal/mailman/send',
            source: 'vista',
            subjectLength: body.subject.length,
            clinicGroup,
          },
        });

        return {
          ok: true,
          source: 'vista' as const,
          message: result.message,
          vistaSync: result.message?.vistaSync || 'pending',
        };
      } catch (err: any) {
        disconnect();
        log.warn(`Portal MailMan VistA send fallback: ${err.message}`);
      }
    }

    // Fallback: Postgres-only draft+send
    try {
      const { createDraft, sendMessage: sendDraft } =
        await import('../services/portal-messaging.js');
      const draft = await createDraft({
        fromDfn: session.patientDfn,
        fromName: session.patientName,
        subject: body.subject,
        category: body.category || 'general',
        body: body.body,
      });
      const sent = await sendDraft(draft.id, session.patientDfn);

      immutableAudit('messaging.portal-send', 'success', portalAuditActor(session), {
        detail: {
          route: '/portal/mailman/send',
          source: 'local',
          subjectLength: body.subject.length,
          messageId: draft.id,
        },
      });

      return {
        ok: true,
        source: 'local' as const,
        sourceLabel: 'Local Mode -- VistA MailMan unavailable',
        message: sent || draft,
        vistaSync: 'not_synced',
      };
    } catch (innerErr: any) {
      log.error(`Portal MailMan local send error: ${innerErr.message}`);
      return reply.code(500).send({ ok: false, error: 'Failed to send message' });
    }
  });
}
