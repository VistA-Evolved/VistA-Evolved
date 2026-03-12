/**
 * Unified VistA Admin Routes
 *
 * Provides REST endpoints for ALL VE* admin RPCs under /vista/admin/*.
 * Each endpoint calls the corresponding VE* custom RPC via safeCallRpc,
 * parses caret-delimited responses into JSON, and returns structured results.
 *
 * All endpoints require admin role.
 */

import type { FastifyInstance } from 'fastify';
import { safeErr } from '../lib/safe-error.js';
import { safeCallRpc } from '../lib/rpc-resilience.js';
import { log } from '../lib/logger.js';
import { requireSession, requireRole } from '../auth/auth-routes.js';

function parseListResponse(lines: string[]): string[][] {
  return lines
    .filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()))
    .map((l: string) => l.split('^'));
}

function parseDetailResponse(lines: string[]): Record<string, string> {
  const detail: Record<string, string> = {};
  lines
    .filter((l: string) => l.trim() && !/^\d+$/.test(l.trim()))
    .forEach((line: string) => {
      const [key, ...rest] = line.split('^');
      if (key) detail[key] = rest.join('^');
    });
  return detail;
}

function checkError(lines: string[]): string | null {
  const filtered = lines.filter((l: string) => l.trim());
  if (filtered[0]?.startsWith('-1^')) {
    return filtered[0].split('^').slice(1).join('^');
  }
  return null;
}

export default async function vistaAdminRoutes(server: FastifyInstance) {

  // ================================================================
  // User Management (ZVEUSER.m)
  // ================================================================

  server.get('/vista/admin/users', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search, count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE USER LIST', [search || '', '0', count || '100']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], active: p[2], title: p[3], service: p[4],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE USER LIST'], count: data.length, data };
    } catch (err: any) {
      log.error('VE USER LIST failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get<{ Params: { ien: string } }>('/vista/admin/user/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE USER DETAIL', [ien]);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseDetailResponse(lines);
      return { ok: true, source: 'vista', rpcUsed: ['VE USER DETAIL'], data };
    } catch (err: any) {
      log.error('VE USER DETAIL failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.post<{ Params: { ien: string } }>('/vista/admin/user/:ien/edit', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const body = (request.body as any) || {};
      const { field, value } = body;
      if (!field) return reply.code(400).send({ ok: false, error: 'field is required' });
      const lines = await safeCallRpc('VE USER EDIT', [ien, field, value || '']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      return { ok: true, source: 'vista', rpcUsed: ['VE USER EDIT'] };
    } catch (err: any) {
      log.error('VE USER EDIT failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.post<{ Params: { ien: string } }>('/vista/admin/user/:ien/add-key', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const body = (request.body as any) || {};
      const { keyIen } = body;
      if (!keyIen) return reply.code(400).send({ ok: false, error: 'keyIen is required' });
      const lines = await safeCallRpc('VE USER ADD KEY', [ien, keyIen]);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      return { ok: true, source: 'vista', rpcUsed: ['VE USER ADD KEY'] };
    } catch (err: any) {
      log.error('VE USER ADD KEY failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.post<{ Params: { ien: string } }>('/vista/admin/user/:ien/remove-key', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const body = (request.body as any) || {};
      const { keyIen } = body;
      if (!keyIen) return reply.code(400).send({ ok: false, error: 'keyIen is required' });
      const lines = await safeCallRpc('VE USER REMOVE KEY', [ien, keyIen]);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      return { ok: true, source: 'vista', rpcUsed: ['VE USER REMOVE KEY'] };
    } catch (err: any) {
      log.error('VE USER REMOVE KEY failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.post<{ Params: { ien: string } }>('/vista/admin/user/:ien/deactivate', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE USER DEACTIVATE', [ien]);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      return { ok: true, source: 'vista', rpcUsed: ['VE USER DEACTIVATE'] };
    } catch (err: any) {
      log.error('VE USER DEACTIVATE failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.post<{ Params: { ien: string } }>('/vista/admin/user/:ien/reactivate', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE USER REACTIVATE', [ien]);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      return { ok: true, source: 'vista', rpcUsed: ['VE USER REACTIVATE'] };
    } catch (err: any) {
      log.error('VE USER REACTIVATE failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/keys', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search } = (request.query as any) || {};
      const lines = await safeCallRpc('VE KEY LIST', [search || '']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], description: p[2],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE KEY LIST'], count: data.length, data };
    } catch (err: any) {
      log.error('VE KEY LIST failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/menus', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search } = (request.query as any) || {};
      if (!search) return reply.code(400).send({ ok: false, error: 'search query param is required' });
      const lines = await safeCallRpc('VE MENU LIST', [search]);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], type: p[2],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE MENU LIST'], count: data.length, data };
    } catch (err: any) {
      log.error('VE MENU LIST failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  // ================================================================
  // Facility / Org Structure (ZVEFAC.m)
  // ================================================================

  server.get('/vista/admin/institutions', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search, count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE INST LIST', [search || '', count || '100']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], station: p[2],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE INST LIST'], count: data.length, data };
    } catch (err: any) {
      log.error('VE INST LIST failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/divisions', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE DIV LIST', []);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE DIV LIST'], count: data.length, data };
    } catch (err: any) {
      log.error('VE DIV LIST failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/services', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE SVC LIST', []);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE SVC LIST'], count: data.length, data };
    } catch (err: any) {
      log.error('VE SVC LIST failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.post('/vista/admin/service/create', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const body = (request.body as any) || {};
      const { name, abbreviation, chief } = body;
      if (!name) return reply.code(400).send({ ok: false, error: 'name is required' });
      const lines = await safeCallRpc('VE SVC CREATE', [name, abbreviation || '', chief || '']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      return { ok: true, source: 'vista', rpcUsed: ['VE SVC CREATE'] };
    } catch (err: any) {
      log.error('VE SVC CREATE failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.post<{ Params: { ien: string } }>('/vista/admin/service/:ien/edit', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const body = (request.body as any) || {};
      const { field, value } = body;
      if (!field) return reply.code(400).send({ ok: false, error: 'field is required' });
      const lines = await safeCallRpc('VE SVC EDIT', [ien, field, value || '']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      return { ok: true, source: 'vista', rpcUsed: ['VE SVC EDIT'] };
    } catch (err: any) {
      log.error('VE SVC EDIT failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/stop-codes', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search } = (request.query as any) || {};
      const lines = await safeCallRpc('VE STOP LIST', [search || '']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], code: p[2],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE STOP LIST'], count: data.length, data };
    } catch (err: any) {
      log.error('VE STOP LIST failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/specialties', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE SPEC LIST', []);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE SPEC LIST'], count: data.length, data };
    } catch (err: any) {
      log.error('VE SPEC LIST failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/site-params', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE SITE PARM', []);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseDetailResponse(lines);
      return { ok: true, source: 'vista', rpcUsed: ['VE SITE PARM'], data };
    } catch (err: any) {
      log.error('VE SITE PARM failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  // ================================================================
  // Clinics (ZVECLIN.m)
  // ================================================================

  server.get('/vista/admin/clinics', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search, count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE CLIN LIST', [search || '', count || '100']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], abbrev: p[2], active: p[3],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE CLIN LIST'], count: data.length, data };
    } catch (err: any) {
      log.error('VE CLIN LIST failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get<{ Params: { ien: string } }>('/vista/admin/clinic/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE CLIN DETAIL', [ien]);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseDetailResponse(lines);
      return { ok: true, source: 'vista', rpcUsed: ['VE CLIN DETAIL'], data };
    } catch (err: any) {
      log.error('VE CLIN DETAIL failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.post('/vista/admin/clinic/create', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const body = (request.body as any) || {};
      const { name, abbreviation, stopCode } = body;
      if (!name) return reply.code(400).send({ ok: false, error: 'name is required' });
      const lines = await safeCallRpc('VE CLIN CREATE', [name, abbreviation || '', stopCode || '']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      return { ok: true, source: 'vista', rpcUsed: ['VE CLIN CREATE'] };
    } catch (err: any) {
      log.error('VE CLIN CREATE failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.post<{ Params: { ien: string } }>('/vista/admin/clinic/:ien/edit', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const body = (request.body as any) || {};
      const { field, value } = body;
      if (!field) return reply.code(400).send({ ok: false, error: 'field is required' });
      const lines = await safeCallRpc('VE CLIN EDIT', [ien, field, value || '']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      return { ok: true, source: 'vista', rpcUsed: ['VE CLIN EDIT'] };
    } catch (err: any) {
      log.error('VE CLIN EDIT failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.post<{ Params: { ien: string } }>('/vista/admin/clinic/:ien/toggle', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE CLIN TOGGLE', [ien]);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      return { ok: true, source: 'vista', rpcUsed: ['VE CLIN TOGGLE'] };
    } catch (err: any) {
      log.error('VE CLIN TOGGLE failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/appointment-types', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE APPT TYPES', []);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], code: p[2],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE APPT TYPES'], count: data.length, data };
    } catch (err: any) {
      log.error('VE APPT TYPES failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  // ================================================================
  // Wards / Beds (ZVEWARD.m)
  // ================================================================

  server.get('/vista/admin/wards', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE WARD LIST', []);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], beds: p[2], specialty: p[3],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE WARD LIST'], count: data.length, data };
    } catch (err: any) {
      log.error('VE WARD LIST failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get<{ Params: { ien: string } }>('/vista/admin/ward/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE WARD DETAIL', [ien]);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseDetailResponse(lines);
      return { ok: true, source: 'vista', rpcUsed: ['VE WARD DETAIL'], data };
    } catch (err: any) {
      log.error('VE WARD DETAIL failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.post<{ Params: { ien: string } }>('/vista/admin/ward/:ien/edit', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const body = (request.body as any) || {};
      const { field, value } = body;
      if (!field) return reply.code(400).send({ ok: false, error: 'field is required' });
      const lines = await safeCallRpc('VE WARD EDIT', [ien, field, value || '']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      return { ok: true, source: 'vista', rpcUsed: ['VE WARD EDIT'] };
    } catch (err: any) {
      log.error('VE WARD EDIT failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/census', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE CENSUS', []);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        wardIen: p[0], wardName: p[1], occupied: p[2], total: p[3],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE CENSUS'], count: data.length, data };
    } catch (err: any) {
      log.error('VE CENSUS failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  // ================================================================
  // Pharmacy / Formulary (ZVEPHAR.m)
  // ================================================================

  server.get('/vista/admin/drugs', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search, count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE DRUG LIST', [search || '', count || '100']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], generic: p[2], formulary: p[3],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE DRUG LIST'], count: data.length, data };
    } catch (err: any) {
      log.error('VE DRUG LIST failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get<{ Params: { ien: string } }>('/vista/admin/drug/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE DRUG DETAIL', [ien]);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseDetailResponse(lines);
      return { ok: true, source: 'vista', rpcUsed: ['VE DRUG DETAIL'], data };
    } catch (err: any) {
      log.error('VE DRUG DETAIL failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.post<{ Params: { ien: string } }>('/vista/admin/drug/:ien/edit', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const body = (request.body as any) || {};
      const { field, value } = body;
      if (!field) return reply.code(400).send({ ok: false, error: 'field is required' });
      const lines = await safeCallRpc('VE DRUG EDIT', [ien, field, value || '']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      return { ok: true, source: 'vista', rpcUsed: ['VE DRUG EDIT'] };
    } catch (err: any) {
      log.error('VE DRUG EDIT failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/med-routes', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE MED ROUTES', []);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], abbreviation: p[2],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE MED ROUTES'], count: data.length, data };
    } catch (err: any) {
      log.error('VE MED ROUTES failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/med-schedules', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE MED SCHEDULES', []);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], frequency: p[2],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE MED SCHEDULES'], count: data.length, data };
    } catch (err: any) {
      log.error('VE MED SCHEDULES failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  // ================================================================
  // Laboratory (ZVELAB.m)
  // ================================================================

  server.get('/vista/admin/lab-tests', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search, count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE LAB TEST LIST', [search || '', count || '100']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], type: p[2],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE LAB TEST LIST'], count: data.length, data };
    } catch (err: any) {
      log.error('VE LAB TEST LIST failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get<{ Params: { ien: string } }>('/vista/admin/lab-test/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE LAB TEST DETAIL', [ien]);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseDetailResponse(lines);
      return { ok: true, source: 'vista', rpcUsed: ['VE LAB TEST DETAIL'], data };
    } catch (err: any) {
      log.error('VE LAB TEST DETAIL failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.post<{ Params: { ien: string } }>('/vista/admin/lab-test/:ien/edit', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const body = (request.body as any) || {};
      const { field, value } = body;
      if (!field) return reply.code(400).send({ ok: false, error: 'field is required' });
      const lines = await safeCallRpc('VE LAB TEST EDIT', [ien, field, value || '']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      return { ok: true, source: 'vista', rpcUsed: ['VE LAB TEST EDIT'] };
    } catch (err: any) {
      log.error('VE LAB TEST EDIT failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/lab-samples', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE LAB COLL SAMP', []);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE LAB COLL SAMP'], count: data.length, data };
    } catch (err: any) {
      log.error('VE LAB COLL SAMP failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/lab-urgencies', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE LAB URGENCY', []);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE LAB URGENCY'], count: data.length, data };
    } catch (err: any) {
      log.error('VE LAB URGENCY failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  // ================================================================
  // Billing / Insurance (ZVEBILL.m)
  // ================================================================

  server.get('/vista/admin/ib-site', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE IB SITE', []);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseDetailResponse(lines);
      return { ok: true, source: 'vista', rpcUsed: ['VE IB SITE'], data };
    } catch (err: any) {
      log.error('VE IB SITE failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/insurance', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search, count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE INS LIST', [search || '', count || '100']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], type: p[2],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE INS LIST'], count: data.length, data };
    } catch (err: any) {
      log.error('VE INS LIST failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get<{ Params: { ien: string } }>('/vista/admin/insurance/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE INS DETAIL', [ien]);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseDetailResponse(lines);
      return { ok: true, source: 'vista', rpcUsed: ['VE INS DETAIL'], data };
    } catch (err: any) {
      log.error('VE INS DETAIL failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.post('/vista/admin/insurance/create', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const body = (request.body as any) || {};
      const { name, address, phone } = body;
      if (!name) return reply.code(400).send({ ok: false, error: 'name is required' });
      const lines = await safeCallRpc('VE INS CREATE', [name, address || '', phone || '']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      return { ok: true, source: 'vista', rpcUsed: ['VE INS CREATE'] };
    } catch (err: any) {
      log.error('VE INS CREATE failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.post<{ Params: { ien: string } }>('/vista/admin/insurance/:ien/edit', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const body = (request.body as any) || {};
      const { field, value } = body;
      if (!field) return reply.code(400).send({ ok: false, error: 'field is required' });
      const lines = await safeCallRpc('VE INS EDIT', [ien, field, value || '']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      return { ok: true, source: 'vista', rpcUsed: ['VE INS EDIT'] };
    } catch (err: any) {
      log.error('VE INS EDIT failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/claims/count', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE CLAIM COUNT', []);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseDetailResponse(lines);
      return { ok: true, source: 'vista', rpcUsed: ['VE CLAIM COUNT'], data };
    } catch (err: any) {
      log.error('VE CLAIM COUNT failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  // ================================================================
  // Radiology (ZVERAD.m)
  // ================================================================

  server.get('/vista/admin/rad-procedures', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search, count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE RAD PROC LIST', [search || '', count || '100']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], type: p[2],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE RAD PROC LIST'], count: data.length, data };
    } catch (err: any) {
      log.error('VE RAD PROC LIST failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get<{ Params: { ien: string } }>('/vista/admin/rad-procedure/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE RAD PROC DETAIL', [ien]);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseDetailResponse(lines);
      return { ok: true, source: 'vista', rpcUsed: ['VE RAD PROC DETAIL'], data };
    } catch (err: any) {
      log.error('VE RAD PROC DETAIL failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/imaging-locations', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE RAD IMG LOCATIONS', []);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], type: p[2],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE RAD IMG LOCATIONS'], count: data.length, data };
    } catch (err: any) {
      log.error('VE RAD IMG LOCATIONS failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/rad-params', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE RAD DIV PARAMS', []);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseDetailResponse(lines);
      return { ok: true, source: 'vista', rpcUsed: ['VE RAD DIV PARAMS'], data };
    } catch (err: any) {
      log.error('VE RAD DIV PARAMS failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  // ================================================================
  // Inventory / IFCAP (ZVEINV.m)
  // ================================================================

  server.get('/vista/admin/inventory', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search, count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE INV ITEM LIST', [search || '', count || '100']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], nsn: p[2], unitOfIssue: p[3],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE INV ITEM LIST'], count: data.length, data };
    } catch (err: any) {
      log.error('VE INV ITEM LIST failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get<{ Params: { ien: string } }>('/vista/admin/inventory/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE INV ITEM DETAIL', [ien]);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseDetailResponse(lines);
      return { ok: true, source: 'vista', rpcUsed: ['VE INV ITEM DETAIL'], data };
    } catch (err: any) {
      log.error('VE INV ITEM DETAIL failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/vendors', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search, count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE INV VENDOR LIST', [search || '', count || '100']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], phone: p[2], city: p[3],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE INV VENDOR LIST'], count: data.length, data };
    } catch (err: any) {
      log.error('VE INV VENDOR LIST failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/purchase-orders', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE INV PO LIST', [count || '100']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], number: p[1], vendor: p[2], status: p[3],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE INV PO LIST'], count: data.length, data };
    } catch (err: any) {
      log.error('VE INV PO LIST failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  // ================================================================
  // Workforce / Provider Credentialing (ZVEWRKF.m)
  // ================================================================

  server.get('/vista/admin/providers', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search, count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE PROV LIST', [search || '', count || '100']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], title: p[2], npi: p[3],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE PROV LIST'], count: data.length, data };
    } catch (err: any) {
      log.error('VE PROV LIST failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get<{ Params: { ien: string } }>('/vista/admin/provider/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE PROV DETAIL', [ien]);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseDetailResponse(lines);
      return { ok: true, source: 'vista', rpcUsed: ['VE PROV DETAIL'], data };
    } catch (err: any) {
      log.error('VE PROV DETAIL failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/person-classes', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE PERSON CLASS LIST', []);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], classification: p[2],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE PERSON CLASS LIST'], count: data.length, data };
    } catch (err: any) {
      log.error('VE PERSON CLASS LIST failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  // ================================================================
  // Quality Management / Reminders (ZVEQUAL.m)
  // ================================================================

  server.get('/vista/admin/reminders', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE REMINDER LIST', [count || '100']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], class: p[2],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE REMINDER LIST'], count: data.length, data };
    } catch (err: any) {
      log.error('VE REMINDER LIST failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get<{ Params: { ien: string } }>('/vista/admin/reminder/:ien', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { ien } = request.params;
      const lines = await safeCallRpc('VE REMINDER DETAIL', [ien]);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseDetailResponse(lines);
      return { ok: true, source: 'vista', rpcUsed: ['VE REMINDER DETAIL'], data };
    } catch (err: any) {
      log.error('VE REMINDER DETAIL failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/qa-params', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE QA SITE PARAMS', []);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseDetailResponse(lines);
      return { ok: true, source: 'vista', rpcUsed: ['VE QA SITE PARAMS'], data };
    } catch (err: any) {
      log.error('VE QA SITE PARAMS failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  // ================================================================
  // Clinical Application Setup (ZVECAPP.m)
  // ================================================================

  server.get('/vista/admin/order-sets', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE ORDER SETS', [count || '100']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], type: p[2],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE ORDER SETS'], count: data.length, data };
    } catch (err: any) {
      log.error('VE ORDER SETS failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/consult-services', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE CONSULT SERVICES', []);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], status: p[2],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE CONSULT SERVICES'], count: data.length, data };
    } catch (err: any) {
      log.error('VE CONSULT SERVICES failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/tiu-definitions', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE TIU DEFINITIONS', []);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], class: p[2], status: p[3],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE TIU DEFINITIONS'], count: data.length, data };
    } catch (err: any) {
      log.error('VE TIU DEFINITIONS failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/tiu-templates', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE TIU TEMPLATES', []);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], type: p[2],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE TIU TEMPLATES'], count: data.length, data };
    } catch (err: any) {
      log.error('VE TIU TEMPLATES failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/health-summary-types', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE HEALTH SUMMARY TYPES', []);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE HEALTH SUMMARY TYPES'], count: data.length, data };
    } catch (err: any) {
      log.error('VE HEALTH SUMMARY TYPES failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  // ================================================================
  // System Management (ZVESYS.m)
  // ================================================================

  server.get('/vista/admin/taskman', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE TASKMAN LIST', [count || '100']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], status: p[2], scheduled: p[3],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE TASKMAN LIST'], count: data.length, data };
    } catch (err: any) {
      log.error('VE TASKMAN LIST failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/error-trap', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE ERROR TRAP', [count || '50']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], error: p[1], routine: p[2], timestamp: p[3], user: p[4],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE ERROR TRAP'], count: data.length, data };
    } catch (err: any) {
      log.error('VE ERROR TRAP failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/sys-status', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const lines = await safeCallRpc('VE SYS STATUS', []);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseDetailResponse(lines);
      return { ok: true, source: 'vista', rpcUsed: ['VE SYS STATUS'], data };
    } catch (err: any) {
      log.error('VE SYS STATUS failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.get('/vista/admin/parameters', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const { search, count } = (request.query as any) || {};
      const lines = await safeCallRpc('VE PARAM LIST', [search || '', count || '100']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      const data = parseListResponse(lines).map((p) => ({
        ien: p[0], name: p[1], value: p[2],
      }));
      return { ok: true, source: 'vista', rpcUsed: ['VE PARAM LIST'], count: data.length, data };
    } catch (err: any) {
      log.error('VE PARAM LIST failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });

  server.post('/vista/admin/parameter/edit', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    try {
      const body = (request.body as any) || {};
      const { paramIen, value } = body;
      if (!paramIen) return reply.code(400).send({ ok: false, error: 'paramIen is required' });
      const lines = await safeCallRpc('VE PARAM EDIT', [paramIen, value || '']);
      const err = checkError(lines);
      if (err) return reply.code(400).send({ ok: false, error: err });
      return { ok: true, source: 'vista', rpcUsed: ['VE PARAM EDIT'] };
    } catch (err: any) {
      log.error('VE PARAM EDIT failed', { err });
      return reply.code(500).send({ ok: false, error: safeErr(err) });
    }
  });
}
