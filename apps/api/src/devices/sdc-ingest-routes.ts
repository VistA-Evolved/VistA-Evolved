/**
 * IEEE 11073 SDC Ingest — Types + Route
 *
 * Phase 383 (W21-P6): API-side ingest endpoint for IEEE 11073 SDC
 * observations forwarded by the sdc11073 Python sidecar. The sidecar
 * normalizes BICEPS metrics/alerts/waveforms to this JSON format before
 * POSTing.
 *
 * Per ADR-W21-SDC-POSTURE: SDC is optional (sidecar behind compose profile).
 * The API accepts any observation format — SDC is just another producer.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { storeObservation } from './gateway-store.js';
import type { DeviceObservation } from './types.js';
import * as crypto from 'node:crypto';

const DEFAULT_TENANT = 'default';
const MAX_SDC_INGEST_LOG = 1000;

// ---------------------------------------------------------------------------
// SDC-specific ingest types (normalized by the sdc11073 sidecar)
// ---------------------------------------------------------------------------

export type SdcMetricCategory = 'numeric' | 'string' | 'enum' | 'waveform' | 'alert' | 'component';

export interface SdcIngestPayload {
  /** Source device MDS handle (SDC Medical Device System) */
  mdsHandle: string;
  /** Device manufacturer */
  manufacturer?: string;
  /** Device model name */
  modelName?: string;
  /** Device serial number */
  serialNumber: string;
  /** Location context (SDC LocationContextDescriptor) */
  locationContext?: string;
  /** Patient context (SDC PatientContextDescriptor — ID only, no PHI) */
  patientId?: string;
  /** Metrics/observations from the device */
  metrics: SdcMetric[];
  /** Timestamp of the sidecar capture */
  capturedAt: string;
}

export interface SdcMetric {
  /** SDC metric handle */
  handle: string;
  /** BICEPS metric type (MDC code) */
  code: string;
  /** Coding system (typically MDC / IEEE 11073-10101) */
  codingSystem: string;
  /** Human-readable display name */
  displayName: string;
  /** Metric category */
  category: SdcMetricCategory;
  /** Observed value */
  value: string;
  /** Units (MDC unit code or UCUM) */
  unit: string;
  /** Determination period (for periodic metrics) */
  determinationPeriod?: string;
  /** Alert condition (for alarm metrics) */
  alertCondition?: string;
  /** Alert priority (for alarm metrics: Lo, Me, Hi) */
  alertPriority?: string;
  /** Metric timestamp */
  timestamp: string;
}

// ---------------------------------------------------------------------------
// In-memory ingest log
// ---------------------------------------------------------------------------

interface SdcIngestEntry {
  id: string;
  mdsHandle: string;
  serialNumber: string;
  manufacturer: string;
  metricCount: number;
  storedCount: number;
  parseOk: boolean;
  error?: string;
  timestamp: string;
}

const sdcIngestLog: SdcIngestEntry[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(8).toString('hex')}`;
}

function now(): string {
  return new Date().toISOString();
}

function tenantId(request: FastifyRequest): string {
  return (request.headers['x-tenant-id'] as string) || DEFAULT_TENANT;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export default async function sdcIngestRoutes(server: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // POST /devices/sdc/ingest — SDC metric ingest from sidecar
  // -------------------------------------------------------------------------
  server.post('/devices/sdc/ingest', async (request, reply) => {
    const tenant = tenantId(request);
    const body = request.body as SdcIngestPayload;

    if (!body || !body.serialNumber || !Array.isArray(body.metrics)) {
      return reply.code(400).send({
        ok: false,
        error: 'Provide { serialNumber, metrics: [...] }',
      });
    }

    let storedCount = 0;
    try {
      for (const metric of body.metrics) {
        const obs: DeviceObservation = {
          id: generateId('obs'),
          gatewayId: `sdc-sidecar-${body.mdsHandle || 'unknown'}`,
          deviceId: body.serialNumber,
          patientId: body.patientId || undefined,
          code: metric.code,
          codeSystem: metric.codingSystem || 'MDC',
          value: metric.value,
          unit: metric.unit,
          flag: metric.alertPriority || undefined,
          referenceRange: undefined,
          sourceProtocol: 'sdc',
          observedAt: metric.timestamp || body.capturedAt,
          ingestedAt: now(),
          normalized: false,
          tenantId: tenant,
        };
        storeObservation(obs);
        storedCount++;
      }

      const entry: SdcIngestEntry = {
        id: generateId('sdc-ing'),
        mdsHandle: body.mdsHandle || '',
        serialNumber: body.serialNumber,
        manufacturer: body.manufacturer || '',
        metricCount: body.metrics.length,
        storedCount,
        parseOk: true,
        timestamp: now(),
      };
      sdcIngestLog.push(entry);
      if (sdcIngestLog.length > MAX_SDC_INGEST_LOG) sdcIngestLog.shift();

      return reply.send({
        ok: true,
        ingestId: entry.id,
        metricCount: body.metrics.length,
        storedCount,
      });
    } catch (err: any) {
      const entry: SdcIngestEntry = {
        id: generateId('sdc-ing'),
        mdsHandle: body.mdsHandle || '',
        serialNumber: body.serialNumber,
        manufacturer: body.manufacturer || '',
        metricCount: body.metrics.length,
        storedCount,
        parseOk: false,
        error: err.message,
        timestamp: now(),
      };
      sdcIngestLog.push(entry);
      if (sdcIngestLog.length > MAX_SDC_INGEST_LOG) sdcIngestLog.shift();

      return reply.code(500).send({
        ok: false,
        ingestId: entry.id,
        error: err.message,
      });
    }
  });

  // -------------------------------------------------------------------------
  // GET /devices/sdc/ingest-log — SDC ingest history
  // -------------------------------------------------------------------------
  server.get('/devices/sdc/ingest-log', async (_request, reply) => {
    return reply.send({
      ok: true,
      entries: [...sdcIngestLog].reverse(),
      count: sdcIngestLog.length,
    });
  });

  // -------------------------------------------------------------------------
  // GET /devices/sdc/status — SDC subsystem status
  // -------------------------------------------------------------------------
  server.get('/devices/sdc/status', async (_request, reply) => {
    const recentIngests = sdcIngestLog.slice(-10);
    const hasRecentActivity = recentIngests.some((e) => {
      const age = Date.now() - new Date(e.timestamp).getTime();
      return age < 5 * 60 * 1000; // 5 minutes
    });

    return reply.send({
      ok: true,
      subsystem: 'ieee-11073-sdc',
      sidecarExpected: true,
      recentActivity: hasRecentActivity,
      totalIngests: sdcIngestLog.length,
      lastIngest: sdcIngestLog.length > 0 ? sdcIngestLog[sdcIngestLog.length - 1] : null,
      note: 'SDC support is optional. Enable sidecar with: docker compose --profile sdc up -d',
    });
  });
}
