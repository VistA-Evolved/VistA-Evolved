/**
 * HL7v2 Routing -- Message Matcher
 *
 * Phase 240 (Wave 6 P3): Matches incoming HL7v2 messages against route filters.
 * Evaluates all enabled routes in priority order and returns matches.
 */

import type { Hl7Message } from '../types.js';
import type { Hl7Route, RouteFilter } from './types.js';
import { listEnabledRoutes, recordMatch } from './registry.js';

/**
 * Find all routes that match a given message.
 * Routes are evaluated in priority order (lower number = higher priority).
 *
 * @returns Matching routes in priority order
 */
export function matchRoutes(message: Hl7Message): Hl7Route[] {
  const enabled = listEnabledRoutes();
  const matches: Hl7Route[] = [];

  for (const route of enabled) {
    if (matchesFilter(message, route.filter)) {
      matches.push(route);
      recordMatch(route.id);
    }
  }

  return matches;
}

/**
 * Test if a message matches a route filter.
 * All specified criteria must match (AND logic).
 * Empty/undefined criteria = match all.
 */
export function matchesFilter(message: Hl7Message, filter: RouteFilter): boolean {
  // Message type filter
  if (filter.messageTypes && filter.messageTypes.length > 0) {
    const msgType = message.messageType;
    if (!filter.messageTypes.some((t) => matchMessageType(msgType, t))) {
      return false;
    }
  }

  // Sending application filter
  if (filter.sendingApplications && filter.sendingApplications.length > 0) {
    if (!filter.sendingApplications.includes(message.msh.sendingApplication)) {
      return false;
    }
  }

  // Sending facility filter
  if (filter.sendingFacilities && filter.sendingFacilities.length > 0) {
    if (!filter.sendingFacilities.includes(message.msh.sendingFacility)) {
      return false;
    }
  }

  // Version filter
  if (filter.versions && filter.versions.length > 0) {
    if (!filter.versions.includes(message.version)) {
      return false;
    }
  }

  // Custom filter
  if (filter.customFilter) {
    try {
      if (!filter.customFilter(message)) {
        return false;
      }
    } catch {
      // Custom filter error = no match (fail-safe)
      return false;
    }
  }

  return true;
}

/**
 * Match a message type against a pattern.
 * Supports exact match ("ADT^A01") and wildcard ("ADT^*", "ADT").
 */
function matchMessageType(messageType: string, pattern: string): boolean {
  if (pattern === '*') return true;
  if (pattern === messageType) return true;

  // Wildcard: "ADT^*" matches "ADT^A01", "ADT^A02", etc.
  if (pattern.endsWith('^*')) {
    const prefix = pattern.slice(0, -2);
    return messageType.startsWith(prefix + '^');
  }

  // Partial: "ADT" matches "ADT^A01"
  if (!pattern.includes('^')) {
    return messageType.startsWith(pattern + '^') || messageType === pattern;
  }

  return false;
}
