/**
 * Lab Inbound — Barrel Export — Phase 433 (W27 P3)
 */
export type {
  InboundLabResult,
  InboundObservation,
  SpecimenInfo,
  LabFilingStatus,
  LabFilingTarget,
  LabValidationResult,
} from "./types.js";

export {
  stageLabResult,
  getLabResult,
  listLabResults,
  updateLabStatus,
  getQuarantinedResults,
  linkLabToPatient,
  getLabStoreStats,
  validateLabResult,
  _resetLabStore,
} from "./store.js";

export {
  processOruR01,
  getLabFilingTarget,
} from "./handler.js";

export type { OruProcessResult } from "./handler.js";
