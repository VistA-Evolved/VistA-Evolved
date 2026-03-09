import type { FastifyInstance } from 'fastify';
import { safeCallRpc } from '../../lib/rpc-resilience.js';
import { log } from '../../lib/logger.js';
import { requireSession, requireRole } from '../../auth/auth-routes.js';

export default async function vistaInventoryRoutes(server: FastifyInstance) {
  server.get('/admin/vista/inventory/items', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search, count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE INV ITEM LIST', [search || '', count || '100']);
      const filtered = lines.filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()));
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const data = filtered.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: parts[1], category: parts[2], status: parts[3] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE INV ITEM LIST', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE INV ITEM LIST', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });

  server.get<{ Params: { ien: string } }>('/admin/vista/inventory/items/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE INV ITEM DETAIL', [ien]);
      const filtered = lines.filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()));
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const detail: Record<string, string> = {};
      filtered.forEach((line: string) => {
        const [key, ...rest] = line.split('^');
        if (key) detail[key] = rest.join('^');
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE INV ITEM DETAIL', data: detail };
    } catch (err: any) {
      log.error('Failed to call VE INV ITEM DETAIL', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });

  server.get('/admin/vista/inventory/vendors', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search } = (request.query as any) || {};
      const lines = await safeCallRpc('VE INV VENDOR LIST', [search || '']);
      const filtered = lines.filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()));
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const data = filtered.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: parts[1], phone: parts[2], city: parts[3] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE INV VENDOR LIST', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE INV VENDOR LIST', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });

  server.get('/admin/vista/inventory/purchase-orders', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE INV PO LIST', [count || '50']);
      const filtered = lines.filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()));
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const data = filtered.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], poNumber: parts[1], vendor: parts[2], date: parts[3], status: parts[4] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE INV PO LIST', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE INV PO LIST', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });
}
