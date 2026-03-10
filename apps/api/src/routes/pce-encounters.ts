/**
 * PCE / Immunization / Encounter Routes
 *
 * Wires VE PCE RPCs to REST endpoints for immunization administration,
 * encounter creation, procedure/diagnosis coding, and visit history.
 * All write operations are audited. All responses include rpcUsed + source.
 *
 * Endpoints:
 *   POST /vista/immunizations/give     -- VE PCE IMM GIVE (administer immunization)
 *   GET  /vista/immunizations/history  -- VE PCE IMM HIST (patient immunization history)
 *   POST /vista/encounters/create      -- VE PCE ENCOUNTER (create visit/encounter)
 *   POST /vista/encounters/procedure   -- VE PCE PROCEDURE (add CPT procedure to visit)
 *   POST /vista/encounters/diagnosis   -- VE PCE DIAGNOSIS (add ICD diagnosis to visit)
 *   GET  /vista/encounters/history     -- VE PCE VISIT HIST (patient visit history)
 */

import type { FastifyInstance } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import { safeCallRpc } from '../lib/rpc-resilience.js';
import { audit } from '../lib/audit.js';
import { safeErr } from '../lib/safe-error.js';

function auditActor(request: any): { duz: string; name: string } {
  return {
    duz: request.session?.duz ?? 'unknown',
    name: request.session?.userName ?? 'unknown',
  };
}

function validateDfn(dfn: unknown): string | null {
  if (!dfn) return null;
  const s = String(dfn);
  return /^\d+$/.test(s) ? s : null;
}

function hasRpcError(lines: string[]): boolean {
  const raw = lines.join('\n');
  return (
    raw.trim().startsWith('-1') ||
    /M\s+ERROR|%YDB-E-|LVUNDEF|LAST REF=|doesn't exist/i.test(raw)
  );
}

function parseCaretLines(lines: string[]): Record<string, string>[] {
  return lines
    .filter((l) => l.trim().length > 0)
    .map((line, idx) => {
      const parts = line.split('^');
      return {
        index: String(idx),
        raw: line,
        ...Object.fromEntries(parts.map((v, i) => [`field${i}`, v.trim()])),
      };
    });
}

export default async function pceEncounterRoutes(server: FastifyInstance): Promise<void> {
  /* ----------------------------------------------------------------
   * POST /vista/immunizations/give
   * RPC: VE PCE IMM GIVE
   * ---------------------------------------------------------------- */
  server.post('/vista/immunizations/give', async (request, reply) => {
    const rpcUsed = ['VE PCE IMM GIVE'];
    try {
      await requireSession(request, reply);
      const body = (request.body as any) || {};
      const dfn = validateDfn(body.dfn);
      if (!dfn) return reply.code(400).send({ ok: false, error: 'Missing or non-numeric dfn' });

      const { immIen, dose, lot, site, route, admin } = body;
      const missing: string[] = [];
      if (!immIen) missing.push('immIen');
      if (missing.length > 0) {
        return reply.code(400).send({
          ok: false,
          error: 'Missing required fields',
          fields: missing,
        });
      }

      const lines = await safeCallRpc(
        'VE PCE IMM GIVE',
        [dfn, String(immIen), String(dose ?? ''), String(lot ?? ''), String(site ?? ''), String(route ?? ''), String(admin ?? '')],
        { idempotent: false },
      );

      if (hasRpcError(lines)) {
        audit('clinical.immunization-give', 'failure', auditActor(request), {
          patientDfn: dfn,
          detail: { rpc: 'VE PCE IMM GIVE' },
        });
        return { ok: false, error: lines[0] || 'RPC error', rpcUsed, source: 'vista' };
      }

      audit('clinical.immunization-give', 'success', auditActor(request), {
        patientDfn: dfn,
        detail: { rpc: 'VE PCE IMM GIVE' },
      });

      return {
        ok: true,
        status: 'administered',
        data: parseCaretLines(lines),
        rpcUsed,
        source: 'vista',
      };
    } catch (err: any) {
      audit('clinical.immunization-give', 'failure', auditActor(request), {
        detail: { rpc: 'VE PCE IMM GIVE', error: safeErr(err) },
      });
      return { ok: false, error: safeErr(err), rpcUsed, source: 'vista' };
    }
  });

  /* ----------------------------------------------------------------
   * GET /vista/immunizations/history?dfn=N
   * RPC: VE PCE IMM HIST
   * ---------------------------------------------------------------- */
  server.get('/vista/immunizations/history', async (request, reply) => {
    const rpcUsed = ['VE PCE IMM HIST'];
    try {
      await requireSession(request, reply);
      const dfn = validateDfn((request.query as any)?.dfn);
      if (!dfn) return reply.code(400).send({ ok: false, error: 'Missing or non-numeric dfn' });

      const lines = await safeCallRpc('VE PCE IMM HIST', [dfn]);

      if (hasRpcError(lines)) {
        return { ok: false, error: lines[0] || 'RPC error', rpcUsed, source: 'vista' };
      }

      audit('phi.immunizations-view', 'success', auditActor(request), {
        patientDfn: dfn,
        detail: { count: lines.filter((l) => l.trim()).length },
      });

      return {
        ok: true,
        count: lines.filter((l) => l.trim()).length,
        data: parseCaretLines(lines),
        rpcUsed,
        source: 'vista',
      };
    } catch (err: any) {
      return { ok: false, error: safeErr(err), rpcUsed, source: 'vista' };
    }
  });

  /* ----------------------------------------------------------------
   * POST /vista/encounters/create
   * RPC: VE PCE ENCOUNTER
   * ---------------------------------------------------------------- */
  server.post('/vista/encounters/create', async (request, reply) => {
    const rpcUsed = ['VE PCE ENCOUNTER'];
    try {
      await requireSession(request, reply);
      const body = (request.body as any) || {};
      const dfn = validateDfn(body.dfn);
      if (!dfn) return reply.code(400).send({ ok: false, error: 'Missing or non-numeric dfn' });

      const { vDate, locIen, servCat } = body;
      const missing: string[] = [];
      if (!vDate) missing.push('vDate');
      if (!locIen) missing.push('locIen');
      if (missing.length > 0) {
        return reply.code(400).send({
          ok: false,
          error: 'Missing required fields',
          fields: missing,
        });
      }

      const lines = await safeCallRpc(
        'VE PCE ENCOUNTER',
        [dfn, String(vDate), String(locIen), String(servCat ?? '')],
        { idempotent: false },
      );

      if (hasRpcError(lines)) {
        audit('clinical.encounter-create', 'failure', auditActor(request), {
          patientDfn: dfn,
          detail: { rpc: 'VE PCE ENCOUNTER' },
        });
        return { ok: false, error: lines[0] || 'RPC error', rpcUsed, source: 'vista' };
      }

      audit('clinical.encounter-create', 'success', auditActor(request), {
        patientDfn: dfn,
        detail: { rpc: 'VE PCE ENCOUNTER' },
      });

      return {
        ok: true,
        status: 'created',
        data: parseCaretLines(lines),
        rpcUsed,
        source: 'vista',
      };
    } catch (err: any) {
      audit('clinical.encounter-create', 'failure', auditActor(request), {
        detail: { rpc: 'VE PCE ENCOUNTER', error: safeErr(err) },
      });
      return { ok: false, error: safeErr(err), rpcUsed, source: 'vista' };
    }
  });

  /* ----------------------------------------------------------------
   * POST /vista/encounters/procedure
   * RPC: VE PCE PROCEDURE
   * ---------------------------------------------------------------- */
  server.post('/vista/encounters/procedure', async (request, reply) => {
    const rpcUsed = ['VE PCE PROCEDURE'];
    try {
      await requireSession(request, reply);
      const body = (request.body as any) || {};
      const dfn = validateDfn(body.dfn);
      if (!dfn) return reply.code(400).send({ ok: false, error: 'Missing or non-numeric dfn' });

      const { visitIen, cptCode, modifiers, provDuz } = body;
      const missing: string[] = [];
      if (!visitIen) missing.push('visitIen');
      if (!cptCode) missing.push('cptCode');
      if (missing.length > 0) {
        return reply.code(400).send({
          ok: false,
          error: 'Missing required fields',
          fields: missing,
        });
      }

      const lines = await safeCallRpc(
        'VE PCE PROCEDURE',
        [dfn, String(visitIen), String(cptCode), String(modifiers ?? ''), String(provDuz ?? '')],
        { idempotent: false },
      );

      if (hasRpcError(lines)) {
        audit('clinical.encounter-procedure', 'failure', auditActor(request), {
          patientDfn: dfn,
          detail: { rpc: 'VE PCE PROCEDURE' },
        });
        return { ok: false, error: lines[0] || 'RPC error', rpcUsed, source: 'vista' };
      }

      audit('clinical.encounter-procedure', 'success', auditActor(request), {
        patientDfn: dfn,
        detail: { rpc: 'VE PCE PROCEDURE' },
      });

      return {
        ok: true,
        status: 'recorded',
        data: parseCaretLines(lines),
        rpcUsed,
        source: 'vista',
      };
    } catch (err: any) {
      audit('clinical.encounter-procedure', 'failure', auditActor(request), {
        detail: { rpc: 'VE PCE PROCEDURE', error: safeErr(err) },
      });
      return { ok: false, error: safeErr(err), rpcUsed, source: 'vista' };
    }
  });

  /* ----------------------------------------------------------------
   * POST /vista/encounters/diagnosis
   * RPC: VE PCE DIAGNOSIS
   * ---------------------------------------------------------------- */
  server.post('/vista/encounters/diagnosis', async (request, reply) => {
    const rpcUsed = ['VE PCE DIAGNOSIS'];
    try {
      await requireSession(request, reply);
      const body = (request.body as any) || {};
      const dfn = validateDfn(body.dfn);
      if (!dfn) return reply.code(400).send({ ok: false, error: 'Missing or non-numeric dfn' });

      const { visitIen, icdCode, primary, provDuz } = body;
      const missing: string[] = [];
      if (!visitIen) missing.push('visitIen');
      if (!icdCode) missing.push('icdCode');
      if (missing.length > 0) {
        return reply.code(400).send({
          ok: false,
          error: 'Missing required fields',
          fields: missing,
        });
      }

      const lines = await safeCallRpc(
        'VE PCE DIAGNOSIS',
        [dfn, String(visitIen), String(icdCode), String(primary ?? ''), String(provDuz ?? '')],
        { idempotent: false },
      );

      if (hasRpcError(lines)) {
        audit('clinical.encounter-diagnosis', 'failure', auditActor(request), {
          patientDfn: dfn,
          detail: { rpc: 'VE PCE DIAGNOSIS' },
        });
        return { ok: false, error: lines[0] || 'RPC error', rpcUsed, source: 'vista' };
      }

      audit('clinical.encounter-diagnosis', 'success', auditActor(request), {
        patientDfn: dfn,
        detail: { rpc: 'VE PCE DIAGNOSIS' },
      });

      return {
        ok: true,
        status: 'recorded',
        data: parseCaretLines(lines),
        rpcUsed,
        source: 'vista',
      };
    } catch (err: any) {
      audit('clinical.encounter-diagnosis', 'failure', auditActor(request), {
        detail: { rpc: 'VE PCE DIAGNOSIS', error: safeErr(err) },
      });
      return { ok: false, error: safeErr(err), rpcUsed, source: 'vista' };
    }
  });

  /* ----------------------------------------------------------------
   * GET /vista/encounters/history?dfn=N
   * RPC: VE PCE VISIT HIST
   * ---------------------------------------------------------------- */
  server.get('/vista/encounters/history', async (request, reply) => {
    const rpcUsed = ['VE PCE VISIT HIST'];
    try {
      await requireSession(request, reply);
      const dfn = validateDfn((request.query as any)?.dfn);
      if (!dfn) return reply.code(400).send({ ok: false, error: 'Missing or non-numeric dfn' });

      const lines = await safeCallRpc('VE PCE VISIT HIST', [dfn]);

      if (hasRpcError(lines)) {
        return { ok: false, error: lines[0] || 'RPC error', rpcUsed, source: 'vista' };
      }

      audit('phi.encounters-view', 'success', auditActor(request), {
        patientDfn: dfn,
        detail: { count: lines.filter((l) => l.trim()).length },
      });

      return {
        ok: true,
        count: lines.filter((l) => l.trim()).length,
        data: parseCaretLines(lines),
        rpcUsed,
        source: 'vista',
      };
    } catch (err: any) {
      return { ok: false, error: safeErr(err), rpcUsed, source: 'vista' };
    }
  });
}
