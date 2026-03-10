import type { FastifyInstance } from 'fastify';
import { safeErr } from '../../lib/safe-error.js';
import { safeCallRpc } from '../../lib/rpc-resilience.js';
import { log } from '../../lib/logger.js';
import { requireSession, requireRole } from '../../auth/auth-routes.js';

export default async function vistaBillingConfigRoutes(server: FastifyInstance) {
  server.get('/admin/vista/ib-site', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE IB SITE', []);
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
      return { ok: true, source: 'vista', rpcUsed: 'VE IB SITE', data: detail };
    } catch (err: any) {
      log.error('Failed to call VE IB SITE', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/admin/vista/insurance-companies', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search, count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE INS LIST', [search || '', count || '100']);
      const filtered = lines.filter((l: string) => l.trim());
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const dataLines = filtered.filter((l: string) => !/^\d+$/.test(l.trim()));
      const data = dataLines.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: parts[1], reimburseType: parts[2], city: parts[3] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE INS LIST', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE INS LIST', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get<{ Params: { ien: string } }>(
    '/admin/vista/insurance-companies/:ien',
    async (request, reply) => {
      const session = await requireSession(request, reply);
      requireRole(session, ['admin'], reply);
      try {
        const { ien } = request.params;
        const lines = await safeCallRpc('VE INS DETAIL', [ien]);
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
        return { ok: true, source: 'vista', rpcUsed: 'VE INS DETAIL', data: detail };
      } catch (err: any) {
        log.error('Failed to call VE INS DETAIL', { err });
        return reply.code(500).send({ ok: false, error: safeErr(err) });
      }
    }
  );

  server.get('/admin/vista/claim-count', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE CLAIM COUNT', []);
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
      return { ok: true, source: 'vista', rpcUsed: 'VE CLAIM COUNT', data: detail };
    } catch (err: any) {
      log.error('Failed to call VE CLAIM COUNT', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.post('/admin/vista/insurance-companies', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const body = (request.body as any) || {};
      const { name, city, state, zip, phone } = body;
      if (!name) {
        return reply.code(400).send({ ok: false, error: 'name is required' });
      }
      const lines = await safeCallRpc('VE INS CREATE', [
        name, city || '', state || '', zip || '', phone || '',
      ]);
      const first = lines.filter((l: string) => l.trim())[0] || '';
      if (first.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: first.split('^').slice(1).join('^') });
      }
      return { ok: true, source: 'vista', rpcUsed: 'VE INS CREATE' };
    } catch (err: any) {
      log.error('Failed to call VE INS CREATE', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.put<{ Params: { ien: string } }>('/admin/vista/insurance-companies/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const body = (request.body as any) || {};
      const { field, value } = body;
      if (!field) {
        return reply.code(400).send({ ok: false, error: 'field is required' });
      }
      const lines = await safeCallRpc('VE INS EDIT', [ien, field, value || '']);
      const first = lines.filter((l: string) => l.trim())[0] || '';
      if (first.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: first.split('^').slice(1).join('^') });
      }
      return { ok: true, source: 'vista', rpcUsed: 'VE INS EDIT' };
    } catch (err: any) {
      log.error('Failed to call VE INS EDIT', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });
}
