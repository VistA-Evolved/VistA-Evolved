/**
 * E-Prescribing (eRx) Routes
 *
 * Wires VE ERX RPCs to REST endpoints for electronic prescribing operations.
 * All write operations are audited. All responses include rpcUsed + source.
 *
 * Endpoints:
 *   POST /vista/erx/prescribe   -- VE ERX NEWRX (new prescription)
 *   POST /vista/erx/renew       -- VE ERX RENEW (renew existing Rx)
 *   POST /vista/erx/cancel      -- VE ERX CANCEL (cancel active Rx)
 *   GET  /vista/erx/drug-search -- VE ERX DRUGSRCH (drug name lookup)
 *   GET  /vista/erx/history     -- VE ERX HISTORY (patient Rx history)
 *   GET  /vista/erx/status      -- VE ERX STATUS (single Rx status)
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

export default async function ePrescribingRoutes(server: FastifyInstance): Promise<void> {
  /* ----------------------------------------------------------------
   * POST /vista/erx/prescribe
   * RPC: VE ERX NEWRX
   * ---------------------------------------------------------------- */
  server.post('/vista/erx/prescribe', async (request, reply) => {
    const rpcUsed = ['VE ERX NEWRX'];
    try {
      await requireSession(request, reply);
      const body = (request.body as any) || {};
      const dfn = validateDfn(body.dfn);
      if (!dfn) return reply.code(400).send({ ok: false, error: 'Missing or non-numeric dfn' });

      const { drugIen, sig, qty, refills, route, schedule, pharmacy } = body;
      const missing: string[] = [];
      if (!drugIen) missing.push('drugIen');
      if (!sig) missing.push('sig');
      if (!qty) missing.push('qty');
      if (refills === undefined || refills === null || refills === '') missing.push('refills');
      if (missing.length > 0) {
        return reply.code(400).send({
          ok: false,
          error: 'Missing required fields',
          fields: missing,
        });
      }

      const lines = await safeCallRpc(
        'VE ERX NEWRX',
        [dfn, String(drugIen), String(sig), String(qty), String(refills), String(route ?? ''), String(schedule ?? ''), String(pharmacy ?? '')],
        { idempotent: false },
      );

      if (hasRpcError(lines)) {
        audit('clinical.erx-prescribe', 'failure', auditActor(request), {
          patientDfn: dfn,
          detail: { rpc: 'VE ERX NEWRX' },
        });
        return { ok: false, error: lines[0] || 'RPC error', rpcUsed, source: 'vista' };
      }

      audit('clinical.erx-prescribe', 'success', auditActor(request), {
        patientDfn: dfn,
        detail: { rpc: 'VE ERX NEWRX' },
      });

      return {
        ok: true,
        status: 'prescribed',
        data: parseCaretLines(lines),
        rpcUsed,
        source: 'vista',
      };
    } catch (err: any) {
      audit('clinical.erx-prescribe', 'failure', auditActor(request), {
        detail: { rpc: 'VE ERX NEWRX', error: safeErr(err) },
      });
      return { ok: false, error: safeErr(err), rpcUsed, source: 'vista' };
    }
  });

  /* ----------------------------------------------------------------
   * POST /vista/erx/renew
   * RPC: VE ERX RENEW
   * ---------------------------------------------------------------- */
  server.post('/vista/erx/renew', async (request, reply) => {
    const rpcUsed = ['VE ERX RENEW'];
    try {
      await requireSession(request, reply);
      const body = (request.body as any) || {};
      const dfn = validateDfn(body.dfn);
      if (!dfn) return reply.code(400).send({ ok: false, error: 'Missing or non-numeric dfn' });
      if (!body.rxIen) return reply.code(400).send({ ok: false, error: 'rxIen is required' });

      const lines = await safeCallRpc(
        'VE ERX RENEW',
        [dfn, String(body.rxIen)],
        { idempotent: false },
      );

      if (hasRpcError(lines)) {
        audit('clinical.erx-renew', 'failure', auditActor(request), {
          patientDfn: dfn,
          detail: { rpc: 'VE ERX RENEW' },
        });
        return { ok: false, error: lines[0] || 'RPC error', rpcUsed, source: 'vista' };
      }

      audit('clinical.erx-renew', 'success', auditActor(request), {
        patientDfn: dfn,
        detail: { rpc: 'VE ERX RENEW' },
      });

      return {
        ok: true,
        status: 'renewed',
        data: parseCaretLines(lines),
        rpcUsed,
        source: 'vista',
      };
    } catch (err: any) {
      audit('clinical.erx-renew', 'failure', auditActor(request), {
        detail: { rpc: 'VE ERX RENEW', error: safeErr(err) },
      });
      return { ok: false, error: safeErr(err), rpcUsed, source: 'vista' };
    }
  });

  /* ----------------------------------------------------------------
   * POST /vista/erx/cancel
   * RPC: VE ERX CANCEL
   * ---------------------------------------------------------------- */
  server.post('/vista/erx/cancel', async (request, reply) => {
    const rpcUsed = ['VE ERX CANCEL'];
    try {
      await requireSession(request, reply);
      const body = (request.body as any) || {};
      const dfn = validateDfn(body.dfn);
      if (!dfn) return reply.code(400).send({ ok: false, error: 'Missing or non-numeric dfn' });
      if (!body.rxIen) return reply.code(400).send({ ok: false, error: 'rxIen is required' });
      if (!body.reason) return reply.code(400).send({ ok: false, error: 'reason is required' });

      const lines = await safeCallRpc(
        'VE ERX CANCEL',
        [dfn, String(body.rxIen), String(body.reason)],
        { idempotent: false },
      );

      if (hasRpcError(lines)) {
        audit('clinical.erx-cancel', 'failure', auditActor(request), {
          patientDfn: dfn,
          detail: { rpc: 'VE ERX CANCEL' },
        });
        return { ok: false, error: lines[0] || 'RPC error', rpcUsed, source: 'vista' };
      }

      audit('clinical.erx-cancel', 'success', auditActor(request), {
        patientDfn: dfn,
        detail: { rpc: 'VE ERX CANCEL' },
      });

      return {
        ok: true,
        status: 'cancelled',
        data: parseCaretLines(lines),
        rpcUsed,
        source: 'vista',
      };
    } catch (err: any) {
      audit('clinical.erx-cancel', 'failure', auditActor(request), {
        detail: { rpc: 'VE ERX CANCEL', error: safeErr(err) },
      });
      return { ok: false, error: safeErr(err), rpcUsed, source: 'vista' };
    }
  });

  /* ----------------------------------------------------------------
   * GET /vista/erx/drug-search?query=X
   * RPC: VE ERX DRUGSRCH
   * ---------------------------------------------------------------- */
  server.get('/vista/erx/drug-search', async (request, reply) => {
    const rpcUsed = ['VE ERX DRUGSRCH'];
    try {
      await requireSession(request, reply);
      const query = (request.query as any)?.query;
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return reply.code(400).send({ ok: false, error: 'query parameter is required' });
      }

      const lines = await safeCallRpc('VE ERX DRUGSRCH', [query.trim()]);

      if (hasRpcError(lines)) {
        return { ok: false, error: lines[0] || 'RPC error', rpcUsed, source: 'vista' };
      }

      const results = lines
        .filter((l) => l.trim().length > 0)
        .map((line) => {
          const parts = line.split('^');
          return {
            ien: parts[0]?.trim() || '',
            name: parts[1]?.trim() || line.trim(),
            dosageForm: parts[2]?.trim() || '',
            strength: parts[3]?.trim() || '',
          };
        });

      return {
        ok: true,
        count: results.length,
        data: results,
        rpcUsed,
        source: 'vista',
      };
    } catch (err: any) {
      return { ok: false, error: safeErr(err), rpcUsed, source: 'vista' };
    }
  });

  /* ----------------------------------------------------------------
   * GET /vista/erx/history?dfn=N
   * RPC: VE ERX HISTORY
   * ---------------------------------------------------------------- */
  server.get('/vista/erx/history', async (request, reply) => {
    const rpcUsed = ['VE ERX HISTORY'];
    try {
      await requireSession(request, reply);
      const dfn = validateDfn((request.query as any)?.dfn);
      if (!dfn) return reply.code(400).send({ ok: false, error: 'Missing or non-numeric dfn' });

      const lines = await safeCallRpc('VE ERX HISTORY', [dfn]);

      if (hasRpcError(lines)) {
        return { ok: false, error: lines[0] || 'RPC error', rpcUsed, source: 'vista' };
      }

      audit('phi.erx-history-view', 'success', auditActor(request), {
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
   * GET /vista/erx/status?rxIen=N
   * RPC: VE ERX STATUS
   * ---------------------------------------------------------------- */
  server.get('/vista/erx/status', async (request, reply) => {
    const rpcUsed = ['VE ERX STATUS'];
    try {
      await requireSession(request, reply);
      const rxIen = (request.query as any)?.rxIen;
      if (!rxIen || !/^\d+$/.test(String(rxIen))) {
        return reply.code(400).send({ ok: false, error: 'Missing or non-numeric rxIen' });
      }

      const lines = await safeCallRpc('VE ERX STATUS', [String(rxIen)]);

      if (hasRpcError(lines)) {
        return { ok: false, error: lines[0] || 'RPC error', rpcUsed, source: 'vista' };
      }

      return {
        ok: true,
        data: parseCaretLines(lines),
        rpcUsed,
        source: 'vista',
      };
    } catch (err: any) {
      return { ok: false, error: safeErr(err), rpcUsed, source: 'vista' };
    }
  });
}
