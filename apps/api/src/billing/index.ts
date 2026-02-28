/**
 * Billing barrel export + initialization
 *
 * Phase 284 (Wave 10 P5)
 */

export * from "./types.js";
export { MockBillingProvider, resetMockBillingStores } from "./mock-provider.js";
export { LagoBillingProvider } from "./lago-provider.js";
export {
  incrementMeter,
  getMeterSnapshot,
  flushMeters,
  startMeteringFlush,
  stopMeteringFlush,
  resetMeteringStore,
} from "./metering.js";

import type { BillingProviderType } from "./types.js";
import { setBillingProvider } from "./types.js";
import { MockBillingProvider } from "./mock-provider.js";
import { LagoBillingProvider } from "./lago-provider.js";

/**
 * Initialize the billing provider based on BILLING_PROVIDER env var.
 * Call once at server startup.
 */
export function initBillingProvider(): void {
  const providerType = (process.env.BILLING_PROVIDER || "mock") as BillingProviderType;

  switch (providerType) {
    case "lago":
      setBillingProvider(new LagoBillingProvider());
      break;
    case "mock":
    default:
      setBillingProvider(new MockBillingProvider());
      break;
  }
}
