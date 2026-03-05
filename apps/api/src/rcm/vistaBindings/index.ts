/**
 * VistA Bindings — Barrel export
 *
 * Centralizes all VistA-first binding point imports.
 *
 * Phase 40 (Superseding) — VistA-first binding points
 * Phase 42 — Claim draft builder from VistA RPCs
 */

export {
  buildClaimFromEncounterData,
  buildClaimFromVistaEncounter,
  type VistaEncounterData,
  type BindingResult,
} from './encounter-to-claim.js';

export { postEraToVista, checkVistaArTransaction, type EraPostResult } from './era-to-vista.js';

export {
  getChargeCaptureCandidates,
  getVistaInsurancePolicies,
  wireChargeCaptureRpc,
  type ChargeCaptureCandidate,
  type ChargeCaptureResult,
} from './charge-capture.js';

export {
  buildClaimDraftFromVista,
  getVistaCoverage,
  parseEncounters,
  parseDiagnoses,
  parseProcedures,
  parseInsurance,
  type RpcCaller,
  type VistaEncounter,
  type VistaDiagnosis,
  type VistaProcedure,
  type VistaInsurance,
  type ClaimDraftCandidate,
  type ClaimDraftResult,
} from './buildClaimDraftFromVista.js';
