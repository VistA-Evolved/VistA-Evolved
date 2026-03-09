import type { FastifyInstance } from 'fastify';
import { safeCallRpc } from '../../lib/rpc-resilience.js';
import { log } from '../../lib/logger.js';
import { requireSession, requireRole } from '../../auth/auth-routes.js';

export default async function vistaFacilitiesRoutes(server: FastifyInstance) {
  server.get('/admin/vista/institutions', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search, count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE INST LIST', [search || '', count || '100']);
      const filtered = lines.filter((l: string) => l.trim());
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const dataLines = filtered.filter((l: string) => !/^\d+$/.test(l.trim()));
      const data = dataLines.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: parts[1], station: parts[2] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE INST LIST', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE INST LIST', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });

  server.get('/admin/vista/divisions', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE DIV LIST', []);
      const filtered = lines.filter((l: string) => l.trim());
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const dataLines = filtered.filter((l: string) => !/^\d+$/.test(l.trim()));
      const data = dataLines.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: parts[1] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE DIV LIST', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE DIV LIST', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });

  server.get('/admin/vista/services', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE SVC LIST', []);
      const filtered = lines.filter((l: string) => l.trim());
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const dataLines = filtered.filter((l: string) => !/^\d+$/.test(l.trim()));
      const data = dataLines.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: parts[1] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE SVC LIST', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE SVC LIST', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });

  server.get('/admin/vista/stop-codes', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search } = (request.query as any) || {};
      const lines = await safeCallRpc('VE STOP LIST', [search || '']);
      const filtered = lines.filter((l: string) => l.trim());
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const dataLines = filtered.filter((l: string) => !/^\d+$/.test(l.trim()));
      const data = dataLines.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: parts[1], code: parts[2] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE STOP LIST', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE STOP LIST', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });

  server.get('/admin/vista/specialties', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE SPEC LIST', []);
      const filtered = lines.filter((l: string) => l.trim());
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const dataLines = filtered.filter((l: string) => !/^\d+$/.test(l.trim()));
      const data = dataLines.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: parts[1] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE SPEC LIST', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE SPEC LIST', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });

  server.get('/admin/vista/site-parameters', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE SITE PARM', []);
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
      return { ok: true, source: 'vista', rpcUsed: 'VE SITE PARM', data: detail };
    } catch (err: any) {
      log.error('Failed to call VE SITE PARM', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });

  server.post('/admin/vista/services', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const body = (request.body as any) || {};
      const { name, abbreviation, chief } = body;
      if (!name) {
        return reply.code(400).send({ ok: false, error: 'name is required' });
      }
      const lines = await safeCallRpc('VE SVC CREATE', [name, abbreviation || '', chief || '']);
      const first = lines.filter((l: string) => l.trim())[0] || '';
      if (first.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: first.split('^').slice(1).join('^') });
      }
      return { ok: true, source: 'vista', rpcUsed: 'VE SVC CREATE' };
    } catch (err: any) {
      log.error('Failed to call VE SVC CREATE', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });

  server.put<{ Params: { ien: string } }>('/admin/vista/services/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const body = (request.body as any) || {};
      const { field, value } = body;
      if (!field) {
        return reply.code(400).send({ ok: false, error: 'field is required' });
      }
      const lines = await safeCallRpc('VE SVC EDIT', [ien, field, value || '']);
      const first = lines.filter((l: string) => l.trim())[0] || '';
      if (first.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: first.split('^').slice(1).join('^') });
      }
      return { ok: true, source: 'vista', rpcUsed: 'VE SVC EDIT' };
    } catch (err: any) {
      log.error('Failed to call VE SVC EDIT', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });
}
