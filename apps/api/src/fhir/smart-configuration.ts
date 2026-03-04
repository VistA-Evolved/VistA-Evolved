/**
 * SMART on FHIR Configuration — Phase 179 (Q195).
 *
 * Implements the /.well-known/smart-configuration endpoint per the
 * SMART App Launch Framework (HL7 FHIR IG).
 *
 * Reference: https://hl7.org/fhir/smart-app-launch/conformance.html
 *
 * This endpoint is public (unauthenticated) per the SMART specification.
 * It advertises the server's authorization capabilities so that SMART
 * client apps can discover how to authenticate and what scopes are available.
 *
 * When OIDC is not enabled, the endpoint returns a minimal discovery
 * document with VistA RPC auth as the authorization method.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { log } from '../lib/logger.js';

/* ================================================================== */
/* Configuration                                                        */
/* ================================================================== */

const OIDC_ENABLED = process.env.OIDC_ENABLED === 'true';
const OIDC_ISSUER = process.env.OIDC_ISSUER || '';

/* ================================================================== */
/* SMART Configuration Document                                         */
/* ================================================================== */

export interface SmartConfiguration {
  /** REQUIRED: URL to the OAuth2 authorization endpoint */
  authorization_endpoint?: string;
  /** REQUIRED: URL to the OAuth2 token endpoint */
  token_endpoint?: string;
  /** RECOMMENDED: URL to the token introspection endpoint */
  introspection_endpoint?: string;
  /** RECOMMENDED: URL to the token revocation endpoint */
  revocation_endpoint?: string;
  /** RECOMMENDED: Array of grant types supported */
  grant_types_supported: string[];
  /** REQUIRED: Array of SMART capabilities */
  capabilities: string[];
  /** RECOMMENDED: scopes supported */
  scopes_supported?: string[];
  /** RECOMMENDED: response types supported */
  response_types_supported?: string[];
  /** RECOMMENDED: code challenge methods for PKCE */
  code_challenge_methods_supported?: string[];
  /** OPTIONAL: JWKS URI for token verification */
  jwks_uri?: string;
  /** OPTIONAL: Registration endpoint */
  registration_endpoint?: string;
  /** OPTIONAL: Management endpoint */
  management_endpoint?: string;
  /** VistA-Evolved extension: auth method */
  'x-vista-evolved-auth'?: string;
  /** VistA-Evolved extension: FHIR base URL */
  'x-vista-evolved-fhir-base'?: string;
}

/**
 * Build the SMART configuration document.
 * Adapts based on whether OIDC is enabled.
 */
export function buildSmartConfiguration(baseUrl: string): SmartConfiguration {
  if (OIDC_ENABLED && OIDC_ISSUER) {
    // Full SMART on FHIR with OIDC
    return {
      authorization_endpoint: `${OIDC_ISSUER}/protocol/openid-connect/auth`,
      token_endpoint: `${OIDC_ISSUER}/protocol/openid-connect/token`,
      introspection_endpoint: `${OIDC_ISSUER}/protocol/openid-connect/token/introspect`,
      revocation_endpoint: `${OIDC_ISSUER}/protocol/openid-connect/revoke`,
      jwks_uri: `${OIDC_ISSUER}/protocol/openid-connect/certs`,
      grant_types_supported: ['authorization_code', 'client_credentials'],
      response_types_supported: ['code'],
      scopes_supported: [
        'openid',
        'profile',
        'fhirUser',
        'launch',
        'launch/patient',
        'patient/*.read',
        'patient/Patient.read',
        'patient/AllergyIntolerance.read',
        'patient/Condition.read',
        'patient/Observation.read',
        'patient/MedicationRequest.read',
        'patient/DocumentReference.read',
        'patient/Encounter.read',
        'user/*.read',
      ],
      code_challenge_methods_supported: ['S256'],
      capabilities: [
        'launch-ehr',
        'launch-standalone',
        'client-public',
        'client-confidential-symmetric',
        'sso-openid-connect',
        'context-ehr-patient',
        'context-standalone-patient',
        'permission-patient',
        'permission-user',
        'permission-v2',
      ],
      'x-vista-evolved-auth': 'oidc',
      'x-vista-evolved-fhir-base': `${baseUrl}/fhir`,
    };
  }

  // Minimal SMART config for VistA RPC auth (sandbox/dev mode)
  return {
    grant_types_supported: ['authorization_code'],
    response_types_supported: ['code'],
    capabilities: ['launch-ehr', 'context-ehr-patient', 'permission-patient', 'permission-user'],
    scopes_supported: [
      'openid',
      'fhirUser',
      'launch',
      'launch/patient',
      'patient/*.read',
      'patient/Patient.read',
      'patient/AllergyIntolerance.read',
      'patient/Condition.read',
      'patient/Observation.read',
      'patient/MedicationRequest.read',
      'patient/DocumentReference.read',
      'patient/Encounter.read',
      'user/*.read',
    ],
    'x-vista-evolved-auth': 'vista-rpc',
    'x-vista-evolved-fhir-base': `${baseUrl}/fhir`,
  };
}

/* ================================================================== */
/* Route registration                                                   */
/* ================================================================== */

export default async function smartConfigRoutes(server: FastifyInstance): Promise<void> {
  /**
   * GET /.well-known/smart-configuration
   *
   * Public endpoint per SMART App Launch specification.
   * Returns the server's SMART configuration document.
   */
  server.get(
    '/.well-known/smart-configuration',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const rawProto = request.headers['x-forwarded-proto'];
      const proto = Array.isArray(rawProto)
        ? rawProto[0]
        : typeof rawProto === 'string'
          ? rawProto.split(',')[0].trim()
          : 'http';
      const host = request.headers['x-forwarded-host'] || request.headers.host || 'localhost:3001';
      const baseUrl = `${proto}://${host}`;

      const config = buildSmartConfiguration(baseUrl);
      reply
        .status(200)
        .header('content-type', 'application/json')
        .header('cache-control', 'public, max-age=3600')
        .send(config);
    }
  );

  log.info('SMART on FHIR configuration endpoint registered: /.well-known/smart-configuration');
}
