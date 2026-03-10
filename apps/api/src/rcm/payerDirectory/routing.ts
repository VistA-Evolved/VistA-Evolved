/**
 * Payer Directory -- Claim Routing Engine
 *
 * Phase 44: jurisdiction + payer + connector capabilities -> chosen connector
 *
 * Given a claim's jurisdiction (country) and payer, determines the best
 * connector to use for submission. Returns ROUTE_NOT_FOUND with remediation
 * steps if no suitable route exists.
 */

import type { PayerCountry } from '../domain/payer.js';
import type { RouteSelection, RouteNotFound, DirectoryPayer, PayerChannel } from './types.js';
import { getDirectoryPayer } from './normalization.js';
import { getPayer } from '../payer-registry/registry.js';
import { getConnector, listConnectors } from '../connectors/types.js';

/* -- Route Selection ------------------------------------------ */

/**
 * Resolve the best route for a claim submission.
 */
export function resolveRoute(
  payerId: string,
  jurisdiction: PayerCountry
): RouteSelection | RouteNotFound {
  // 1. Try directory payer first (enriched), fall back to base registry
  const dirPayer = getDirectoryPayer(payerId);
  const basePayer = getPayer(payerId);

  if (!dirPayer && !basePayer) {
    return {
      code: 'ROUTE_NOT_FOUND',
      payerId,
      jurisdiction,
      remediation: [
        `Payer "${payerId}" not found in directory or registry.`,
        'Run POST /rcm/payers/refresh to load latest payer directories.',
        `Add the payer manually via POST /rcm/payers with payerId="${payerId}".`,
        'Check the clearinghouse payer roster for the correct payer ID.',
      ],
    };
  }

  // 2. Determine available channels
  const channels: PayerChannel[] = dirPayer?.channels ?? [];

  // If no directory channels, infer from base payer integration mode
  if (channels.length === 0 && basePayer) {
    const inferredChannel = inferChannelFromMode(basePayer.integrationMode);
    if (inferredChannel) channels.push(inferredChannel);
  }

  // 3. Match channels to available connectors
  const availableConnectors = listConnectors();

  for (const channel of channels) {
    // Find a connector that handles this channel type
    const connectorId =
      channel.connectorId ?? findConnectorForChannel(channel, jurisdiction, availableConnectors);
    if (connectorId) {
      const connector = getConnector(connectorId);
      if (connector) {
        return {
          payerId,
          jurisdiction,
          connectorId,
          channel,
          confidence: channel.connectorId ? 'exact' : 'inferred',
          notes: `Routed via ${connectorId} connector`,
        };
      }
    }
  }

  // 4. Try jurisdiction-based fallback
  const fallbackConnector = getJurisdictionFallback(jurisdiction);
  if (fallbackConnector) {
    return {
      payerId,
      jurisdiction,
      connectorId: fallbackConnector,
      channel: {
        type: jurisdiction === 'US' ? 'EDI_CLEARINGHOUSE' : 'PORTAL_BATCH',
        connectorId: fallbackConnector,
      },
      confidence: 'fallback',
      notes: `Fallback to ${fallbackConnector} for jurisdiction ${jurisdiction}`,
    };
  }

  // 5. No route found
  return buildRouteNotFound(payerId, jurisdiction, dirPayer);
}

/* -- Helpers -------------------------------------------------- */

function inferChannelFromMode(mode: string): PayerChannel | null {
  switch (mode) {
    case 'clearinghouse_edi':
      return { type: 'EDI_CLEARINGHOUSE' };
    case 'direct_api':
      return { type: 'DIRECT_API' };
    case 'portal_batch':
      return { type: 'PORTAL_BATCH' };
    case 'government_portal':
      return { type: 'NATIONAL_GATEWAY' };
    case 'fhir_payer':
      return { type: 'FHIR_R4' };
    default:
      return null;
  }
}

function findConnectorForChannel(
  channel: PayerChannel,
  jurisdiction: PayerCountry,
  _connectors: Array<{ id: string }>
): string | null {
  // Jurisdiction-specific connector matching
  switch (jurisdiction) {
    case 'PH':
      if (channel.type === 'NATIONAL_GATEWAY') return 'philhealth';
      return 'portal-batch';
    case 'AU':
      if (channel.type === 'NATIONAL_GATEWAY') return 'eclipse-au';
      return 'portal-batch';
    case 'SG':
      if (channel.type === 'NATIONAL_GATEWAY') return 'nphc-sg';
      return 'portal-batch';
    case 'NZ':
      if (channel.type === 'DIRECT_API') return 'acc-nz';
      return 'portal-batch';
    case 'US':
      if (channel.type === 'EDI_CLEARINGHOUSE') return 'clearinghouse';
      return 'sandbox';
    default:
      return 'sandbox';
  }
}

function getJurisdictionFallback(jurisdiction: PayerCountry): string | null {
  switch (jurisdiction) {
    case 'US':
      return 'sandbox';
    case 'PH':
      return 'portal-batch';
    case 'AU':
      return 'portal-batch';
    case 'SG':
      return 'portal-batch';
    case 'NZ':
      return 'portal-batch';
    default:
      return null;
  }
}

function buildRouteNotFound(
  payerId: string,
  jurisdiction: PayerCountry,
  dirPayer?: DirectoryPayer
): RouteNotFound {
  const remediation: string[] = [];

  if (!dirPayer) {
    remediation.push(
      `Payer "${payerId}" is in the base registry but not the enriched directory.`,
      'Run POST /rcm/payers/refresh to pull authoritative sources.'
    );
  } else {
    remediation.push(
      `Payer "${payerId}" has ${dirPayer.channels.length} channel(s) but none match an available connector.`
    );
  }

  remediation.push(
    `Check connector health: GET /rcm/connectors/health`,
    `Verify enrollment status: GET /rcm/payers/${payerId}/enrollment-packet`,
    `For ${jurisdiction} claims, ensure the appropriate connector is configured.`
  );

  return { code: 'ROUTE_NOT_FOUND', payerId, jurisdiction, remediation };
}

/**
 * Check if a route resolution result is a "not found" error.
 */
export function isRouteNotFound(result: RouteSelection | RouteNotFound): result is RouteNotFound {
  return 'code' in result && result.code === 'ROUTE_NOT_FOUND';
}
