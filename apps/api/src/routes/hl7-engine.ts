/**
 * HL7v2 Engine — API Routes
 *
 * Phase 239 (Wave 6 P2): Health and status endpoints for the HL7v2 MLLP engine.
 * Phase 279 (Wave 9): FHIR bridge, channel health, and outbound builder routes.
 *
 * Routes:
 *   GET  /hl7/health             — Engine health check
 *   GET  /hl7/connections        — Active MLLP connections (admin only)
 *   GET  /hl7/status             — Detailed engine status (admin only)
 *   GET  /hl7/channel-health     — Channel health summary (admin only)
 *   GET  /hl7/fhir/conversions   — List supported FHIR conversions
 *   POST /hl7/fhir/convert       — Convert HL7v2 message to FHIR R4
 *   GET  /hl7/outbound/types     — List outbound message types
 *   POST /hl7/outbound/build     — Build an outbound HL7v2 message
 */

import type { FastifyInstance } from "fastify";
import { getHl7EngineStatus, getHl7Engine, isHl7EngineEnabled } from "../hl7/index.js";
import {
  convertHl7ToFhir,
  listFhirConversions,
} from "../hl7/fhir-bridge.js";
import {
  getChannelHealthSummary,
  getRouteHealthSummary,
} from "../hl7/channel-health.js";
import {
  buildAdtMessage,
  buildOruMessage,
  buildOrmMessage,
  buildSiuMessage,
  listOutboundMessageTypes,
} from "../hl7/outbound-builder.js";
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

  /* ---------------------------------------------------------------- */
  /*  Channel Health (Phase 279)                                       */
  /* ---------------------------------------------------------------- */

  /**
   * GET /hl7/channel-health — Aggregated channel health summary.
   * Admin-only (enforced by AUTH_RULES matching /hl7/* -> admin).
   */
  server.get("/hl7/channel-health", async (_request, reply) => {
    const summary = getChannelHealthSummary();
    const routeHealth = getRouteHealthSummary();
    return reply.send({
      ok: true,
      channels: summary,
      routes: routeHealth,
    });
  });

  /* ---------------------------------------------------------------- */
  /*  FHIR Bridge (Phase 279)                                          */
  /* ---------------------------------------------------------------- */

  /**
   * GET /hl7/fhir/conversions — List supported FHIR conversion types.
   */
  server.get("/hl7/fhir/conversions", async (_request, reply) => {
    return reply.send({
      ok: true,
      conversions: listFhirConversions(),
    });
  });

  /**
   * POST /hl7/fhir/convert — Convert an HL7v2 message to FHIR R4 bundle.
   * Body: { message: string } (raw HL7v2 pipe-delimited message)
   */
  server.post("/hl7/fhir/convert", async (request, reply) => {
    const body = (request.body as any) || {};
    if (!body.message || typeof body.message !== "string") {
      return reply.code(400).send({
        ok: false,
        error: "Request body must include 'message' (string) containing an HL7v2 message",
      });
    }

    try {
      const result = convertHl7ToFhir(body.message);
      return reply.send(result);
    } catch (err) {
      log.error("FHIR conversion failed", {
        component: "hl7-fhir-bridge",
        error: (err as Error).message,
      });
      return reply.code(422).send({
        ok: false,
        error: `FHIR conversion failed: ${(err as Error).message}`,
      });
    }
  });

  /* ---------------------------------------------------------------- */
  /*  Outbound Builder (Phase 279)                                     */
  /* ---------------------------------------------------------------- */

  /**
   * GET /hl7/outbound/types — List supported outbound message types.
   */
  server.get("/hl7/outbound/types", async (_request, reply) => {
    return reply.send({
      ok: true,
      types: listOutboundMessageTypes(),
    });
  });

  /**
   * POST /hl7/outbound/build — Build an outbound HL7v2 message.
   * Body: { type: "ADT"|"ORU"|"ORM"|"SIU", data: {...} }
   */
  server.post("/hl7/outbound/build", async (request, reply) => {
    const body = (request.body as any) || {};
    const type = (body.type || "").toUpperCase();

    if (!body.config || typeof body.config !== "object" || !body.data || typeof body.data !== "object") {
      return reply.code(400).send({
        ok: false,
        error: "Request body must include 'type' (ADT|ORU|ORM|SIU), 'config' (OutboundConfig), and 'data' (object)",
      });
    }

    try {
      let result: import("../hl7/outbound-builder.js").OutboundResult;
      switch (type) {
        case "ADT":
          result = buildAdtMessage(body.config, body.data);
          break;
        case "ORU":
          result = buildOruMessage(body.config, body.data);
          break;
        case "ORM":
          result = buildOrmMessage(body.config, body.data);
          break;
        case "SIU":
          result = buildSiuMessage(body.config, body.data);
          break;
        default:
          return reply.code(400).send({
            ok: false,
            error: `Unsupported outbound type '${type}'. Use ADT, ORU, ORM, or SIU.`,
          });
      }
      return reply.send({ ...result, type });
    } catch (err) {
      log.error("Outbound message build failed", {
        component: "hl7-outbound-builder",
        error: (err as Error).message,
      });
      return reply.code(422).send({
        ok: false,
        error: `Build failed: ${(err as Error).message}`,
      });
    }
  });
}
