/**
 * HL7v2 Engine — Barrel Export + Lifecycle
 *
 * Phase 239 (Wave 6 P2): Engine initialization and shutdown.
 * Opt-in via HL7_ENGINE_ENABLED=true env var.
 */

import { log } from "../lib/logger.js";
import { MllpServer } from "./mllp-server.js";
import type { Hl7EngineStatus } from "./types.js";
import { routingMessageHandler, shutdownDispatcher } from "./routing/index.js";

// Re-exports
export { MllpServer } from "./mllp-server.js";
export { MllpClient } from "./mllp-client.js";
export { parseMessage, getField, getSegments, messageSummary } from "./parser.js";
export { generateAck, ackAccept, ackError, ackReject } from "./ack-generator.js";
export * from "./types.js";
export * from "./fhir-bridge.js";
export * from "./channel-health.js";
export * from "./outbound-builder.js";

/* ------------------------------------------------------------------ */
/*  Singleton Engine Instance                                          */
/* ------------------------------------------------------------------ */

let engineInstance: MllpServer | null = null;

/**
 * Check if the HL7 engine is enabled via env var.
 */
export function isHl7EngineEnabled(): boolean {
  return process.env.HL7_ENGINE_ENABLED === "true";
}

/**
 * Initialize and start the HL7v2 MLLP engine.
 * No-op if HL7_ENGINE_ENABLED is not "true".
 *
 * @returns true if engine started, false if disabled/skipped
 */
export async function initHl7Engine(): Promise<boolean> {
  if (!isHl7EngineEnabled()) {
    log.info("HL7 engine disabled (set HL7_ENGINE_ENABLED=true to enable)", {
      component: "hl7-engine",
    });
    return false;
  }

  if (engineInstance) {
    log.warn("HL7 engine already initialized", { component: "hl7-engine" });
    return true;
  }

  const port = parseInt(process.env.HL7_MLLP_PORT || "2575", 10);
  const host = process.env.HL7_MLLP_HOST || "0.0.0.0";
  const maxConnections = parseInt(process.env.HL7_MLLP_MAX_CONNECTIONS || "100", 10);

  engineInstance = new MllpServer({
    port,
    host,
    maxConnections,
  });

  // Register routing message handler (Phase 240, replaces default handler)
  // Falls back to ACK-accept if no routes match (dead-lettered)
  engineInstance.onMessage(routingMessageHandler);

  try {
    await engineInstance.start();
    log.info("HL7 engine started", {
      component: "hl7-engine",
      port,
      host,
    });
    return true;
  } catch (err) {
    log.error("HL7 engine failed to start", {
      component: "hl7-engine",
      error: (err as Error).message,
    });
    engineInstance = null;
    return false;
  }
}

/**
 * Stop the HL7v2 engine and release all resources.
 */
export async function stopHl7Engine(): Promise<void> {
  if (!engineInstance) return;

  try {
    shutdownDispatcher();
    await engineInstance.stop();
    log.info("HL7 engine stopped", { component: "hl7-engine" });
  } catch (err) {
    log.error("HL7 engine stop error", {
      component: "hl7-engine",
      error: (err as Error).message,
    });
  }
  engineInstance = null;
}

/**
 * Get the current engine status.
 */
export function getHl7EngineStatus(): Hl7EngineStatus {
  if (!engineInstance) {
    return {
      running: false,
      listening: false,
      port: parseInt(process.env.HL7_MLLP_PORT || "2575", 10),
      activeConnections: 0,
      totalMessagesReceived: 0,
      totalMessagesSent: 0,
      totalErrors: 0,
      uptimeMs: 0,
    };
  }
  return engineInstance.getStatus();
}

/**
 * Get the engine instance (for advanced usage / route registration).
 */
export function getHl7Engine(): MllpServer | null {
  return engineInstance;
}
