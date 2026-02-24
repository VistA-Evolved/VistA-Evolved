/**
 * Inbox / Notifications routes — Phase 13B + Phase 14B compat layer.
 *
 * GET /vista/inbox — aggregates pending items across clinical domains:
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

import type { FastifyInstance } from "fastify";
import { validateCredentials } from "../vista/config.js";
import { connect, disconnect, callRpc, getDuz } from "../vista/rpcBrokerClient.js";
import { optionalRpc } from "../vista/rpcCapabilities.js";
import { safeErr } from '../lib/safe-error.js';

export interface InboxItem {
  id: string;
  type: 'unsigned_order' | 'abnormal_lab' | 'pending_consult' | 'flagged_result' | 'cosign_needed' | 'notification';
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
  server.get("/vista/inbox", async (_request, reply) => {
    try {
      validateCredentials();
    } catch (err: any) {
      return reply.code(500).send({ ok: false, error: "Inbox credential validation failed" });
    }

    const items: InboxItem[] = [];
    const featureStatus: { rpc: string; status: 'available' | 'expected-missing' | 'error'; detail?: string }[] = [];

    // Phase 14B: check capability layer before calling RPCs
    const unsigCheck = optionalRpc("ORWORB UNSIG ORDERS");
    const fastCheck = optionalRpc("ORWORB FASTUSER");

    try {
      await connect();
      const duz = getDuz();

      // 1. Unsigned orders via ORWORB UNSIG ORDERS
      if (unsigCheck.available) {
        try {
          const unsigLines = await callRpc("ORWORB UNSIG ORDERS", [duz]);
          const firstLine = unsigLines[0] || "";
          // Only "Remote Procedure doesn't exist" means truly absent
          // LVUNDEF / M ERROR means it ran but needs real params = available
          if (firstLine.includes("doesn't exist") || firstLine.includes("doesn\u0027t exist") || firstLine.startsWith("CRemote")) {
            featureStatus.push({ rpc: "ORWORB UNSIG ORDERS", status: 'expected-missing', detail: 'RPC not available on this distro' });
          } else {
            featureStatus.push({ rpc: "ORWORB UNSIG ORDERS", status: 'available' });
            for (const line of unsigLines) {
              if (!line.trim()) continue;
              const parts = line.split("^");
              const dfn = parts[0]?.trim();
              const patientName = parts[1]?.trim() || "Unknown";
              const orderInfo = parts[2]?.trim() || "Unsigned order";
              if (dfn && dfn !== "0" && /^\d+$/.test(dfn)) {
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
          featureStatus.push({ rpc: "ORWORB UNSIG ORDERS", status: 'error', detail: safeErr(err) });
        }
      } else {
        featureStatus.push({ rpc: "ORWORB UNSIG ORDERS", status: 'expected-missing', detail: 'Feature disabled on this distro' });
      }

      // 2. Notifications via ORWORB FASTUSER
      if (fastCheck.available) {
        try {
          const notifLines = await callRpc("ORWORB FASTUSER", [duz]);
          const firstNotif = notifLines[0] || "";
          // Only "Remote Procedure doesn't exist" means truly absent
          if (firstNotif.includes("doesn't exist") || firstNotif.includes("doesn\u0027t exist") || firstNotif.startsWith("CRemote")) {
            featureStatus.push({ rpc: "ORWORB FASTUSER", status: 'expected-missing', detail: 'RPC not available on this distro' });
          } else {
            featureStatus.push({ rpc: "ORWORB FASTUSER", status: 'available' });
            for (const line of notifLines) {
              if (!line.trim()) continue;
              const parts = line.split("^");
              const notifIen = parts[0]?.trim();
              const patientName = parts[1]?.trim() || "";
              const message = parts[2]?.trim() || line;
              const urgency = parts[3]?.trim() || "";
              const dfn = parts[4]?.trim() || "";

              if (notifIen && !/^\d+$/.test(notifIen)) continue;

              items.push({
                id: `notif-${notifIen || items.length}`,
                type: 'notification',
                priority: urgency.toUpperCase() === 'STAT' ? 'stat' : urgency.toUpperCase() === 'URGENT' ? 'urgent' : 'routine',
                patientDfn: dfn || undefined,
                patientName: patientName || undefined,
                summary: message,
                detail: line,
                dateTime: new Date().toISOString(),
                acknowledged: false,
              });
            }
          }
        } catch (err: any) {
          featureStatus.push({ rpc: "ORWORB FASTUSER", status: 'error', detail: safeErr(err) });
        }
      } else {
        featureStatus.push({ rpc: "ORWORB FASTUSER", status: 'expected-missing', detail: 'Feature disabled on this distro' });
      }

      disconnect();
    } catch (err: any) {
      disconnect();
      return reply.code(500).send({ ok: false, error: "Inbox query failed" });
    }

    return {
      ok: true,
      count: items.length,
      items,
      featureStatus,
      // Backward-compat: rpcErrors derived from featureStatus for Phase 13 verifier
      rpcErrors: featureStatus.filter(f => f.status !== 'available').map(f => `${f.rpc}: ${f.detail || 'not available'}`).length > 0
        ? featureStatus.filter(f => f.status !== 'available').map(f => `${f.rpc}: ${f.detail || 'not available'}`)
        : undefined,
    };
  });
}
