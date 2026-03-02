/**
 * apps/api/src/service-lines/or/or-routes.ts
 *
 * Phase 467 (W31-P4). OR scheduling REST endpoints.
 */

import type { FastifyInstance } from "fastify";
import {
  createCase,
  getCase,
  listCases,
  updateCaseStatus,
  setAnesthesia,
  getRoom,
  listRooms,
  updateRoomStatus,
  createBlock,
  listBlocks,
  getOrBoardMetrics,
} from "./or-store.js";

export default async function orRoutes(server: FastifyInstance) {
  // ── Cases ──────────────────────────────────────────────────────

  server.post("/or/cases", async (request, reply) => {
    const body = (request.body as any) || {};
    const { patientDfn, procedure, surgeon, scheduledDate, estimatedDurationMin } = body;
    if (!patientDfn || !procedure || !surgeon || !scheduledDate) {
      return reply.code(400).send({ ok: false, error: "patientDfn, procedure, surgeon, scheduledDate required" });
    }
    const orCase = createCase({
      patientDfn,
      priority: body.priority || "elective",
      scheduledDate,
      scheduledStartTime: body.scheduledStartTime,
      estimatedDurationMin: estimatedDurationMin || 120,
      surgeon,
      procedure,
      procedureCpt: body.procedureCpt,
      laterality: body.laterality,
      roomId: body.roomId,
    });
    return reply.code(201).send({ ok: true, case: orCase });
  });

  server.get("/or/cases", async (request) => {
    const { date, status, roomId } = request.query as any;
    return { ok: true, cases: listCases({ date, status, roomId }) };
  });

  server.get("/or/cases/:id", async (request, reply) => {
    const { id } = request.params as any;
    const c = getCase(id);
    if (!c) return reply.code(404).send({ ok: false, error: "Case not found" });
    return { ok: true, case: c };
  });

  server.patch("/or/cases/:id/status", async (request, reply) => {
    const { id } = request.params as any;
    const { status } = (request.body as any) || {};
    if (!status) return reply.code(400).send({ ok: false, error: "status required" });
    const ok = updateCaseStatus(id, status, "system");
    if (!ok) return reply.code(404).send({ ok: false, error: "Case not found" });
    return { ok: true };
  });

  // ── Anesthesia ─────────────────────────────────────────────────

  server.post("/or/cases/:id/anesthesia", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const { type, anesthesiologist, asaClass } = body;
    if (!type || !anesthesiologist || !asaClass) {
      return reply.code(400).send({ ok: false, error: "type, anesthesiologist, asaClass required" });
    }
    const ok = setAnesthesia(id, {
      type,
      anesthesiologist,
      crna: body.crna,
      asaClass,
      preOpEvalComplete: body.preOpEvalComplete ?? false,
      inductionTime: body.inductionTime,
      intubationTime: body.intubationTime,
      emergenceTime: body.emergenceTime,
      extubationTime: body.extubationTime,
      agents: body.agents || [],
      airway: body.airway,
      complications: body.complications || [],
    });
    if (!ok) return reply.code(404).send({ ok: false, error: "Case not found" });
    return { ok: true };
  });

  // ── Rooms ──────────────────────────────────────────────────────

  server.get("/or/rooms", async () => {
    return { ok: true, rooms: listRooms() };
  });

  server.get("/or/rooms/:id", async (request, reply) => {
    const { id } = request.params as any;
    const room = getRoom(id);
    if (!room) return reply.code(404).send({ ok: false, error: "Room not found" });
    return { ok: true, room };
  });

  server.patch("/or/rooms/:id/status", async (request, reply) => {
    const { id } = request.params as any;
    const { status } = (request.body as any) || {};
    if (!status) return reply.code(400).send({ ok: false, error: "status required" });
    const ok = updateRoomStatus(id, status);
    if (!ok) return reply.code(404).send({ ok: false, error: "Room not found" });
    return { ok: true };
  });

  // ── Blocks ─────────────────────────────────────────────────────

  server.get("/or/blocks", async (request) => {
    const { roomId } = request.query as any;
    return { ok: true, blocks: listBlocks(roomId) };
  });

  server.post("/or/blocks", async (request, reply) => {
    const body = (request.body as any) || {};
    const { roomId, serviceId, dayOfWeek, startTime, endTime } = body;
    if (!roomId || !serviceId || dayOfWeek === undefined || !startTime || !endTime) {
      return reply.code(400).send({ ok: false, error: "roomId, serviceId, dayOfWeek, startTime, endTime required" });
    }
    const block = createBlock({ roomId, serviceId, dayOfWeek, startTime, endTime, surgeon: body.surgeon });
    return reply.code(201).send({ ok: true, block });
  });

  // ── Board ──────────────────────────────────────────────────────

  server.get("/or/board", async () => {
    return { ok: true, metrics: getOrBoardMetrics() };
  });
}
