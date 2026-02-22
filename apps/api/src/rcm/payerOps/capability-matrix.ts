/**
 * Capability Matrix Store — Phase 88: Evidence-backed integration matrix
 *
 * Every payer capability (eligibility / LOA / claims / claim status / remittance)
 * has mode, maturity, and evidence. No "green" state without proof.
 *
 * In-memory (same pattern as other payerops stores).
 */

import { randomBytes } from "node:crypto";

/* ── Types ──────────────────────────────────────────────────── */

export type CapabilityType =
  | "eligibility"
  | "loa"
  | "claims_submit"
  | "claim_status"
  | "remittance";

export const ALL_CAPABILITY_TYPES: CapabilityType[] = [
  "eligibility",
  "loa",
  "claims_submit",
  "claim_status",
  "remittance",
];

export type CapabilityMode = "manual" | "portal" | "api" | "rpa_planned";

export type CapabilityMaturity = "none" | "planned" | "in_progress" | "active";

export interface CapabilityEvidence {
  id: string;
  type: "url" | "internal_note" | "runbook_ref";
  value: string;         // URL, note text, or runbook path
  addedAt: string;
  addedBy: string;
}

export interface PayerCapability {
  payerId: string;       // FK to RegistryPayer.id
  payerName: string;     // denormalized for fast display
  capability: CapabilityType;
  mode: CapabilityMode;
  maturity: CapabilityMaturity;
  evidence: CapabilityEvidence[];
  operationalNotes?: string;  // timeouts, business hours, known denial triggers
  updatedAt: string;
  updatedBy: string;
}

/** Composite key for the matrix cell */
function cellKey(payerId: string, capability: CapabilityType): string {
  return `${payerId}::${capability}`;
}

/* ── Store ──────────────────────────────────────────────────── */

const matrix = new Map<string, PayerCapability>();

/* ── CRUD ────────────────────────────────────────────────────── */

/**
 * Get or create a capability cell. If not set, returns default (manual/none/no evidence).
 */
export function getCapability(payerId: string, capability: CapabilityType): PayerCapability | undefined {
  return matrix.get(cellKey(payerId, capability));
}

/**
 * Get all capabilities for a payer.
 */
export function getPayerCapabilities(payerId: string): PayerCapability[] {
  return ALL_CAPABILITY_TYPES
    .map(c => matrix.get(cellKey(payerId, c)))
    .filter((c): c is PayerCapability => c !== undefined);
}

/**
 * Get the full matrix (all payers x all capabilities).
 */
export function getFullMatrix(): {
  payerId: string;
  payerName: string;
  capabilities: Record<CapabilityType, {
    mode: CapabilityMode;
    maturity: CapabilityMaturity;
    evidenceCount: number;
    hasOperationalNotes: boolean;
  } | null>;
}[] {
  // Group by payerId
  const grouped = new Map<string, { payerName: string; caps: PayerCapability[] }>();
  for (const cap of matrix.values()) {
    const existing = grouped.get(cap.payerId);
    if (existing) {
      existing.caps.push(cap);
    } else {
      grouped.set(cap.payerId, { payerName: cap.payerName, caps: [cap] });
    }
  }

  return Array.from(grouped.entries()).map(([payerId, { payerName, caps }]) => {
    const capabilities: Record<string, any> = {};
    for (const ct of ALL_CAPABILITY_TYPES) {
      const cap = caps.find(c => c.capability === ct);
      capabilities[ct] = cap
        ? {
            mode: cap.mode,
            maturity: cap.maturity,
            evidenceCount: cap.evidence.length,
            hasOperationalNotes: !!cap.operationalNotes,
          }
        : null;
    }
    return { payerId, payerName, capabilities: capabilities as any };
  }).sort((a, b) => a.payerName.localeCompare(b.payerName));
}

/**
 * Set/update a capability cell. Validates evidence requirement for "active" maturity.
 */
export function setCapability(data: {
  payerId: string;
  payerName: string;
  capability: CapabilityType;
  mode: CapabilityMode;
  maturity: CapabilityMaturity;
  operationalNotes?: string;
  actor: string;
}): { ok: boolean; error?: string; capability?: PayerCapability } {
  // Evidence enforcement: active maturity requires at least 1 evidence
  const key = cellKey(data.payerId, data.capability);
  const existing = matrix.get(key);
  const currentEvidence = existing?.evidence ?? [];

  if (data.maturity === "active" && currentEvidence.length === 0) {
    return {
      ok: false,
      error: `Cannot set maturity to "active" without evidence. Add at least one evidence link first.`,
    };
  }

  const now = new Date().toISOString();
  const cap: PayerCapability = {
    payerId: data.payerId,
    payerName: data.payerName,
    capability: data.capability,
    mode: data.mode,
    maturity: data.maturity,
    evidence: currentEvidence,
    operationalNotes: data.operationalNotes ?? existing?.operationalNotes,
    updatedAt: now,
    updatedBy: data.actor,
  };
  matrix.set(key, cap);
  return { ok: true, capability: cap };
}

/**
 * Add evidence to a capability cell.
 */
export function addEvidence(data: {
  payerId: string;
  capability: CapabilityType;
  type: "url" | "internal_note" | "runbook_ref";
  value: string;
  actor: string;
}): { ok: boolean; error?: string; capability?: PayerCapability } {
  const key = cellKey(data.payerId, data.capability);
  const cap = matrix.get(key);
  if (!cap) {
    return { ok: false, error: "Capability cell not found. Set mode/maturity first." };
  }

  const evidence: CapabilityEvidence = {
    id: `ev-${randomBytes(6).toString("hex")}`,
    type: data.type,
    value: data.value,
    addedAt: new Date().toISOString(),
    addedBy: data.actor,
  };
  cap.evidence.push(evidence);
  cap.updatedAt = evidence.addedAt;
  cap.updatedBy = data.actor;
  return { ok: true, capability: cap };
}

/**
 * Remove evidence from a capability cell. If maturity is "active" and this was
 * the last evidence, demote maturity to "in_progress".
 */
export function removeEvidence(data: {
  payerId: string;
  capability: CapabilityType;
  evidenceId: string;
}): { ok: boolean; error?: string; capability?: PayerCapability } {
  const key = cellKey(data.payerId, data.capability);
  const cap = matrix.get(key);
  if (!cap) return { ok: false, error: "Capability cell not found" };

  const idx = cap.evidence.findIndex(e => e.id === data.evidenceId);
  if (idx === -1) return { ok: false, error: "Evidence not found" };

  cap.evidence.splice(idx, 1);

  // Auto-demote if no evidence left and maturity was active
  if (cap.evidence.length === 0 && cap.maturity === "active") {
    cap.maturity = "in_progress";
  }
  cap.updatedAt = new Date().toISOString();
  return { ok: true, capability: cap };
}

/**
 * Initialize default (manual/none) capabilities for a payer.
 */
export function initPayerCapabilities(payerId: string, payerName: string, actor: string): void {
  for (const ct of ALL_CAPABILITY_TYPES) {
    const key = cellKey(payerId, ct);
    if (!matrix.has(key)) {
      matrix.set(key, {
        payerId,
        payerName,
        capability: ct,
        mode: "manual",
        maturity: "none",
        evidence: [],
        updatedAt: new Date().toISOString(),
        updatedBy: actor,
      });
    }
  }
}

/**
 * Get matrix stats for the health endpoint.
 */
export function getMatrixStats(): {
  totalCells: number;
  byMode: Record<string, number>;
  byMaturity: Record<string, number>;
  activeWithEvidence: number;
  activeWithoutEvidence: number;
} {
  const byMode: Record<string, number> = {};
  const byMaturity: Record<string, number> = {};
  let activeWithEvidence = 0;
  let activeWithoutEvidence = 0;

  for (const cap of matrix.values()) {
    byMode[cap.mode] = (byMode[cap.mode] ?? 0) + 1;
    byMaturity[cap.maturity] = (byMaturity[cap.maturity] ?? 0) + 1;
    if (cap.maturity === "active") {
      if (cap.evidence.length > 0) activeWithEvidence++;
      else activeWithoutEvidence++;
    }
  }

  return {
    totalCells: matrix.size,
    byMode,
    byMaturity,
    activeWithEvidence,
    activeWithoutEvidence,
  };
}
