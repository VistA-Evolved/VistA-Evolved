/**
 * ASTM + POCT1-A Ingest — Routes
 *
 * Phase 382 (W21-P5): HTTP ingest endpoints for ASTM E1381 and POCT1-A
 * messages. The edge gateway parses serial/TCP traffic and POSTs the
 * data to these endpoints. Observations are stored in the device pipeline.
 */

import type { FastifyInstance, FastifyRequest } from "fastify";
import { parseAstm, type AstmParseResult } from "./astm-parser.js";
import { parsePoct1a, type Poct1aParseResult } from "./poct1a-parser.js";
import { storeObservation } from "./gateway-store.js";
import type { DeviceObservation } from "./types.js";
import * as crypto from "node:crypto";

const DEFAULT_TENANT = "default";
const MAX_INGEST_LOG = 1000;

// ---------------------------------------------------------------------------
// In-memory ingest logs
// ---------------------------------------------------------------------------

interface AstmIngestEntry {
  id: string;
  senderId: string;
  recordCount: number;
  observationCount: number;
  frameCount: number;
  checksumErrors: number;
  parseOk: boolean;
  error?: string;
  timestamp: string;
}

interface Poct1aIngestEntry {
  id: string;
  deviceManufacturer: string;
  deviceModel: string;
  observationCount: number;
  resultCount: number;
  parseOk: boolean;
  error?: string;
  timestamp: string;
}

const astmIngestLog: AstmIngestEntry[] = [];
const poct1aIngestLog: Poct1aIngestEntry[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(8).toString("hex")}`;
}

function now(): string {
  return new Date().toISOString();
}

function tenantId(request: FastifyRequest): string {
  return (request.headers["x-tenant-id"] as string) || DEFAULT_TENANT;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export default async function astmPoct1aIngestRoutes(server: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /devices/astm/ingest — ASTM frame/record ingest
  // -------------------------------------------------------------------------
  server.post("/devices/astm/ingest", async (request, reply) => {
    const tenant = tenantId(request);
    const body = request.body as any;

    let rawData: string;
    let gatewayId: string | undefined;

    if (body && typeof body === "object" && body.data) {
      rawData = body.data;
      gatewayId = body.gatewayId;
    } else if (typeof body === "string") {
      rawData = body;
    } else {
      return reply.code(400).send({ ok: false, error: "Provide { data: '<astm>' } or raw ASTM text" });
    }

    const result: AstmParseResult = parseAstm(rawData);

    // Store observations in the device observation pipeline
    let storedCount = 0;
    if (result.ok && result.observations.length > 0) {
      for (const obs of result.observations) {
        const deviceObs: DeviceObservation = {
          id: generateId("obs"),
          gatewayId: gatewayId || "direct-astm",
          deviceSerial: result.message?.senderId || "unknown",
          observationType: "lab-result",
          code: obs.testCode,
          codingSystem: "ASTM",
          displayName: obs.testName || obs.testCode,
          value: obs.value,
          unit: obs.units,
          referenceRange: obs.referenceRange,
          abnormalFlag: obs.abnormalFlag,
          status: "final",
          observedAt: result.message?.timestamp || now(),
          receivedAt: now(),
          patientId: obs.patientId || undefined,
          metadata: {
            protocol: "ASTM-E1381",
            specimenId: obs.specimenId,
            resultStatus: obs.resultStatus,
          },
        };
        storeObservation(tenant, deviceObs);
        storedCount++;
      }
    }

    // Log the ingest
    const entry: AstmIngestEntry = {
      id: generateId("astm-ing"),
      senderId: result.message?.senderId || "",
      recordCount: result.message?.records.length || 0,
      observationCount: result.observations.length,
      frameCount: result.frameCount,
      checksumErrors: result.checksumErrors,
      parseOk: result.ok,
      error: result.error,
      timestamp: now(),
    };
    astmIngestLog.push(entry);
    if (astmIngestLog.length > MAX_INGEST_LOG) astmIngestLog.shift();

    return reply.code(result.ok ? 200 : 422).send({
      ok: result.ok,
      ingestId: entry.id,
      recordCount: entry.recordCount,
      observationCount: result.observations.length,
      storedCount,
      frameCount: result.frameCount,
      checksumErrors: result.checksumErrors,
      error: result.error,
    });
  });

  // -------------------------------------------------------------------------
  // POST /devices/astm/parse — Parse-only diagnostic (no storage)
  // -------------------------------------------------------------------------
  server.post("/devices/astm/parse", async (request, reply) => {
    const body = request.body as any;
    const rawData = typeof body === "string" ? body : body?.data;

    if (!rawData) {
      return reply.code(400).send({ ok: false, error: "Provide { data: '<astm>' } or raw ASTM text" });
    }

    const result = parseAstm(rawData);
    return reply.send(result);
  });

  // -------------------------------------------------------------------------
  // GET /devices/astm/ingest-log — ASTM ingest history
  // -------------------------------------------------------------------------
  server.get("/devices/astm/ingest-log", async (_request, reply) => {
    return reply.send({ ok: true, entries: [...astmIngestLog].reverse(), count: astmIngestLog.length });
  });

  // -------------------------------------------------------------------------
  // POST /devices/poct1a/ingest — POCT1-A XML ingest
  // -------------------------------------------------------------------------
  server.post("/devices/poct1a/ingest", async (request, reply) => {
    const tenant = tenantId(request);
    const body = request.body as any;

    let xmlData: string;
    let gatewayId: string | undefined;

    if (body && typeof body === "object" && body.data) {
      xmlData = body.data;
      gatewayId = body.gatewayId;
    } else if (typeof body === "string") {
      xmlData = body;
    } else {
      return reply.code(400).send({ ok: false, error: "Provide { data: '<xml>' } or raw XML" });
    }

    const result: Poct1aParseResult = parsePoct1a(xmlData);

    // Store observations in the device observation pipeline
    let storedCount = 0;
    if (result.ok && result.observations.length > 0) {
      for (const obs of result.observations) {
        for (const r of obs.results) {
          const deviceObs: DeviceObservation = {
            id: generateId("obs"),
            gatewayId: gatewayId || "direct-poct1a",
            deviceSerial: obs.device.serialNumber || "unknown",
            observationType: "poct-result",
            code: r.analyteCode,
            codingSystem: "POCT1A",
            displayName: r.analyteName || r.analyteCode,
            value: r.value,
            unit: r.unit,
            referenceRange: r.referenceRange,
            abnormalFlag: r.flag,
            status: "final",
            observedAt: r.timestamp || obs.timestamp,
            receivedAt: now(),
            patientId: obs.patient.patientId || undefined,
            metadata: {
              protocol: "POCT1-A",
              deviceManufacturer: obs.device.manufacturer,
              deviceModel: obs.device.model,
              operatorId: obs.operatorId,
              observationId: obs.observationId,
            },
          };
          storeObservation(tenant, deviceObs);
          storedCount++;
        }
      }
    }

    // Log the ingest
    const firstDevice = result.observations[0]?.device;
    const totalResults = result.observations.reduce(
      (sum, o) => sum + o.results.length,
      0
    );

    const entry: Poct1aIngestEntry = {
      id: generateId("poct-ing"),
      deviceManufacturer: firstDevice?.manufacturer || "",
      deviceModel: firstDevice?.model || "",
      observationCount: result.observations.length,
      resultCount: totalResults,
      parseOk: result.ok,
      error: result.error,
      timestamp: now(),
    };
    poct1aIngestLog.push(entry);
    if (poct1aIngestLog.length > MAX_INGEST_LOG) poct1aIngestLog.shift();

    return reply.code(result.ok ? 200 : 422).send({
      ok: result.ok,
      ingestId: entry.id,
      observationCount: result.observations.length,
      resultCount: totalResults,
      storedCount,
      error: result.error,
    });
  });

  // -------------------------------------------------------------------------
  // POST /devices/poct1a/parse — Parse-only diagnostic (no storage)
  // -------------------------------------------------------------------------
  server.post("/devices/poct1a/parse", async (request, reply) => {
    const body = request.body as any;
    const xmlData = typeof body === "string" ? body : body?.data;

    if (!xmlData) {
      return reply.code(400).send({ ok: false, error: "Provide { data: '<xml>' } or raw XML" });
    }

    const result = parsePoct1a(xmlData);
    return reply.send(result);
  });

  // -------------------------------------------------------------------------
  // GET /devices/poct1a/ingest-log — POCT1-A ingest history
  // -------------------------------------------------------------------------
  server.get("/devices/poct1a/ingest-log", async (_request, reply) => {
    return reply.send({ ok: true, entries: [...poct1aIngestLog].reverse(), count: poct1aIngestLog.length });
  });
}
