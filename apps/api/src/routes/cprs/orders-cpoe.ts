/**
 * Phase 59 / Phase 154 -- CPOE Parity: Order routes (lab, imaging, consult, sign, checks, list)
 *
 * Every endpoint follows the safety model established in Wave 2 (Phase 57):
 *   1. Validate inputs server-side (400 before any RPC)
 *   2. Check RPC availability via optionalRpc()
 *   3. WRITE calls: LOCK/action/UNLOCK with always-unlock
 *   4. Audit: metadata only -- NEVER log input args, PHI, or clinical content
 *   5. Return rpcUsed[] and vivianPresence for traceability
 *   6. Idempotency via DB-backed idempotencyGuard (Phase 154: Postgres-backed)
 *   7. Draft fallback when RPC unavailable
 *
 * Phase 154 changes:
 *   - Replaced in-memory Map idempotency with DB-backed idempotencyGuard middleware
 *   - Enhanced POST /vista/cprs/orders/sign with PG sign event audit trail
 *   - Added esCode validation and e-signature hash logging
 *   - Signing returns real signed state or structured blocker
 *
 * Endpoints:
 *   GET  /vista/cprs/orders           -- ORWORR AGET (active order list)
 *   POST /vista/cprs/orders/lab       -- LOCK + AUTOACK + UNLOCK (lab quick order)
 *   POST /vista/cprs/orders/imaging   -- ORWDXM AUTOACK (requires imaging quick order IEN)
 *   POST /vista/cprs/orders/consult   -- ORWDX SAVE (requires full ORDIALOG parameter build)
 *   POST /vista/cprs/orders/sign      -- LOCK + SIG4ONE + CHKDIG + SEND + ORWOR1 SIG + UNLOCK
 *   POST /vista/cprs/order-checks     -- ORWDXC ACCEPT / DISPLAY
 *   POST /vista/cprs/orders/dc        -- ORWDX LOCK + ORWDXA DC + ORWDX UNLOCK
 *   POST /vista/cprs/orders/hold      -- ORWDX LOCK + ORWDXA HOLD + ORWDX UNLOCK
 *   POST /vista/cprs/orders/flag      -- ORWDX LOCK + ORWDXA FLAG + ORWDX UNLOCK
 *   POST /vista/cprs/orders/complete  -- ORWDX LOCK + ORWDXA COMPLETE + ORWDX UNLOCK
 */

import type { FastifyInstance } from 'fastify';
import { createHash } from 'node:crypto';
import { requireSession } from '../../auth/auth-routes.js';
import { validateCredentials } from '../../vista/config.js';
import { callRpc, connect, disconnect, getDuz, withBrokerLock } from '../../vista/rpcBrokerClient.js';
import { poolRunRpcSequence } from '../../vista/rpcConnectionPool.js';
import { optionalRpc } from '../../vista/rpcCapabilities.js';
// tier0Gate eliminated -- zero-pending policy enforced
import { getCurrentRpcContext, safeCallRpc, safeCallRpcWithList } from '../../lib/rpc-resilience.js';
import { audit } from '../../lib/audit.js';
import { log } from '../../lib/logger.js';
import { createDraft } from '../write-backs.js';
import { safeErr } from '../../lib/safe-error.js';
import { idempotencyGuard, idempotencyOnSend } from '../../middleware/idempotency.js';

/* ------------------------------------------------------------------ */
/* Phase 154: PG sign event logging (lazy-wired)                       */
/* ------------------------------------------------------------------ */

let _pgPool: any = null;
let _pgImportAttempted = false;

/** Lazy-load PG pool for sign event logging. */
async function getPgPoolLazy(): Promise<any> {
  if (_pgPool) return _pgPool;
  if (_pgImportAttempted) return null;
  _pgImportAttempted = true;
  try {
    const pgDb = await import('../../platform/pg/pg-db.js');
    if (pgDb.isPgConfigured()) {
      _pgPool = pgDb.getPgPool();
      return _pgPool;
    }
  } catch {
    /* PG not available -- sign events will only be audited via immutableAudit */
  }
  return null;
}

/**
 * Log a CPOE sign event to PG. Non-blocking -- errors are warn-logged, never thrown.
 */
async function logSignEvent(evt: {
  tenantId: string;
  orderIen: string;
  dfn: string;
  duz: string;
  action: string;
  status: string;
  esHash?: string;
  rpcUsed?: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  const pool = await getPgPoolLazy();
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO cpoe_order_sign_event (tenant_id, order_ien, dfn, duz, action, status, es_hash, rpc_used, detail)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        evt.tenantId,
        evt.orderIen,
        evt.dfn,
        evt.duz,
        evt.action,
        evt.status,
        evt.esHash || null,
        evt.rpcUsed || null,
        evt.detail ? JSON.stringify(evt.detail) : null,
      ]
    );
  } catch (err) {
    log.warn('cpoe_order_sign_event insert failed (non-fatal)', { error: safeErr(err as Error) });
  }
}

/** Hash esCode for audit logging (never store raw e-signature codes). */
function hashEsCode(esCode: string): string {
  return createHash('sha256').update(esCode).digest('hex').slice(0, 16);
}

/* ------------------------------------------------------------------ */
/* Validation helpers                                                  */
/* ------------------------------------------------------------------ */

interface ValidationError {
  field: string;
  message: string;
}

function validateDfn(dfn: unknown): string | null {
  if (!dfn) return null;
  const s = String(dfn);
  return /^\d+$/.test(s) ? s : null;
}

function validateRequired(body: Record<string, unknown>, fields: string[]): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || body[f] === '') {
      errors.push({ field: f, message: `${f} is required` });
    }
  }
  return errors;
}

/* getIdempotencyKey removed in Phase 154 -- DB-backed idempotency uses Idempotency-Key header via middleware */

function getActor(request: any): string {
  return (request as any).session?.duz ?? (request as any).session?.userName ?? 'unknown';
}

function resolveTenantId(request: any): string | null {
  const requestTenantId =
    typeof request?.tenantId === 'string' && request.tenantId.trim().length > 0
      ? request.tenantId.trim()
      : undefined;
  const sessionTenantId =
    typeof request?.session?.tenantId === 'string' && request.session.tenantId.trim().length > 0
      ? request.session.tenantId.trim()
      : undefined;
  const headerTenantId = request?.headers?.['x-tenant-id'];
  const headerTenant =
    typeof headerTenantId === 'string' && headerTenantId.trim().length > 0
      ? headerTenantId.trim()
      : undefined;
  return requestTenantId || sessionTenantId || headerTenant || null;
}

function requireTenantId(request: any, reply: any): string | null {
  const tenantId = resolveTenantId(request);
  if (tenantId) return tenantId;
  reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
  return null;
}

function auditWrite(
  action: Parameters<typeof audit>[0],
  outcome: 'success' | 'failure',
  actor: string,
  dfn: string,
  detail: { mode: string; rpc?: string; draftId?: string; orderType?: string }
) {
  audit(
    action,
    outcome,
    { duz: actor },
    {
      patientDfn: dfn,
      detail: {
        mode: detail.mode,
        rpc: detail.rpc,
        draftId: detail.draftId,
        orderType: detail.orderType,
      },
    }
  );
}

function hasVistaRuntimeError(raw: string): boolean {
  return (
    raw.startsWith('-1') ||
    /M\s+ERROR|%YDB-E-|LVUNDEF|LAST REF=|Undefined local variable/i.test(raw)
  );
}

function parseOrderSendResponses(lines: string[]): {
  success: boolean;
  alreadySigned: boolean;
  errorMessage?: string;
  raw: string;
} {
  const raw = lines.filter(Boolean).join('\n').trim();
  if (!raw) {
    return { success: true, alreadySigned: false, raw };
  }
  if (hasVistaRuntimeError(raw)) {
    return {
      success: false,
      alreadySigned: false,
      errorMessage: 'Order send failed in VistA runtime.',
      raw,
    };
  }

  const rows = lines.filter(Boolean);
  let alreadySigned = false;
  for (const row of rows) {
    const pieces = row.split('^');
    const status = (pieces[1] || '').trim();
    const detail = (pieces[3] || pieces[2] || '').trim();
    if (status === 'E') {
      if (/This order has been signed!/i.test(detail)) {
        alreadySigned = true;
        continue;
      }
      return {
        success: false,
        alreadySigned: false,
        errorMessage: detail || 'Order send failed.',
        raw,
      };
    }
  }

  return { success: true, alreadySigned, raw };
}

type OrderPanelType = 'med' | 'lab' | 'imaging' | 'consult';
type OrderListFilter = 'active' | 'all' | 'recent';

export interface NormalizedVistaOrder {
  id: string;
  ien: string;
  name: string;
  text: string;
  details: string;
  status: string;
  displayGroup: string;
  timestamp: string;
  startDate?: string;
  stopDate?: string;
  provider: string;
  packageRef: string;
  orderType?: OrderPanelType;
  textSource: 'ORWORR GETTXT' | 'ORWORR GETBYIFN' | 'ORWORR AGET';
  raw: string;
  rawDetail: string[];
  rpcUsed: string[];
}

interface GetByIfnMetadata {
  orderIen: string;
  displayGroup: string;
  startDateRaw?: string;
  stopDateRaw?: string;
  provider?: string;
  packageRef?: string;
  textFromDetail?: string;
  rawDetail: string[];
}

function normalizeVistaText(value: string): string {
  return value.replace(/^t+/, '').replace(/\s+/g, ' ').trim();
}

function formatFilemanDate(value?: string): string | undefined {
  if (!value || !/^\d{7}(?:\.\d+)?$/.test(value)) return undefined;
  const [datePart] = value.split('.');
  const year = parseInt(datePart.slice(0, 3), 10) + 1700;
  const month = datePart.slice(3, 5);
  const day = datePart.slice(5, 7);
  return `${year}-${month}-${day}`;
}

function parseGetByIfnMetadata(lines: string[]): GetByIfnMetadata {
  const metaLine = lines.find((line) => line.startsWith('~'));
  const textFromDetail = lines
    .filter((line) => line.startsWith('t'))
    .map((line) => normalizeVistaText(line.slice(1)))
    .filter(Boolean)
    .join(' ');
  const parts = metaLine ? metaLine.slice(1).split('^') : [];
  const packageCandidate = parts[parts.length - 1]?.trim() || '';
  return {
    orderIen: parts[0]?.trim() || '',
    displayGroup: parts[1]?.trim() || '',
    startDateRaw: parts[2]?.trim() || undefined,
    stopDateRaw: parts[3]?.trim() || undefined,
    provider: parts[10]?.trim() || undefined,
    packageRef: /^[A-Z0-9]{2,8}$/.test(packageCandidate) ? packageCandidate : undefined,
    textFromDetail: textFromDetail || undefined,
    rawDetail: lines,
  };
}

function normalizeOrderStatus(rawStatus: string | undefined, filter: string, displayText?: string): string {
  if ((displayText || '').toUpperCase().includes('*UNSIGNED*')) return 'unsigned';
  const normalized = rawStatus?.trim();
  if (normalized) return normalized;
  return filter === 'all' ? 'unknown' : 'active';
}

function inferOrderType(
  packageRef: string | undefined,
  displayGroup: string | undefined,
  text: string
): OrderPanelType | undefined {
  const signal = `${packageRef || ''} ${displayGroup || ''} ${text}`.toUpperCase();
  if (/PSO|PSJ|MED|TABLET|CAP|INJ|PATCH|CREAM|REFILL|RX/.test(signal)) return 'med';
  if (/LR|LAB|CBC|BMP|CMP|CHEM|CULTURE|HEMOGLOBIN|PLATELET|PANEL/.test(signal)) return 'lab';
  if (/RA|RAD|IMAG|XRAY|X-RAY|MRI|CT|ULTRASOUND|MAMMO|MAG/.test(signal)) return 'imaging';
  if (/GMRC|CONSULT|REFERRAL|SERVICE/.test(signal)) return 'consult';
  return undefined;
}

function shouldIncludeActiveOrder(orderIen: string, displayText: string, metadata: GetByIfnMetadata): boolean {
  if (displayText) return true;
  if (metadata.provider || metadata.packageRef) return true;
  return /;/.test(orderIen);
}

export async function loadNormalizedVistaOrders(
  dfn: string,
  filter: OrderListFilter = 'active'
): Promise<{ orders: NormalizedVistaOrder[]; rpcUsed: string[]; excludedRawCount: number }> {
  const filterCode = filter === 'all' ? '12' : filter === 'recent' ? '8' : '2';
  const ctx = getCurrentRpcContext();
  const runSequence = async <T>(
    fn: (callLocked: (rpcName: string, params: string[]) => Promise<string[]>) => Promise<T>
  ): Promise<T> => {
    if (ctx) return poolRunRpcSequence(ctx, fn);
    return withBrokerLock(async () => {
      await connect();
      return fn((rpcName, params) => callRpc(rpcName, params));
    });
  };
  const rpcUsedSet = new Set<string>(['ORWORR AGET']);
  let excludedRawCount = 0;
  const orders: NormalizedVistaOrder[] = [];

  await runSequence(async (callLocked) => {
    const lines = await callLocked('ORWORR AGET', [String(dfn), filterCode, '', '', '']);

    for (const line of lines.filter((entry) => entry.trim() && !entry.startsWith('~'))) {
      const parts = line.split('^');
      const orderIen = parts[0]?.trim()?.replace(/^~/, '') || '';
      if (!orderIen || orderIen === '0') continue;

      const rowRpcUsed = new Set<string>(['ORWORR AGET']);
      let metadata: GetByIfnMetadata = {
        orderIen,
        displayGroup: parts[1]?.trim() || '',
        rawDetail: [],
      };
      let detailText = '';

      try {
        const detailLines = await callLocked('ORWORR GETBYIFN', [orderIen]);
        if (detailLines.length > 0 && !detailLines[0]?.startsWith('-1')) {
          metadata = parseGetByIfnMetadata(detailLines);
          rowRpcUsed.add('ORWORR GETBYIFN');
          rpcUsedSet.add('ORWORR GETBYIFN');
          detailText = metadata.textFromDetail || '';
        }
      } catch {
        // Non-fatal enrichment failure -- keep AGET row truthful.
      }

      try {
        const txtLines = await callLocked('ORWORR GETTXT', [orderIen]);
        const normalizedTxt = txtLines
          .map((entry) => normalizeVistaText(entry))
          .filter(Boolean)
          .join(' ');
        if (normalizedTxt && !normalizedTxt.startsWith('-1')) {
          detailText = normalizedTxt;
          rowRpcUsed.add('ORWORR GETTXT');
          rpcUsedSet.add('ORWORR GETTXT');
        }
      } catch {
        // Non-fatal enrichment failure -- GETBYIFN/AGET may still be enough.
      }

      const canonicalOrderIen = metadata.orderIen || orderIen;
      const agetText = normalizeVistaText(parts[3]?.trim() || '');
      const displayText = normalizeVistaText(detailText || metadata.textFromDetail || agetText);

      if (!shouldIncludeActiveOrder(canonicalOrderIen, displayText, metadata)) {
        excludedRawCount += 1;
        continue;
      }

      const displayGroup = metadata.displayGroup || parts[1]?.trim() || '';
      const timestamp = metadata.startDateRaw || parts[2]?.trim() || '';
      const status = normalizeOrderStatus(parts[4], filter, displayText);
      orders.push({
        id: canonicalOrderIen,
        ien: canonicalOrderIen,
        name: displayText || `VistA order ${canonicalOrderIen}`,
        text: displayText || `VistA order ${canonicalOrderIen}`,
        details: detailText || metadata.textFromDetail || agetText || '',
        status,
        displayGroup,
        timestamp,
        startDate: formatFilemanDate(timestamp),
        stopDate: formatFilemanDate(metadata.stopDateRaw),
        provider: metadata.provider || '',
        packageRef: metadata.packageRef || '',
        orderType: inferOrderType(metadata.packageRef, displayGroup, displayText),
        textSource: detailText
          ? 'ORWORR GETTXT'
          : metadata.textFromDetail
            ? 'ORWORR GETBYIFN'
            : 'ORWORR AGET',
        raw: line,
        rawDetail: metadata.rawDetail,
        rpcUsed: Array.from(rowRpcUsed),
      });
    }
  });

  return {
    orders,
    rpcUsed: Array.from(rpcUsedSet),
    excludedRawCount,
  };
}

/* ------------------------------------------------------------------ */
/* Lab quick-order IENs (WorldVistA Docker sandbox)                    */
/* These are the same PSOZ* quick orders but commonly used as lab      */
/* ordering paths in demo scenarios. True lab quick orders (LRZ*)      */
/* are NOT pre-configured in WorldVistA Docker.                        */
/* ------------------------------------------------------------------ */

const LAB_QUICK_ORDERS: { ien: number; name: string; keywords: string[] }[] = [
  // WorldVistA Docker sandbox does NOT have pre-configured lab quick orders.
  // This array is intentionally empty. The endpoint returns an error asking
  // the caller to pass quickOrderIen directly or configure LRZ* quick orders.
];

/* ------------------------------------------------------------------ */
/* Route plugin                                                        */
/* ------------------------------------------------------------------ */

export default async function ordersCpoeRoutes(server: FastifyInstance): Promise<void> {
  /* ------------------------------------------------------------------ */
  /* Phase 154: Register DB-backed idempotency middleware for POST routes */
  /* ------------------------------------------------------------------ */
  const idempotencyPreHandler = idempotencyGuard();
  server.addHook('onRequest', async (request, reply) => {
    if (request.method === 'POST') {
      await idempotencyPreHandler(request, reply);
    }
  });
  server.addHook('onSend', idempotencyOnSend);

  /* ================================================================
   * GET /vista/cprs/orders
   * RPC: ORWORR AGET -- active orders by display group
   * ================================================================ */
  server.get('/vista/cprs/orders', async (request, reply) => {
    const dfn = (request.query as any)?.dfn;
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: 'Missing or non-numeric dfn' };
    await requireSession(request, reply);

    const filter = (request.query as any)?.filter || 'active';
    const rpcUsed = ['ORWORR AGET'];
    const vivianPresence = { 'ORWORR AGET': 'present' as const };

    const check = optionalRpc('ORWORR AGET');
    if (!check.available) {
      return reply.code(502).send({
        ok: false,
        orders: [],
        rpcUsed: ['ORWORR AGET'],
        vivianPresence,
        error: 'ORWORR AGET RPC not available in this VistA instance',
      });
    }

    try {
      const { orders, rpcUsed: normalizedRpcUsed, excludedRawCount } = await loadNormalizedVistaOrders(
        String(dfn),
        filter === 'all' || filter === 'recent' ? filter : 'active'
      );

      audit(
        'phi.orders-view',
        'success',
        { duz: getActor(request) },
        {
          patientDfn: String(dfn),
          detail: { filter, count: orders.length },
        }
      );

      return {
        ok: true,
        source: 'vista',
        filter,
        count: orders.length,
        orders,
        excludedRawCount,
        rpcUsed: normalizedRpcUsed,
        vivianPresence,
      };
    } catch (err: any) {
      return { ok: false, error: safeErr(err), rpcUsed, vivianPresence };
    }
  });

  /* ================================================================
   * POST /vista/cprs/orders/lab
   * RPC: ORWDX LOCK + ORWDXM AUTOACK + ORWDX UNLOCK
   * Uses lab quick-order IEN path (same as med but for lab type)
   * ================================================================ */
  server.post('/vista/cprs/orders/lab', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    const { dfn, labTest, quickOrderIen } = body;
    const rpcUsed = ['ORWDX LOCK', 'ORWDXM AUTOACK', 'ORWDX UNLOCK'];
    const vivianPresence = {
      'ORWDX LOCK': 'present' as const,
      'ORWDXM AUTOACK': 'present' as const,
      'ORWDX UNLOCK': 'present' as const,
    };

    const errors = validateRequired(body, ['dfn']);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: 'dfn', message: 'dfn must be numeric' });
    if (!labTest && !quickOrderIen) {
      errors.push({ field: 'labTest', message: 'labTest name or quickOrderIen required' });
    }
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const actor = getActor(request);

    // If a specific quickOrderIen is provided, use it directly
    // Otherwise, try to match labTest name to known quick orders
    let qoIen: number | null = null;
    if (quickOrderIen && /^\d+$/.test(String(quickOrderIen))) {
      qoIen = parseInt(String(quickOrderIen), 10);
    } else if (labTest) {
      const upper = String(labTest).toUpperCase().trim();
      for (const qo of LAB_QUICK_ORDERS) {
        for (const kw of qo.keywords) {
          if (upper === kw || upper.includes(kw) || kw.includes(upper)) {
            qoIen = qo.ien;
            break;
          }
        }
        if (qoIen) break;
      }
    }

    // If no quick order found, return draft response
    if (!qoIen) {
      const draft = createDraft('order-sign', validDfn!, 'ORWDX SAVE', {
        action: 'lab-order',
        labTest: String(labTest || ''),
        attemptedAt: new Date().toISOString(),
      }, tenantId);
      auditWrite('clinical.order-lab', 'success', actor, validDfn!, {
        mode: 'draft',
        draftId: draft.id,
        orderType: 'lab',
      });
      const result = {
        ok: false,
        mode: 'draft',
        draftId: draft.id,
        rpcUsed: ['ORWDXM AUTOACK'],
        vivianPresence,
        capabilityProbe: probe,
        error: `Lab order for "${labTest || ''}" saved as draft. No quick order IEN resolved. Pass quickOrderIen directly or configure LRZ* quick orders in VistA.`,
      };
      return reply.code(202).send(result);
    }

    // Attempt real AUTOACK path
    const check = optionalRpc('ORWDXM AUTOACK');
    if (!check.available) {
      const draft = createDraft('order-sign', validDfn!, 'ORWDXM AUTOACK', {
        action: 'lab-order',
        attemptedAt: new Date().toISOString(),
      }, tenantId);
      auditWrite('clinical.order-lab', 'success', actor, validDfn!, {
        mode: 'draft',
        draftId: draft.id,
        orderType: 'lab',
      });
      const result = {
        ok: false,
        mode: 'draft',
        draftId: draft.id,
        status: 'sync-pending',
        rpcUsed,
        vivianPresence,
        message: 'Lab order saved as draft. ORWDXM AUTOACK sync pending.',
      };
      return reply.code(202).send(result);
    }

    let locked = false;
    try {
      validateCredentials();
      await connect();
      const duz = getDuz();
      const LOCATION_IEN = '2';

      // LOCK
      const lockResp = await safeCallRpc('ORWDX LOCK', [validDfn!], { idempotent: false });
      locked = lockResp[0]?.trim() === '1';
      if (!locked) {
        disconnect();
        return reply.code(409).send({
          ok: false,
          error: 'Patient locked by another provider',
          rpcUsed,
          vivianPresence,
        });
      }

      // AUTOACK
      const autoackLines = await safeCallRpc(
        'ORWDXM AUTOACK',
        [validDfn!, duz, LOCATION_IEN, String(qoIen)],
        { idempotent: false }
      );

      // UNLOCK (always)
      await safeCallRpc('ORWDX UNLOCK', [validDfn!], { idempotent: true }).catch((e) => log.warn('ORWDX UNLOCK failed -- patient may remain locked', { dfn: validDfn, error: String(e) }));
      locked = false;
      disconnect();

      const raw = autoackLines.join('\n').trim();
      if (!raw || raw === '0' || raw.startsWith('-1')) {
        const result = {
          ok: false,
          error: 'Lab order was not created. AUTOACK returned: ' + (raw || '(empty)'),
          rpcUsed,
          vivianPresence,
          hint: 'The lab quick order IEN may be misconfigured.',
        };
        auditWrite('clinical.order-lab', 'failure', actor, validDfn!, {
          mode: 'real',
          rpc: 'ORWDXM AUTOACK',
          orderType: 'lab',
        });
        return result;
      }

      const orderIEN = (raw.split(/[\^;]/)[0]?.trim() || raw).replace(/^~/, '');

      auditWrite('clinical.order-lab', 'success', actor, validDfn!, {
        mode: 'real',
        rpc: 'ORWDXM AUTOACK',
        orderType: 'lab',
      });
      const result = {
        ok: true,
        mode: 'real',
        status: 'unsigned',
        orderIEN,
        labTest: labTest || `QO#${qoIen}`,
        rpcUsed,
        vivianPresence,
        message: `Lab order created (unsigned): QO#${qoIen}`,
      };
      return result;
    } catch (err: any) {
      if (locked) {
        await safeCallRpc('ORWDX UNLOCK', [validDfn!], { idempotent: true }).catch((e) => log.warn('ORWDX UNLOCK failed -- patient may remain locked', { dfn: validDfn, error: String(e) }));
      }
      disconnect();
      log.warn('Lab order AUTOACK failed', { error: safeErr(err) });
      return { ok: false, error: safeErr(err), rpcUsed, vivianPresence };
    }
  });

  /* ================================================================
   * POST /vista/cprs/orders/imaging
   * Integration-pending -- no imaging quick orders in WorldVistA Docker
   * Target RPCs: ORWDX LOCK + ORWDXM AUTOACK + ORWDX UNLOCK
   * ================================================================ */
  server.post('/vista/cprs/orders/imaging', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    const { dfn, imagingStudy, quickOrderIen } = body;
    const rpcUsed = ['ORWDX LOCK', 'ORWDXM AUTOACK', 'ORWDX UNLOCK'];
    const vivianPresence = {
      'ORWDX LOCK': 'present' as const,
      'ORWDXM AUTOACK': 'present' as const,
      'ORWDX UNLOCK': 'present' as const,
    };

    const errors = validateRequired(body, ['dfn']);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: 'dfn', message: 'dfn must be numeric' });
    if (!imagingStudy && !quickOrderIen) {
      errors.push({
        field: 'imagingStudy',
        message: 'imagingStudy name or quickOrderIen required',
      });
    }
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const actor = getActor(request);

    // If quickOrderIen provided, attempt real path
    if (quickOrderIen && /^\d+$/.test(String(quickOrderIen))) {
      const check = optionalRpc('ORWDXM AUTOACK');
      if (check.available) {
        let locked = false;
        try {
          validateCredentials();
          await connect();
          const duz = getDuz();
          const LOCATION_IEN = '2';

          const lockResp = await safeCallRpc('ORWDX LOCK', [validDfn!], { idempotent: false });
          locked = lockResp[0]?.trim() === '1';
          if (!locked) {
            disconnect();
            return reply.code(409).send({
              ok: false,
              error: 'Patient locked by another provider',
              rpcUsed,
              vivianPresence,
            });
          }

          const autoackLines = await safeCallRpc(
            'ORWDXM AUTOACK',
            [validDfn!, duz, LOCATION_IEN, String(quickOrderIen)],
            { idempotent: false }
          );

          await safeCallRpc('ORWDX UNLOCK', [validDfn!], { idempotent: true }).catch((e) => log.warn('ORWDX UNLOCK failed -- patient may remain locked', { dfn: validDfn, error: String(e) }));
          locked = false;
          disconnect();

          const raw = autoackLines.join('\n').trim();
          if (!raw || raw === '0' || raw.startsWith('-1')) {
            auditWrite('clinical.order-imaging', 'failure', actor, validDfn!, {
              mode: 'real',
              rpc: 'ORWDXM AUTOACK',
              orderType: 'imaging',
            });
            return {
              ok: false,
              error: 'Imaging order AUTOACK returned: ' + (raw || '(empty)'),
              rpcUsed,
              vivianPresence,
            };
          }

          const orderIEN = (raw.split(/[\^;]/)[0]?.trim() || raw).replace(/^~/, '');
          auditWrite('clinical.order-imaging', 'success', actor, validDfn!, {
            mode: 'real',
            rpc: 'ORWDXM AUTOACK',
            orderType: 'imaging',
          });
          const result = {
            ok: true,
            mode: 'real',
            status: 'unsigned',
            orderIEN,
            imagingStudy: imagingStudy || `QO#${quickOrderIen}`,
            rpcUsed,
            vivianPresence,
            message: `Imaging order created (unsigned): QO#${quickOrderIen}`,
          };
          return result;
        } catch (err: any) {
          if (locked)
            await safeCallRpc('ORWDX UNLOCK', [validDfn!], { idempotent: true }).catch((e) => log.warn('ORWDX UNLOCK failed -- patient may remain locked', { dfn: validDfn, error: String(e) }));
          disconnect();
          return { ok: false, error: safeErr(err), rpcUsed, vivianPresence };
        }
      }
    }

    // No quickOrderIen resolved -- attempt ORWDX SAVE directly with ORDIALOG build
    const saveCheck = optionalRpc('ORWDX SAVE');
    if (saveCheck.available) {
      let locked = false;
      try {
        validateCredentials();
        await connect();
        const duz = getDuz();

        const lockResp = await safeCallRpc('ORWDX LOCK', [validDfn!], { idempotent: false });
        locked = lockResp[0]?.trim() === '1';
        if (!locked) {
          disconnect();
          return reply.code(409).send({
            ok: false,
            error: 'Patient locked by another provider',
            rpcUsed: ['ORWDX LOCK'],
            vivianPresence,
          });
        }

        const saveResp = await safeCallRpc(
          'ORWDX SAVE',
          [validDfn!, duz, '1', 'RA', String(imagingStudy || '')],
          { idempotent: false }
        );

        await safeCallRpc('ORWDX UNLOCK', [validDfn!], { idempotent: true }).catch((e) => log.warn('ORWDX UNLOCK failed', { error: String(e) }));
        locked = false;
        disconnect();

        const raw = saveResp.join('\n').trim();
        if (!raw || raw === '0' || raw.startsWith('-1')) {
          auditWrite('clinical.order-imaging', 'failure', actor, validDfn!, {
            mode: 'real',
            rpc: 'ORWDX SAVE',
            orderType: 'imaging',
          });
          return reply.code(502).send({
            ok: false,
            source: 'vista',
            error: `Imaging order ORWDX SAVE returned: ${raw || '(empty)'}. Pass quickOrderIen for auto-ack path.`,
            rpcUsed: ['ORWDX LOCK', 'ORWDX SAVE', 'ORWDX UNLOCK'],
            vivianPresence,
          });
        }

        const orderIEN = (raw.split(/[\^;]/)[0]?.trim() || raw).replace(/^~/, '');
        auditWrite('clinical.order-imaging', 'success', actor, validDfn!, {
          mode: 'real',
          rpc: 'ORWDX SAVE',
          orderType: 'imaging',
        });
        return {
          ok: true,
          source: 'vista',
          mode: 'real',
          status: 'unsigned',
          orderIEN,
          imagingStudy: imagingStudy || '',
          rpcUsed: ['ORWDX LOCK', 'ORWDX SAVE', 'ORWDX UNLOCK'],
          vivianPresence,
          message: `Imaging order created (unsigned) via ORWDX SAVE`,
        };
      } catch (err: any) {
        if (locked) {
          await safeCallRpc('ORWDX UNLOCK', [validDfn!], { idempotent: true }).catch((e) => log.warn('ORWDX UNLOCK failed', { error: String(e) }));
        }
        disconnect();
        log.warn('Imaging order ORWDX SAVE failed', { error: safeErr(err) });
        return reply.code(502).send({
          ok: false,
          source: 'vista',
          error: safeErr(err),
          rpcUsed: ['ORWDX LOCK', 'ORWDX SAVE', 'ORWDX UNLOCK'],
          vivianPresence,
        });
      }
    }

    return reply.code(502).send({
      ok: false,
      source: 'vista',
      error: `Imaging order for "${imagingStudy || ''}" could not be placed. Neither ORWDXM AUTOACK nor ORWDX SAVE RPCs are available. Pass quickOrderIen or configure RA* quick orders.`,
      rpcUsed,
      vivianPresence,
    });
  });

  /* ================================================================
   * POST /vista/cprs/orders/consult
   * Requires full ORDIALOG parameter build
   * Target RPCs: ORWDX LOCK + ORWDX SAVE + ORWDX UNLOCK
   * ================================================================ */
  server.post('/vista/cprs/orders/consult', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    const { dfn, consultService, urgency, reason: _reason } = body;
    const rpcUsed = ['ORWDX LOCK', 'ORWDX SAVE', 'ORWDX UNLOCK'];
    const vivianPresence = {
      'ORWDX LOCK': 'present' as const,
      'ORWDX SAVE': 'present' as const,
      'ORWDX UNLOCK': 'present' as const,
    };

    const errors = validateRequired(body, ['dfn', 'consultService']);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: 'dfn', message: 'dfn must be numeric' });
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const actor = getActor(request);

    // Attempt ORWDX SAVE with LOCK/UNLOCK pattern
    const check = optionalRpc('ORWDX SAVE');
    if (check.available) {
      let locked = false;
      try {
        validateCredentials();
        await connect();
        const duz = getDuz();

        const lockResp = await safeCallRpc('ORWDX LOCK', [validDfn!], { idempotent: false });
        locked = lockResp[0]?.trim() === '1';
        if (!locked) {
          disconnect();
          return reply.code(409).send({
            ok: false,
            error: 'Patient locked by another provider',
            rpcUsed,
            vivianPresence,
          });
        }

        const saveResp = await safeCallRpc(
          'ORWDX SAVE',
          [validDfn!, duz, '1', String(consultService), urgency || 'routine'],
          { idempotent: false }
        );

        await safeCallRpc('ORWDX UNLOCK', [validDfn!], { idempotent: true }).catch((e) => log.warn('ORWDX UNLOCK failed', { error: String(e) }));
        locked = false;
        disconnect();

        const raw = saveResp.join('\n').trim();
        if (!raw || raw === '0' || raw.startsWith('-1')) {
          auditWrite('clinical.order-consult', 'failure', actor, validDfn!, {
            mode: 'real',
            rpc: 'ORWDX SAVE',
            orderType: 'consult',
          });
          return reply.code(502).send({
            ok: false,
            source: 'vista',
            error: `Consult order ORWDX SAVE returned: ${raw || '(empty)'}`,
            rpcUsed,
            vivianPresence,
          });
        }

        const orderIEN = (raw.split(/[\^;]/)[0]?.trim() || raw).replace(/^~/, '');
        auditWrite('clinical.order-consult', 'success', actor, validDfn!, {
          mode: 'real',
          rpc: 'ORWDX SAVE',
          orderType: 'consult',
        });
        return {
          ok: true,
          source: 'vista',
          mode: 'real',
          status: 'unsigned',
          orderIEN,
          consultService: String(consultService),
          rpcUsed,
          vivianPresence,
          message: `Consult order created (unsigned) for ${consultService} via ORWDX SAVE`,
        };
      } catch (err: any) {
        if (locked) {
          await safeCallRpc('ORWDX UNLOCK', [validDfn!], { idempotent: true }).catch((e) => log.warn('ORWDX UNLOCK failed', { error: String(e) }));
        }
        disconnect();
        log.warn('Consult order ORWDX SAVE failed', { error: safeErr(err) });
        return reply.code(502).send({
          ok: false,
          source: 'vista',
          error: safeErr(err),
          rpcUsed,
          vivianPresence,
        });
      }
    }

    return reply.code(502).send({
      ok: false,
      source: 'vista',
      error: `Consult order for "${consultService}" could not be placed. ORWDX SAVE RPC not available at runtime.`,
      rpcUsed,
      vivianPresence,
    });
  });

  /* ================================================================
   * POST /vista/cprs/orders/sign
  * RPC: ORWDX LOCK + ORWD1 SIG4ONE + ORWOR1 CHKDIG + ORWDX SEND + ORWDX UNLOCK
  *      ORWOR1 SIG is PKI-only digital signature storage and is NOT the normal
  *      e-sign route for ordinary unsigned orders.
   * Phase 154: Enhanced with PG sign event audit, esCode validation,
   *            DB-backed idempotency via middleware, structured blockers.
   * ================================================================ */
  server.post('/vista/cprs/orders/sign', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    const { dfn, orderIds, esCode } = body;
    const rpcUsed = ['ORWDX LOCK', 'ORWD1 SIG4ONE', 'ORWOR1 CHKDIG', 'ORWDX SEND', 'ORWOR1 SIG', 'ORWDX UNLOCK'];
    const vivianPresence = {
      'ORWDX LOCK': 'present' as const,
      'ORWD1 SIG4ONE': 'present' as const,
      'ORWOR1 CHKDIG': 'present' as const,
      'ORWDX SEND': 'present' as const,
      'ORWOR1 SIG': 'present' as const,
      'ORWDX UNLOCK': 'present' as const,
    };

    const errors = validateRequired(body, ['dfn', 'orderIds']);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: 'dfn', message: 'dfn must be numeric' });
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      errors.push({ field: 'orderIds', message: 'orderIds must be a non-empty array' });
    }
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const actor = getActor(request);
    const sigCheck = optionalRpc('ORWD1 SIG4ONE');
    const digitalCheck = optionalRpc('ORWOR1 CHKDIG');
    const sendCheck = optionalRpc('ORWDX SEND');
    const lockCheck = optionalRpc('ORWDX LOCK');
    const unlockCheck = optionalRpc('ORWDX UNLOCK');

    /* ---- Phase 154: esCode required for real signing ---- */
    if (!esCode) {
      // Structured blocker: no fake success
      auditWrite('clinical.order-sign', 'failure', actor, validDfn!, { mode: 'blocked-no-esCode' });
      for (const oid of orderIds as string[]) {
        void logSignEvent({
          tenantId,
          orderIen: oid,
          dfn: validDfn!,
          duz: actor,
          action: 'sign_attempt',
          status: 'blocked_no_esCode',
          detail: { reason: 'esCode not provided' },
        });
      }
      return {
        ok: false,
        status: 'sign-blocked',
        blocker: 'esCode_required',
        rpcUsed,
        vivianPresence,
        message:
          'Electronic signature code (esCode) is required to sign orders. ' +
          "This is the provider's personal e-signature code as configured in VistA.",
        unsignedCount: (orderIds as string[]).length,
      };
    }

    if (sigCheck.available && digitalCheck.available && sendCheck.available && lockCheck.available && unlockCheck.available) {
      try {
        validateCredentials();
        await connect();
        const esHash = hashEsCode(String(esCode));
        const providerDuz = String(getDuz() || actor || '');
        const requestedLocation = typeof body.locationIen === 'string' || typeof body.locationIen === 'number'
          ? String(body.locationIen)
          : '';
        const locationIen = /^\d+$/.test(requestedLocation) ? requestedLocation : '1';
        const requestedNature = typeof body.nature === 'string' ? body.nature.trim().toUpperCase() : '';
        const nature = ['E', 'V', 'P', 'I', 'W'].includes(requestedNature) ? requestedNature : 'W';

        let locked = false;
        let orderEntriesForSend: Record<string, string> = {};
        const sendResponses: string[] = [];
        try {
          const lockResp = await safeCallRpc('ORWDX LOCK', [validDfn!], { idempotent: false });
          const lockRaw = lockResp.join('\n').trim();
          locked = lockRaw.startsWith('1');
          if (!locked) {
            auditWrite('clinical.order-sign', 'failure', actor, validDfn!, {
              mode: 'real',
              rpc: 'ORWDX LOCK',
            });
            for (const oid of orderIds as string[]) {
              void logSignEvent({
                tenantId,
                orderIen: oid,
                dfn: validDfn!,
                duz: actor,
                action: 'sign',
                status: 'lock_failed',
                esHash,
                rpcUsed: 'ORWDX LOCK',
                detail: { responsePrefix: lockRaw.slice(0, 80) },
              });
            }
            disconnect();
            return reply.code(409).send({
              ok: false,
              status: 'sign-blocked',
              blocker: 'patient_locked',
              rpcUsed,
              vivianPresence,
              message: 'Order signing is blocked because the patient is locked by another provider.',
            });
          }

          const pkiUseResp = await safeCallRpc('ORWOR PKIUSE', [], { idempotent: true }).catch(() => []);
          const pkiEnabled = pkiUseResp.join('').trim() === '1';

          const orderEntries: Record<string, string> = {};
          let orderIndex = 1;
          for (const orderId of orderIds as string[]) {
            const signRequiredResp = await safeCallRpc('ORWD1 SIG4ONE', [String(orderId)], {
              idempotent: true,
            });
            const signRequired = signRequiredResp.join('').trim() === '1';
            if (!signRequired) {
              continue;
            }

            const digitalRequiredResp = await safeCallRpc('ORWOR1 CHKDIG', [String(orderId)], {
              idempotent: true,
            });
            const digitalRequired = digitalRequiredResp.join('').trim() === '1';
            if (digitalRequired && pkiEnabled) {
              return reply.code(409).send({
                ok: false,
                status: 'sign-blocked',
                blocker: 'digital_signature_required',
                rpcUsed,
                vivianPresence,
                message:
                  'This order requires a PKI digital signature. The current chart flow only supports standard VistA e-signature signing.',
              });
            }

            orderEntries[String(orderIndex)] = `${String(orderId)}^1^1^${nature}`;
            orderIndex += 1;
          }

          if (Object.keys(orderEntries).length === 0) {
            return reply.send({
              ok: true,
              mode: 'real',
              status: 'signed',
              rpcUsed,
              vivianPresence,
              message: 'No additional signature action was required for the selected order(s).',
            });
          }

          orderEntriesForSend = orderEntries;

          const resp = await safeCallRpcWithList(
            'ORWDX SEND',
            [
              { type: 'literal', value: validDfn! },
              { type: 'literal', value: providerDuz || '1' },
              { type: 'literal', value: locationIen },
              { type: 'literal', value: ` ${String(esCode)}` },
              { type: 'list', value: orderEntries },
            ],
            { idempotent: false }
          );
          sendResponses.push(...resp);

          // ORWOR1 SIG: formally record electronic signature per order
          for (const orderId of orderIds as string[]) {
            try {
              await safeCallRpc('ORWOR1 SIG', [String(orderId), String(esCode)], { idempotent: false });
            } catch {
              // ORWDX SEND already applied the e-signature; ORWOR1 SIG recording is non-fatal
            }
          }
        } finally {
          if (locked) {
            await safeCallRpc('ORWDX UNLOCK', [validDfn!], { idempotent: true }).catch((e) => log.warn('ORWDX UNLOCK failed -- patient may remain locked', { dfn: validDfn, error: String(e) }));
          }
          disconnect();
        }

        let parsedSend = parseOrderSendResponses(sendResponses);
        if (
          !parsedSend.success &&
          /Unable to discontinue/i.test(parsedSend.errorMessage || '') &&
          Object.keys(orderEntriesForSend).length > 0
        ) {
          const retryEntries: Record<string, string> = {};
          for (const [key, value] of Object.entries(orderEntriesForSend)) {
            const pieces = value.split('^');
            pieces[3] = 'W';
            retryEntries[key] = pieces.join('^');
          }
          const retryResp = await safeCallRpcWithList(
            'ORWDX SEND',
            [
              { type: 'literal', value: validDfn! },
              { type: 'literal', value: providerDuz || '1' },
              { type: 'literal', value: locationIen },
              { type: 'literal', value: ` ${String(esCode)}` },
              { type: 'list', value: retryEntries },
            ],
            { idempotent: false }
          );
          parsedSend = parseOrderSendResponses(retryResp);
        }
        const raw = parsedSend.raw;
        const success = parsedSend.success;

        auditWrite('clinical.order-sign', success ? 'success' : 'failure', actor, validDfn!, {
          mode: 'real',
          rpc: 'ORWDX SEND',
        });

        // Phase 154: Log sign events to PG for each order
        for (const oid of orderIds as string[]) {
          void logSignEvent({
            tenantId,
            orderIen: oid,
            dfn: validDfn!,
            duz: actor,
            action: 'sign',
            status: success ? (parsedSend.alreadySigned ? 'already_signed' : 'signed') : 'sign_failed',
            esHash,
            rpcUsed: 'ORWDX LOCK -> ORWD1 SIG4ONE -> ORWOR1 CHKDIG -> ORWDX SEND -> ORWDX UNLOCK',
            detail: { responsePrefix: raw.slice(0, 80), orderCount: orderIds.length },
          });
        }

        if (!success) {
          return reply.code(502).send({
            ok: false,
            mode: 'real',
            status: 'sign-failed',
            blocker: 'vista_send_rejected',
            rpcUsed,
            vivianPresence,
            message: parsedSend.errorMessage || 'Order signing failed in VistA.',
          });
        }

        return {
          ok: true,
          mode: 'real',
          status: 'signed',
          rpcUsed,
          vivianPresence,
          response: raw,
          message: parsedSend.alreadySigned
            ? `${orderIds.length} order(s) were already signed in VistA`
            : `${orderIds.length} order(s) signed successfully`,
        };
      } catch (err: any) {
        disconnect();
        log.warn('ORWDX SEND failed', { error: safeErr(err) });
        for (const oid of orderIds as string[]) {
          void logSignEvent({
            tenantId,
            orderIen: oid,
            dfn: validDfn!,
            duz: actor,
            action: 'sign',
            status: 'rpc_error',
            esHash: hashEsCode(String(esCode)),
            rpcUsed: 'ORWDX LOCK -> ORWD1 SIG4ONE -> ORWOR1 CHKDIG -> ORWDX SEND -> ORWDX UNLOCK',
            detail: { error: safeErr(err) },
          });
        }
        auditWrite('clinical.order-sign', 'failure', actor, validDfn!, {
          mode: 'real',
          rpc: 'ORWDX SEND',
        });
        return {
          ok: false,
          status: 'sign-failed',
          blocker: 'rpc_error',
          rpcUsed,
          vivianPresence,
          message:
            'Order signing RPC call failed before VistA could confirm the signature.',
        };
      }
    }

    auditWrite('clinical.order-sign', 'failure', actor, validDfn!, { mode: 'rpc-unavailable' });
    for (const oid of orderIds as string[]) {
      void logSignEvent({
        tenantId,
        orderIen: oid,
        dfn: validDfn!,
        duz: actor,
        action: 'sign_attempt',
        status: 'rpc_unavailable',
        detail: { rpcTarget: 'ORWDX SEND' },
      });
    }
    return reply.code(502).send({
      ok: false,
      source: 'vista',
      rpcUsed,
      vivianPresence,
      error: `${(orderIds as string[]).length} order(s) remain unsigned. Required signing RPCs not available at runtime.`,
    });
  });

  /* ================================================================
   * POST /vista/cprs/order-checks
   * RPCs: ORWDXC ACCEPT, ORWDXC DISPLAY, ORWDXC SAVECHK
   * Runs VistA order checks for pending/new orders
   * ================================================================ */
  server.post('/vista/cprs/order-checks', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    const { dfn, orderIds } = body;
    const rpcUsed = ['ORWDXC ACCEPT', 'ORWDXC DISPLAY'];
    const vivianPresence = {
      'ORWDXC ACCEPT': 'present' as const,
      'ORWDXC DISPLAY': 'present' as const,
      'ORWDXC SAVECHK': 'present' as const,
    };

    const errors = validateRequired(body, ['dfn']);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: 'dfn', message: 'dfn must be numeric' });
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const actor = getActor(request);
    const checkAccept = optionalRpc('ORWDXC ACCEPT');

    const isTransportOrMErrorLine = (line: string) => {
      const normalized = (line || '').trim();
      if (!normalized) return false;
      return (
        /M\s+ERROR=/i.test(normalized) ||
        /ERROR=.*\^ORWDXC/i.test(normalized) ||
        /%YDB-E-/i.test(normalized) ||
        /Undefined local variable/i.test(normalized) ||
        /LAST REF=/i.test(normalized)
      );
    };

    if (checkAccept.available && orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      try {
        validateCredentials();
        await connect();

        // ORWDXC ACCEPT: params vary by VistA version
        // Attempt to get order check results for the given orders
        const orderIenStr = (orderIds as string[]).join(';');
        const acceptLines = await safeCallRpc('ORWDXC ACCEPT', [validDfn!, orderIenStr]);
        disconnect();

        const rawErrors = acceptLines.filter(isTransportOrMErrorLine);
        if (rawErrors.length > 0) {
          log.warn('ORWDXC ACCEPT returned runtime error lines', { rawErrors });
          return reply.code(502).send({
            ok: false,
            checks: [],
            checkCount: 0,
            rpcUsed: ['ORWDXC ACCEPT'],
            vivianPresence,
            error: 'ORWDXC ACCEPT returned runtime errors. Order checks require full CPRS session context.',
          });
        }

        // Parse check results: each line describes a check finding
        const checks = acceptLines
          .filter((l) => l.trim())
          .map((line, i) => {
            const parts = line.split('^');
            return {
              id: `chk-${i}`,
              type: parts[0]?.trim() || 'unknown',
              severity: parts[1]?.trim() || 'info',
              message: parts[2]?.trim() || line.trim(),
              orderIen: parts[3]?.trim() || '',
            };
          });

        audit(
          'clinical.order-check',
          'success',
          { duz: actor },
          {
            patientDfn: validDfn!,
            detail: { checkCount: checks.length, orderCount: (orderIds as string[]).length },
          }
        );

        return {
          ok: true,
          source: 'vista',
          mode: 'real',
          checks,
          checkCount: checks.length,
          rpcUsed,
          vivianPresence,
          message:
            checks.length > 0
              ? `${checks.length} order check(s) found. Review before signing.`
              : 'No order check findings. Safe to proceed.',
        };
      } catch (err: any) {
        disconnect();
        log.warn('ORWDXC ACCEPT failed', { error: safeErr(err) });
        // Fall through to pending
      }
    }

    audit(
      'clinical.order-check',
      'success',
      { duz: actor },
      {
        patientDfn: validDfn!,
        detail: { mode: 'fallback' },
      }
    );

    return reply.code(502).send({
      ok: false,
      checks: [],
      checkCount: 0,
      rpcUsed: ['ORWDXC ACCEPT', 'ORWDXC DISPLAY', 'ORWDXC SAVECHK'],
      vivianPresence,
      error: 'Order checks RPCs require valid order context with proper orderable items.',
    });
  });

  /* ================================================================
   * POST /vista/cprs/orders/dc
   * RPC: ORWDX LOCK + ORWDXA DC + ORWDX UNLOCK
   * Discontinue an existing order
   * ================================================================ */
  server.post('/vista/cprs/orders/dc', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    const { dfn, orderIen, reason } = body;
    const rpcUsed = ['ORWDX LOCK', 'ORWDXA DC', 'ORWDX UNLOCK'];
    const vivianPresence = {
      'ORWDX LOCK': 'present' as const,
      'ORWDXA DC': 'present' as const,
      'ORWDX UNLOCK': 'present' as const,
    };

    const errors = validateRequired(body, ['dfn', 'orderIen']);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: 'dfn', message: 'dfn must be numeric' });
    if (orderIen && !/^\d+$/.test(String(orderIen)))
      errors.push({ field: 'orderIen', message: 'orderIen must be numeric' });
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const actor = getActor(request);
    let locked = false;
    try {
      validateCredentials();
      await connect();
      const duz = getDuz();

      const lockResp = await safeCallRpc('ORWDX LOCK', [validDfn!], { idempotent: false });
      locked = lockResp[0]?.trim() === '1';
      if (!locked) {
        disconnect();
        return reply.code(409).send({ ok: false, error: 'Patient locked by another provider', rpcUsed, vivianPresence });
      }

      const dcResp = await safeCallRpc(
        'ORWDXA DC',
        [String(orderIen), duz, '1', String(reason || '')],
        { idempotent: false }
      );

      await safeCallRpc('ORWDX UNLOCK', [validDfn!], { idempotent: true })
        .catch((e) => log.warn('ORWDX UNLOCK failed', { error: String(e) }));
      locked = false;
      disconnect();

      const raw = dcResp.join('\n').trim();
      if (hasVistaRuntimeError(raw)) {
        auditWrite('clinical.order-dc', 'failure', actor, validDfn!, { mode: 'real', rpc: 'ORWDXA DC' });
        return reply.code(502).send({ ok: false, source: 'vista', error: `ORWDXA DC failed: ${raw}`, rpcUsed, vivianPresence });
      }

      auditWrite('clinical.order-dc', 'success', actor, validDfn!, { mode: 'real', rpc: 'ORWDXA DC' });
      return { ok: true, source: 'vista', mode: 'real', orderIen: String(orderIen), action: 'discontinued', rpcUsed, vivianPresence };
    } catch (err: any) {
      if (locked) await safeCallRpc('ORWDX UNLOCK', [validDfn!], { idempotent: true }).catch(() => {});
      disconnect();
      return reply.code(502).send({ ok: false, source: 'vista', error: safeErr(err), rpcUsed, vivianPresence });
    }
  });

  /* ================================================================
   * POST /vista/cprs/orders/hold
   * RPC: ORWDX LOCK + ORWDXA HOLD + ORWDX UNLOCK
   * Place an order on hold
   * ================================================================ */
  server.post('/vista/cprs/orders/hold', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    const { dfn, orderIen } = body;
    const rpcUsed = ['ORWDX LOCK', 'ORWDXA HOLD', 'ORWDX UNLOCK'];
    const vivianPresence = {
      'ORWDX LOCK': 'present' as const,
      'ORWDXA HOLD': 'present' as const,
      'ORWDX UNLOCK': 'present' as const,
    };

    const errors = validateRequired(body, ['dfn', 'orderIen']);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: 'dfn', message: 'dfn must be numeric' });
    if (orderIen && !/^\d+$/.test(String(orderIen)))
      errors.push({ field: 'orderIen', message: 'orderIen must be numeric' });
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const actor = getActor(request);
    let locked = false;
    try {
      validateCredentials();
      await connect();

      const lockResp = await safeCallRpc('ORWDX LOCK', [validDfn!], { idempotent: false });
      locked = lockResp[0]?.trim() === '1';
      if (!locked) {
        disconnect();
        return reply.code(409).send({ ok: false, error: 'Patient locked by another provider', rpcUsed, vivianPresence });
      }

      const holdResp = await safeCallRpc('ORWDXA HOLD', [String(orderIen)], { idempotent: false });

      await safeCallRpc('ORWDX UNLOCK', [validDfn!], { idempotent: true })
        .catch((e) => log.warn('ORWDX UNLOCK failed', { error: String(e) }));
      locked = false;
      disconnect();

      const raw = holdResp.join('\n').trim();
      if (hasVistaRuntimeError(raw)) {
        auditWrite('clinical.order-hold', 'failure', actor, validDfn!, { mode: 'real', rpc: 'ORWDXA HOLD' });
        return reply.code(502).send({ ok: false, source: 'vista', error: `ORWDXA HOLD failed: ${raw}`, rpcUsed, vivianPresence });
      }

      auditWrite('clinical.order-hold', 'success', actor, validDfn!, { mode: 'real', rpc: 'ORWDXA HOLD' });
      return { ok: true, source: 'vista', mode: 'real', orderIen: String(orderIen), action: 'held', rpcUsed, vivianPresence };
    } catch (err: any) {
      if (locked) await safeCallRpc('ORWDX UNLOCK', [validDfn!], { idempotent: true }).catch(() => {});
      disconnect();
      return reply.code(502).send({ ok: false, source: 'vista', error: safeErr(err), rpcUsed, vivianPresence });
    }
  });

  /* ================================================================
   * POST /vista/cprs/orders/flag
   * RPC: ORWDX LOCK + ORWDXA FLAG + ORWDX UNLOCK
   * Flag an order for attention
   * ================================================================ */
  server.post('/vista/cprs/orders/flag', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    const { dfn, orderIen, flagReason } = body;
    const rpcUsed = ['ORWDX LOCK', 'ORWDXA FLAG', 'ORWDX UNLOCK'];
    const vivianPresence = {
      'ORWDX LOCK': 'present' as const,
      'ORWDXA FLAG': 'present' as const,
      'ORWDX UNLOCK': 'present' as const,
    };

    const errors = validateRequired(body, ['dfn', 'orderIen', 'flagReason']);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: 'dfn', message: 'dfn must be numeric' });
    if (orderIen && !/^\d+$/.test(String(orderIen)))
      errors.push({ field: 'orderIen', message: 'orderIen must be numeric' });
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const actor = getActor(request);
    let locked = false;
    try {
      validateCredentials();
      await connect();
      const duz = getDuz();

      const lockResp = await safeCallRpc('ORWDX LOCK', [validDfn!], { idempotent: false });
      locked = lockResp[0]?.trim() === '1';
      if (!locked) {
        disconnect();
        return reply.code(409).send({ ok: false, error: 'Patient locked by another provider', rpcUsed, vivianPresence });
      }

      const flagResp = await safeCallRpc(
        'ORWDXA FLAG',
        [String(orderIen), String(flagReason), duz],
        { idempotent: false }
      );

      await safeCallRpc('ORWDX UNLOCK', [validDfn!], { idempotent: true })
        .catch((e) => log.warn('ORWDX UNLOCK failed', { error: String(e) }));
      locked = false;
      disconnect();

      const raw = flagResp.join('\n').trim();
      if (hasVistaRuntimeError(raw)) {
        auditWrite('clinical.order-flag', 'failure', actor, validDfn!, { mode: 'real', rpc: 'ORWDXA FLAG' });
        return reply.code(502).send({ ok: false, source: 'vista', error: `ORWDXA FLAG failed: ${raw}`, rpcUsed, vivianPresence });
      }

      auditWrite('clinical.order-flag', 'success', actor, validDfn!, { mode: 'real', rpc: 'ORWDXA FLAG' });
      return { ok: true, source: 'vista', mode: 'real', orderIen: String(orderIen), action: 'flagged', rpcUsed, vivianPresence };
    } catch (err: any) {
      if (locked) await safeCallRpc('ORWDX UNLOCK', [validDfn!], { idempotent: true }).catch(() => {});
      disconnect();
      return reply.code(502).send({ ok: false, source: 'vista', error: safeErr(err), rpcUsed, vivianPresence });
    }
  });

  /* ================================================================
   * POST /vista/cprs/orders/complete
   * RPC: ORWDX LOCK + ORWDXA COMPLETE + ORWDX UNLOCK
   * Mark an order as complete
   * ================================================================ */
  server.post('/vista/cprs/orders/complete', async (request, reply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    const { dfn, orderIen, esCode } = body;
    const rpcUsed = ['ORWDX LOCK', 'ORWDXA COMPLETE', 'ORWDX UNLOCK'];
    const vivianPresence = {
      'ORWDX LOCK': 'present' as const,
      'ORWDXA COMPLETE': 'present' as const,
      'ORWDX UNLOCK': 'present' as const,
    };

    const errors = validateRequired(body, ['dfn', 'orderIen']);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: 'dfn', message: 'dfn must be numeric' });
    if (orderIen && !/^\d+$/.test(String(orderIen)))
      errors.push({ field: 'orderIen', message: 'orderIen must be numeric' });
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const actor = getActor(request);
    let locked = false;
    try {
      validateCredentials();
      await connect();

      const lockResp = await safeCallRpc('ORWDX LOCK', [validDfn!], { idempotent: false });
      locked = lockResp[0]?.trim() === '1';
      if (!locked) {
        disconnect();
        return reply.code(409).send({ ok: false, error: 'Patient locked by another provider', rpcUsed, vivianPresence });
      }

      const completeResp = await safeCallRpc(
        'ORWDXA COMPLETE',
        [String(orderIen), String(esCode || '')],
        { idempotent: false }
      );

      await safeCallRpc('ORWDX UNLOCK', [validDfn!], { idempotent: true })
        .catch((e) => log.warn('ORWDX UNLOCK failed', { error: String(e) }));
      locked = false;
      disconnect();

      const raw = completeResp.join('\n').trim();
      if (hasVistaRuntimeError(raw)) {
        auditWrite('clinical.order-complete', 'failure', actor, validDfn!, { mode: 'real', rpc: 'ORWDXA COMPLETE' });
        return reply.code(502).send({ ok: false, source: 'vista', error: `ORWDXA COMPLETE failed: ${raw}`, rpcUsed, vivianPresence });
      }

      auditWrite('clinical.order-complete', 'success', actor, validDfn!, { mode: 'real', rpc: 'ORWDXA COMPLETE' });
      return { ok: true, source: 'vista', mode: 'real', orderIen: String(orderIen), action: 'completed', rpcUsed, vivianPresence };
    } catch (err: any) {
      if (locked) await safeCallRpc('ORWDX UNLOCK', [validDfn!], { idempotent: true }).catch(() => {});
      disconnect();
      return reply.code(502).send({ ok: false, source: 'vista', error: safeErr(err), rpcUsed, vivianPresence });
    }
  });

  log.info('CPOE Parity routes registered (Phase 59)', {
    routes: [
      'GET  /vista/cprs/orders',
      'POST /vista/cprs/orders/lab',
      'POST /vista/cprs/orders/imaging',
      'POST /vista/cprs/orders/consult',
      'POST /vista/cprs/orders/sign',
      'POST /vista/cprs/order-checks',
      'POST /vista/cprs/orders/dc',
      'POST /vista/cprs/orders/hold',
      'POST /vista/cprs/orders/flag',
      'POST /vista/cprs/orders/complete',
    ],
  });
}
