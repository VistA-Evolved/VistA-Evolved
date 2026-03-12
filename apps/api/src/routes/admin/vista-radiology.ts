import type { FastifyInstance } from 'fastify';
import { safeErr } from '../../lib/safe-error.js';
import { safeCallRpc } from '../../lib/rpc-resilience.js';
import { log } from '../../lib/logger.js';
import { requireSession, requireRole } from '../../auth/auth-routes.js';

function normalizeField(value?: string) {
  return (value ?? '').trim();
}

export default async function vistaRadiologyRoutes(server: FastifyInstance) {
  server.get('/admin/vista/radiology/procedures', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search, count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE RAD PROC LIST', [search || '', count || '100']);
      const filtered = lines.filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()));
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const data = filtered.map((line: string) => {
        const parts = line.split('^');
        return {
          ien: normalizeField(parts[0]),
          name: normalizeField(parts[1]),
          typeCode: normalizeField(parts[2]),
          cpt: normalizeField(parts[3]),
        };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE RAD PROC LIST', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE RAD PROC LIST', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get<{ Params: { ien: string } }>('/admin/vista/radiology/procedures/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE RAD PROC DETAIL', [ien]);
      const filtered = lines.filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()));
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const detail: Record<string, string> = {};
      filtered.slice(1).forEach((line: string) => {
        const [key, ...rest] = line.split('^');
        if (key) detail[normalizeField(key)] = normalizeField(rest.join('^'));
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE RAD PROC DETAIL', data: detail };
    } catch (err: any) {
      log.error('Failed to call VE RAD PROC DETAIL', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/admin/vista/radiology/imaging-locations', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE RAD IMG LOCATIONS', []);
      const filtered = lines.filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()));
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const data = filtered.map((line: string) => {
        const parts = line.split('^');
        return {
          ien: normalizeField(parts[0]),
          name: normalizeField(parts[1]),
          entryType: normalizeField(parts[2]),
        };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE RAD IMG LOCATIONS', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE RAD IMG LOCATIONS', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/admin/vista/radiology/division-params', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE RAD DIV PARAMS', []);
      const filtered = lines.filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()));
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const data = filtered.map((line: string) => {
        const parts = line.split('^');
        return {
          ien: normalizeField(parts[0]),
          name: normalizeField(parts[1]),
          file0Piece2: normalizeField(parts[2]),
          file0Piece3: normalizeField(parts[3]),
        };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE RAD DIV PARAMS', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE RAD DIV PARAMS', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });
}
