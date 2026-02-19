/**
 * Stub Messaging Adapter — Phase 37C.
 * Returns pending stubs when no HL7/HLO backend is configured.
 */

import type { MessagingAdapter, HL7Message, HL7Stats } from "./interface.js";
import type { AdapterResult } from "../types.js";

export class StubMessagingAdapter implements MessagingAdapter {
  readonly adapterType = "messaging" as const;
  readonly implementationName = "stub";
  readonly _isStub = true;

  async healthCheck() {
    return { ok: true, latencyMs: 0, detail: "Stub messaging adapter — no backend" };
  }

  async getMessages(_limit?: number): Promise<AdapterResult<HL7Message[]>> {
    return { ok: false, pending: true, error: "Messaging adapter not configured" };
  }

  async getStats(): Promise<AdapterResult<HL7Stats>> {
    return { ok: false, pending: true, error: "Messaging adapter not configured" };
  }

  async sendMessage(): Promise<AdapterResult<{ messageId: string }>> {
    return { ok: false, pending: true, error: "Messaging adapter not configured" };
  }

  async getLinkStatus(): Promise<AdapterResult<Array<{
    linkName: string;
    status: "active" | "inactive" | "error";
    lastActivity: string | null;
  }>>> {
    return { ok: false, pending: true, error: "Messaging adapter not configured" };
  }
}
