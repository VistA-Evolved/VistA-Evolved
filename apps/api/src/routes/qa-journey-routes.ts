/**
 * Phase 166: Clinic Day Journey Routes
 *
 * Admin-only endpoints to run and inspect A-Z proof journeys.
 * No PHI in outputs -- journey results contain only step names,
 * RPC names, timing, and pass/fail status.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import {
  ALL_JOURNEYS,
  runAllJourneys,
  runJourney,
  getJourneyResults,
  clearJourneyResults,
} from '../qa/clinic-day-journeys.js';

/** Only allow loopback targets -- prevent SSRF via attacker-controlled baseUrl */
const ALLOWED_BASE_RE = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/;
function sanitizeBaseUrl(raw?: string): string {
  const url = raw || 'http://127.0.0.1:3001';
  if (!ALLOWED_BASE_RE.test(url)) return 'http://127.0.0.1:3001';
  return url;
}

export default async function qaJourneyRoutes(server: FastifyInstance) {
  // List all journey definitions
  server.get('/admin/qa/journeys', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    return {
      ok: true,
      journeys: ALL_JOURNEYS.map((j) => ({
        id: j.id,
        name: j.name,
        description: j.description,
        category: j.category,
        stepCount: j.steps.length,
        expectedRpcs: [...new Set(j.steps.flatMap((s) => s.expectedRpcs))],
      })),
    };
  });

  // Run all journeys
  server.post('/admin/qa/journeys/run', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const body = ((request as any).body as any) || {};
    const baseUrl = sanitizeBaseUrl(body.baseUrl);
    const cookie = body.cookie || (request.headers.cookie ?? '');
    const report = await runAllJourneys(baseUrl, cookie);
    return { ok: true, report };
  });

  // Run a single journey by ID
  server.post(
    '/admin/qa/journeys/:journeyId/run',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;
      const { journeyId } = (request as any).params;
      const journey = ALL_JOURNEYS.find((j) => j.id === journeyId);
      if (!journey) {
        return reply.code(404).send({ ok: false, error: `Journey ${journeyId} not found` });
      }
      const body = ((request as any).body as any) || {};
      const baseUrl = sanitizeBaseUrl(body.baseUrl);
      const cookie = body.cookie || (request.headers.cookie ?? '');
      const result = await runJourney(journey, baseUrl, cookie);
      return { ok: true, result };
    }
  );

  // Get cached journey results
  server.get('/admin/qa/journeys/results', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const results = getJourneyResults();
    return {
      ok: true,
      count: results.length,
      results,
    };
  });

  // Clear cached journey results
  server.delete(
    '/admin/qa/journeys/results',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;
      clearJourneyResults();
      return { ok: true, cleared: true };
    }
  );

  // RPC trace tripwire -- verify expected RPCs for a journey
  server.get(
    '/admin/qa/journeys/:journeyId/rpc-trace',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;
      const { journeyId } = (request as any).params;
      const journey = ALL_JOURNEYS.find((j) => j.id === journeyId);
      if (!journey) {
        return reply.code(404).send({ ok: false, error: `Journey ${journeyId} not found` });
      }
      const expectedRpcs = [...new Set(journey.steps.flatMap((s) => s.expectedRpcs))];
      return {
        ok: true,
        journeyId: journey.id,
        journeyName: journey.name,
        expectedRpcs,
        stepRpcs: journey.steps
          .filter((s) => s.expectedRpcs.length > 0)
          .map((s) => ({ step: s.name, rpcs: s.expectedRpcs })),
      };
    }
  );
}
