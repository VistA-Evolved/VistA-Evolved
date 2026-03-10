import type { FastifyInstance } from 'fastify';
import { safeErr } from '../../lib/safe-error.js';
import { safeCallRpc } from '../../lib/rpc-resilience.js';
import { log } from '../../lib/logger.js';
import { requireSession, requireRole } from '../../auth/auth-routes.js';

export default async function vistaSystemRoutes(server: FastifyInstance) {
  server.get('/admin/vista/system/taskman', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE TASKMAN LIST', []);
      const filtered = lines.filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()));
      const data = filtered.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: parts[1], status: parts[2], scheduled: parts[3], namespace: parts[4] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE TASKMAN LIST', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE TASKMAN LIST', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/admin/vista/system/errors', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE ERROR TRAP', [count || '50']);
      const filtered = lines.filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()));
      const data = filtered.map((line: string) => {
        const parts = line.split('^');
        return { date: parts[0], errorId: parts[1], errorText: parts[2], routine: parts[3], line: parts[4] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE ERROR TRAP', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE ERROR TRAP', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/admin/vista/system/status', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE SYS STATUS', []);
      const filtered = lines.filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()));
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const data: Record<string, string> = {};
      filtered.forEach((line: string) => {
        const [key, ...rest] = line.split('^');
        if (key) data[key] = rest.join('^');
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE SYS STATUS', data };
    } catch (err: any) {
      log.error('Failed to call VE SYS STATUS', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/admin/vista/system/parameters', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { entity } = (request.query as any) || {};
      const lines = await safeCallRpc('VE PARAM LIST', [entity || '']);
      const filtered = lines.filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()));
      const data = filtered.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: parts[1], value: parts[2], entity: parts[3] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE PARAM LIST', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE PARAM LIST', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.post('/admin/vista/system/parameters', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const body = (request.body as any) || {};
      const { entity, paramName, value } = body;
      if (!entity || !paramName) {
        return reply.code(400).send({ ok: false, error: 'entity and paramName required' });
      }
      const lines = await safeCallRpc('VE PARAM EDIT', [entity, paramName, value || '']);
      const first = lines.filter((l: string) => l.trim())[0] || '';
      if (first.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: first.split('^').slice(1).join('^') });
      }
      return { ok: true, source: 'vista', rpcUsed: 'VE PARAM EDIT' };
    } catch (err: any) {
      log.error('Failed to call VE PARAM EDIT', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });
}
