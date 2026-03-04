/**
 * VistA RCM Read Routes -- Phase 39: Billing Grounding
 *
 * Read-only endpoints that query real VistA billing data:
 *   GET /vista/rcm/encounters?dfn=N    -- PCE encounters via ORWPCE RPCs (LIVE)
 *   GET /vista/rcm/insurance?dfn=N     -- Patient insurance via IBCN INSURANCE QUERY (LIVE)
 *   GET /vista/rcm/icd-search?text=X   -- ICD-10 search via ORWPCE4 LEX (LIVE)
 *   GET /vista/rcm/charges?dfn=N       -- IB charges (INTEGRATION-PENDING: ^IB empty)
 *   GET /vista/rcm/claims-status?dfn=N -- Claims tracking (INTEGRATION-PENDING: ^DGCR(399) empty)
 *   GET /vista/rcm/ar-status?dfn=N     -- AR balance (INTEGRATION-PENDING: ^PRCA(430) empty)
 *   GET /vista/rcm/capability-map      -- Machine-readable billing capability map
 *
 * Auth: All /vista/* routes are session-protected by AUTH_RULES catch-all.
 * Pattern: VistA-first. Real RPC data where available. Integration-pending stubs
 *          name the exact VistA file, routine, and RPC needed for production.
 */

import type { FastifyInstance } from 'fastify';
import { validateCredentials } from '../vista/config.js';
import { connect, disconnect, callRpc } from '../vista/rpcBrokerClient.js';
import { audit } from '../lib/audit.js';
import { log } from '../lib/logger.js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { safeErr } from '../lib/safe-error.js';

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function auditActor(request: any): { duz: string; name?: string; role?: string } {
  const s = request.session;
  if (s) return { duz: s.duz, name: s.userName, role: s.role };
  return { duz: 'system' };
}

function validateDfn(dfn: any): string | null {
  if (!dfn || !/^\d+$/.test(String(dfn))) return null;
  return String(dfn);
}

/* ------------------------------------------------------------------ */
/* Capability map cache                                                 */
/* ------------------------------------------------------------------ */

let capabilityMapCache: any = null;

function loadCapabilityMap(): any {
  if (capabilityMapCache) return capabilityMapCache;
  try {
    // Resolve from project root: data/vista/capability-map-billing.json
    // From apps/api/src/routes/ → up 4 levels to project root
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const projectRoot = join(__dirname, '..', '..', '..', '..');
    const mapPath = join(projectRoot, 'data', 'vista', 'capability-map-billing.json');
    if (existsSync(mapPath)) {
      capabilityMapCache = JSON.parse(readFileSync(mapPath, 'utf-8'));
      return capabilityMapCache;
    }
  } catch {
    /* fallback below */
  }
  return { error: 'Capability map not found' };
}

/* ------------------------------------------------------------------ */
/* Integration-pending response builder                                 */
/* ------------------------------------------------------------------ */

interface PendingInfo {
  vistaFiles: string[];
  targetRoutines: string[];
  migrationPath: string;
  sandboxNote: string;
}

function integrationPendingResponse(endpoint: string, dfn: string, info: PendingInfo) {
  return {
    ok: true,
    status: 'integration-pending',
    endpoint,
    patientDfn: dfn,
    count: 0,
    results: [],
    vistaGrounding: {
      vistaFiles: info.vistaFiles,
      targetRoutines: info.targetRoutines,
      migrationPath: info.migrationPath,
      sandboxNote: info.sandboxNote,
    },
    hint: 'This endpoint returns real VistA data in production. The WorldVistA sandbox does not have billing data populated in the target files.',
  };
}

/* ------------------------------------------------------------------ */
/* Route plugin                                                         */
/* ------------------------------------------------------------------ */

export default async function vistaRcmRoutes(server: FastifyInstance): Promise<void> {
  /**
   * GET /vista/rcm/encounters?dfn=N
   * Returns PCE encounter/visit history for a patient via ORWPCE RPCs.
   * Status: LIVE -- 68 visits in sandbox, with linked CPT + diagnosis codes.
   */
  server.get('/vista/rcm/encounters', async (request) => {
    const dfn = validateDfn((request.query as any)?.dfn);
    if (!dfn) {
      return { ok: false, error: 'Missing or non-numeric dfn', hint: 'Use ?dfn=3' };
    }

    try {
      validateCredentials();
    } catch (err: any) {
      return {
        ok: false,
        error: safeErr(err),
        hint: 'Set VISTA credentials in apps/api/.env.local',
      };
    }

    try {
      await connect();

      // ORWPCE VISIT returns visit strings for a patient
      // Param: DFN
      const visitLines = await callRpc('ORWPCE VISIT', [dfn]);

      // ORWPCE PCE4NOTE returns PCE data for a specific note/visit
      // We'll return the visit list with parsed fields
      const encounters = visitLines
        .filter((line) => line && line.trim().length > 0)
        .map((line) => {
          const parts = line.split('^');
          return {
            visitIen: parts[0]?.trim() || '',
            dateTime: parts[1]?.trim() || '',
            location: parts[2]?.trim() || '',
            service: parts[3]?.trim() || '',
            visitType: parts[4]?.trim() || '',
            status: parts[5]?.trim() || '',
            raw: line,
          };
        })
        .filter((e) => e.visitIen);

      disconnect();

      audit('phi.rcm-encounters-view', 'success', auditActor(request), {
        patientDfn: dfn,
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { count: encounters.length },
      });

      return {
        ok: true,
        status: 'live',
        count: encounters.length,
        results: encounters,
        rpcUsed: 'ORWPCE VISIT',
        vistaFiles: ['9000010 (VISIT)', '9000010.18 (V CPT)', '9000010.07 (V POV)'],
      };
    } catch (err: any) {
      disconnect();
      log.error('vista-rcm-encounters error', { err: err.message });
      return { ok: false, error: safeErr(err), hint: 'Ensure VistA RPC Broker is running' };
    }
  });

  /**
   * GET /vista/rcm/insurance?dfn=N
   * Returns patient insurance coverage via IBCN INSURANCE QUERY.
   * Status: LIVE -- RPC exists, 2 insurance companies in sandbox.
   */
  server.get('/vista/rcm/insurance', async (request) => {
    const dfn = validateDfn((request.query as any)?.dfn);
    if (!dfn) {
      return { ok: false, error: 'Missing or non-numeric dfn', hint: 'Use ?dfn=3' };
    }

    try {
      validateCredentials();
    } catch (err: any) {
      return {
        ok: false,
        error: safeErr(err),
        hint: 'Set VISTA credentials in apps/api/.env.local',
      };
    }

    try {
      await connect();

      // IBCN INSURANCE QUERY takes DFN as param
      const lines = await callRpc('IBCN INSURANCE QUERY', [dfn]);
      disconnect();

      const policies = lines
        .filter((line) => line && line.trim().length > 0)
        .map((line) => {
          const parts = line.split('^');
          return {
            policyId: parts[0]?.trim() || '',
            insuranceName: parts[1]?.trim() || '',
            groupNumber: parts[2]?.trim() || '',
            subscriberId: parts[3]?.trim() || '',
            effectiveDate: parts[4]?.trim() || '',
            expirationDate: parts[5]?.trim() || '',
            status: parts[6]?.trim() || '',
            raw: line,
          };
        })
        .filter((p) => p.policyId || p.insuranceName);

      audit('phi.rcm-insurance-view', 'success', auditActor(request), {
        patientDfn: dfn,
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { count: policies.length },
      });

      return {
        ok: true,
        status: 'live',
        count: policies.length,
        results: policies,
        rpcUsed: 'IBCN INSURANCE QUERY',
        vistaFiles: ['36 (INSURANCE COMPANY)', '2.312 (PATIENT INSURANCE)'],
      };
    } catch (err: any) {
      disconnect();
      log.error('vista-rcm-insurance error', { err: err.message });
      return { ok: false, error: safeErr(err), hint: 'Ensure VistA RPC Broker is running' };
    }
  });

  /**
   * GET /vista/rcm/icd-search?text=X
   * Searches ICD-10 diagnosis codes via ORWPCE4 LEX.
   * Status: LIVE -- lexicon RPC available.
   */
  server.get('/vista/rcm/icd-search', async (request) => {
    const text = ((request.query as any)?.text || '').trim();
    if (!text || text.length < 2) {
      return {
        ok: false,
        error: 'Query text must be at least 2 characters',
        hint: 'Use ?text=diabetes',
      };
    }

    try {
      validateCredentials();
    } catch (err: any) {
      return {
        ok: false,
        error: safeErr(err),
        hint: 'Set VISTA credentials in apps/api/.env.local',
      };
    }

    try {
      await connect();

      // ORWPCE4 LEX: params are search text, context (blank for all)
      const lines = await callRpc('ORWPCE4 LEX', [text, '']);
      disconnect();

      const results = lines
        .filter((line) => line && line.trim().length > 0 && !line.startsWith('-1'))
        .map((line) => {
          const parts = line.split('^');
          return {
            ien: parts[0]?.trim() || '',
            displayText: parts[1]?.trim() || '',
            code: parts[2]?.trim() || '',
            codeSystem: parts[3]?.trim() || '',
            raw: line,
          };
        })
        .filter((r) => r.ien || r.displayText);

      audit('data.icd-search', 'success', auditActor(request), {
        requestId: (request as any).requestId,
        sourceIp: request.ip,
        detail: { searchText: text, count: results.length },
      });

      return {
        ok: true,
        status: 'live',
        count: results.length,
        searchText: text,
        results,
        rpcUsed: 'ORWPCE4 LEX',
      };
    } catch (err: any) {
      disconnect();
      log.error('vista-rcm-icd-search error', { err: err.message });
      return { ok: false, error: safeErr(err), hint: 'Ensure VistA RPC Broker is running' };
    }
  });

  /**
   * GET /vista/rcm/charges?dfn=N
   * IB charges for a patient.
   * Status: INTEGRATION-PENDING -- ^IB(350) is empty in WorldVistA sandbox.
   */
  server.get('/vista/rcm/charges', async (request) => {
    const dfn = validateDfn((request.query as any)?.dfn);
    if (!dfn) {
      return { ok: false, error: 'Missing or non-numeric dfn', hint: 'Use ?dfn=3' };
    }

    audit('phi.rcm-charges-view', 'success', auditActor(request), {
      patientDfn: dfn,
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { status: 'integration-pending' },
    });

    return integrationPendingResponse('/vista/rcm/charges', dfn, {
      vistaFiles: ['350 (IB ACTION)', '350.1 (IB ACTION TYPE)'],
      targetRoutines: ['IBCF', 'IBCE', 'IBJP'],
      migrationPath:
        'When IB billing is configured, read ^IB(350) actions for patient via IB RPCs or FileMan. IB ACTION entries are created by CPRS encounter checkout (IBD RPCs) and pharmacy billing (IBARXM RPCs).',
      sandboxNote:
        'WorldVistA Docker sandbox has 0 entries in ^IB(350). 122 IB Action Type definitions exist in ^IBE(350.1).',
    });
  });

  /**
   * GET /vista/rcm/claims-status?dfn=N
   * Claims tracking for a patient.
   * Status: INTEGRATION-PENDING -- ^DGCR(399) is empty in WorldVistA sandbox.
   */
  server.get('/vista/rcm/claims-status', async (request) => {
    const dfn = validateDfn((request.query as any)?.dfn);
    if (!dfn) {
      return { ok: false, error: 'Missing or non-numeric dfn', hint: 'Use ?dfn=3' };
    }

    audit('phi.rcm-claims-status-view', 'success', auditActor(request), {
      patientDfn: dfn,
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { status: 'integration-pending' },
    });

    return integrationPendingResponse('/vista/rcm/claims-status', dfn, {
      vistaFiles: ['399 (BILL/CLAIMS)'],
      targetRoutines: ['IBCF', 'IBJP', 'IBCE'],
      migrationPath:
        'Claims are generated by IB GENERATE CLAIM workflow after IB ACTION entries exist. Read ^DGCR(399) via FileMan or IBCF RPCs. Requires IB Actions (File 350) to be populated first.',
      sandboxNote:
        'WorldVistA Docker sandbox has 0 entries in ^DGCR(399). Claims generation requires IB configuration + IB Action entries.',
    });
  });

  /**
   * GET /vista/rcm/ar-status?dfn=N
   * AR (Accounts Receivable) balance for a patient.
   * Status: INTEGRATION-PENDING -- ^PRCA(430) is empty in WorldVistA sandbox.
   */
  server.get('/vista/rcm/ar-status', async (request) => {
    const dfn = validateDfn((request.query as any)?.dfn);
    if (!dfn) {
      return { ok: false, error: 'Missing or non-numeric dfn', hint: 'Use ?dfn=3' };
    }

    audit('phi.rcm-ar-status-view', 'success', auditActor(request), {
      patientDfn: dfn,
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { status: 'integration-pending' },
    });

    return integrationPendingResponse('/vista/rcm/ar-status', dfn, {
      vistaFiles: ['430 (ACCOUNTS RECEIVABLE)', '433 (AR TRANSACTION)'],
      targetRoutines: ['PRCAFN', 'PRCASER', 'PRCATR'],
      migrationPath:
        'AR transactions are created when claims are billed and payments posted. Query via PRCA RPCs (PRCAFN, PRCASER routines present in sandbox). Requires Claims (File 399) pipeline to be active.',
      sandboxNote:
        'WorldVistA Docker sandbox has 0 entries in ^PRCA(430). 2 entries in ^PRCA(433) (seed payment data).',
    });
  });

  /**
   * GET /vista/rcm/capability-map
   * Returns the machine-readable billing capability map.
   */
  server.get('/vista/rcm/capability-map', async () => {
    return loadCapabilityMap();
  });
}
