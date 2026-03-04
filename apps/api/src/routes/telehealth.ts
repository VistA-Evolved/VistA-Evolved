/**
 * Telehealth Routes — Phase 30
 *
 * REST endpoints for telehealth video visit lifecycle:
 * - POST /telehealth/rooms — Create a room for an appointment
 * - GET  /telehealth/rooms/:roomId — Get room status
 * - POST /telehealth/rooms/:roomId/join — Join a room (get join URL)
 * - POST /telehealth/rooms/:roomId/end — End a room
 * - GET  /telehealth/rooms/:roomId/waiting — Get waiting room state
 * - GET  /telehealth/device-check/requirements — Get device requirements
 * - POST /telehealth/device-check/report — Submit device check result
 * - GET  /telehealth/rooms — List active rooms (clinician)
 * - GET  /telehealth/health — Provider health check
 *
 * Portal routes (patient-facing, under /portal/telehealth):
 * - GET  /portal/telehealth/appointment/:appointmentId/room — Get/create room for appointment
 * - POST /portal/telehealth/rooms/:roomId/join — Patient join
 * - GET  /portal/telehealth/rooms/:roomId/waiting — Patient waiting room
 * - GET  /portal/telehealth/device-check — Device requirements
 * - POST /portal/telehealth/device-check/report — Submit device check
 *
 * Auth:
 * - /telehealth/* routes use clinician session (requireSession)
 * - /portal/telehealth/* routes use portal session (portalSessionLookup)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getTelehealthProvider, listProviders } from '../telehealth/providers/index.js';
import * as roomStore from '../telehealth/room-store.js';
import { getDeviceRequirements, validateDeviceReport } from '../telehealth/device-check.js';
import { portalAudit } from '../services/portal-audit.js';
import { log } from '../lib/logger.js';

/* ------------------------------------------------------------------ */
/* Session helpers — injected from index.ts                             */
/* ------------------------------------------------------------------ */

interface PortalSessionData {
  token: string;
  patientDfn: string;
  patientName: string;
  createdAt: number;
  lastActivity: number;
}

interface ClinicianSession {
  duz: string;
  userName?: string;
  role?: string;
}

type PortalSessionLookup = (request: FastifyRequest) => PortalSessionData | null;
type ClinicianSessionLookup = (
  request: FastifyRequest,
  reply: FastifyReply
) => ClinicianSession | Promise<ClinicianSession>;

let _portalSession: PortalSessionLookup | null = null;
let _clinicianSession: ClinicianSessionLookup | null = null;

export function initTelehealthRoutes(
  portalSessionLookup: PortalSessionLookup,
  clinicianSessionLookup: ClinicianSessionLookup
): void {
  _portalSession = portalSessionLookup;
  _clinicianSession = clinicianSessionLookup;
}

function requirePortalSession(request: FastifyRequest, reply: FastifyReply): PortalSessionData {
  const session = _portalSession?.(request);
  if (!session) {
    reply.code(401).send({ ok: false, error: 'Not authenticated' });
    throw new Error('No portal session');
  }
  return session;
}

async function requireClinicianSession(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<ClinicianSession> {
  if (!_clinicianSession) {
    reply.code(401).send({ ok: false, error: 'Not authenticated' });
    throw new Error('No clinician session lookup');
  }
  return await _clinicianSession(request, reply);
}

/* ------------------------------------------------------------------ */
/* Route plugin                                                         */
/* ------------------------------------------------------------------ */

export default async function telehealthRoutes(server: FastifyInstance): Promise<void> {
  const provider = getTelehealthProvider();

  /* ── Clinician routes (/telehealth/*) ── */

  // Create room for an appointment
  server.post('/telehealth/rooms', async (request, reply) => {
    try {
      const session = await requireClinicianSession(request, reply);
      const body = (request.body as any) || {};
      const { appointmentId } = body;

      if (!appointmentId) {
        return reply.code(400).send({ ok: false, error: 'appointmentId required' });
      }

      // Check if room already exists for this appointment
      const existing = await roomStore.getRoomByAppointment(appointmentId);
      if (existing && existing.status !== 'ended') {
        return { ok: true, room: existing, reused: true };
      }

      // Create via provider adapter
      const result = await provider.createRoom(appointmentId);

      // Store room in lifecycle store
      const room = roomStore.createRoom(appointmentId, result.roomId);

      log.info('Telehealth room created by clinician', {
        roomId: room.roomId,
        appointmentId,
        duz: session.duz,
      });

      return { ok: true, room, providerMeta: result.meta };
    } catch (err: any) {
      if (err.message === 'No clinician session lookup') return;
      log.error('Failed to create telehealth room', { error: err.message });
      return reply.code(500).send({ ok: false, error: 'Failed to create room' });
    }
  });

  // Get room status
  server.get('/telehealth/rooms/:roomId', async (request, reply) => {
    try {
      await requireClinicianSession(request, reply);
      const { roomId } = request.params as any;
      const room = await roomStore.getRoom(roomId);
      if (!room) return reply.code(404).send({ ok: false, error: 'Room not found' });
      return { ok: true, room };
    } catch (err: any) {
      if (err.message === 'No clinician session lookup') return;
      return reply.code(500).send({ ok: false, error: 'Failed to get room' });
    }
  });

  // Clinician join room
  server.post('/telehealth/rooms/:roomId/join', async (request, reply) => {
    try {
      const session = await requireClinicianSession(request, reply);
      const { roomId } = request.params as any;

      const room = await roomStore.getRoom(roomId);
      if (!room) return reply.code(404).send({ ok: false, error: 'Room not found' });
      if (room.status === 'ended')
        return reply.code(410).send({ ok: false, error: 'Room has ended' });

      // Join the room store
      await roomStore.joinRoom(roomId, `duz-${session.duz}`, 'provider');

      // Get provider join URL
      const joinResult = await provider.joinUrl(roomId, {
        displayName: session.userName || `Provider ${session.duz}`,
        role: 'provider',
      });

      log.info('Clinician joined telehealth room', { roomId, duz: session.duz });

      return { ok: true, joinUrl: joinResult.url, expiresInSeconds: joinResult.expiresInSeconds };
    } catch (err: any) {
      if (err.message === 'No clinician session lookup') return;
      return reply.code(500).send({ ok: false, error: 'Failed to join room' });
    }
  });

  // End room
  server.post('/telehealth/rooms/:roomId/end', async (request, reply) => {
    try {
      const session = await requireClinicianSession(request, reply);
      const { roomId } = request.params as any;

      const room = await roomStore.getRoom(roomId);
      if (!room) return reply.code(404).send({ ok: false, error: 'Room not found' });

      await provider.endRoom(roomId);
      const ended = await roomStore.endRoom(roomId);

      log.info('Telehealth room ended by clinician', { roomId, duz: session.duz });

      return { ok: true, room: ended };
    } catch (err: any) {
      if (err.message === 'No clinician session lookup') return;
      return reply.code(500).send({ ok: false, error: 'Failed to end room' });
    }
  });

  // Get waiting room state (clinician view)
  server.get('/telehealth/rooms/:roomId/waiting', async (request, reply) => {
    try {
      await requireClinicianSession(request, reply);
      const { roomId } = request.params as any;
      const state = await roomStore.getWaitingRoomState(roomId);
      if (!state) return reply.code(404).send({ ok: false, error: 'Room not found' });
      return { ok: true, waiting: state };
    } catch (err: any) {
      if (err.message === 'No clinician session lookup') return;
      return reply.code(500).send({ ok: false, error: 'Failed to get waiting room' });
    }
  });

  // List active rooms (clinician dashboard)
  server.get('/telehealth/rooms', async (request, reply) => {
    try {
      await requireClinicianSession(request, reply);
      const rooms = await roomStore.listActiveRooms();
      const stats = roomStore.getRoomStats();
      return { ok: true, rooms, stats };
    } catch (err: any) {
      if (err.message === 'No clinician session lookup') return;
      return reply.code(500).send({ ok: false, error: 'Failed to list rooms' });
    }
  });

  // Device check requirements
  server.get('/telehealth/device-check/requirements', async () => {
    return { ok: true, requirements: getDeviceRequirements() };
  });

  // Provider health check
  server.get('/telehealth/health', async () => {
    const healthy = await provider.healthCheck();
    return {
      ok: true,
      provider: provider.name,
      healthy,
      availableProviders: listProviders(),
      roomStats: roomStore.getRoomStats(),
    };
  });

  /* ── Portal routes (/portal/telehealth/*) ── */

  // Get or create room for a portal appointment
  server.get('/portal/telehealth/appointment/:appointmentId/room', async (request, reply) => {
    try {
      requirePortalSession(request, reply);
      const { appointmentId } = request.params as any;

      // Check for existing active room
      const existing = await roomStore.getRoomByAppointment(appointmentId);
      if (existing && existing.status !== 'ended') {
        return { ok: true, room: existing };
      }

      // No active room yet — patient sees "waiting for provider to start"
      return { ok: true, room: null, message: 'Your provider has not started the visit yet.' };
    } catch (err: any) {
      if (err.message === 'No portal session') return;
      return reply.code(500).send({ ok: false, error: 'Failed to get room' });
    }
  });

  // Patient join room
  server.post('/portal/telehealth/rooms/:roomId/join', async (request, reply) => {
    try {
      const session = requirePortalSession(request, reply);
      const { roomId } = request.params as any;

      const room = await roomStore.getRoom(roomId);
      if (!room) return reply.code(404).send({ ok: false, error: 'Room not found' });
      if (room.status === 'ended')
        return reply.code(410).send({ ok: false, error: 'Visit has ended' });

      // Join the room store
      await roomStore.joinRoom(roomId, `dfn-${session.patientDfn}`, 'patient');

      // Get provider join URL
      const joinResult = await provider.joinUrl(roomId, {
        displayName: session.patientName || 'Patient',
        role: 'patient',
      });

      // Audit
      portalAudit('portal.telehealth.joined', 'success', session.patientDfn, {
        detail: { roomId },
      });

      return { ok: true, joinUrl: joinResult.url, expiresInSeconds: joinResult.expiresInSeconds };
    } catch (err: any) {
      if (err.message === 'No portal session') return;
      return reply.code(500).send({ ok: false, error: 'Failed to join visit' });
    }
  });

  // Patient waiting room state
  server.get('/portal/telehealth/rooms/:roomId/waiting', async (request, reply) => {
    try {
      requirePortalSession(request, reply);
      const { roomId } = request.params as any;

      const state = await roomStore.getWaitingRoomState(roomId);
      if (!state) return reply.code(404).send({ ok: false, error: 'Room not found' });

      return { ok: true, waiting: state };
    } catch (err: any) {
      if (err.message === 'No portal session') return;
      return reply.code(500).send({ ok: false, error: 'Failed to get waiting room' });
    }
  });

  // Device requirements (portal)
  server.get('/portal/telehealth/device-check', async () => {
    return { ok: true, requirements: getDeviceRequirements() };
  });

  // Submit device check report (portal)
  server.post('/portal/telehealth/device-check/report', async (request, reply) => {
    try {
      const session = requirePortalSession(request, reply);
      const body = (request.body as any) || {};

      const result = validateDeviceReport(body);

      portalAudit(
        'portal.telehealth.device.check',
        result.ready ? 'success' : 'failure',
        session.patientDfn,
        {
          detail: {
            ready: result.ready,
            issues: result.issues,
          },
        }
      );

      return { ok: true, result };
    } catch (err: any) {
      if (err.message === 'No portal session') return;
      return reply.code(500).send({ ok: false, error: 'Failed to process device check' });
    }
  });
}
