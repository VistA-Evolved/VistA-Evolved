/**
 * Patient Registration Routes
 *
 * Wire VistA patient registration RPCs (ZVEPATREG.m custom routines)
 * for create, demographics, update, search, and duplicate detection.
 *
 * VistA RPCs:
 *   - VE PAT REGISTER  (write) -- Create new patient in File #2
 *   - VE PAT DEMOG      (read)  -- Get patient demographics from File #2
 *   - VE PAT UPDATE     (write) -- Update patient demographics
 *   - VE PAT SEARCH     (read)  -- Search patients by name/SSN/DOB
 *   - VE PAT MERGE      (read)  -- Duplicate detection for patient merge
 *
 * Auth: session-based (default AUTH_RULES catch-all for /vista/*).
 * Audit: all writes logged to immutable-audit (no PHI in detail).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import { safeCallRpc } from '../lib/rpc-resilience.js';
import { immutableAudit } from '../lib/immutable-audit.js';
import { safeErr } from '../lib/safe-error.js';

function auditActor(request: FastifyRequest): { sub: string; name: string; roles: string[] } {
  const s = request.session;
  return {
    sub: s?.duz || 'anonymous',
    name: s?.userName || 'unknown',
    roles: s?.role ? [s.role] : [],
  };
}

function hasBrokerError(lines: string[]): boolean {
  return lines.some((line) =>
    /M\s+ERROR|%YDB-E-|LVUNDEF|LAST REF=|Remote Procedure|doesn't exist/i.test(line)
  );
}

function parseDelimitedRows(lines: string[]): Record<string, string>[] {
  return lines
    .filter((l) => l.trim())
    .map((line) => {
      const parts = line.split('^');
      return {
        ien: parts[0]?.trim() || '',
        name: parts[1]?.trim() || '',
        dob: parts[2]?.trim() || '',
        sex: parts[3]?.trim() || '',
        ssn: parts[4]?.trim() || '',
        raw: line,
      };
    });
}

export default async function patientRegistrationRoutes(server: FastifyInstance): Promise<void> {
  /* ----------------------------------------------------------------
   * POST /vista/patient/register
   * RPC: VE PAT REGISTER
   * Params: name, dob, sex, ssn, street, city, state, zip, phone, vetStat
   * ---------------------------------------------------------------- */
  server.post('/vista/patient/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const body = (request.body as any) || {};
    const { name, dob, sex, ssn, street, city, state, zip, phone, vetStat } = body;

    if (!name || !dob || !sex) {
      return reply.code(400).send({
        ok: false,
        error: 'name, dob, and sex are required',
      });
    }

    const rpcUsed = ['VE PAT REGISTER'];

    try {
      const lines = await safeCallRpc(
        'VE PAT REGISTER',
        [
          String(name),
          String(dob),
          String(sex),
          String(ssn || ''),
          String(street || ''),
          String(city || ''),
          String(state || ''),
          String(zip || ''),
          String(phone || ''),
          String(vetStat || ''),
        ],
        { idempotent: false }
      );

      if (hasBrokerError(lines)) {
        return reply.code(502).send({
          ok: false,
          error: `VE PAT REGISTER returned error: ${lines[0]?.substring(0, 120) || 'unknown'}`,
          rpcUsed,
          source: 'vista',
        });
      }

      const status = lines[0]?.trim() || '';
      const data = lines.slice(1).filter((l) => l.trim());

      immutableAudit('registration.create', 'success', auditActor(request), {
        requestId: (request as any).id,
        sourceIp: request.ip,
        tenantId: session.tenantId,
        detail: { rpc: 'VE PAT REGISTER' },
      });

      return {
        ok: true,
        status,
        data,
        rpcUsed,
        source: 'vista',
      };
    } catch (err: any) {
      immutableAudit('registration.create', 'failure', auditActor(request), {
        requestId: (request as any).id,
        sourceIp: request.ip,
        tenantId: session.tenantId,
        detail: { rpc: 'VE PAT REGISTER', error: safeErr(err) },
      });
      return reply.code(502).send({
        ok: false,
        error: safeErr(err),
        rpcUsed,
        source: 'vista',
      });
    }
  });

  /* ----------------------------------------------------------------
   * GET /vista/patient/demographics?dfn=N
   * RPC: VE PAT DEMOG
   * ---------------------------------------------------------------- */
  server.get(
    '/vista/patient/demographics',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;

      const dfn = (request.query as any)?.dfn;
      if (!dfn || !/^\d+$/.test(String(dfn))) {
        return reply.code(400).send({ ok: false, error: 'Missing or non-numeric dfn' });
      }

      const rpcUsed = ['VE PAT DEMOG'];

      try {
        const lines = await safeCallRpc('VE PAT DEMOG', [String(dfn)]);

        if (hasBrokerError(lines)) {
          return reply.code(502).send({
            ok: false,
            error: `VE PAT DEMOG returned error: ${lines[0]?.substring(0, 120) || 'unknown'}`,
            rpcUsed,
            source: 'vista',
          });
        }

        const fields: Record<string, string> = {};
        for (const line of lines) {
          const sep = line.indexOf('^');
          if (sep > 0) {
            fields[line.substring(0, sep).trim()] = line.substring(sep + 1).trim();
          }
        }

        immutableAudit('registration.demographics', 'success', auditActor(request), {
          requestId: (request as any).id,
          sourceIp: request.ip,
          tenantId: session.tenantId,
          detail: { rpc: 'VE PAT DEMOG', dfn: '[REDACTED]' },
        });

        return {
          ok: true,
          data: fields,
          rpcUsed,
          source: 'vista',
        };
      } catch (err: any) {
        return reply.code(502).send({
          ok: false,
          error: safeErr(err),
          rpcUsed,
          source: 'vista',
        });
      }
    }
  );

  /* ----------------------------------------------------------------
   * POST /vista/patient/update
   * RPC: VE PAT UPDATE
   * Params: dfn, field, value
   * ---------------------------------------------------------------- */
  server.post('/vista/patient/update', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const body = (request.body as any) || {};
    const { dfn, field, value } = body;

    if (!dfn || !field || value === undefined) {
      return reply.code(400).send({
        ok: false,
        error: 'dfn, field, and value are required',
      });
    }

    const rpcUsed = ['VE PAT UPDATE'];

    try {
      const lines = await safeCallRpc(
        'VE PAT UPDATE',
        [String(dfn), String(field), String(value)],
        { idempotent: false }
      );

      if (hasBrokerError(lines)) {
        return reply.code(502).send({
          ok: false,
          error: `VE PAT UPDATE returned error: ${lines[0]?.substring(0, 120) || 'unknown'}`,
          rpcUsed,
          source: 'vista',
        });
      }

      immutableAudit('registration.update', 'success', auditActor(request), {
        requestId: (request as any).id,
        sourceIp: request.ip,
        tenantId: session.tenantId,
        detail: { rpc: 'VE PAT UPDATE', field },
      });

      return {
        ok: true,
        status: lines[0]?.trim() || 'updated',
        data: lines.slice(1).filter((l) => l.trim()),
        rpcUsed,
        source: 'vista',
      };
    } catch (err: any) {
      immutableAudit('registration.update', 'failure', auditActor(request), {
        requestId: (request as any).id,
        sourceIp: request.ip,
        tenantId: session.tenantId,
        detail: { rpc: 'VE PAT UPDATE', error: safeErr(err) },
      });
      return reply.code(502).send({
        ok: false,
        error: safeErr(err),
        rpcUsed,
        source: 'vista',
      });
    }
  });

  /* ----------------------------------------------------------------
   * GET /vista/patient/search?query=X&type=NAME
   * RPC: VE PAT SEARCH
   * type: NAME | SSN | DOB (default NAME)
   * ---------------------------------------------------------------- */
  server.get('/vista/patient/search', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const query = (request.query as any)?.query;
    const type = (request.query as any)?.type || 'NAME';

    if (!query || String(query).trim().length < 2) {
      return reply.code(400).send({
        ok: false,
        error: 'query param must be at least 2 characters',
      });
    }

    const rpcUsed = ['VE PAT SEARCH'];

    try {
      const lines = await safeCallRpc('VE PAT SEARCH', [String(query), String(type)]);

      if (hasBrokerError(lines)) {
        return reply.code(502).send({
          ok: false,
          error: `VE PAT SEARCH returned error: ${lines[0]?.substring(0, 120) || 'unknown'}`,
          rpcUsed,
          source: 'vista',
        });
      }

      const results = parseDelimitedRows(lines);

      immutableAudit('registration.search', 'success', auditActor(request), {
        requestId: (request as any).id,
        sourceIp: request.ip,
        tenantId: session.tenantId,
        detail: { rpc: 'VE PAT SEARCH', resultCount: results.length },
      });

      return {
        ok: true,
        results,
        count: results.length,
        rpcUsed,
        source: 'vista',
      };
    } catch (err: any) {
      return reply.code(502).send({
        ok: false,
        error: safeErr(err),
        rpcUsed,
        source: 'vista',
      });
    }
  });

  /* ----------------------------------------------------------------
   * GET /vista/patient/duplicate-check?name=X&dob=Y&ssn=Z
   * RPC: VE PAT MERGE
   * ---------------------------------------------------------------- */
  server.get(
    '/vista/patient/duplicate-check',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;

      const { name, dob, ssn } = request.query as { name?: string; dob?: string; ssn?: string };
      if (!name && !dob) {
        return reply.code(400).send({
          ok: false,
          error: 'At least name or dob query param is required',
        });
      }

      const rpcUsed = ['VE PAT MERGE'];

      try {
        const lines = await safeCallRpc('VE PAT MERGE', [
          String(name || ''),
          String(dob || ''),
          String(ssn || ''),
        ]);

        if (hasBrokerError(lines)) {
          return reply.code(502).send({
            ok: false,
            error: `VE PAT MERGE returned error: ${lines[0]?.substring(0, 120) || 'unknown'}`,
            rpcUsed,
            source: 'vista',
          });
        }

        const duplicates = parseDelimitedRows(lines);

        immutableAudit('registration.duplicate_check', 'success', auditActor(request), {
          requestId: (request as any).id,
          sourceIp: request.ip,
          tenantId: session.tenantId,
          detail: { rpc: 'VE PAT MERGE', candidateCount: duplicates.length },
        });

        return {
          ok: true,
          duplicates,
          count: duplicates.length,
          hasDuplicates: duplicates.length > 0,
          rpcUsed,
          source: 'vista',
        };
      } catch (err: any) {
        return reply.code(502).send({
          ok: false,
          error: safeErr(err),
          rpcUsed,
          source: 'vista',
        });
      }
    }
  );
}
