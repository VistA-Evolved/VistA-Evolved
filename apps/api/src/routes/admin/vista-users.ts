import type { FastifyInstance } from 'fastify';
import { safeErr } from '../../lib/safe-error.js';
import { safeCallRpc } from '../../lib/rpc-resilience.js';
import { log } from '../../lib/logger.js';
import { requireSession, requireRole } from '../../auth/auth-routes.js';

export default async function vistaUsersRoutes(server: FastifyInstance) {
  server.get('/admin/vista/users', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search, count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE USER LIST', [search || '', '0', count || '100']);
      const filtered = lines.filter((l: string) => l.trim());
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const dataLines = filtered.filter((l: string) => !/^\d+$/.test(l.trim()));
      const data = dataLines.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: parts[1], active: parts[2], title: parts[3], service: parts[4] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE USER LIST', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE USER LIST', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get<{ Params: { ien: string } }>('/admin/vista/users/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE USER DETAIL', [ien]);
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
      return { ok: true, source: 'vista', rpcUsed: 'VE USER DETAIL', data: detail };
    } catch (err: any) {
      log.error('Failed to call VE USER DETAIL', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/admin/vista/keys', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search } = (request.query as any) || {};
      const lines = await safeCallRpc('VE KEY LIST', [search || '']);
      const filtered = lines.filter((l: string) => l.trim());
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const dataLines = filtered.filter((l: string) => !/^\d+$/.test(l.trim()));
      const data = dataLines.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: parts[1], description: parts[2] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE KEY LIST', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE KEY LIST', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/admin/vista/menus', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search } = (request.query as any) || {};
      if (!search) {
        return reply.code(400).send({ ok: false, error: 'search query param is required' });
      }
      const lines = await safeCallRpc('VE MENU LIST', [search]);
      const filtered = lines.filter((l: string) => l.trim());
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const dataLines = filtered.filter((l: string) => !/^\d+$/.test(l.trim()));
      const data = dataLines.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: parts[1], type: parts[2] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE MENU LIST', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE MENU LIST', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.put<{ Params: { ien: string } }>('/admin/vista/users/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const body = (request.body as any) || {};
      const { field, value } = body;
      if (!field) {
        return reply.code(400).send({ ok: false, error: 'field is required' });
      }
      const lines = await safeCallRpc('VE USER EDIT', [ien, field, value || '']);
      const first = lines.filter((l: string) => l.trim())[0] || '';
      if (first.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: first.split('^').slice(1).join('^') });
      }
      return { ok: true, source: 'vista', rpcUsed: 'VE USER EDIT' };
    } catch (err: any) {
      log.error('Failed to call VE USER EDIT', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.post<{ Params: { ien: string } }>('/admin/vista/users/:ien/keys', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const body = (request.body as any) || {};
      const { keyIen } = body;
      if (!keyIen) {
        return reply.code(400).send({ ok: false, error: 'keyIen is required' });
      }
      const lines = await safeCallRpc('VE USER ADD KEY', [ien, keyIen]);
      const first = lines.filter((l: string) => l.trim())[0] || '';
      if (first.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: first.split('^').slice(1).join('^') });
      }
      return { ok: true, source: 'vista', rpcUsed: 'VE USER ADD KEY' };
    } catch (err: any) {
      log.error('Failed to call VE USER ADD KEY', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.delete<{ Params: { ien: string; keyIen: string } }>('/admin/vista/users/:ien/keys/:keyIen', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien, keyIen } = request.params;
      const lines = await safeCallRpc('VE USER REMOVE KEY', [ien, keyIen]);
      const first = lines.filter((l: string) => l.trim())[0] || '';
      if (first.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: first.split('^').slice(1).join('^') });
      }
      return { ok: true, source: 'vista', rpcUsed: 'VE USER REMOVE KEY' };
    } catch (err: any) {
      log.error('Failed to call VE USER REMOVE KEY', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.post<{ Params: { ien: string } }>('/admin/vista/users/:ien/deactivate', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE USER DEACTIVATE', [ien]);
      const first = lines.filter((l: string) => l.trim())[0] || '';
      if (first.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: first.split('^').slice(1).join('^') });
      }
      return { ok: true, source: 'vista', rpcUsed: 'VE USER DEACTIVATE' };
    } catch (err: any) {
      log.error('Failed to call VE USER DEACTIVATE', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.post<{ Params: { ien: string } }>('/admin/vista/users/:ien/reactivate', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE USER REACTIVATE', [ien]);
      const first = lines.filter((l: string) => l.trim())[0] || '';
      if (first.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: first.split('^').slice(1).join('^') });
      }
      return { ok: true, source: 'vista', rpcUsed: 'VE USER REACTIVATE' };
    } catch (err: any) {
      log.error('Failed to call VE USER REACTIVATE', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });
}
