import type { FastifyInstance } from 'fastify';
import { safeErr } from '../../lib/safe-error.js';
import { safeCallRpc } from '../../lib/rpc-resilience.js';
import { log } from '../../lib/logger.js';
import { requireSession, requireRole } from '../../auth/auth-routes.js';

function normalizeField(value?: string) {
  return String(value || '').trim();
}

export default async function vistaLabRoutes(server: FastifyInstance) {
  server.get('/admin/vista/lab-tests', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search, count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE LAB TEST LIST', [search || '', count || '100']);
      const filtered = lines.filter((l: string) => l.trim());
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const dataLines = filtered.filter((l: string) => !/^\d+$/.test(l.trim()));
      const data = dataLines.map((line: string) => {
        const parts = line.split('^');
        return {
          ien: parts[0],
          name: normalizeField(parts[1]),
          typeCode: normalizeField(parts[2]),
          subscript: normalizeField(parts[3]),
        };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE LAB TEST LIST', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE LAB TEST LIST', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get<{ Params: { ien: string } }>('/admin/vista/lab-tests/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE LAB TEST DETAIL', [ien]);
      const filtered = lines.filter((l: string) => l.trim());
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const dataLines = filtered.slice(1).filter((l: string) => !/^\d+$/.test(l.trim()));
      const detail: Record<string, string> = {};
      dataLines.forEach((line: string) => {
        const [key, ...rest] = line.split('^');
        if (key) detail[key] = normalizeField(rest.join('^'));
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE LAB TEST DETAIL', data: detail };
    } catch (err: any) {
      log.error('Failed to call VE LAB TEST DETAIL', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/admin/vista/collection-samples', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE LAB COLL SAMP', []);
      const filtered = lines.filter((l: string) => l.trim());
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const dataLines = filtered.filter((l: string) => !/^\d+$/.test(l.trim()));
      const data = dataLines.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: normalizeField(parts[1]), tubeIen: normalizeField(parts[2]) };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE LAB COLL SAMP', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE LAB COLL SAMP', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/admin/vista/lab-urgency', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE LAB URGENCY', []);
      const filtered = lines.filter((l: string) => l.trim());
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const dataLines = filtered.filter((l: string) => !/^\d+$/.test(l.trim()));
      const data = dataLines.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: normalizeField(parts[1]) };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE LAB URGENCY', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE LAB URGENCY', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.put<{ Params: { ien: string } }>('/admin/vista/lab-tests/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const body = (request.body as any) || {};
      const { field, value } = body;
      if (!field) {
        return reply.code(400).send({ ok: false, error: 'field is required' });
      }
      const lines = await safeCallRpc('VE LAB TEST EDIT', [ien, field, value || '']);
      const first = lines.filter((l: string) => l.trim())[0] || '';
      if (first.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: first.split('^').slice(1).join('^') });
      }
      return { ok: true, source: 'vista', rpcUsed: 'VE LAB TEST EDIT' };
    } catch (err: any) {
      log.error('Failed to call VE LAB TEST EDIT', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });
}
