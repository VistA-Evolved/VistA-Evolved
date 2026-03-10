/**
 * Immunization Routes -- Phase 65 + wiring fix.
 *
 * Endpoints:
 *   GET  /vista/immunizations?dfn=N   -- Patient immunization history via ORQQPX IMMUN LIST
 *   GET  /vista/immunizations/catalog  -- Immunization type picker via PXVIMM IMM SHORT LIST
 *   POST /vista/immunizations?dfn=N   -- Add immunization via ORWPCE SAVE / PX SAVE DATA
 *
 * Auth: session-based (/vista/* catch-all in security.ts).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../../auth/auth-routes.js';
import { safeCallRpc } from '../../lib/rpc-resilience.js';
import { log } from '../../lib/logger.js';
import { safeErr } from '../../lib/safe-error.js';

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/** Parse ORQQPX IMMUN LIST response: IEN^NAME^DATE/TIME^REACTION^INVERSE_DT */
function fileManDateToIso(value: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const [datePart, timePart = ''] = raw.split('.');
  if (!/^\d{7}$/.test(datePart)) return raw;

  const year = Number(datePart.slice(0, 3)) + 1700;
  const month = datePart.slice(3, 5);
  const day = datePart.slice(5, 7);
  if (!month || !day) return raw;

  const paddedTime = (timePart + '000000').slice(0, 6);
  const hour = paddedTime.slice(0, 2) || '00';
  const minute = paddedTime.slice(2, 4) || '00';
  const second = paddedTime.slice(4, 6) || '00';

  if (timePart.trim()) {
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }

  return `${year}-${month}-${day}`;
}

function parseImmunList(lines: string[]): Array<{
  ien: string;
  name: string;
  dateTime: string;
  rawDateTime: string;
  reaction: string;
  inverseDt: string;
}> {
  const results: Array<{
    ien: string;
    name: string;
    dateTime: string;
    rawDateTime: string;
    reaction: string;
    inverseDt: string;
  }> = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const parts = line.split('^');
    const ien = parts[0]?.trim() || '';
    if (!ien) continue;
    const rawDateTime = parts[2]?.trim() || '';
    results.push({
      ien,
      name: parts[1]?.trim() || '',
      dateTime: fileManDateToIso(rawDateTime),
      rawDateTime,
      reaction: parts[3]?.trim() || '',
      inverseDt: parts[4]?.trim() || '',
    });
  }
  return results;
}

/** Parse PXVIMM IMM SHORT LIST: IEN^NAME */
function parseCatalog(lines: string[]): Array<{ ien: string; name: string }> {
  const results: Array<{ ien: string; name: string }> = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const parts = line.split('^');
    const ien = parts[0]?.trim() || '';
    if (!ien) continue;
    results.push({ ien, name: parts[1]?.trim() || '' });
  }
  return results;
}

/* ------------------------------------------------------------------ */
/* Routes                                                               */
/* ------------------------------------------------------------------ */

export default async function immunizationsRoutes(server: FastifyInstance): Promise<void> {
  /**
   * GET /vista/immunizations?dfn=N
   * Returns patient immunization history from VistA ORQQPX IMMUN LIST.
   */
  server.get('/vista/immunizations', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const dfn = (request.query as any)?.dfn;
    if (!dfn) {
      return reply.status(400).send({ ok: false, error: 'dfn query parameter required' });
    }

    try {
      const lines = await safeCallRpc('ORQQPX IMMUN LIST', [String(dfn)]);
      const results = parseImmunList(lines);
      return reply.send({
        ok: true,
        source: 'vista',
        count: results.length,
        results,
        rpcUsed: ['ORQQPX IMMUN LIST'],

      });
    } catch (err: any) {
      log.warn('ORQQPX IMMUN LIST failed', { err: err.message });
      return reply.code(502).send({
        ok: false,
        source: 'vista',
        error: `Immunization list RPC failed: ${safeErr(err)}`,
        rpcUsed: ['ORQQPX IMMUN LIST'],
      });
    }
  });

  /**
   * GET /vista/immunizations/catalog
   * Returns immunization type picker list from PXVIMM IMM SHORT LIST.
   */
  server.get(
    '/vista/immunizations/catalog',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);

      try {
        const lines = await safeCallRpc('PXVIMM IMM SHORT LIST', []);
        const results = parseCatalog(lines);
        return reply.send({
          ok: true,
          source: 'vista',
          count: results.length,
          results,
          rpcUsed: ['PXVIMM IMM SHORT LIST'],
  
        });
      } catch (err: any) {
        log.warn('PXVIMM IMM SHORT LIST failed', { err: err.message });
        return reply.code(502).send({
          ok: false,
          source: 'vista',
          error: `Immunization catalog RPC failed: ${safeErr(err)}`,
          rpcUsed: ['PXVIMM IMM SHORT LIST'],
        });
      }
    }
  );

  /**
   * POST /vista/immunizations?dfn=N
   * Add immunization via ORWPCE SAVE (PCE encounter save).
   * Falls back to PX SAVE DATA if ORWPCE SAVE fails.
   *
   * Body: { immunizationIen, encounterStr, visitIen?, locationIen?, adminRoute?, adminSite?, infoSource? }
   */
  server.post('/vista/immunizations', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const dfn = (request.query as any)?.dfn;
    if (!dfn) {
      return reply.status(400).send({ ok: false, error: 'dfn query parameter required' });
    }

    const body = (request.body as any) || {};
    const immunizationIen = String(body.immunizationIen || '').trim();
    const encounterStr = String(body.encounterStr || '').trim();
    if (!immunizationIen) {
      return reply.status(400).send({ ok: false, error: 'immunizationIen required' });
    }
    if (!encounterStr) {
      return reply.status(400).send({ ok: false, error: 'encounterStr required (visitIEN;date;locIEN)' });
    }

    const adminRoute = String(body.adminRoute || '').trim();
    const adminSite = String(body.adminSite || '').trim();
    const infoSource = String(body.infoSource || '').trim();
    const rpcUsed: string[] = [];

    // Build PCE data array for ORWPCE SAVE: IMM^operation^immunizationIEN^...
    const pceItems: string[] = [
      `IMM^+^${immunizationIen}^^^${adminRoute}^${adminSite}^${infoSource}^^^`,
    ];

    try {
      const result = await safeCallRpc('ORWPCE SAVE', [
        String(dfn),
        encounterStr,
        ...pceItems,
      ], { idempotent: false });
      rpcUsed.push('ORWPCE SAVE');

      return reply.send({
        ok: true,
        source: 'vista',
        rpcUsed,
        data: result,
      });
    } catch (orwpceErr: any) {
      log.warn('ORWPCE SAVE failed for immunization, trying PX SAVE DATA', {
        err: orwpceErr.message,
      });
      rpcUsed.push('ORWPCE SAVE');

      try {
        const pxResult = await safeCallRpc('PX SAVE DATA', [
          String(dfn),
          encounterStr,
          `IMM^+^${immunizationIen}^^^${adminRoute}^${adminSite}^${infoSource}^^^`,
        ], { idempotent: false });
        rpcUsed.push('PX SAVE DATA');

        return reply.send({
          ok: true,
          source: 'vista',
          rpcUsed,
          data: pxResult,
        });
      } catch (pxErr: any) {
        rpcUsed.push('PX SAVE DATA');
        log.warn('PX SAVE DATA also failed for immunization', { err: pxErr.message });
        return reply.code(502).send({
          ok: false,
          source: 'vista',
          error: `Immunization save failed: ${pxErr.message || 'RPC error'}`,
          rpcUsed,
        });
      }
    }
  });
}
