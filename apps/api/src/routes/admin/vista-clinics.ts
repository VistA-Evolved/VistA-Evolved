import type { FastifyInstance } from 'fastify';
import { safeCallRpc } from '../../lib/rpc-resilience.js';
import { log } from '../../lib/logger.js';
import { requireSession, requireRole } from '../../auth/auth-routes.js';

export default async function vistaClinicsRoutes(server: FastifyInstance) {
  server.get('/admin/vista/clinics', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search, count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE CLIN LIST', [search || '', count || '200']);
      const filtered = lines.filter((l: string) => l.trim());
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const dataLines = filtered.filter((l: string) => !/^\d+$/.test(l.trim()));
      const data = dataLines.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: parts[1], abbreviation: parts[2], service: parts[3], stopCode: parts[4], apptLength: parts[5], provider: parts[6], active: parts[7] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE CLIN LIST', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE CLIN LIST', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });

  server.get<{ Params: { ien: string } }>('/admin/vista/clinics/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE CLIN DETAIL', [ien]);
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
      return { ok: true, source: 'vista', rpcUsed: 'VE CLIN DETAIL', data: detail };
    } catch (err: any) {
      log.error('Failed to call VE CLIN DETAIL', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });

  server.get('/admin/vista/appointment-types', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE APPT TYPES', []);
      const filtered = lines.filter((l: string) => l.trim());
      if (filtered[0]?.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: filtered[0].split('^').slice(1).join('^') });
      }
      const dataLines = filtered.filter((l: string) => !/^\d+$/.test(l.trim()));
      const data = dataLines.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: parts[1] };
      });
      return { ok: true, source: 'vista', rpcUsed: 'VE APPT TYPES', count: data.length, data };
    } catch (err: any) {
      log.error('Failed to call VE APPT TYPES', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });

  server.post('/admin/vista/clinics', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const body = (request.body as any) || {};
      const { name, abbreviation, service, stopCode, appointmentLength } = body;
      if (!name) {
        return reply.code(400).send({ ok: false, error: 'name is required' });
      }
      const lines = await safeCallRpc('VE CLIN CREATE', [
        name, abbreviation || '', service || '', stopCode || '', appointmentLength || '',
      ]);
      const first = lines.filter((l: string) => l.trim())[0] || '';
      if (first.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: first.split('^').slice(1).join('^') });
      }
      return { ok: true, source: 'vista', rpcUsed: 'VE CLIN CREATE' };
    } catch (err: any) {
      log.error('Failed to call VE CLIN CREATE', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });

  server.put<{ Params: { ien: string } }>('/admin/vista/clinics/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const body = (request.body as any) || {};
      const { field, value } = body;
      if (!field) {
        return reply.code(400).send({ ok: false, error: 'field is required' });
      }
      const lines = await safeCallRpc('VE CLIN EDIT', [ien, field, value || '']);
      const first = lines.filter((l: string) => l.trim())[0] || '';
      if (first.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: first.split('^').slice(1).join('^') });
      }
      return { ok: true, source: 'vista', rpcUsed: 'VE CLIN EDIT' };
    } catch (err: any) {
      log.error('Failed to call VE CLIN EDIT', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });

  server.post<{ Params: { ien: string } }>('/admin/vista/clinics/:ien/toggle', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const body = (request.body as any) || {};
      const { action } = body;
      if (!action) {
        return reply.code(400).send({ ok: false, error: 'action is required (activate or inactivate)' });
      }
      const lines = await safeCallRpc('VE CLIN TOGGLE', [ien, action]);
      const first = lines.filter((l: string) => l.trim())[0] || '';
      if (first.startsWith('-1^')) {
        return reply.code(400).send({ ok: false, error: first.split('^').slice(1).join('^') });
      }
      return { ok: true, source: 'vista', rpcUsed: 'VE CLIN TOGGLE' };
    } catch (err: any) {
      log.error('Failed to call VE CLIN TOGGLE', { err });
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });
}
