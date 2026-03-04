/**
 * HL7 v2 MLLP Ingest — Routes
 *
 * Phase 381 (W21-P4): HTTP ingest endpoint that accepts HL7 v2 messages
 * (ORU/ORM), parses them, extracts observations, and stores them in the
 * device observation pipeline.
 *
 * In production, the edge gateway receives MLLP over TCP and forwards
 * the extracted HL7 message body to this HTTP endpoint. The MLLP framing
 * is handled at the gateway level; this endpoint receives the raw HL7 text.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { parseHl7Message, generateAck, type Hl7ParseResult } from './hl7v2-parser.js';
import { storeObservation } from './gateway-store.js';
import type { DeviceObservation } from './types.js';
import * as crypto from 'node:crypto';

const DEFAULT_TENANT = 'default';
const MAX_HL7_INGEST_LOG = 1000;

// In-memory ingest log for diagnostics
interface IngestLogEntry {
  id: string;
  messageType: string;
  controlId: string;
  sendingApp: string;
  observationCount: number;
  parseOk: boolean;
  error?: string;
  timestamp: string;
}

const ingestLog: IngestLogEntry[] = [];

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(8).toString('hex')}`;
}

function now(): string {
  return new Date().toISOString();
}

function tenantId(request: FastifyRequest): string {
  return (request.headers['x-tenant-id'] as string) || DEFAULT_TENANT;
}

export default async function hl7v2IngestRoutes(server: FastifyInstance): Promise<void> {
  /**
   * POST /devices/hl7v2/ingest — Ingest an HL7 v2 message
   *
   * Body: { message: string } or raw HL7 text with Content-Type: x-application/hl7-v2+er7
   * Auth: service (gateway-to-server)
   */
  server.post('/devices/hl7v2/ingest', async (request, reply) => {
    let rawMessage: string;

    const contentType = request.headers['content-type'] || '';
    if (contentType.includes('hl7') || contentType.includes('text/plain')) {
      // Raw HL7 body
      rawMessage = typeof request.body === 'string' ? request.body : String(request.body || '');
    } else {
      // JSON envelope
      const body = (request.body as any) || {};
      rawMessage = body.message || '';
    }

    if (!rawMessage || !rawMessage.trim()) {
      return reply.code(400).send({ ok: false, error: 'empty_message' });
    }

    // Parse the HL7 message
    const result: Hl7ParseResult = parseHl7Message(rawMessage.trim());

    // Log the ingest attempt
    const entry: IngestLogEntry = {
      id: generateId('hl7'),
      messageType: result.message?.messageType || 'UNKNOWN',
      controlId: result.message?.controlId || '',
      sendingApp: result.message?.sendingApp || '',
      observationCount: result.observations?.length || 0,
      parseOk: result.ok,
      error: result.error,
      timestamp: now(),
    };
    ingestLog.push(entry);
    while (ingestLog.length > MAX_HL7_INGEST_LOG) ingestLog.shift();

    if (!result.ok) {
      const ack = generateAck(entry.controlId || '0', 'AE', result.error);
      return reply.code(422).send({
        ok: false,
        error: result.error,
        ack,
      });
    }

    // Convert observations to DeviceObservation and store
    const tid = tenantId(request);
    const gatewayId = (request.headers['x-gateway-id'] as string) || 'direct';
    const storedObs: DeviceObservation[] = [];

    for (const obs of result.observations || []) {
      const deviceObs: DeviceObservation = {
        id: generateId('obs'),
        gatewayId,
        deviceId: result.message?.sendingApp || 'unknown',
        patientId: result.patientId,
        code: obs.code,
        codeSystem: obs.codeSystem,
        value: obs.value,
        unit: obs.units,
        flag: obs.abnormalFlags || undefined,
        referenceRange: obs.referenceRange || undefined,
        sourceProtocol: 'hl7v2',
        observedAt: obs.observationTimestamp || now(),
        ingestedAt: now(),
        normalized: false,
        tenantId: tid,
      };
      storeObservation(deviceObs);
      storedObs.push(deviceObs);
    }

    const ack = generateAck(result.message!.controlId, 'AA');

    return reply.code(201).send({
      ok: true,
      messageType: result.message!.messageType,
      controlId: result.message!.controlId,
      observationsStored: storedObs.length,
      patientId: result.patientId,
      ack,
    });
  });

  /**
   * POST /devices/hl7v2/parse — Parse without storing (diagnostic)
   * Auth: admin
   */
  server.post('/devices/hl7v2/parse', async (request, reply) => {
    const body = (request.body as any) || {};
    const rawMessage = body.message || '';
    if (!rawMessage) {
      return reply.code(400).send({ ok: false, error: 'message required' });
    }
    const result = parseHl7Message(rawMessage.trim());
    return {
      ok: result.ok,
      message: result.message
        ? {
            messageType: result.message.messageType,
            controlId: result.message.controlId,
            sendingApp: result.message.sendingApp,
            sendingFacility: result.message.sendingFacility,
            timestamp: result.message.timestamp,
            version: result.message.version,
            segmentCount: result.message.segments.length,
          }
        : null,
      observations: result.observations,
      patientId: result.patientId,
      error: result.error,
    };
  });

  /**
   * GET /devices/hl7v2/ingest-log — View ingest history
   * Auth: admin
   */
  server.get('/devices/hl7v2/ingest-log', async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = parseInt(query.limit || '50', 10);
    const entries = ingestLog.slice(-limit);
    return { ok: true, entries, total: entries.length };
  });
}
