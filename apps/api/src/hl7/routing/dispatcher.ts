/**
 * HL7v2 Routing — Destination Dispatcher
 *
 * Phase 240 (Wave 6 P3): Dispatches transformed HL7v2 messages to their
 * configured destinations (MLLP forward, VistA RPC, HTTP, dead-letter).
 *
 * PHI safety: Only message metadata (control ID, type) logged on dispatch.
 */

import * as crypto from "node:crypto";
import { log } from "../../lib/logger.js";
import type { RouteDestination, DispatchResult, DeadLetterEntry } from "./types.js";
import type { Hl7Message } from "../types.js";
import { MllpClient } from "../mllp-client.js";
import { parseMessage, messageSummary } from "../parser.js";
import { addToDeadLetter, recordDispatch, recordFailure } from "./registry.js";

/** Client pool for MLLP destinations (reuse connections). */
const clientPool = new Map<string, MllpClient>();

/**
 * Dispatch a message to a destination.
 *
 * @param messageText - Transformed HL7v2 message text
 * @param destination - Target destination config
 * @param routeId - Route ID for stats tracking
 * @param originalMessage - Original parsed message (for metadata logging)
 */
export async function dispatch(
  messageText: string,
  destination: RouteDestination,
  routeId: string,
  originalMessage: Hl7Message,
): Promise<DispatchResult> {
  const start = Date.now();

  try {
    let result: DispatchResult;

    switch (destination.type) {
      case "mllp":
        result = await dispatchMllp(messageText, destination);
        break;
      case "http":
        result = await dispatchHttp(messageText, destination);
        break;
      case "vista-rpc":
        result = dispatchVistaRpc(messageText, destination);
        break;
      case "dead-letter":
        result = dispatchDeadLetter(originalMessage, destination, "Routed to dead-letter");
        break;
      default:
        result = {
          ok: false,
          destinationId: destination.id,
          error: `Unknown destination type: ${destination.type}`,
          durationMs: Date.now() - start,
        };
    }

    result.durationMs = Date.now() - start;

    if (result.ok) {
      recordDispatch(routeId, result.durationMs);
      log.info("HL7 message dispatched", {
        component: "hl7-dispatch",
        routeId,
        destinationId: destination.id,
        type: destination.type,
        durationMs: result.durationMs,
        messageControlId: originalMessage.messageControlId,
      });
    } else {
      recordFailure(routeId);
      log.warn("HL7 dispatch failed", {
        component: "hl7-dispatch",
        routeId,
        destinationId: destination.id,
        type: destination.type,
        error: result.error,
        messageControlId: originalMessage.messageControlId,
      });
    }

    return result;
  } catch (err) {
    const durationMs = Date.now() - start;
    recordFailure(routeId);
    log.error("HL7 dispatch error", {
      component: "hl7-dispatch",
      routeId,
      destinationId: destination.id,
      error: (err as Error).message,
    });
    return {
      ok: false,
      destinationId: destination.id,
      error: "HL7 dispatch error",
      durationMs,
    };
  }
}

/**
 * Dead-letter a message that couldn't be routed.
 */
export function deadLetterUnroutable(message: Hl7Message, reason: string): void {
  const entry: DeadLetterEntry = {
    id: crypto.randomBytes(8).toString("hex"),
    messageType: message.messageType,
    messageControlId: message.messageControlId,
    sendingApplication: message.msh.sendingApplication,
    receivedAt: Date.now(),
    reason,
    retryCount: 0,
  };
  addToDeadLetter(entry);
}

/**
 * Shut down all pooled MLLP clients.
 */
export function shutdownDispatcher(): void {
  for (const [id, client] of clientPool) {
    try {
      client.disconnect();
    } catch { /* ignore */ }
  }
  clientPool.clear();
}

/* ------------------------------------------------------------------ */
/*  Private — Dispatch by Type                                         */
/* ------------------------------------------------------------------ */

async function dispatchMllp(
  messageText: string,
  dest: RouteDestination,
): Promise<DispatchResult> {
  // Parse target as host:port
  const [host, portStr] = dest.target.split(":");
  const port = parseInt(portStr || "2575", 10);

  // Get or create pooled client
  let client = clientPool.get(dest.id);
  if (!client) {
    client = new MllpClient({
      host: host || "127.0.0.1",
      port,
      responseTimeoutMs: dest.timeoutMs || 30_000,
    });
    clientPool.set(dest.id, client);
  }

  const ackText = await client.send(messageText);
  const ackParsed = parseMessage(ackText);

  return {
    ok: true,
    destinationId: dest.id,
    ack: ackParsed
      ? { message: ackText, ackCode: "AA", messageControlId: ackParsed.messageControlId }
      : undefined,
    durationMs: 0,
  };
}

async function dispatchHttp(
  messageText: string,
  dest: RouteDestination,
): Promise<DispatchResult> {
  // HTTP POST to target URL
  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      dest.timeoutMs || 30_000,
    );

    const response = await fetch(dest.target, {
      method: "POST",
      headers: { "Content-Type": "application/hl7-v2" },
      body: messageText,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    return {
      ok: response.ok,
      destinationId: dest.id,
      error: response.ok ? undefined : `HTTP ${response.status}`,
      durationMs: 0,
    };
  } catch (err) {
    return {
      ok: false,
      destinationId: dest.id,
      error: (err as Error).message,
      durationMs: 0,
    };
  }
}

function dispatchVistaRpc(
  _messageText: string,
  dest: RouteDestination,
): DispatchResult {
  // VistA RPC bridge — integration pending
  // Will be wired in Phase 241 (P4) with message pack handlers
  return {
    ok: false,
    destinationId: dest.id,
    error: "VistA RPC bridge: integration pending",
    durationMs: 0,
  };
}

function dispatchDeadLetter(
  message: Hl7Message,
  dest: RouteDestination,
  reason: string,
): DispatchResult {
  deadLetterUnroutable(message, reason);
  return {
    ok: true,
    destinationId: dest.id,
    durationMs: 0,
  };
}
