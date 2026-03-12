import type { FastifyInstance } from 'fastify';
import { safeErr } from '../../lib/safe-error.js';
import { safeCallRpc } from '../../lib/rpc-resilience.js';
import { log } from '../../lib/logger.js';
import { requireSession, requireRole } from '../../auth/auth-routes.js';

function normalizeField(value?: string) {
  return (value ?? '').trim();
}

export default async function vistaWorkforceRoutes(server: FastifyInstance) {
  server.get('/admin/vista/workforce/providers', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search } = (request.query as any) || {};
      const lines = await safeCallRpc('VE PROV LIST', [search || '']);
      const filtered = lines.filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()));
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const data = filtered.map((line: string) => {
        const parts = line.split('^');
        return {
          ien: normalizeField(parts[0]),
          name: normalizeField(parts[1]),
          npi: normalizeField(parts[2]),
          dea: normalizeField(parts[3]),
          personClassIen: normalizeField(parts[4]),
        };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE PROV LIST', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE PROV LIST', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get<{ Params: { ien: string } }>('/admin/vista/workforce/providers/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE PROV DETAIL', [ien]);
      const filtered = lines.filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()));
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const detail: Record<string, string> = {};
      filtered.slice(1).forEach((line: string) => {
        const [key, ...rest] = line.split('^');
        if (key) detail[normalizeField(key)] = normalizeField(rest.join('^'));
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE PROV DETAIL', data: detail };
    } catch (err: any) {
      log.error('Failed to call VE PROV DETAIL', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/admin/vista/workforce/person-classes', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE PERSON CLASS LIST', []);
      const filtered = lines.filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()));
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const data = filtered.map((line: string) => {
        const parts = line.split('^');
        return {
          ien: normalizeField(parts[0]),
          name: normalizeField(parts[1]),
          classification: normalizeField(parts[2]),
          area: normalizeField(parts[3]),
        };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE PERSON CLASS LIST', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE PERSON CLASS LIST', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });
}
