/**
 * HL7v2 Routing — Route Registry
 *
 * Phase 240 (Wave 6 P3): In-memory route store with CRUD operations.
 * Matches the project pattern of in-memory stores with future PG migration path.
 */

import { log } from '../../lib/logger.js';
import type { Hl7Route, RouteStats, DeadLetterEntry } from './types.js';

/* ------------------------------------------------------------------ */
/*  In-Memory Stores                                                   */
/* ------------------------------------------------------------------ */

const routes = new Map<string, Hl7Route>();
const routeStats = new Map<string, RouteStats>();
const deadLetterQueue: DeadLetterEntry[] = [];
const MAX_DLQ_SIZE = 1000;

/* ------------------------------------------------------------------ */
/*  Route CRUD                                                         */
/* ------------------------------------------------------------------ */

/** Add or update a route. */
export function addRoute(route: Hl7Route): void {
  const existing = routes.get(route.id);
  routes.set(route.id, {
    ...route,
    updatedAt: Date.now(),
    createdAt: existing?.createdAt ?? Date.now(),
  });

  // Initialize stats if new
  if (!routeStats.has(route.id)) {
    routeStats.set(route.id, {
      routeId: route.id,
      matched: 0,
      dispatched: 0,
      failed: 0,
      avgDurationMs: 0,
      lastMatchedAt: 0,
    });
  }

  log.info('HL7 route added/updated', {
    component: 'hl7-routing',
    routeId: route.id,
    name: route.name,
    enabled: route.enabled,
    priority: route.priority,
    destinationType: route.destination.type,
  });
}

/** Get a route by ID. */
export function getRoute(id: string): Hl7Route | undefined {
  return routes.get(id);
}

/** List all routes (sorted by priority). */
export function listRoutes(): Hl7Route[] {
  return Array.from(routes.values()).sort((a, b) => a.priority - b.priority);
}

/** List only enabled routes (sorted by priority). */
export function listEnabledRoutes(): Hl7Route[] {
  return listRoutes().filter((r) => r.enabled);
}

/** Remove a route by ID. Returns true if found and removed. */
export function removeRoute(id: string): boolean {
  const existed = routes.delete(id);
  routeStats.delete(id);
  if (existed) {
    log.info('HL7 route removed', { component: 'hl7-routing', routeId: id });
  }
  return existed;
}

/** Enable or disable a route. */
export function toggleRoute(id: string, enabled: boolean): boolean {
  const route = routes.get(id);
  if (!route) return false;
  route.enabled = enabled;
  route.updatedAt = Date.now();
  log.info('HL7 route toggled', {
    component: 'hl7-routing',
    routeId: id,
    enabled,
  });
  return true;
}

/* ------------------------------------------------------------------ */
/*  Route Stats                                                        */
/* ------------------------------------------------------------------ */

/** Get stats for a route. */
export function getRouteStats(id: string): RouteStats | undefined {
  return routeStats.get(id);
}

/** Get stats for all routes. */
export function getAllRouteStats(): RouteStats[] {
  return Array.from(routeStats.values());
}

/** Record a match for a route. */
export function recordMatch(routeId: string): void {
  const stats = routeStats.get(routeId);
  if (stats) {
    stats.matched++;
    stats.lastMatchedAt = Date.now();
  }
}

/** Record a successful dispatch. */
export function recordDispatch(routeId: string, durationMs: number): void {
  const stats = routeStats.get(routeId);
  if (stats) {
    stats.dispatched++;
    // Running average
    stats.avgDurationMs =
      (stats.avgDurationMs * (stats.dispatched - 1) + durationMs) / stats.dispatched;
  }
}

/** Record a failed dispatch. */
export function recordFailure(routeId: string): void {
  const stats = routeStats.get(routeId);
  if (stats) {
    stats.failed++;
  }
}

/* ------------------------------------------------------------------ */
/*  Dead-Letter Queue                                                  */
/* ------------------------------------------------------------------ */

/** Add a message to the dead-letter queue. */
export function addToDeadLetter(entry: DeadLetterEntry): void {
  // FIFO eviction if over limit
  if (deadLetterQueue.length >= MAX_DLQ_SIZE) {
    deadLetterQueue.shift();
  }
  deadLetterQueue.push(entry);
  log.warn('HL7 message dead-lettered', {
    component: 'hl7-routing',
    messageType: entry.messageType,
    messageControlId: entry.messageControlId,
    reason: entry.reason,
  });
}

/** Get dead-letter queue entries. */
export function getDeadLetterQueue(limit = 50): DeadLetterEntry[] {
  return deadLetterQueue.slice(-limit);
}

/** Get dead-letter queue size. */
export function getDeadLetterCount(): number {
  return deadLetterQueue.length;
}

/** Clear the dead-letter queue. */
export function clearDeadLetterQueue(): number {
  const count = deadLetterQueue.length;
  deadLetterQueue.length = 0;
  return count;
}
