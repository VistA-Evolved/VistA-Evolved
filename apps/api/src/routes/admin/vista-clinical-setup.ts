import type { FastifyInstance } from 'fastify';
import { safeErr } from '../../lib/safe-error.js';
import { safeCallRpc } from '../../lib/rpc-resilience.js';
import { log } from '../../lib/logger.js';
import { requireSession, requireRole } from '../../auth/auth-routes.js';

function normalizeCode(value?: string) {
  const trimmed = String(value || '').trim();
  return trimmed || '';
}

export default async function vistaClinicalSetupRoutes(server: FastifyInstance) {
  server.get('/admin/vista/clinical-setup/order-sets', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search } = (request.query as any) || {};
      const lines = await safeCallRpc('VE ORDER SETS', [search || '']);
      const filtered = lines.filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()));
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const data = filtered.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: parts[1], type: parts[2], status: parts[3] || '' };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE ORDER SETS', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE ORDER SETS', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/admin/vista/clinical-setup/consult-services', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE CONSULT SERVICES', []);
      const filtered = lines.filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()));
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const data = filtered.map((line: string) => {
        const parts = line.split('^');
        return {
          ien: parts[0],
          name: parts[1],
          groupIen: normalizeCode(parts[2]),
          statusCode: normalizeCode(parts[3]),
        };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE CONSULT SERVICES', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE CONSULT SERVICES', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/admin/vista/clinical-setup/tiu-definitions', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search } = (request.query as any) || {};
      const lines = await safeCallRpc('VE TIU DEFINITIONS', [search || '']);
      const filtered = lines.filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()));
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const data = filtered.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: parts[1], type: parts[2], status: parts[3] || '' };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE TIU DEFINITIONS', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE TIU DEFINITIONS', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/admin/vista/clinical-setup/tiu-templates', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search } = (request.query as any) || {};
      const lines = await safeCallRpc('VE TIU TEMPLATES', [search || '']);
      const filtered = lines.filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()));
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const data = filtered.map((line: string) => {
        const parts = line.split('^');
        return {
          ien: parts[0],
          name: parts[1],
          ownerIen: normalizeCode(parts[2]),
          statusCode: normalizeCode(parts[3]),
        };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE TIU TEMPLATES', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE TIU TEMPLATES', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/admin/vista/clinical-setup/health-summary-types', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE HEALTH SUMMARY TYPES', []);
      const filtered = lines.filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()));
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const data = filtered.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: parts[1], owner: parts[2] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE HEALTH SUMMARY TYPES', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE HEALTH SUMMARY TYPES', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });
}
