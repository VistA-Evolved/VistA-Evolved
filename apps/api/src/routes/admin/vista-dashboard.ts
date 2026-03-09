/**
 * VistA Operational Dashboard
 *
 * GET /admin/vista/dashboard/operational — aggregates operational metrics
 * from multiple VistA RPCs for admin dashboard display.
 */

import type { FastifyInstance } from 'fastify';
import { safeCallRpc } from '../../lib/rpc-resilience.js';
import { log } from '../../lib/logger.js';
import { requireSession, requireRole } from '../../auth/auth-routes.js';

/** Filter out numeric-only lines (count headers) from RPC results. */
function filterDataLines(lines: string[]): string[] {
  const filtered = lines.filter((l: string) => l.trim());
  if (filtered[0]?.startsWith('-1^')) return [];
  return filtered.filter((l: string) => !/^\d+$/.test(l.trim()));
}

async function callRpcSafe(rpc: string, params: string[]): Promise<string[]> {
  try {
    const lines = await safeCallRpc(rpc, params);
    return filterDataLines(lines);
  } catch (err: unknown) {
    log.warn(`Dashboard RPC ${rpc} failed`, { err });
    return [];
  }
}

export default async function vistaDashboardRoutes(server: FastifyInstance) {
  server.get('/admin/vista/dashboard/operational', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);

    try {
      const [
        userLines, clinLines, wardLines, censusLines, drugLines, labLines,
        insLines, divLines, svcLines, claimLines, statusLines, taskmanLines,
        errorLines, radLines, invLines, vendLines, provLines, pclsLines,
        remLines, ordLines, csltLines, tiuLines, templLines, hsumLines,
        paramLines, specLines, stopLines, routeLines, schedLines,
      ] = await Promise.all([
        callRpcSafe('VE USER LIST', ['', '0', '9999']),
        callRpcSafe('VE CLIN LIST', ['', '9999']),
        callRpcSafe('VE WARD LIST', []),
        callRpcSafe('VE CENSUS', []),
        callRpcSafe('VE DRUG LIST', ['', '9999']),
        callRpcSafe('VE LAB TEST LIST', ['', '9999']),
        callRpcSafe('VE INS LIST', ['', '9999']),
        callRpcSafe('VE DIV LIST', []),
        callRpcSafe('VE SVC LIST', []),
        callRpcSafe('VE CLAIM COUNT', []),
        callRpcSafe('VE SYS STATUS', []),
        callRpcSafe('VE TASKMAN LIST', []),
        callRpcSafe('VE ERROR TRAP', ['10']),
        callRpcSafe('VE RAD PROC LIST', ['', '9999']),
        callRpcSafe('VE INV ITEM LIST', ['', '9999']),
        callRpcSafe('VE INV VENDOR LIST', ['']),
        callRpcSafe('VE PROV LIST', ['']),
        callRpcSafe('VE PERSON CLASS LIST', []),
        callRpcSafe('VE REMINDER LIST', ['']),
        callRpcSafe('VE ORDER SETS', ['']),
        callRpcSafe('VE CONSULT SERVICES', []),
        callRpcSafe('VE TIU DEFINITIONS', ['']),
        callRpcSafe('VE TIU TEMPLATES', ['']),
        callRpcSafe('VE HEALTH SUMMARY TYPES', []),
        callRpcSafe('VE PARAM LIST', ['']),
        callRpcSafe('VE SPEC LIST', []),
        callRpcSafe('VE STOP LIST', ['']),
        callRpcSafe('VE MED ROUTES', []),
        callRpcSafe('VE MED SCHEDULES', []),
      ]);

      const users = userLines.map((line: string) => {
        const parts = line.split('^');
        return { ien: parts[0], name: parts[1], active: parts[2], title: parts[3], service: parts[4] };
      });
      const activeUsers = users.filter((u: { active?: string }) => u.active === 'ACTIVE');

      const census = censusLines.map((line: string) => {
        const parts = line.split('^');
        return { wardIen: parts[0], wardName: parts[1], beds: parseInt(parts[2] || '0', 10), count: parseInt(parts[3] || '0', 10) };
      });
      const totalPatients = census.reduce((sum: number, c: { count: number }) => sum + (c.count || 0), 0);
      const wardsWithPatients = census.filter((c: { count: number }) => (c.count || 0) > 0).length;
      const totalBeds = census.reduce((sum: number, c: { beds: number }) => sum + (c.beds || 0), 0);

      const claimsSummary: Record<string, string> = {};
      claimLines.forEach((line: string) => {
        const [key, ...rest] = line.split('^');
        if (key) claimsSummary[key] = rest.join('^');
      });

      const sysStatus: Record<string, string> = {};
      statusLines.forEach((line: string) => {
        const [key, ...rest] = line.split('^');
        if (key) sysStatus[key] = rest.join('^');
      });

      const data = {
        users: { total: users.length, active: activeUsers.length, inactive: users.length - activeUsers.length },
        facilities: { divisions: divLines.length, services: svcLines.length, specialties: specLines.length, stopCodes: stopLines.length },
        clinics: { total: clinLines.length },
        wards: { total: wardLines.length, totalBeds, occupancy: totalBeds > 0 ? Math.round((totalPatients / totalBeds) * 100) : 0 },
        census: { totalPatients, wardsWithPatients },
        pharmacy: { drugs: drugLines.length, routes: routeLines.length, schedules: schedLines.length },
        lab: { tests: labLines.length },
        billing: { insuranceCompanies: insLines.length, claimsSummary },
        radiology: { procedures: radLines.length },
        inventory: { items: invLines.length, vendors: vendLines.length },
        workforce: { providers: provLines.length, personClasses: pclsLines.length },
        quality: { reminders: remLines.length },
        clinicalSetup: { orderSets: ordLines.length, consultServices: csltLines.length, tiuDefinitions: tiuLines.length, tiuTemplates: templLines.length, healthSummaryTypes: hsumLines.length },
        system: { ...sysStatus, taskmanTasks: taskmanLines.length, recentErrors: errorLines.length, parameters: paramLines.length },
        generatedAt: new Date().toISOString(),
      };

      return { ok: true, source: 'vista', data };
    } catch (err: unknown) {
      log.error('Failed to build operational dashboard', { err });
      return reply.code(500).send({ ok: false, error: (err as Error).message });
    }
  });
}
