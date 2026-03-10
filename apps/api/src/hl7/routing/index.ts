/**
 * HL7v2 Routing -- Barrel Export
 *
 * Phase 240 (Wave 6 P3): Re-exports all routing components and provides
 * the routing message handler for the MLLP server.
 */

import type { Hl7Message, Hl7Ack, MllpConnection } from '../types.js';
import { messageSummary } from '../parser.js';
import { ackAccept, ackError } from '../ack-generator.js';
import { matchRoutes } from './matcher.js';
import { runTransformPipeline } from './transform.js';
import { dispatch, deadLetterUnroutable } from './dispatcher.js';
import { log } from '../../lib/logger.js';

// Re-exports
export * from './types.js';
export {
  addRoute,
  getRoute,
  listRoutes,
  listEnabledRoutes,
  removeRoute,
  toggleRoute,
  getRouteStats,
  getAllRouteStats,
  getDeadLetterQueue,
  getDeadLetterCount,
  clearDeadLetterQueue,
} from './registry.js';
export { matchRoutes, matchesFilter } from './matcher.js';
export { runTransformPipeline } from './transform.js';
export { dispatch, deadLetterUnroutable, shutdownDispatcher } from './dispatcher.js';

/**
 * The routing message handler for the MLLP server.
 * Replaces the default handler from Phase 239 (P2).
 *
 * Flow: receive -> match routes -> transform -> dispatch -> ACK
 */
export async function routingMessageHandler(
  message: Hl7Message,
  connection: MllpConnection
): Promise<Hl7Ack> {
  // Find matching routes
  const matchedRoutes = matchRoutes(message);

  if (matchedRoutes.length === 0) {
    // No routes matched -- dead-letter
    deadLetterUnroutable(message, 'No matching routes');
    log.warn('HL7 message unroutable (dead-lettered)', {
      component: 'hl7-routing',
      connectionId: connection.id,
      ...messageSummary(message),
    });
    return ackError(message, 'No matching routes configured');
  }

  // Process through first matching route (priority-ordered)
  // Future: fan-out to multiple routes if needed
  const route = matchedRoutes[0]!;

  // Transform pipeline
  const transformResult = runTransformPipeline(message.raw, route.transforms);

  // Dispatch to destination
  const dispatchResult = await dispatch(
    transformResult.messageText,
    route.destination,
    route.id,
    message
  );

  if (dispatchResult.ok) {
    return ackAccept(message);
  } else {
    return ackError(message, dispatchResult.error || 'Dispatch failed');
  }
}
