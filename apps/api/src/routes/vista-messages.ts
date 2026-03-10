/**
 * VistA Messages Routes -- MailMan RPC bridge with standard VistA RPC fallback.
 *
 * Routes:
 *   GET  /vista/messages/inbox       -- Read inbox from VistA MailMan
 *   POST /vista/messages/send        -- Send message through VistA MailMan
 *   GET  /vista/messages/recipients  -- Search for message recipients
 *
 * Strategy: Try standard VistA MailMan RPCs first (XM GET MAIL, XM SEND MSG,
 * ORWPT CLINRNG), then fall back to custom ZVEMSGR.m RPCs (ZVE MAIL LIST,
 * ZVE MAIL SEND), then in-memory store as last resort.
 *
 * Auth: session (matches /^\/vista\// AUTH_RULE).
 */

import type { FastifyInstance } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import { safeCallRpc, safeCallRpcWithList } from '../lib/rpc-resilience.js';
import { immutableAudit } from '../lib/immutable-audit.js';
import { log } from '../lib/logger.js';
import { safeErr } from '../lib/safe-error.js';

/* ================================================================== */
/* Helpers                                                              */
/* ================================================================== */

function auditActor(session: { duz: string; userName: string; role?: string }) {
  return {
    sub: session.duz,
    name: session.userName,
    roles: session.role ? [session.role] : [],
  };
}

interface InboxMessage {
  ien: string;
  subject: string;
  fromDuz: string;
  fromName: string;
  date: string;
  isNew: boolean;
}

function fmDateToISO(fmDate: string): string {
  if (!fmDate || fmDate === '0') return '';
  const intPart = fmDate.split('.')[0];
  const timePart = fmDate.split('.')[1] || '000000';
  const yr = 1700 + parseInt(intPart.substring(0, 3), 10);
  const mo = intPart.substring(3, 5);
  const dy = intPart.substring(5, 7);
  const hh = timePart.substring(0, 2).padEnd(2, '0');
  const mm = timePart.substring(2, 4).padEnd(2, '0');
  const ss = timePart.substring(4, 6).padEnd(2, '0');
  return `${yr}-${mo}-${dy}T${hh}:${mm}:${ss}.000Z`;
}

/* ================================================================== */
/* Route Plugin                                                         */
/* ================================================================== */

export default async function vistaMessagesRoutes(server: FastifyInstance): Promise<void> {
  /* ---------------------------------------------------------------- */
  /* GET /vista/messages/inbox                                         */
  /* Tries: XM GET MAIL -> ZVE MAIL LIST -> empty                      */
  /* ---------------------------------------------------------------- */
  server.get('/vista/messages/inbox', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (reply.sent) return;
    const limit = Number((request.query as any)?.limit) || 50;
    const rpcUsed: string[] = [];

    try {
      // Strategy 1: Standard VistA MailMan RPC
      try {
        const lines = await safeCallRpc('XM GET MAIL', [session.duz, String(limit)]);
        rpcUsed.push('XM GET MAIL');
        if (lines && lines.length > 0 && !lines[0]?.includes('not found') && !lines[0]?.includes('error')) {
          const messages: InboxMessage[] = [];
          for (const line of lines) {
            if (!line.trim()) continue;
            const parts = line.split('^');
            if (parts.length < 4) continue;
            messages.push({
              ien: parts[0],
              subject: parts[1] || '',
              fromDuz: parts[2] || '',
              fromName: parts[3] || '',
              date: parts[4] ? fmDateToISO(parts[4]) : '',
              isNew: parts[5] === '1',
            });
          }
          immutableAudit('messaging.read', 'success', auditActor(session), {
            detail: { route: '/vista/messages/inbox', count: messages.length, source: 'vista' },
          });
          return { ok: true, source: 'vista', rpcUsed, count: messages.length, data: messages };
        }
      } catch {
        rpcUsed.push('XM GET MAIL (unavailable)');
      }

      // Strategy 2: Custom ZVEMSGR.m RPC
      try {
        const lines = await safeCallRpcWithList('ZVE MAIL LIST', [
          { type: 'list' as const, value: { '0': '1', '1': String(limit) } },
        ]);
        rpcUsed.push('ZVE MAIL LIST');
        if (lines && lines.length > 0 && lines[0]?.startsWith('ok')) {
          const messages: InboxMessage[] = [];
          for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split('^');
            if (parts.length < 5) continue;
            messages.push({
              ien: parts[0],
              subject: parts[1],
              fromDuz: parts[2],
              fromName: parts[3],
              date: fmDateToISO(parts[4]),
              isNew: parts[6] === '1',
            });
          }
          immutableAudit('messaging.read', 'success', auditActor(session), {
            detail: { route: '/vista/messages/inbox', count: messages.length, source: 'vista' },
          });
          return { ok: true, source: 'vista', rpcUsed, count: messages.length, data: messages };
        }
      } catch {
        rpcUsed.push('ZVE MAIL LIST (unavailable)');
      }

      // Both RPCs unavailable
      immutableAudit('messaging.read', 'failure', auditActor(session), {
        detail: { route: '/vista/messages/inbox', source: 'none', rpcUsed },
      });
      return reply.status(503).send({
        ok: false,
        source: 'none',
        rpcUsed,
        error: 'VistA MailMan RPCs unavailable',
        vistaGrounding: {
          vistaFiles: ['File #3.9 (MailMan Message)'],
          targetRpcs: ['XM GET MAIL', 'ZVE MAIL LIST'],
          migrationPath: 'Install ZVEMSGR.m or standard MailMan package',
        },
      });
    } catch (err: unknown) {
      log.error('Messages inbox error', { error: err instanceof Error ? err.message : String(err) });
      return reply.status(500).send({ ok: false, rpcUsed, error: safeErr(err) });
    }
  });

  /* ---------------------------------------------------------------- */
  /* POST /vista/messages/send                                         */
  /* Tries: XM SEND MSG -> ZVE MAIL SEND                               */
  /* ---------------------------------------------------------------- */
  server.post('/vista/messages/send', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (reply.sent) return;
    const body = (request.body as any) || {};
    const rpcUsed: string[] = [];

    if (!body.subject || !body.body) {
      return reply.status(400).send({ ok: false, error: 'Missing required fields: subject, body' });
    }
    if (!body.to) {
      return reply.status(400).send({
        ok: false,
        error: 'Missing required field: to (recipient DUZ, name, or mail group)',
      });
    }

    const recipients = Array.isArray(body.to)
      ? body.to
      : [{ type: 'user' as const, id: String(body.to), name: body.toName || String(body.to) }];

    try {
      // Strategy 1: Standard VistA MailMan send RPC
      try {
        const toList = recipients
          .map((r: { type: string; id: string; name?: string }) =>
            r.type === 'mail-group' ? `G.${r.name || r.id}` : r.id
          )
          .join(',');
        const lines = await safeCallRpc(
          'XM SEND MSG',
          [body.subject, body.body, toList, body.priority || ''],
          { idempotent: false }
        );
        rpcUsed.push('XM SEND MSG');
        const resultStr = lines.join('\n').trim();
        if (!resultStr.toLowerCase().includes('error') && !resultStr.includes('-1')) {
          const vistaRef = resultStr.split('^')[0] || null;
          immutableAudit('messaging.send', 'success', auditActor(session), {
            detail: {
              route: '/vista/messages/send',
              recipientCount: recipients.length,
              subjectLength: body.subject.length,
              vistaRef,
            },
          });
          return {
            ok: true,
            source: 'vista',
            rpcUsed,
            vistaRef,
          };
        }
      } catch {
        rpcUsed.push('XM SEND MSG (unavailable)');
      }

      // Strategy 2: Custom ZVEMSGR.m send RPC
      try {
        const listParams: Record<string, string> = {};
        listParams['SUBJ'] = body.subject;
        const textLines = body.body.split('\n');
        for (let i = 0; i < textLines.length; i++) {
          listParams[`TEXT,${i + 1}`] = textLines[i] || ' ';
        }
        let recIdx = 1;
        for (const r of recipients) {
          const recValue = r.type === 'mail-group' ? `G.${r.name || r.id}` : r.id;
          listParams[`REC,${recIdx}`] = recValue;
          recIdx++;
        }
        if (body.priority === 'priority' || body.priority === 'urgent') {
          listParams['PRI'] = 'P';
        }

        const result = await safeCallRpcWithList('ZVE MAIL SEND', [
          { type: 'list' as const, value: listParams },
        ]);
        rpcUsed.push('ZVE MAIL SEND');
        const resultStr = Array.isArray(result) ? result.join('\n').trim() : '';
        if (resultStr.startsWith('ok^')) {
          const vistaRef = resultStr.split('^')[1] || null;
          immutableAudit('messaging.send', 'success', auditActor(session), {
            detail: {
              route: '/vista/messages/send',
              recipientCount: recipients.length,
              subjectLength: body.subject.length,
              vistaRef,
            },
          });
          return { ok: true, source: 'vista', rpcUsed, vistaRef };
        }
      } catch {
        rpcUsed.push('ZVE MAIL SEND (unavailable)');
      }

      // Both RPCs unavailable
      immutableAudit('messaging.send', 'failure', auditActor(session), {
        detail: { route: '/vista/messages/send', rpcUsed },
      });
      return reply.status(503).send({
        ok: false,
        source: 'none',
        rpcUsed,
        error: 'VistA MailMan send RPCs unavailable',
        vistaGrounding: {
          vistaFiles: ['File #3.9 (MailMan Message)'],
          targetRpcs: ['XM SEND MSG', 'ZVE MAIL SEND'],
          migrationPath: 'Install ZVEMSGR.m or configure XM SEND MSG in context',
        },
      });
    } catch (err: unknown) {
      log.error('Messages send error', { error: err instanceof Error ? err.message : String(err) });
      return reply.status(500).send({ ok: false, rpcUsed, error: safeErr(err) });
    }
  });

  /* ---------------------------------------------------------------- */
  /* GET /vista/messages/recipients                                     */
  /* Tries: ORWPT CLINRNG -> ORQQXMB MAIL GROUPS -> empty              */
  /* ---------------------------------------------------------------- */
  server.get('/vista/messages/recipients', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (reply.sent) return;
    const search = String((request.query as any)?.search || '').trim();
    const rpcUsed: string[] = [];

    if (!search) {
      return reply.status(400).send({ ok: false, error: 'Missing required query param: search' });
    }

    try {
      const results: Array<{
        type: 'user' | 'mail-group';
        id: string;
        name: string;
        title?: string;
      }> = [];

      // Strategy 1: Clinician search via ORWPT CLINRNG
      try {
        const lines = await safeCallRpc('ORWPT CLINRNG', [search]);
        rpcUsed.push('ORWPT CLINRNG');
        for (const line of lines) {
          if (!line.trim()) continue;
          const parts = line.split('^');
          if (parts.length >= 2 && parts[0]) {
            results.push({
              type: 'user',
              id: parts[0],
              name: parts[1] || '',
              title: parts[2] || undefined,
            });
          }
        }
      } catch {
        rpcUsed.push('ORWPT CLINRNG (unavailable)');
      }

      // Also include mail groups matching the search
      try {
        const groupLines = await safeCallRpc('ORQQXMB MAIL GROUPS', []);
        rpcUsed.push('ORQQXMB MAIL GROUPS');
        for (const line of groupLines) {
          if (!line.trim()) continue;
          const parts = line.split('^');
          const groupName = parts[1] || parts[0] || '';
          if (groupName.toUpperCase().includes(search.toUpperCase())) {
            results.push({
              type: 'mail-group',
              id: parts[0],
              name: groupName,
              title: parts[2] || undefined,
            });
          }
        }
      } catch {
        rpcUsed.push('ORQQXMB MAIL GROUPS (unavailable)');
      }

      immutableAudit('messaging.recipient_search', 'success', auditActor(session), {
        detail: { route: '/vista/messages/recipients', resultCount: results.length },
      });

      return {
        ok: true,
        source: 'vista',
        rpcUsed,
        count: results.length,
        data: results,
      };
    } catch (err: unknown) {
      log.error('Recipients search error', {
        error: err instanceof Error ? err.message : String(err),
      });
      return reply.status(500).send({ ok: false, rpcUsed, error: safeErr(err) });
    }
  });

  log.info('VistA Messages routes registered: 3 endpoints (inbox, send, recipients)');
}
