import type { FastifyInstance } from 'fastify';
import { safeCallRpc } from '../../lib/rpc-resilience.js';
import { log } from '../../lib/logger.js';
import { requireSession, requireRole } from '../../auth/auth-routes.js';

export default async function vistaPharmacyRoutes(server: FastifyInstance) {
  server.get('/admin/vista/drugs', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search, count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE DRUG LIST', [search || '', count || '100']);
      const filtered = lines.filter((l: string) => l.trim());
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const dataLines = filtered.filter((l: string) => !/^\d+$/.test(l.trim()));
      const data = dataLines.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: parts[1], vaClass: parts[2], formulary: parts[3] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE DRUG LIST', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE DRUG LIST', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });

  server.get<{ Params: { ien: string } }>('/admin/vista/drugs/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE DRUG DETAIL', [ien]);
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
      return { ok: true, source: 'vista', rpcUsed: 'VE DRUG DETAIL', data: detail };
    } catch (err: any) {
      log.error('Failed to call VE DRUG DETAIL', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });

  server.get('/admin/vista/med-routes', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE MED ROUTES', []);
      const filtered = lines.filter((l: string) => l.trim());
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const dataLines = filtered.filter((l: string) => !/^\d+$/.test(l.trim()));
      const data = dataLines.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: parts[1], abbreviation: parts[2] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE MED ROUTES', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE MED ROUTES', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });

  server.get('/admin/vista/med-schedules', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE MED SCHEDULES', []);
      const filtered = lines.filter((l: string) => l.trim());
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const dataLines = filtered.filter((l: string) => !/^\d+$/.test(l.trim()));
      const data = dataLines.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: parts[1], frequency: parts[2] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE MED SCHEDULES', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE MED SCHEDULES', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });

  server.put<{ Params: { ien: string } }>('/admin/vista/drugs/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const body = (request.body as any) || {};
      const { field, value } = body;
      if (!field) {
        return reply.code(400).send({ ok: false, error: 'field is required' });
      }
      const lines = await safeCallRpc('VE DRUG EDIT', [ien, field, value || '']);
      const first = lines.filter((l: string) => l.trim())[0] || '';
      if (first.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: first.split('^').slice(1).join('^') });
      }
      return { ok: true, source: 'vista', rpcUsed: 'VE DRUG EDIT' };
    } catch (err: any) {
      log.error('Failed to call VE DRUG EDIT', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });
}
