/**
 * HL7v2 Engine — API Routes
 *
 * Phase 239 (Wave 6 P2): Health and status endpoints for the HL7v2 MLLP engine.
 *
 * Routes:
 *   GET /hl7/health       — Engine health check
 *   GET /hl7/connections   — Active MLLP connections (admin only)
 *   GET /hl7/status        — Detailed engine status (admin only)
 */

import type { FastifyInstance } from "fastify";
import { getHl7EngineStatus, getHl7Engine, isHl7EngineEnabled } from "../hl7/index.js";
import { log } from "../lib/logger.js";

export default async function hl7EngineRoutes(server: FastifyInstance): Promise<void> {
  /**
   * GET /hl7/health — Engine health check.
   * Returns basic health status. Available without admin role so monitoring
   * systems can probe it.
   */
  server.get("/hl7/health", async (_request, reply) => {
    const status = getHl7EngineStatus();
    const enabled = isHl7EngineEnabled();

    return reply.send({
      ok: enabled ? status.running : true, // Not enabled = OK (not expected to run)
      enabled,
      running: status.running,
      listening: status.listening,
      port: status.port,
      uptimeMs: status.uptimeMs,
    });
  });

  /**
   * GET /hl7/connections — Active MLLP connections.
   * Admin-only (enforced by AUTH_RULES matching /hl7/* -> admin).
   */
  server.get("/hl7/connections", async (_request, reply) => {
    const engine = getHl7Engine();
    if (!engine) {
      return reply.code(503).send({
        ok: false,
        error: "HL7 engine not running",
        connections: [],
      });
    }

    const connections = engine.getConnections().map((c) => ({
      id: c.id,
      remoteHost: c.remoteHost,
      remotePort: c.remotePort,
      state: c.state,
      connectedAt: c.connectedAt,
      lastActivityAt: c.lastActivityAt,
      messagesReceived: c.messagesReceived,
      messagesSent: c.messagesSent,
      errors: c.errors,
    }));

    return reply.send({
      ok: true,
      count: connections.length,
      connections,
    });
  });

  /**
   * GET /hl7/status — Detailed engine status.
   * Admin-only (enforced by AUTH_RULES).
   */
  server.get("/hl7/status", async (_request, reply) => {
    const status = getHl7EngineStatus();
    const enabled = isHl7EngineEnabled();

    return reply.send({
      ok: true,
      enabled,
      ...status,
      config: {
        port: parseInt(process.env.HL7_MLLP_PORT || "2575", 10),
        host: process.env.HL7_MLLP_HOST || "0.0.0.0",
        maxConnections: parseInt(process.env.HL7_MLLP_MAX_CONNECTIONS || "100", 10),
        tls: process.env.HL7_MLLP_TLS === "true",
      },
    });
  });
}
