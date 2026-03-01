/**
 * HL7v2 Message Packs — API Routes
 *
 * Phase 241 (Wave 6 P4): Pack listing, validation, and template endpoints.
 *
 * Routes:
 *   GET  /hl7/packs             — List all message packs
 *   GET  /hl7/packs/:id         — Get pack details
 *   POST /hl7/packs/:id/validate — Validate a message against a pack
 *   GET  /hl7/packs/:id/template — Get route template for a pack
 */

import type { FastifyInstance } from "fastify";
import { listPacks, getPack } from "../hl7/packs/index.js";
import { parseMessage } from "../hl7/parser.js";

export default async function hl7PackRoutes(server: FastifyInstance): Promise<void> {

  /** GET /hl7/packs — List all message packs */
  server.get("/hl7/packs", async (_request, reply) => {
    const packs = listPacks();
    return reply.send({
      ok: true,
      count: packs.length,
      packs: packs.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        messageTypes: p.messageTypes,
      })),
    });
  });

  /** GET /hl7/packs/:id — Get pack details */
  server.get("/hl7/packs/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const pack = getPack(id);
    if (!pack) {
      return reply.code(404).send({ ok: false, error: "Pack not found" });
    }
    return reply.send({
      ok: true,
      pack: {
        id: pack.id,
        name: pack.name,
        description: pack.description,
        messageTypes: pack.messageTypes,
      },
    });
  });

  /** POST /hl7/packs/:id/validate — Validate a message against a pack */
  server.post("/hl7/packs/:id/validate", async (request, reply) => {
    const { id } = request.params as { id: string };
    const pack = getPack(id);
    if (!pack) {
      return reply.code(404).send({ ok: false, error: "Pack not found" });
    }

    const body = (request.body as any) || {};
    const messageText = body.message || body.hl7 || "";
    if (!messageText) {
      return reply.code(400).send({ ok: false, error: "Missing 'message' field in request body" });
    }

    const parsed = parseMessage(messageText);
    if (!parsed) {
      return reply.code(400).send({ ok: false, error: "Could not parse HL7v2 message" });
    }

    const result = pack.validate(parsed);
    return reply.send({ ok: true, packId: id, result });
  });

  /** GET /hl7/packs/:id/template — Get route template for a pack */
  server.get("/hl7/packs/:id/template", async (request, reply) => {
    const { id } = request.params as { id: string };
    const pack = getPack(id);
    if (!pack) {
      return reply.code(404).send({ ok: false, error: "Pack not found" });
    }
    return reply.send({ ok: true, packId: id, template: pack.getRouteTemplate() });
  });
}
