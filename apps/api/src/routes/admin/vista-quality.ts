import type { FastifyInstance } from 'fastify';
import { safeErr } from '../../lib/safe-error.js';
import { safeCallRpc } from '../../lib/rpc-resilience.js';
import { log } from '../../lib/logger.js';
import { requireSession, requireRole } from '../../auth/auth-routes.js';

function normalizeField(value?: string) {
  return (value ?? '').trim();
}

export default async function vistaQualityRoutes(server: FastifyInstance) {
  server.get('/admin/vista/quality/reminders', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search } = (request.query as any) || {};
      const lines = await safeCallRpc('VE REMINDER LIST', [search || '']);
      const filtered = lines.filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()));
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const data = filtered.map((line: string) => {
        const parts = line.split('^');
        return {
          ien: normalizeField(parts[0]),
          name: normalizeField(parts[1]),
          reminderClass: normalizeField(parts[2]),
          sponsor: normalizeField(parts[3]),
        };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE REMINDER LIST', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE REMINDER LIST', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get<{ Params: { ien: string } }>('/admin/vista/quality/reminders/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE REMINDER DETAIL', [ien]);
      const filtered = lines.filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()));
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const detail: Record<string, string> = {};
      filtered.slice(1).forEach((line: string) => {
        const [key, ...rest] = line.split('^');
        if (key) detail[normalizeField(key)] = normalizeField(rest.join('^'));
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE REMINDER DETAIL', data: detail };
    } catch (err: any) {
      log.error('Failed to call VE REMINDER DETAIL', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/admin/vista/quality/qa-site-params', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE QA SITE PARAMS', []);
      const filtered = lines.filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()));
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const payload = filtered.slice(1).map((line: string) => line.split('^'));
      const detail: Record<string, string> = {
        ien: normalizeField(payload[0]?.[1]),
        facilityCode: normalizeField(payload[1]?.[1]),
        file0Piece2: normalizeField(payload[2]?.[1]),
        file0Piece3: normalizeField(payload[3]?.[1]),
      };
      return { ok: true, source: 'vista', rpcUsed: 'VE QA SITE PARAMS', data: detail };
    } catch (err: any) {
      log.error('Failed to call VE QA SITE PARAMS', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });
}
