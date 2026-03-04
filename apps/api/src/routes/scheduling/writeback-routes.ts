/**
 * Phase 170: Scheduling Writeback Routes
 *
 * Additional scheduling endpoints that enforce truth gates
 * and provide writeback status/policy transparency.
 *
 * Endpoints:
 *   GET  /scheduling/writeback/policy      -- Current writeback policy
 *   GET  /scheduling/writeback/entries      -- Tracked writeback entries
 *   POST /scheduling/writeback/verify/:ref  -- Enforce truth gate on appointment
 *   GET  /scheduling/writeback/readiness    -- RPC availability for writeback
 *
 * VistA RPCs:
 *   - SDES GET APPT BY APPT IEN (truth gate)
 *   - SDES CREATE APPOINTMENTS (future writeback target)
 *   - SDES CANCEL APPOINTMENT 2 (future cancel target)
 *   - SDOE LIST ENCOUNTERS FOR PAT (fallback verification)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../../auth/auth-routes.js';
import { log } from '../../lib/logger.js';
import {
  getWritebackPolicy,
  enforceTruthGate,
  getWritebackEntries,
  getWritebackEntryCount,
} from './writeback-guard.js';

export default async function writebackRoutes(server: FastifyInstance) {
  // GET /scheduling/writeback/policy — current writeback policy
  server.get(
    '/scheduling/writeback/policy',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;

      const policy = await getWritebackPolicy();
      return {
        ok: true,
        policy,
        enforcementRules: [
          "UI must NEVER display 'scheduled' unless truth gate passed",
          "Staff approve → status stays 'approved' until VistA confirmation",
          "All approve paths must call enforceTruthGate before returning 'scheduled'",
          'request_only mode: all bookings flow through staff approval queue',
        ],
        targetRpcs: {
          truthGate: ['SDES GET APPT BY APPT IEN', 'SDOE LIST ENCOUNTERS FOR PAT'],
          writeback: ['SDES CREATE APPOINTMENTS'],
          cancel: ['SDES CANCEL APPOINTMENT 2'],
          checkin: ['SDES CHECKIN'],
          checkout: ['SDES CHECKOUT'],
        },
      };
    }
  );

  // GET /scheduling/writeback/entries — tracked writeback entries
  server.get(
    '/scheduling/writeback/entries',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;

      const entries = getWritebackEntries()
        .filter((e) => e.tenantId === session.tenantId)
        .map((e) => ({
          id: e.id,
          appointmentRef: e.appointmentRef,
          status: e.status,
          attempts: e.attempts,
          lastAttemptAt: e.lastAttemptAt,
          vistaIen: e.vistaIen,
          truthGatePassed: e.truthGateResult?.passed ?? null,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        }));

      return { ok: true, entries, total: entries.length, storeTotal: getWritebackEntryCount() };
    }
  );

  // POST /scheduling/writeback/verify/:ref — enforce truth gate on an approved appointment
  server.post(
    '/scheduling/writeback/verify/:ref',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;
      const { ref } = request.params as { ref: string };
      const body = (request.body as any) || {};
      const patientDfn = body.patientDfn || (request.query as any).dfn;

      if (!patientDfn) {
        return reply
          .code(400)
          .send({ ok: false, error: "patientDfn required (body or query param 'dfn')" });
      }

      log.info('Truth gate enforcement requested', { appointmentRef: ref });

      const result = await enforceTruthGate(ref, patientDfn, session.tenantId, session.duz);

      return {
        ok: result.ok,
        status: result.status,
        truthGate: result.truthGate,
        vistaIen: result.vistaIen,
        rpcUsed: result.rpcUsed,
        error: result.error,
        nextSteps: result.nextSteps,
        enforcementNote: result.ok
          ? "VistA confirmed: appointment may be displayed as 'scheduled'"
          : "VistA did NOT confirm: appointment must stay 'approved' in UI — NEVER show 'scheduled'",
      };
    }
  );

  // GET /scheduling/writeback/readiness — RPC availability + writeback readiness
  server.get(
    '/scheduling/writeback/readiness',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;

      const policy = await getWritebackPolicy();

      const writebackRpcs = [
        { rpc: 'SDES CREATE APPOINTMENTS', purpose: 'Direct appointment booking', tag: 'write' },
        { rpc: 'SDES CANCEL APPOINTMENT 2', purpose: 'Cancel appointment', tag: 'write' },
        { rpc: 'SDES CHECKIN', purpose: 'Patient check-in', tag: 'write' },
        { rpc: 'SDES CHECKOUT', purpose: 'Patient checkout', tag: 'write' },
        { rpc: 'SDES GET APPT BY APPT IEN', purpose: 'Truth gate verification', tag: 'read' },
        { rpc: 'SDOE LIST ENCOUNTERS FOR PAT', purpose: 'Fallback truth gate', tag: 'read' },
      ];

      return {
        ok: true,
        mode: policy.mode,
        writebackEnabled: policy.allowDirectWriteback,
        truthGateRequired: policy.requireTruthGate,
        rpcs: writebackRpcs,
        readiness: {
          request_only: {
            description: 'All appointments flow through staff approval queue',
            vistaWriteback: false,
            truthGateAvailable: policy.mode !== 'request_only',
            status: policy.mode === 'request_only' ? 'active' : 'inactive',
          },
          sdes_partial: {
            description: 'SDES installed but writeback not verified safe',
            vistaWriteback: false,
            truthGateAvailable: true,
            status: policy.mode === 'sdes_partial' ? 'active' : 'inactive',
          },
          vista_direct: {
            description: 'Full SDES writeback with mandatory truth gate',
            vistaWriteback: true,
            truthGateAvailable: true,
            status: policy.mode === 'vista_direct' ? 'active' : 'inactive',
          },
        },
        statusContract: {
          never: "UI must NEVER display 'scheduled' without truth gate pass",
          approve: "'approved' means staff approved, not VistA confirmed",
          scheduled: "'scheduled' requires VistA round-trip confirmation",
          integration_pending: 'VistA writeback infra not available',
        },
      };
    }
  );
}
