/**
 * apps/api/src/adapters/dashboard/index.ts
 *
 * Phase 453 (W29-P7). Dashboard adapter barrel + factory.
 */

export type { DashboardAdapter, DashboardResult } from "./interface.js";
export { StubDashboardAdapter } from "./stub-adapter.js";
export { WorldVistaDashboardAdapter } from "./worldvista-adapter.js";

import type { DashboardAdapter } from "./interface.js";
import { StubDashboardAdapter } from "./stub-adapter.js";
import { WorldVistaDashboardAdapter } from "./worldvista-adapter.js";

let _adapter: DashboardAdapter | null = null;

export function getDashboardAdapter(): DashboardAdapter {
  if (!_adapter) {
    const mode = process.env.ADAPTER_DASHBOARD || "stub";
    if (mode === "worldvista") {
      _adapter = new WorldVistaDashboardAdapter();
    } else {
      _adapter = new StubDashboardAdapter();
    }
  }
  return _adapter;
}
