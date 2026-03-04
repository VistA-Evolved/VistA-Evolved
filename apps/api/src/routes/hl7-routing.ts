/**
 * HL7v2 Routing — API Routes
 *
 * Phase 240 (Wave 6 P3): CRUD endpoints for HL7v2 route management,
 * dead-letter queue access, and route testing.
 *
 * Routes:
 *   GET    /hl7/routes             — List all routes
 *   GET    /hl7/routes/:id         — Get a route
 *   PUT    /hl7/routes/:id         — Create/update a route
 *   DELETE /hl7/routes/:id         — Delete a route
 *   POST   /hl7/routes/:id/toggle  — Enable/disable a route
 *   GET    /hl7/routes/:id/stats   — Route statistics
 *   GET    /hl7/stats              — All route statistics
 *   GET    /hl7/dead-letter        — Dead-letter queue
 *   DELETE /hl7/dead-letter        — Clear dead-letter queue
 */

import type { FastifyInstance } from 'fastify';
import {
  addRoute,
  getRoute,
  listRoutes,
  removeRoute,
  toggleRoute,
  getRouteStats,
  getAllRouteStats,
  getDeadLetterQueue,
  getDeadLetterCount,
  clearDeadLetterQueue,
} from '../hl7/routing/index.js';
import type { Hl7Route } from '../hl7/routing/types.js';
import { log } from '../lib/logger.js';

export default async function hl7RoutingRoutes(server: FastifyInstance): Promise<void> {
  /** GET /hl7/routes — List all routes */
  server.get('/hl7/routes', async (_request, reply) => {
    const routes = listRoutes();
    return reply.send({
      ok: true,
      count: routes.length,
      routes: routes.map(sanitizeRoute),
    });
  });

  /** GET /hl7/routes/:id — Get a route */
  server.get('/hl7/routes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const route = getRoute(id);
    if (!route) {
      return reply.code(404).send({ ok: false, error: 'Route not found' });
    }
    return reply.send({ ok: true, route: sanitizeRoute(route) });
  });

  /** PUT /hl7/routes/:id — Create/update a route */
  server.put('/hl7/routes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};

    const route: Hl7Route = {
      id,
      name: body.name || id,
      description: body.description || '',
      enabled: body.enabled ?? true,
      priority: body.priority ?? 100,
      filter: body.filter || {},
      transforms: body.transforms || [],
      destination: body.destination || {
        type: 'dead-letter',
        id: 'dlq',
        name: 'Dead Letter',
        target: '',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    addRoute(route);

    log.info('HL7 route created/updated via API', {
      component: 'hl7-routing',
      routeId: id,
      name: route.name,
    });

    return reply.code(201).send({ ok: true, route: sanitizeRoute(route) });
  });

  /** DELETE /hl7/routes/:id — Delete a route */
  server.delete('/hl7/routes/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const removed = removeRoute(id);
    if (!removed) {
      return reply.code(404).send({ ok: false, error: 'Route not found' });
    }
    return reply.send({ ok: true, deleted: id });
  });

  /** POST /hl7/routes/:id/toggle — Enable/disable a route */
  server.post('/hl7/routes/:id/toggle', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const enabled = body.enabled ?? true;
    const toggled = toggleRoute(id, enabled);
    if (!toggled) {
      return reply.code(404).send({ ok: false, error: 'Route not found' });
    }
    return reply.send({ ok: true, routeId: id, enabled });
  });

  /** GET /hl7/routes/:id/stats — Route statistics */
  server.get('/hl7/routes/:id/stats', async (request, reply) => {
    const { id } = request.params as { id: string };
    const stats = getRouteStats(id);
    if (!stats) {
      return reply.code(404).send({ ok: false, error: 'Route stats not found' });
    }
    return reply.send({ ok: true, stats });
  });

  /** GET /hl7/stats — All route statistics */
  server.get('/hl7/stats', async (_request, reply) => {
    const allStats = getAllRouteStats();
    return reply.send({
      ok: true,
      count: allStats.length,
      stats: allStats,
    });
  });

  /** GET /hl7/dead-letter — Dead-letter queue */
  server.get('/hl7/dead-letter', async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = parseInt(query.limit || '50', 10);
    const entries = getDeadLetterQueue(limit);
    return reply.send({
      ok: true,
      total: getDeadLetterCount(),
      count: entries.length,
      entries,
    });
  });

  /** DELETE /hl7/dead-letter — Clear dead-letter queue */
  server.delete('/hl7/dead-letter', async (_request, reply) => {
    const cleared = clearDeadLetterQueue();
    return reply.send({ ok: true, cleared });
  });
}

/** Sanitize route for API response (strip internal custom functions). */
function sanitizeRoute(route: Hl7Route): Omit<Hl7Route, 'filter'> & { filter: any } {
  const { filter, ...rest } = route;
  const { customFilter: _customFilter, ...safeFilter } = filter;
  return { ...rest, filter: safeFilter };
}
