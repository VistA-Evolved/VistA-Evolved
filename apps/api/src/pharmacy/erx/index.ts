/**
 * Phase 586 (W42-P15): e-Prescribing NCPDP SCRIPT Framework
 *
 * Provides NCPDP SCRIPT message types, builder, adapter interface,
 * and stub adapter for dev/testing. Plug in a real adapter (Surescripts,
 * WENO, DoseSpot) for production eRx network connectivity.
 */

export type {
  ScriptMessageType,
  ScriptMessage,
  NewRxMessage,
  RxRenewalRequestMessage,
  RxRenewalResponseMessage,
  CancelRxMessage,
  CancelRxResponseMessage,
  RxFillMessage,
  ErxAdapter,
  ErxNetworkProvider,
  ErxTransmitResult,
  ErxPrescriber,
  ErxPatient,
  ErxPharmacy,
  ErxMedication,
  ErxPayerInfo,
  ErxAddress,
  ErxPharmacySearchResult,
  ErxFormularyCheckResult,
  ErxEligibilityResult,
  ControlledSubstanceSchedule,
  DawCode,
  CancelReasonCode,
} from './types.js';

export { StubErxAdapter } from './stub-adapter.js';
export { buildNewRx, buildRenewalResponse, buildCancelRx, mapVistaPatientToErx } from './message-builder.js';

let activeAdapter: import('./types.js').ErxAdapter | null = null;

/**
 * Register the active eRx adapter. Call at startup based on config.
 * Default: StubErxAdapter if ERX_PROVIDER is not set or is "stub".
 */
export function registerErxAdapter(adapter: import('./types.js').ErxAdapter): void {
  activeAdapter = adapter;
}

/**
 * Get the currently registered eRx adapter.
 * Falls back to StubErxAdapter if none registered.
 */
export async function getErxAdapter(): Promise<import('./types.js').ErxAdapter> {
  if (!activeAdapter) {
    const mod = await import('./stub-adapter.js');
    activeAdapter = new mod.StubErxAdapter();
  }
  return activeAdapter;
}
