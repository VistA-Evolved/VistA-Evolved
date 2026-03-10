/**
 * Inbox / Notifications routes -- Phase 13B + Phase 14B compat layer.
 *
 * GET /vista/inbox -- aggregates pending items across clinical domains:
 *   - Unsigned orders
 *   - Abnormal lab results
 *   - Pending consult requests
 *   - Unacknowledged results
 *
 * Phase 14B: Uses RPC capability layer to detect missing RPCs at startup
 * and report them as "expected-missing" (not WARN) with structured fallback.
 *
 * RPCs:  ORWORB FASTUSER, ORWORB UNSIG ORDERS
 */

import type { FastifyInstance } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import { validateCredentials } from '../vista/config.js';
import { connect, disconnect, callRpc, getDuz } from '../vista/rpcBrokerClient.js';
import { safeCallRpc } from '../lib/rpc-resilience.js';
import { optionalRpc } from '../vista/rpcCapabilities.js';
import { safeErr } from '../lib/safe-error.js';
import { log } from '../lib/logger.js';

function parseNotificationDate(raw: string | undefined): string {
  const normalized = (raw || '').trim().replace('@', ' ');
  if (!normalized) return new Date().toISOString();

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function parseFastUserNotification(line: string, fallbackIndex: number): InboxItem | null {
  const parts = line.split('^');
  const maybeNotifIen = parts[0]?.trim();
  const hasLeadingNotificationIen = !!maybeNotifIen && /^\d+$/.test(maybeNotifIen);

  const patientName = (hasLeadingNotificationIen ? parts[1] : parts[1])?.trim() || undefined;
  const message = (hasLeadingNotificationIen ? parts[2] : parts[5])?.trim() || line;
  const urgency = (hasLeadingNotificationIen ? parts[3] : parts[3])?.trim() || '';
  const dfnCandidate = (hasLeadingNotificationIen ? parts[4] : '')?.trim() || '';
  const dateCandidate = (hasLeadingNotificationIen ? '' : parts[4])?.trim() || '';

  return {
    id: `notif-${hasLeadingNotificationIen ? maybeNotifIen : fallbackIndex}`,
    type: 'notification',
    priority:
      urgency.toUpperCase() === 'STAT'
        ? 'stat'
        : urgency.toUpperCase() === 'URGENT'
          ? 'urgent'
          : 'routine',
    patientDfn: /^\d+$/.test(dfnCandidate) ? dfnCandidate : undefined,
    patientName,
    summary: message,
    detail: line,
    dateTime: parseNotificationDate(dateCandidate),
    acknowledged: false,
  };
}

export interface InboxItem {
  id: string;
  type:
    | 'unsigned_order'
    | 'abnormal_lab'
    | 'pending_consult'
    | 'flagged_result'
    | 'cosign_needed'
    | 'notification';
  priority: 'routine' | 'urgent' | 'stat';
  patientDfn?: string;
  patientName?: string;
  summary: string;
  detail: string;
  dateTime: string;
  acknowledged: boolean;
}

export default async function inboxRoutes(server: FastifyInstance): Promise<void> {
  // GET /vista/inbox
  server.get('/vista/inbox', async (_request, reply) => {
    try {
      validateCredentials();
    } catch (_err: any) {
      return reply.code(500).send({ ok: false, error: 'Inbox credential validation failed' });
    }

    const items: InboxItem[] = [];
    const featureStatus: {
      rpc: string;
      status: 'available' | 'expected-missing' | 'error';
      detail?: string;
    }[] = [];

    // Phase 14B: check capability layer before calling RPCs
    const unsigCheck = optionalRpc('ORWORB UNSIG ORDERS');
    const fastCheck = optionalRpc('ORWORB FASTUSER');

    try {
      await connect();
      const duz = getDuz();

      // 1. Unsigned orders via ORWORB UNSIG ORDERS
      if (unsigCheck.available) {
        try {
          const unsigLines = await callRpc('ORWORB UNSIG ORDERS', [duz]);
          const firstLine = unsigLines[0] || '';
          // Only "Remote Procedure doesn't exist" means truly absent
          // LVUNDEF / M ERROR means it ran but needs real params = available
          if (
            firstLine.includes("doesn't exist") ||
            firstLine.includes('doesn\u0027t exist') ||
            firstLine.startsWith('CRemote')
          ) {
            featureStatus.push({
              rpc: 'ORWORB UNSIG ORDERS',
              status: 'expected-missing',
              detail: 'RPC not available on this distro',
            });
          } else {
            featureStatus.push({ rpc: 'ORWORB UNSIG ORDERS', status: 'available' });
            for (const line of unsigLines) {
              if (!line.trim()) continue;
              const parts = line.split('^');
              const dfn = parts[0]?.trim();
              const patientName = parts[1]?.trim() || 'Unknown';
              const orderInfo = parts[2]?.trim() || 'Unsigned order';
              if (dfn && dfn !== '0' && /^\d+$/.test(dfn)) {
                items.push({
                  id: `unsig-${dfn}-${items.length}`,
                  type: 'unsigned_order',
                  priority: 'routine',
                  patientDfn: dfn,
                  patientName,
                  summary: `Unsigned order: ${orderInfo}`,
                  detail: line,
                  dateTime: new Date().toISOString(),
                  acknowledged: false,
                });
              }
            }
          }
        } catch (err: any) {
          featureStatus.push({ rpc: 'ORWORB UNSIG ORDERS', status: 'error', detail: safeErr(err) });
        }
      } else {
        featureStatus.push({
          rpc: 'ORWORB UNSIG ORDERS',
          status: 'expected-missing',
          detail: 'Feature disabled on this distro',
        });
      }

      // 2. Notifications via ORWORB FASTUSER
      if (fastCheck.available) {
        try {
          const notifLines = await callRpc('ORWORB FASTUSER', [duz]);
          const firstNotif = notifLines[0] || '';
          // Only "Remote Procedure doesn't exist" means truly absent
          if (
            firstNotif.includes("doesn't exist") ||
            firstNotif.includes('doesn\u0027t exist') ||
            firstNotif.startsWith('CRemote')
          ) {
            featureStatus.push({
              rpc: 'ORWORB FASTUSER',
              status: 'expected-missing',
              detail: 'RPC not available on this distro',
            });
          } else {
            featureStatus.push({ rpc: 'ORWORB FASTUSER', status: 'available' });
            for (const line of notifLines) {
              if (!line.trim()) continue;
              const parsed = parseFastUserNotification(line, items.length);
              if (parsed) {
                items.push(parsed);
              }
            }
          }
        } catch (err: any) {
          featureStatus.push({ rpc: 'ORWORB FASTUSER', status: 'error', detail: safeErr(err) });
        }
      } else {
        featureStatus.push({
          rpc: 'ORWORB FASTUSER',
          status: 'expected-missing',
          detail: 'Feature disabled on this distro',
        });
      }

      disconnect();
    } catch (_err: any) {
      disconnect();
      return reply.code(500).send({ ok: false, error: 'Inbox query failed' });
    }

    return {
      ok: true,
      count: items.length,
      items,
      featureStatus,
      // Backward-compat: rpcErrors derived from featureStatus for Phase 13 verifier
      rpcErrors:
        featureStatus
          .filter((f) => f.status !== 'available')
          .map((f) => `${f.rpc}: ${f.detail || 'not available'}`).length > 0
          ? featureStatus
              .filter((f) => f.status !== 'available')
              .map((f) => `${f.rpc}: ${f.detail || 'not available'}`)
          : undefined,
    };
  });

  // POST /vista/inbox/acknowledge
  server.post('/vista/inbox/acknowledge', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;

    const body = (request.body as any) || {};
    const itemId = String(body.itemId || '').trim();
    if (!itemId) {
      return reply.code(400).send({ ok: false, error: 'itemId required' });
    }

    const rpcUsed: string[] = [];
    const alertId = itemId.replace(/^notif-/, '');

    try {
      const result = await safeCallRpc('ORB DELETE ALERT', [alertId, session.duz], { idempotent: false });
      rpcUsed.push('ORB DELETE ALERT');

      return {
        ok: true,
        itemId,
        source: 'vista',
        rpcUsed,
        data: result,
      };
    } catch (err: any) {
      rpcUsed.push('ORB DELETE ALERT');
      log.warn('ORB DELETE ALERT failed', { err: err?.message, alertId });
      return reply.code(502).send({
        ok: false,
        itemId,
        source: 'vista',
        error: `Alert acknowledgement failed: ${safeErr(err)}`,
        rpcUsed,
      });
    }
  });
}
