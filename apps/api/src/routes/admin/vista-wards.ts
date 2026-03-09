import type { FastifyInstance } from 'fastify';
import { safeCallRpc } from '../../lib/rpc-resilience.js';
import { log } from '../../lib/logger.js';
import { requireSession, requireRole } from '../../auth/auth-routes.js';

export default async function vistaWardsRoutes(server: FastifyInstance) {
  server.get('/admin/vista/wards', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE WARD LIST', []);
      const filtered = lines.filter((l: string) => l.trim());
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const dataLines = filtered.filter((l: string) => !/^\d+$/.test(l.trim()));
      const data = dataLines.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: parts[1], beds: parts[2], service: parts[3], occupancy: parts[4] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE WARD LIST', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE WARD LIST', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });

  server.get<{ Params: { ien: string } }>('/admin/vista/wards/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE WARD DETAIL', [ien]);
      const filtered = lines.filter((l: string) => l.trim());
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const dataLines = filtered.filter((l: string) => !/^\d+$/.test(l.trim()));
      const detail: Record<string, string> = {};
      dataLines.forEach((line: string) => {
        const [key, ...rest] = line.split('^');
        if (key) detail[key] = rest.join('^');
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE WARD DETAIL', data: detail };
    } catch (err: any) {
      log.error('Failed to call VE WARD DETAIL', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });

  server.get('/admin/vista/census', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE CENSUS', []);
      const filtered = lines.filter((l: string) => l.trim());
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const dataLines = filtered.filter((l: string) => !/^\d+$/.test(l.trim()));
      const data = dataLines.map((line: string) => {
        const parts = line.split('^');
        return { wardIen: parts[0], wardName: parts[1], beds: parts[2], count: parts[3] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE CENSUS', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE CENSUS', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });

  server.put<{ Params: { ien: string } }>('/admin/vista/wards/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const body = (request.body as any) || {};
      const { field, value } = body;
      if (!field) {
        return reply.code(400).send({ ok: false, error: 'field is required' });
      }
      const lines = await safeCallRpc('VE WARD EDIT', [ien, field, value || '']);
      const first = lines.filter((l: string) => l.trim())[0] || '';
      if (first.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: first.split('^').slice(1).join('^') });
      }
      return { ok: true, source: 'vista', rpcUsed: 'VE WARD EDIT' };
    } catch (err: any) {
      log.error('Failed to call VE WARD EDIT', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });
}
