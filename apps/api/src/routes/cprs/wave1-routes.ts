/**
 * Phase 56 -- CPRS Wave 1 READ routes
 *
 * New endpoints required by wave56-plan.json that don't exist yet.
 * Existing /vista/* endpoints (allergies, problems, vitals, meds, notes, labs)
 * already satisfy most Wave 1 needs. This file adds:
 *   - /vista/cprs/orders-summary
 *   - /vista/cprs/appointments (ORWPT APPTLST or scheduling adapter)
 *   - /vista/cprs/reminders (Phase 78: wired to ORQQPX REMINDERS LIST)
 *   - /vista/cprs/meds/detail
 *   - /vista/cprs/labs/chart
 *   - /vista/cprs/problems/icd-search
 *
 * Each endpoint declares rpcUsed[] and vivianPresence for traceability.
 */

import type { FastifyInstance } from 'fastify';
import { requireSession } from '../../auth/auth-routes.js';
import { safeCallRpc } from '../../lib/rpc-resilience.js';
import { audit } from '../../lib/audit.js';
import { safeErr } from '../../lib/safe-error.js';
import { loadNormalizedVistaOrders } from './orders-cpoe.js';

function auditActor(request: any): { name: string } {
  return { name: (request as any).session?.userName ?? 'unknown' };
}

function isWave1RpcMissingLine(line: string): boolean {
  return (
    line.includes("doesn't exist") ||
    line.includes('doesn\u0027t exist') ||
    line.startsWith('CRemote') ||
    line.includes('not found')
  );
}

function hasWave1BrokerExecutionError(lines: string[]): boolean {
  return lines.some((line) => /M\s+ERROR|%YDB-E-|LVUNDEF|LAST REF=|Remote Procedure/i.test(line));
}

function parseReminderRows(lines: string[]) {
  return lines
    .filter((line: string) => line.trim())
    .map((line: string, i: number) => {
      const parts = line.split('^');
      return {
        ien: parts[0]?.trim() || `rem-${i}`,
        name: parts[1]?.trim() || line.trim(),
        due: parts[2]?.trim() || '',
        status: parts[3]?.trim() || '',
        priority: parts[4]?.trim() || '',
      };
    });
}

async function loadUnsignedOrdersFromActiveList(dfn: string) {
  const buildUnsignedOrders = async () => {
    const { orders: normalizedOrders, rpcUsed } = await loadNormalizedVistaOrders(String(dfn), 'active');
    const orders = normalizedOrders
      .filter((order) => order.status === 'unsigned')
      .map((order) => ({
        id: order.id,
        name: order.name,
        status: 'unsigned',
        date: order.startDate || '',
      }));

    return { orders, rpcUsed };
  };

  let result = await buildUnsignedOrders();
  if (result.orders.length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    result = await buildUnsignedOrders();
  }

  return result;
}

export default async function cprsWave1Routes(server: FastifyInstance): Promise<void> {
  /* ----------------------------------------------------------------
   * GET /vista/cprs/orders-summary
   * RPC: ORWORB UNSIG ORDERS
   * ---------------------------------------------------------------- */
  server.get('/vista/cprs/orders-summary', async (request, reply) => {
    const dfn = (request.query as any)?.dfn;
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: 'Missing or non-numeric dfn' };

    const rpcUsed = ['ORWORB UNSIG ORDERS'];
    const vivianPresence = {
      'ORWORB UNSIG ORDERS': 'exception' as const,
      'ORWORR AGET': 'present' as const,
      'ORWORR GETTXT': 'present' as const,
      'ORWORR GETBYIFN': 'present' as const,
    };

    try {
      const session = await requireSession(request, reply);
      const lines = await safeCallRpc('ORWORB UNSIG ORDERS', [session.duz]);

      // Guard: if the RPC doesn't exist on this VistA instance, the response
      // contains an error message like "Remote Procedure '...' doesn't exist".
      // RPC missing: fall back to active orders list for unsigned order extraction.
      const rpcMissing = lines.some(
        (l: string) => l.includes("doesn't exist") || l.includes('not found')
      );
      if (rpcMissing) {
        try {
          const fallback = await loadUnsignedOrdersFromActiveList(String(dfn));
          return {
            ok: true,
            status: fallback.orders.length > 0 ? 'ok' : 'ok-empty',
            source: 'active-orders-fallback',
            unsigned: fallback.orders.length,
            recent: fallback.orders,
            rpcUsed: ['ORWORB UNSIG ORDERS', ...fallback.rpcUsed],
            vivianPresence,
            _note:
              'ORWORB UNSIG ORDERS is unavailable on this VistA instance; summary derived from recovered live active orders.',
          };
        } catch (fallbackErr: any) {
          return {
            ok: false,
            error: `Unsigned orders unavailable: ORWORB UNSIG ORDERS missing and ORWORR AGET fallback failed (${safeErr(fallbackErr)})`,
            unsigned: 0,
            recent: [],
            rpcUsed: [...rpcUsed, 'ORWORR AGET'],
            vivianPresence,
          };
        }
      }

      const orders = lines
        .filter((l: string) => l.trim())
        .map((line: string, i: number) => {
          const parts = line.split('^');
          const patientDfn = parts[0]?.trim() || '';
          return {
            id: `ord-${patientDfn || dfn}-${i}`,
            patientDfn,
            patientName: parts[1]?.trim() || '',
            name: parts[2]?.trim() || line.trim(),
            status: 'unsigned',
            date: parts[3]?.trim() || '',
          };
        })
        .filter((order) => order.patientDfn === String(dfn));

      audit('phi.orders-view', 'success', auditActor(request), {
        patientDfn: String(dfn),
        detail: { count: orders.length },
      });

      return {
        ok: true,
        status: orders.length > 0 ? 'ok' : 'ok-empty',
        unsigned: orders.length,
        recent: orders,
        rpcUsed,
        vivianPresence,
      };
    } catch (err: any) {
      return { ok: false, error: safeErr(err), rpcUsed, vivianPresence };
    }
  });

  /* ----------------------------------------------------------------
   * GET /vista/cprs/appointments -- CPRS Cover Sheet appointment summary
   * Uses ORWPT APPTLST instead of the merged request-store scheduling feed
   * so the chart only shows truthful appointment data.
   * ---------------------------------------------------------------- */
  server.get('/vista/cprs/appointments', async (request, reply) => {
    const dfn = (request.query as any)?.dfn;
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: 'Missing or non-numeric dfn' };

    await requireSession(request, reply);
    const rpcUsed: string[] = [];

    // Try adapter first
    try {
      const { getAdapter } = await import('../../adapters/adapter-loader.js');
      const adapter = getAdapter('scheduling') as any;
      if (adapter && typeof adapter.getAppointmentsCprs === 'function') {
        const result = await adapter.getAppointmentsCprs(String(dfn));
        if (result.ok) {
          rpcUsed.push('ORWPT APPTLST');
          return {
            ok: true,
            status: 'ok',
            results: (result.data || []).map((appt: any, index: number) => ({
              id: `cprs-appt-${index}-${appt.dateTime || 'unknown'}-${appt.clinicIen || appt.clinicName || 'unknown'}`,
              dateTime: appt.dateTime || '',
              clinic: appt.clinicName || '',
              clinicIen: appt.clinicIen || '',
              status: appt.status || 'scheduled',
              source: 'vista',
            })),
            rpcUsed,
          };
        }
      }
    } catch {
      /* adapter unavailable, fall through to direct RPC */
    }

    // Direct RPC fallback
    try {
      const lines = await safeCallRpc('ORWPT APPTLST', [String(dfn)]);
      rpcUsed.push('ORWPT APPTLST');
      const results = lines
        .filter((l: string) => l.trim())
        .map((line: string, i: number) => {
          const parts = line.split('^');
          return {
            id: `cprs-appt-${i}`,
            dateTime: parts[0]?.trim() || '',
            clinic: parts[1]?.trim() || '',
            clinicIen: parts[2]?.trim() || '',
            status: parts[3]?.trim() || 'scheduled',
            source: 'vista',
          };
        });

      return {
        ok: true,
        status: results.length > 0 ? 'ok' : 'ok-empty',
        results,
        rpcUsed,
      };
    } catch (err: any) {
      rpcUsed.push('ORWPT APPTLST');
      return {
        ok: false,
        error: `ORWPT APPTLST failed: ${safeErr(err)}`,
        results: [],
        rpcUsed,
      };
    }
  });

  /* ----------------------------------------------------------------
   * GET /vista/cprs/reminders  (Phase 78: wired to ORQQPX REMINDERS LIST)
   * RPC: ORQQPX REMINDERS LIST -- evaluates clinical reminders for patient
   * May return empty in sandbox if PXRM reminder definitions not loaded.
   * ---------------------------------------------------------------- */
  server.get('/vista/cprs/reminders', async (request, reply) => {
    const dfn = (request.query as any)?.dfn;
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: 'Missing or non-numeric dfn' };

    const rpcUsed = ['ORQQPX REMINDERS LIST'];
    const vivianPresence = {
      'ORQQPX REMINDERS LIST': 'present' as const,
    };

    try {
      await requireSession(request, reply);
      let lines = await safeCallRpc('ORQQPX REMINDERS LIST', [String(dfn)]);

      if (hasWave1BrokerExecutionError(lines)) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        lines = await safeCallRpc('ORQQPX REMINDERS LIST', [String(dfn)]);
      }

      if (hasWave1BrokerExecutionError(lines)) {
        const firstLine = lines.find((line: string) => line.trim()) || '';
        return {
          ok: false,
          error: isWave1RpcMissingLine(firstLine)
            ? 'ORQQPX REMINDERS LIST is not available on this VistA instance'
            : `ORQQPX REMINDERS LIST returned a broker error: ${firstLine.substring(0, 120)}`,
          results: [],
          rpcUsed,
          vivianPresence,
        };
      }

      const results = parseReminderRows(lines);

      audit('phi.reminders-view', 'success', auditActor(request), {
        patientDfn: String(dfn),
        detail: { count: results.length },
      });

      return {
        ok: true,
        status: results.length > 0 ? 'ok' : 'ok-empty',
        results,
        rpcUsed,
        vivianPresence,
        note:
          results.length === 0
            ? 'ORQQPX REMINDERS LIST returned no reminders. PXRM definitions may not be configured in sandbox.'
            : undefined,
      };
    } catch (err: any) {
      return { ok: false, error: safeErr(err), rpcUsed, vivianPresence };
    }
  });

  /* ----------------------------------------------------------------
   * GET /vista/cprs/reminders/detail
   * RPC: ORQQPX REMINDER DETAIL -- get detail for a single reminder IEN
   * Params: ?ien=<reminder IEN>
   * ---------------------------------------------------------------- */
  server.get('/vista/cprs/reminders/detail', async (request, reply) => {
    const ien = (request.query as any)?.ien;
    if (!ien || !/^\d+$/.test(String(ien)))
      return { ok: false, error: 'Missing or non-numeric ien' };

    const rpcUsed = ['ORQQPX REMINDER DETAIL'];
    const vivianPresence = {
      'ORQQPX REMINDER DETAIL': 'present' as const,
    };

    try {
      await requireSession(request, reply);
      const lines = await safeCallRpc('ORQQPX REMINDER DETAIL', [String(ien)]);

      if (hasWave1BrokerExecutionError(lines)) {
        const firstLine = lines.find((line: string) => line.trim()) || '';
        return {
          ok: false,
          error: isWave1RpcMissingLine(firstLine)
            ? 'ORQQPX REMINDER DETAIL is not available on this VistA instance'
            : `ORQQPX REMINDER DETAIL returned a broker error: ${firstLine.substring(0, 120)}`,
          rpcUsed,
          vivianPresence,
          source: 'vista',
        };
      }

      const text = lines.join('\n');
      const fields: Record<string, string> = {};
      for (const line of lines) {
        const sep = line.indexOf('^');
        if (sep > 0) {
          fields[line.substring(0, sep).trim()] = line.substring(sep + 1).trim();
        }
      }

      audit('phi.reminders-view', 'success', auditActor(request), {
        detail: { ien: String(ien), type: 'detail' },
      });

      return {
        ok: true,
        source: 'vista',
        ien: String(ien),
        text,
        fields: Object.keys(fields).length > 0 ? fields : undefined,
        rpcUsed,
        vivianPresence,
      };
    } catch (err: any) {
      return { ok: false, error: safeErr(err), rpcUsed, vivianPresence, source: 'vista' };
    }
  });

  /* ----------------------------------------------------------------
   * GET /vista/cprs/reminders/inquiry
   * RPC: PXRM REMINDER INQUIRY -- full clinical reminder inquiry text
   * Params: ?ien=<reminder IEN>
   * ---------------------------------------------------------------- */
  server.get('/vista/cprs/reminders/inquiry', async (request, reply) => {
    const ien = (request.query as any)?.ien;
    if (!ien || !/^\d+$/.test(String(ien)))
      return { ok: false, error: 'Missing or non-numeric ien' };

    const rpcUsed = ['PXRM REMINDER INQUIRY'];
    const vivianPresence = {
      'PXRM REMINDER INQUIRY': 'present' as const,
    };

    try {
      await requireSession(request, reply);
      const lines = await safeCallRpc('PXRM REMINDER INQUIRY', [String(ien)]);

      if (hasWave1BrokerExecutionError(lines)) {
        const firstLine = lines.find((line: string) => line.trim()) || '';
        return {
          ok: false,
          error: isWave1RpcMissingLine(firstLine)
            ? 'PXRM REMINDER INQUIRY is not available on this VistA instance'
            : `PXRM REMINDER INQUIRY returned a broker error: ${firstLine.substring(0, 120)}`,
          rpcUsed,
          vivianPresence,
          source: 'vista',
        };
      }

      audit('phi.reminders-view', 'success', auditActor(request), {
        detail: { ien: String(ien), type: 'inquiry' },
      });

      return {
        ok: true,
        source: 'vista',
        ien: String(ien),
        text: lines.join('\n'),
        lineCount: lines.length,
        rpcUsed,
        vivianPresence,
      };
    } catch (err: any) {
      return { ok: false, error: safeErr(err), rpcUsed, vivianPresence, source: 'vista' };
    }
  });

  /* ----------------------------------------------------------------
   * GET /vista/cprs/meds/detail
   * RPC: ORWORR GETTXT
   * ---------------------------------------------------------------- */
  server.get('/vista/cprs/meds/detail', async (request, reply) => {
    const orderId = (request.query as any)?.orderId;
    if (!orderId) return { ok: false, error: 'Missing orderId query param' };

    const rpcUsed = ['ORWORR GETTXT'];
    const vivianPresence = { 'ORWORR GETTXT': 'present' as const };

    try {
      await requireSession(request, reply);
      const lines = await safeCallRpc('ORWORR GETTXT', [String(orderId)]);
      return { ok: true, text: lines.join('\n'), rpcUsed, vivianPresence };
    } catch (err: any) {
      return { ok: false, error: safeErr(err), rpcUsed, vivianPresence };
    }
  });

  /* ----------------------------------------------------------------
   * GET /vista/cprs/labs/chart
   * RPC: ORWLRR CHART
   * ---------------------------------------------------------------- */
  server.get('/vista/cprs/labs/chart', async (request, reply) => {
    const dfn = (request.query as any)?.dfn;
    const testName = (request.query as any)?.testName;
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: 'Missing or non-numeric dfn' };

    const rpcUsed = ['ORWLRR CHART'];
    const vivianPresence = { 'ORWLRR CHART': 'present' as const };

    try {
      await requireSession(request, reply);
      const lines = await safeCallRpc('ORWLRR CHART', [String(dfn), testName ?? '']);

      const data = lines
        .filter((l: string) => l.trim())
        .map((line: string, i: number) => {
          const parts = line.split('^');
          return {
            date: parts[0]?.trim() || '',
            value: parts[1]?.trim() || '',
            units: parts[2]?.trim() || '',
            flag: parts[3]?.trim() || '',
          };
        });

      return { ok: true, data, rpcUsed, vivianPresence };
    } catch (err: any) {
      return { ok: false, error: safeErr(err), rpcUsed, vivianPresence };
    }
  });

  /* ----------------------------------------------------------------
   * GET /vista/cprs/problems/icd-search
   * RPC: ORQQPL4 LEX
   * ---------------------------------------------------------------- */
  server.get('/vista/cprs/problems/icd-search', async (request, reply) => {
    const term = (request.query as any)?.term;
    if (!term || String(term).length < 2)
      return { ok: false, error: 'Search term must be >= 2 chars' };

    const rpcUsed = ['ORQQPL4 LEX'];
    const vivianPresence = { 'ORQQPL4 LEX': 'present' as const };

    try {
      await requireSession(request, reply);
      const lines = await safeCallRpc('ORQQPL4 LEX', [String(term)]);

      const MAX_RESULTS = 200;
      const results = lines
        .filter((l: string) => l.trim())
        .slice(0, MAX_RESULTS)
        .map((line: string) => {
          const parts = line.split('^');
          return {
            ien: parts[0]?.trim() || '',
            text: parts[1]?.trim() || '',
            code: parts[2]?.trim() || '',
          };
        });

      const truncated = lines.filter((l: string) => l.trim()).length > MAX_RESULTS;
      return { ok: true, results, truncated, rpcUsed, vivianPresence };
    } catch (err: any) {
      return { ok: false, error: safeErr(err), rpcUsed, vivianPresence };
    }
  });
}
