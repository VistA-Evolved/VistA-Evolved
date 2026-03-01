/**
 * UI Extension Slots — Phase 359 (W18-P6)
 *
 * Extension slot registry for plugins to inject UI components into predefined
 * locations (dashboard tiles, chart side panels, toolbar actions, etc.).
 * Tenant policy enforcement ensures only approved slots are filled.
 *
 * ADR: ADR-PLUGIN-MODEL.md — React portals for UI extensions.
 */

import { randomBytes } from "node:crypto";

// ── Types ───────────────────────────────────────────────────────────────

export type SlotLocation =
  | "dashboard_tile"
  | "chart_side_panel"
  | "toolbar_action"
  | "patient_banner"
  | "orders_addon"
  | "notes_addon"
  | "admin_tab"
  | "custom";

export type ExtensionStatus = "active" | "disabled" | "pending_review";

export interface UiExtensionSlot {
  id: string;
  tenantId: string;
  pluginId: string;
  slotLocation: SlotLocation;
  /** Display label for the extension */
  label: string;
  /** Optional icon identifier */
  icon?: string;
  /** Component URL or module path to load */
  componentRef: string;
  /** Sort order within the slot location */
  priority: number;
  /** Roles that can see this extension */
  allowedRoles: string[];
  status: ExtensionStatus;
  /** Arbitrary config passed to the component */
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SlotPolicy {
  id: string;
  tenantId: string;
  slotLocation: SlotLocation;
  /** Max extensions allowed in this slot */
  maxExtensions: number;
  /** Whether new extensions require admin approval */
  requireApproval: boolean;
  /** Roles that can manage this slot */
  adminRoles: string[];
  updatedAt: string;
}

// ── Stores ──────────────────────────────────────────────────────────────

/** Extension slots — keyed by extension ID */
const extensions = new Map<string, UiExtensionSlot>();

/** Slot policies — keyed by "tenantId:slotLocation" */
const slotPolicies = new Map<string, SlotPolicy>();

// ── Helpers ─────────────────────────────────────────────────────────────

function genId(): string {
  return randomBytes(16).toString("hex");
}

function now(): string {
  return new Date().toISOString();
}

function policyKey(tenantId: string, location: SlotLocation): string {
  return `${tenantId}:${location}`;
}

/** All known slot locations */
export const SLOT_LOCATIONS: SlotLocation[] = [
  "dashboard_tile",
  "chart_side_panel",
  "toolbar_action",
  "patient_banner",
  "orders_addon",
  "notes_addon",
  "admin_tab",
  "custom",
];

// ── Slot Policy CRUD ────────────────────────────────────────────────────

export function setSlotPolicy(
  tenantId: string,
  slotLocation: SlotLocation,
  opts: { maxExtensions?: number; requireApproval?: boolean; adminRoles?: string[] },
): SlotPolicy {
  const key = policyKey(tenantId, slotLocation);
  const existing = slotPolicies.get(key);
  const policy: SlotPolicy = {
    id: existing?.id || genId(),
    tenantId,
    slotLocation,
    maxExtensions: opts.maxExtensions ?? existing?.maxExtensions ?? 5,
    requireApproval: opts.requireApproval ?? existing?.requireApproval ?? true,
    adminRoles: opts.adminRoles ?? existing?.adminRoles ?? ["admin"],
    updatedAt: now(),
  };
  slotPolicies.set(key, policy);
  return policy;
}

export function getSlotPolicy(
  tenantId: string,
  slotLocation: SlotLocation,
): SlotPolicy | undefined {
  return slotPolicies.get(policyKey(tenantId, slotLocation));
}

export function listSlotPolicies(tenantId: string): SlotPolicy[] {
  const result: SlotPolicy[] = [];
  for (const p of slotPolicies.values()) {
    if (p.tenantId === tenantId) result.push(p);
  }
  return result;
}

// ── Extension CRUD ──────────────────────────────────────────────────────

export function registerExtension(
  tenantId: string,
  pluginId: string,
  slotLocation: SlotLocation,
  opts: {
    label: string;
    componentRef: string;
    icon?: string;
    priority?: number;
    allowedRoles?: string[];
    config?: Record<string, unknown>;
  },
): UiExtensionSlot {
  // Check policy
  const policy = getSlotPolicy(tenantId, slotLocation);
  if (policy) {
    const existing = getExtensionsForSlot(tenantId, slotLocation);
    if (existing.length >= policy.maxExtensions) {
      throw new Error(
        `Slot "${slotLocation}" has reached max extensions (${policy.maxExtensions})`,
      );
    }
  }

  const ext: UiExtensionSlot = {
    id: genId(),
    tenantId,
    pluginId,
    slotLocation,
    label: opts.label,
    icon: opts.icon,
    componentRef: opts.componentRef,
    priority: opts.priority ?? 100,
    allowedRoles: opts.allowedRoles ?? ["*"],
    status: policy?.requireApproval ? "pending_review" : "active",
    config: opts.config ?? {},
    createdAt: now(),
    updatedAt: now(),
  };

  extensions.set(ext.id, ext);
  return ext;
}

export function getExtension(
  id: string,
  tenantId: string,
): UiExtensionSlot | undefined {
  const ext = extensions.get(id);
  if (!ext || ext.tenantId !== tenantId) return undefined;
  return ext;
}

export function updateExtensionStatus(
  id: string,
  tenantId: string,
  status: ExtensionStatus,
): UiExtensionSlot | undefined {
  const ext = extensions.get(id);
  if (!ext || ext.tenantId !== tenantId) return undefined;
  ext.status = status;
  ext.updatedAt = now();
  return ext;
}

export function unregisterExtension(
  id: string,
  tenantId: string,
): boolean {
  const ext = extensions.get(id);
  if (!ext || ext.tenantId !== tenantId) return false;
  extensions.delete(id);
  return true;
}

// ── Query Helpers ───────────────────────────────────────────────────────

export function getExtensionsForSlot(
  tenantId: string,
  slotLocation: SlotLocation,
  opts?: { status?: ExtensionStatus; role?: string },
): UiExtensionSlot[] {
  const result: UiExtensionSlot[] = [];
  for (const ext of extensions.values()) {
    if (ext.tenantId !== tenantId) continue;
    if (ext.slotLocation !== slotLocation) continue;
    if (opts?.status && ext.status !== opts.status) continue;
    if (opts?.role && !ext.allowedRoles.includes("*") && !ext.allowedRoles.includes(opts.role)) {
      continue;
    }
    result.push(ext);
  }
  // Sort by priority (lower = higher priority)
  result.sort((a, b) => a.priority - b.priority);
  return result;
}

export function listExtensions(
  tenantId: string,
  opts?: { pluginId?: string; status?: ExtensionStatus },
): UiExtensionSlot[] {
  const result: UiExtensionSlot[] = [];
  for (const ext of extensions.values()) {
    if (ext.tenantId !== tenantId) continue;
    if (opts?.pluginId && ext.pluginId !== opts.pluginId) continue;
    if (opts?.status && ext.status !== opts.status) continue;
    result.push(ext);
  }
  return result;
}

export function getExtensionStats(tenantId: string): {
  totalExtensions: number;
  activeExtensions: number;
  pendingExtensions: number;
  extensionsBySlot: Record<string, number>;
  slotLocations: SlotLocation[];
  totalPolicies: number;
} {
  let total = 0;
  let active = 0;
  let pending = 0;
  const bySlot: Record<string, number> = {};

  for (const ext of extensions.values()) {
    if (ext.tenantId !== tenantId) continue;
    total++;
    if (ext.status === "active") active++;
    if (ext.status === "pending_review") pending++;
    bySlot[ext.slotLocation] = (bySlot[ext.slotLocation] || 0) + 1;
  }

  let policies = 0;
  for (const p of slotPolicies.values()) {
    if (p.tenantId === tenantId) policies++;
  }

  return {
    totalExtensions: total,
    activeExtensions: active,
    pendingExtensions: pending,
    extensionsBySlot: bySlot,
    slotLocations: SLOT_LOCATIONS,
    totalPolicies: policies,
  };
}

// ── Reset (testing) ─────────────────────────────────────────────────────

export function _resetUiExtensions(): void {
  extensions.clear();
  slotPolicies.clear();
}
