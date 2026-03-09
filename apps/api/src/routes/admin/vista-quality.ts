import type { FastifyInstance } from 'fastify';
import { safeCallRpc } from '../../lib/rpc-resilience.js';
import { log } from '../../lib/logger.js';
import { requireSession, requireRole } from '../../auth/auth-routes.js';

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
        return { ien: parts[0], name: parts[1], reminderClass: parts[2], sponsor: parts[3] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE REMINDER LIST', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE REMINDER LIST', { err });
      return reply.code(500).send({ ok: false, error: err.message });
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
      filtered.forEach((line: string) => {
        const [key, ...rest] = line.split('^');
        if (key) detail[key] = rest.join('^');
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE REMINDER DETAIL', data: detail };
    } catch (err: any) {
      log.error('Failed to call VE REMINDER DETAIL', { err });
      return reply.code(500).send({ ok: false, error: err.message });
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
      const detail: Record<string, string> = {};
      filtered.forEach((line: string) => {
        const [key, ...rest] = line.split('^');
        if (key) detail[key] = rest.join('^');
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE QA SITE PARAMS', data: detail };
    } catch (err: any) {
      log.error('Failed to call VE QA SITE PARAMS', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });
}
