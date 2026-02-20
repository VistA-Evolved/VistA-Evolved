/**
 * VistA Bindings — Barrel export
 *
 * Centralizes all VistA-first binding point imports.
 *
 * Phase 40 (Superseding) — VistA-first binding points
 */

export {
  buildClaimFromEncounterData,
  buildClaimFromVistaEncounter,
  type VistaEncounterData,
  type BindingResult,
} from './encounter-to-claim.js';

export {
  postEraToVista,
  checkVistaArTransaction,
  type EraPostResult,
} from './era-to-vista.js';

export {
  getChargeCaptureCandidates,
  getVistaInsurancePolicies,
  type ChargeCapturCandidate,
  type ChargeCaptureResult,
} from './charge-capture.js';
